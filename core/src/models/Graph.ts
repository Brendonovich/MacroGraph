import { batch } from "solid-js";
import { createMutable } from "solid-js/store";
import { ReactiveMap } from "@solid-primitives/map";
import { ReactiveSet } from "@solid-primitives/set";
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
  Some,
} from "../types";

export interface GraphArgs {
  id: number;
  name: string;
  project: Project;
}

export const SerializedGraph = z.object({
  id: z.coerce.number(),
  name: z.string(),
  nodes: z.record(z.coerce.number().int(), SerializedNode).default({}),
  commentBoxes: z.array(SerializedCommentBox).default([]),
  nodeIdCounter: z.number(),
  connections: z.array(SerializedConnection).default([]),
});

export class Graph {
  id: number;
  name: string;
  project: Project;

  nodes = new ReactiveMap<number, Node>();
  commentBoxes = new ReactiveSet<CommentBox>();

  private nodeIdCounter = 0;

  constructor(args: GraphArgs) {
    this.id = args.id;
    this.name = args.name;
    this.project = args.project;

    return createMutable(this);
  }

  generateNodeId() {
    return this.nodeIdCounter++;
  }

  createNode(args: Omit<NodeArgs, "graph" | "id">) {
    const id = this.generateNodeId();

    const node = new Node({ ...args, id, graph: this });

    this.nodes.set(id, node);

    this.project.core.addEventNodeMapping(node);

    this.project.save();

    return node;
  }

  createCommentBox(args: Omit<CommentBoxArgs, "graph">) {
    const box = new CommentBox({
      ...args,
      graph: this,
    });

    this.commentBoxes.add(box);

    this.project.save();

    return box;
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
      this.commentBoxes.delete(item);
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
      nodeIdCounter: this.nodeIdCounter,
      nodes: Object.fromEntries(
        [...this.nodes.entries()].map(([id, node]) => [id, node.serialize()])
      ),
      commentBoxes: [...this.commentBoxes.values()].map((box) =>
        box.serialize()
      ),
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

    graph.nodeIdCounter = data.nodeIdCounter;

    batch(() => {
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
    });

    await graph.deserializeConnections(data.connections);

    for (const node of graph.nodes.values()) {
      const nodeData = data.nodes[node.id]!;

      node.state.inputs.forEach((i) => {
        const defaultValue = nodeData.defaultValues[i.id];

        if (defaultValue === undefined || !(i instanceof DataInput)) return;

        i.defaultValue = defaultValue;
      });
    }

    graph.commentBoxes = new ReactiveSet(
      data.commentBoxes.map(
        (box) =>
          new CommentBox({
            ...box,
            graph,
          })
      )
    );

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
