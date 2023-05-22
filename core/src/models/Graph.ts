import {
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  Node,
  NodeArgs,
  SerializedNode,
} from ".";
import { createMutable } from "solid-js/store";
import { pinsCanConnect } from "../utils";
import { ReactiveMap } from "@solid-primitives/map";
import { ReactiveSet } from "@solid-primitives/set";
import { z } from "zod";
import { CommentBox, CommentBoxArgs, SerializedCommentBox } from "./CommentBox";
import { Project } from "./Project";
import { connectWildcardsInTypes } from "../types/wildcard";

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
  connections: z
    .array(
      z.object({
        from: z.object({
          node: z.coerce.number().int(),
          output: z.string(),
        }),
        to: z.object({
          node: z.coerce.number().int(),
          input: z.string(),
        }),
      })
    )
    .default([]),
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

  createNode(args: Omit<NodeArgs, "graph" | "id">) {
    const id = this.nodeIdCounter++;

    const node = new Node({ ...args, id, graph: this });

    this.nodes.set(id, node);

    this.project.core.addEventNodeMapping(node);

    this.project.save();

    return node;
  }

  createCommentBox(args: CommentBoxArgs) {
    const box = new CommentBox(args);

    this.commentBoxes.add(box);

    this.project.save();

    return box;
  }

  connectPins(output: DataOutput | ExecOutput, input: DataInput | ExecInput) {
    if (!pinsCanConnect(output, input)) return;

    if (output instanceof DataOutput) {
      const dataOutput = output as DataOutput;
      const dataInput = input as DataInput;

      connectWildcardsInTypes(dataOutput.type, dataInput.type);

      dataOutput.connections.add(dataInput);
      dataInput.connection?.connections.delete(dataInput);
      dataInput.connection = dataOutput;
    } else {
      const execOutput = output as ExecOutput;
      const execInput = input as ExecInput;

      if (execOutput.connection) execOutput.connection.connection = null;
      if (execInput.connection) execInput.connection.connection = null;

      execOutput.connection = execInput;
      execInput.connection = execOutput;
    }

    this.project.save();
  }

  disconnectPin(pin: DataOutput | ExecOutput | DataInput | ExecInput) {
    if (pin instanceof DataOutput) {
      pin.connections.forEach((p) => (p.connection = null));
      pin.connections.clear();
    } else if (pin instanceof DataInput) {
      pin.connection?.connections.delete(pin);
      pin.connection = null;
    } else {
      if (pin.connection) pin.connection.connection = null;
      pin.connection = null;
    }

    this.project.save();
  }

  deleteItem(item: Node | CommentBox) {
    if (item instanceof Node) {
      item.inputs.forEach((i) => this.disconnectPin(i));
      item.outputs.forEach((o) => this.disconnectPin(o));

      this.nodes.delete(item.id);
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
      commentBoxes: [...this.commentBoxes.values()].map((box) => ({
        ...box,
      })),
      connections: [...this.nodes.entries()].reduce((acc, [_, node]) => {
        node.inputs.forEach((i) => {
          if (i.connection === null) return acc;

          acc.push({
            from: {
              node: i.connection.node.id,
              output: i.connection.id,
            },
            to: {
              node: i.node.id,
              input: i.id,
            },
          });
        });

        return acc;
      }, [] as any),
    };
  }

  static deserialize(
    project: Project,
    data: z.infer<typeof SerializedGraph>
  ): Graph {
    const graph = new Graph({
      project,
      id: data.id,
      name: data.name,
    });

    graph.nodeIdCounter = data.nodeIdCounter;

    graph.nodes = new ReactiveMap(
      Object.entries(data.nodes)
        .map(([idStr, serializedNode]) => {
          const id = z.coerce.number().parse(idStr);
          const node = Node.deserialize(graph, serializedNode);

          if (node === null) return null;

          project.core.addEventNodeMapping(node);

          return [id, node] as [number, Node];
        })
        .filter(Boolean) as [number, Node][]
    );

    data.connections.forEach(({ from, to }) => {
      const output = graph.nodes.get(from.node)?.output(from.output);
      const input = graph.nodes.get(to.node)?.input(to.input);

      if (!output || !input) return;

      graph.connectPins(output, input);
    });

    graph.commentBoxes = new ReactiveSet(
      data.commentBoxes.map((box) => new CommentBox(box))
    );

    return graph;
  }
}
