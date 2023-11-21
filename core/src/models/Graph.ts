import { batch } from "solid-js";
import { createMutable } from "solid-js/store";
import { ReactiveMap } from "@solid-primitives/map";
import { z } from "zod";

import {
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  Node,
  NodeArgs,
  Pin,
  ScopeInput,
  ScopeOutput,
  SerializedConnection,
  SerializedNode,
  serializeConnections,
} from ".";
import { pinsCanConnect } from "../utils";
import { CommentBox, CommentBoxArgs, SerializedCommentBox } from "./CommentBox";
import { Project } from "./Project";
import {
  connectWildcardsInIO,
  disconnectWildcardsInIO,
  None,
  PrimitiveType,
  Some,
  t,
} from "../types";

export interface GraphArgs {
  id: number;
  name: string;
  project: Project;
}

const SerializedVariable = z.object({
  id: z.number(),
  name: z.string(),
  value: z.any(),
  type: z
    .union([
      z.literal("float"),
      z.literal("int"),
      z.literal("string"),
      z.literal("bool"),
    ])
    .default("float"),
});

export const SerializedGraph = z.object({
  id: z.coerce.number(),
  name: z.string(),
  nodes: z.record(z.coerce.number().int(), SerializedNode).default({}),
  commentBoxes: z.array(SerializedCommentBox).default([]),
  variables: z.array(SerializedVariable).default([]),
  nodeIdCounter: z.number(),
  connections: z.array(SerializedConnection).default([]),
});

type VariableArgs = {
  id: number;
  name: string;
  type: PrimitiveType;
  value: any;
};

class Variable {
  id: number;
  name: string;
  type: PrimitiveType;
  value: any;

  constructor(args: VariableArgs) {
    this.id = args.id;
    this.name = args.name;
    this.type = args.type;
    this.value = args.value;

    return createMutable(this);
  }

  serialize(): z.infer<typeof SerializedVariable> {
    return {
      id: this.id,
      name: this.name,
      value: this.value,
      type: this.type.primitiveVariant(),
    };
  }

  static deserialize(data: z.infer<typeof SerializedVariable>) {
    return new Variable({
      id: data.id,
      name: data.name,
      value: data.value,
      type: (() => {
        switch (data.type) {
          case "int":
            return t.int();
          case "float":
            return t.float();
          case "string":
            return t.string();
          case "bool":
            return t.bool();
        }
      })(),
    });
  }
}

export class Graph {
  id: number;
  name: string;
  project: Project;

  nodes = new ReactiveMap<number, Node>();
  commentBoxes = new ReactiveMap<number, CommentBox>();
  variables: Variable[] = [];

  private idCounter = 0;

  constructor(args: GraphArgs) {
    this.id = args.id;
    this.name = args.name;
    this.project = args.project;

    return createMutable(this);
  }

  generateId() {
    return this.idCounter++;
  }

  createNode(args: Omit<NodeArgs, "graph" | "id">) {
    const id = this.generateId();

    const node = new Node({ ...args, id, graph: this });

    this.nodes.set(id, node);

    this.project.core.addEventNodeMapping(node);

    this.project.save();

    return node;
  }

  createCommentBox(args: Omit<CommentBoxArgs, "graph" | "id">) {
    const id = this.generateId();

    const box = new CommentBox({
      ...args,
      id,
      graph: this,
    });

    this.commentBoxes.set(id, box);

    this.project.save();

    return box;
  }

  createVariable(args: Omit<VariableArgs, "id">) {
    const id = this.generateId();

    this.variables.push(new Variable({ ...args, id }));

    this.project.save();

    return id;
  }

  setVariableValue(id: number, value: any) {
    const variable = this.variables.find((v) => v.id === id);
    if (variable) variable.value = value;

    this.project.save();
  }

  connectPins(
    output: DataOutput<any> | ExecOutput | ScopeOutput,
    input: DataInput<any> | ExecInput | ScopeInput
  ) {
    const status = batch(() => {
      if (!pinsCanConnect(output, input)) return false;

      if (output instanceof DataOutput) {
        const dataOutput = output as DataOutput<any>;
        const dataInput = input as DataInput<any>;

        dataOutput.connections.add(dataInput);
        dataInput.connection.peek((c) => c.connections.delete(dataInput));
        dataInput.connection = Some(dataOutput);

        connectWildcardsInIO(dataOutput, dataInput);
      } else if (output instanceof ExecOutput) {
        const execOutput = output as ExecOutput;
        const execInput = input as ExecInput;

        execInput.connections.add(execOutput);
        execOutput.connection.peek((c) => c.connections.delete(execOutput));
        execOutput.connection = Some(execInput);
      } else {
        const scopeOutput = output as ScopeOutput;
        const scopeInput = input as ScopeInput;

        scopeOutput.connection.peek((c) => (c.connection = None));
        scopeInput.connection.peek((c) => (c.connection = None));

        scopeOutput.connection = Some(scopeInput);
        scopeInput.connection = Some(scopeOutput);

        scopeInput.scope.value = Some(scopeOutput.scope);
      }

      return true;
    });

    this.project.save();

    return status;
  }

