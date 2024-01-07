import { batch } from "solid-js";
import { createMutable } from "solid-js/store";
import { ReactiveMap } from "@solid-primitives/map";
import { z } from "zod";
import { Option } from "@macrograph/typesystem";

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
} from ".";
import { pinIsInput, pinIsOutput, pinsCanConnect } from "../utils";
import { SerializedNode } from "./Node";
import { CommentBox, CommentBoxArgs, SerializedCommentBox } from "./CommentBox";
import { Project } from "./Project";
import { SerializedVariable, Variable, VariableArgs } from "./Variable";

export const SerializedConnection = z.object({
  from: z.object({
    node: z.coerce.number().int(),
    output: z.string(),
  }),
  to: z.object({
    node: z.coerce.number().int(),
    input: z.string(),
  }),
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

export interface GraphArgs {
  id: number;
  name: string;
  project: Project;
}

type IORef = `${number}:${"i" | "o"}:${string}`;

export function splitIORef(ref: IORef) {
  const [nodeId, type, ...ioId] = ref.split(":") as [
    string,
    "i" | "o",
    ...string[]
  ];

  return {
    type,
    nodeId: Number(nodeId),
    ioId: ioId.join(":"),
  };
}

export function makeIORef(io: Pin): IORef {
  return `${io.node.id}:${pinIsInput(io) ? "i" : "o"}:${io.id}`;
}

type Connections = ReactiveMap<IORef, Array<IORef>>;

export class Graph {
  id: number;
  name: string;
  project: Project;

  nodes = new ReactiveMap<number, Node>();
  commentBoxes = new ReactiveMap<number, CommentBox>();
  variables: Array<Variable> = [];
  connections: Connections = new ReactiveMap();

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

  createVariable(args: Omit<VariableArgs, "id" | "owner">) {
    const id = this.generateId();

    this.variables.push(new Variable({ ...args, id, owner: this }));

    this.project.save();

    return id;
  }

  setVariableValue(id: number, value: any) {
    const variable = this.variables.find((v) => v.id === id);
    if (variable) variable.value = value;

    this.project.save();
  }

  removeVariable(id: number) {
    const index = this.variables.findIndex((v) => v.id === id);
    if (index === -1) return;

    const v = this.variables.splice(index, 1);
    v.forEach((v) => v.dispose());
  }

  connectPins(
    output: DataOutput<any> | ExecOutput | ScopeOutput,
    input: DataInput<any> | ExecInput | ScopeInput
  ) {
    const status = (() => {
      if (!pinsCanConnect(output, input)) return false;

      const outRef = makeIORef(output),
        inRef = makeIORef(input);

      if (output instanceof DataOutput && input instanceof DataInput) {
        this.disconnectPin(input);

        const outputConnections =
          this.connections.get(outRef) ??
          (() => {
            const array: Array<IORef> = createMutable([]);
            this.connections.set(outRef, array);
            return array;
          })();
        outputConnections.push(inRef);
      } else if (output instanceof ExecOutput) {
        // should allow multi-input in the future
        this.disconnectPin(input);
        this.disconnectPin(output);

        this.connections.set(outRef, createMutable([inRef]));
      } else {
        this.disconnectPin(input);
        this.disconnectPin(output);

        this.connections.set(outRef, createMutable([inRef]));
      }

      return true;
    })();

    this.project.save();

    return status;
  }

  disconnectPin(pin: Pin) {
    const ref = makeIORef(pin);

    if (pinIsOutput(pin)) {
      this.connections.delete(ref);
    } else {
      (
        pin.connection as unknown as Option<
          DataInput<any> | ExecInput | ScopeInput
        >
      ).peek((conn) => {
        const connArray = this.connections.get(makeIORef(conn));
        if (!connArray) return;

        const index = connArray.indexOf(ref);
        if (index === -1) return;

        connArray.splice(index, 1);
      });
    }

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
      connections: (() => {
        const serialized: Array<z.infer<typeof SerializedConnection>> = [];

        for (const [refStr, conns] of this.connections) {
          const ref = splitIORef(refStr);

          if (ref.type === "i") continue;

          conns.forEach((conn) => {
            const connRef = splitIORef(conn);

            serialized.push({
              from: {
                node: ref.nodeId,
                output: ref.ioId,
              },
              to: {
                node: connRef.nodeId,
                input: connRef.ioId,
              },
            });
          });
        }

        return serialized;
      })(),
    };
  }

  static deserialize(project: Project, data: z.infer<typeof SerializedGraph>) {
    const graph = new Graph({
      project,
      id: data.id,
      name: data.name,
    });

    graph.idCounter = data.nodeIdCounter;

    graph.variables = data.variables.map((v) => Variable.deserialize(v, graph));

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

      graph.commentBoxes = new ReactiveMap(
        data.commentBoxes.map((box) => {
          const id = box.id ?? graph.generateId();

          return [id, new CommentBox({ ...box, id, graph })];
        })
      );

      graph.connections = data.connections.reduce((acc, conn) => {
        const outRef: IORef = `${conn.from.node}:o:${conn.from.output}`,
          inRef: IORef = `${conn.to.node}:i:${conn.to.input}`;

        const outConns =
          acc.get(outRef) ??
          (() => {
            const array: Array<IORef> = createMutable([]);
            acc.set(outRef, array);
            return array;
          })();

        outConns.push(inRef);

        return acc;
      }, new ReactiveMap() as Connections);
    });

    for (const node of graph.nodes.values()) {
      const nodeData = data.nodes[node.id]!;

      node.state.inputs.forEach((i) => {
        const defaultValue = nodeData.defaultValues[i.id];

        if (defaultValue === undefined || !(i instanceof DataInput)) return;

        i.defaultValue = defaultValue;
      });
    }

    return graph;
  }
}
