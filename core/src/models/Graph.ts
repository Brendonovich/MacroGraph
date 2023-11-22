import { batch, createEffect, mapArray } from "solid-js";
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
} from ".";
import { pinIsInput, pinsCanConnect } from "../utils";
import { SerializedNode } from "./Node";
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

  removeVariable(id: number) {
    const index = this.variables.findIndex((v) => v.id === id);
    if (index === -1) return;

    this.variables.splice(index, 1);
  }

  connectPins(
    output: DataOutput<any> | ExecOutput | ScopeOutput,
    input: DataInput<any> | ExecInput | ScopeInput
  ) {
    const status = batch(() => {
      if (!pinsCanConnect(output, input)) return false;

      const outRef = makeIORef(output),
        inRef = makeIORef(input);

      if (output instanceof DataOutput) {
        const outputConnections =
          this.connections.get(outRef) ??
          (() => {
            const array: Array<IORef> = [];
            this.connections.set(outRef, array);
            return array;
          })();
        outputConnections.push(inRef);

        this.connections.set(inRef, [outRef]);
      } else if (output instanceof ExecOutput) {
        const outputConnections =
          this.connections.get(outRef) ??
          (() => {
            const array: Array<IORef> = [];
            this.connections.set(outRef, array);
            return array;
          })();
        outputConnections.push(inRef);

        this.connections.set(inRef, [outRef]);
      } else {
        this.connections.set(inRef, [outRef]);
        this.connections.set(outRef, [inRef]);
      }

      return true;
    });

    this.project.save();

    return status;
  }

  disconnectPin(pin: Pin) {
    batch(() => {
      const ref = makeIORef(pin);

      if (pin instanceof DataOutput) {
        pin.connections().forEach((conn) => {
          this.connections.delete(makeIORef(conn));
        });
      } else if (pin instanceof DataInput) {
        pin.connection().peek((conn) => {
          const connRef = makeIORef(conn);

          const connections = this.connections.get(connRef);
          if (!connections) return;

          const index = connections.indexOf(ref);
          if (index !== -1) connections.splice(index, 1);

          if (connections.length === 0) this.connections.delete(connRef);
        });
      } else if (pin instanceof ScopeOutput) {
        pin.connection().peek((conn) => {
          this.connections.delete(makeIORef(conn));
        });
      } else if (pin instanceof ScopeInput) {
        pin.connection().peek((conn) => {
          this.connections.delete(makeIORef(conn));
        });
      } else if (pin instanceof ExecOutput) {
        pin.connection().peek((conn) => {
          this.connections.delete(makeIORef(conn));
        });
      } else {
        pin.connection().peek((conn) => {
          this.connections.delete(makeIORef(conn));
        });
      }

      this.connections.delete(ref);
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
            const array: Array<IORef> = [];
            acc.set(outRef, array);
            return array;
          })();

        outConns.push(inRef);

        const inConns =
          acc.get(inRef) ??
          (() => {
            const array: Array<IORef> = [];
            acc.set(inRef, array);
            return array;
          })();

        inConns.push(outRef);

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