  disconnectPin(pin: Pin) {
    batch(() => {
      if (pin instanceof DataOutput) {
        pin.connections.forEach((conn) => {
          disconnectWildcardsInIO(pin, conn);

          conn.connection = None;
        });

        pin.connections.clear();
      } else if (pin instanceof DataInput) {
        pin.connection.peek((conn) => {
          disconnectWildcardsInIO(conn, pin);

          conn.connections.delete(pin);
        });

        pin.connection = None;
      } else if (pin instanceof ScopeOutput) {
        pin.connection.peek((conn) => {
          conn.scope.value = None;
          conn.connection = None;
        });

        pin.connection = None;
      } else if (pin instanceof ScopeInput) {
        pin.scope.value = None;

        pin.connection.peek((conn) => (conn.connection = None));

        pin.connection = None;
      } else if (pin instanceof ExecOutput) {
        pin.connection.peek((conn) => conn.connections.delete(pin));
        pin.connection = None;
      } else {
        pin.connections.forEach((conn) => (conn.connection = None));

        pin.connections.clear();
      }
    });

    this.project.save();
  }

  deleteItem(item: Node | CommentBox) {
    if (item instanceof Node) {
      item.state.inputs.forEach((i) => this.disconnectPin(i));
      item.state.outputs.forEach((o) => this.disconnectPin(o));

      this.nodes.delete(item.id);
      item.dispose();
    } else {
      this.commentBoxes.delete(item.id);
    }

    this.project.save();
  }

  async rename(name: string) {
    this.name = name;

    this.project.save();
  }

  serialize(): z.infer<typeof SerializedGraph> {
    return {
      id: this.id,
      name: this.name,
      nodeIdCounter: this.idCounter,
      nodes: Object.fromEntries(
        [...this.nodes.entries()].map(([id, node]) => [id, node.serialize()])
      ),
      commentBoxes: [...this.commentBoxes.values()].map((box) =>
        box.serialize()
      ),
      variables: this.variables.map((v) => v.serialize()),
      connections: serializeConnections(this.nodes.values()),
    };
  }

  static async deserialize(
    project: Project,
    data: z.infer<typeof SerializedGraph>
  ): Promise<Graph> {
    const graph = new Graph({
      project,
      id: data.id,
      name: data.name,
    });

    graph.idCounter = data.nodeIdCounter;

    batch(() => {
      graph.variables = data.variables.map((v) => Variable.deserialize(v));

      graph.nodes = new ReactiveMap(
        Object.entries(data.nodes)
          .map(([idStr, serializedNode]) => {
            const id = z.coerce.number().parse(idStr);
            const node = Node.deserialize(graph, serializedNode);

            if (node === null) return null;

            return [id, node] as [number, Node];
          })
          .filter(Boolean) as [number, Node][]
      );

      for (const node of graph.nodes.values()) {
        const nodeData = data.nodes[node.id]!;

        node.state.inputs.forEach((i) => {
          const defaultValue = nodeData.defaultValues[i.id];

          if (defaultValue === undefined || !(i instanceof DataInput)) return;

          i.defaultValue = defaultValue;
        });
      }

      graph.commentBoxes = new ReactiveMap(
        data.commentBoxes.map((box) => {
          const id = box.id ?? graph.generateId();

          return [id, new CommentBox({ ...box, id, graph })];
        })
      );
    });

    await graph.deserializeConnections(data.connections);

    return graph;
  }

  async deserializeConnections(
    connections: z.infer<typeof SerializedConnection>[],
    options?: { nodeIdMap: Map<number, number> }
  ) {
    let i = 0;

    const getNodeId = (rawId: number) => {
      if (!options?.nodeIdMap) return rawId;

      const id = options.nodeIdMap.get(rawId);

      if (id === undefined) {
        throw new Error(`Failed to find node with id ${rawId}`);
      }

      return id;
    };

    while (connections.length > 0) {
      if (i > 10) {
        console.warn(`Failed to deserialize all connections after ${i} passes`);
        break;
      }

      i++;

      connections = connections.filter(({ from, to }) => {
        const output = this.nodes
          .get(getNodeId(from.node))
          ?.output(from.output);
        const input = this.nodes.get(getNodeId(to.node))?.input(to.input);

        if (!output || !input) return true;

        return !this.connectPins(output, input);
      });

      await microtask();
    }
  }
}

const microtask = () => new Promise<void>((res) => queueMicrotask(res));
