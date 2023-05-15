import {
  Core,
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

export interface GraphArgs {
  id: number;
  name: string;
  core: Core;
}

export const SerializedGraph = z.object({
  id: z.number(),
  name: z.string(),
  nodes: z.record(z.coerce.number().int(), SerializedNode),
  commentBoxes: z.array(SerializedCommentBox).default([]),
  nodeIdCounter: z.number(),
  connections: z.array(
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
  ),
});

export class Graph {
  id: number;
  name: string;
  core: Core;

  nodes = new ReactiveMap<number, Node>();
  commentBoxes = new ReactiveSet<CommentBox>();

  private nodeIdCounter = 0;

  constructor(args: GraphArgs) {
    this.id = args.id;
    this.name = args.name;
    this.core = args.core;

    return createMutable(this);
  }

  createNode(args: Omit<NodeArgs, "graph" | "id">) {
    const id = this.nodeIdCounter++;

    const node = new Node({ ...args, id, graph: this });

    this.nodes.set(id, node);

    this.core.addEventNodeMapping(node);

    this.save();

    return node;
  }

  createCommentBox(args: CommentBoxArgs) {
    const box = new CommentBox(args);

    this.commentBoxes.add(box);

    this.save();

    return box;
  }

  connectPins(output: DataOutput | ExecOutput, input: DataInput | ExecInput) {
    if (!pinsCanConnect(output, input)) return;

    if (output instanceof DataOutput) {
      const dataOutput = output as DataOutput;
      const dataInput = input as DataInput;

      dataOutput.connections.push(dataInput);
      dataInput.connection?.connections.splice(
        dataInput.connection.connections.indexOf(dataInput),
        1
      );
      dataInput.connection = dataOutput;
    } else {
      const execOutput = output as ExecOutput;
      const execInput = input as ExecInput;

      if (execOutput.connection) execOutput.connection.connection = null;
      if (execInput.connection) execInput.connection.connection = null;

      execOutput.connection = execInput;
      execInput.connection = execOutput;
    }

    this.save();
  }

  deleteItem(item: Node | CommentBox) {
    if (item instanceof Node) {
      item.inputs.forEach((i) => i.disconnect(false));
      item.outputs.forEach((o) => o.disconnect(false));

      this.nodes.delete(item.id);
    } else {
      console.log("HMM");
      this.commentBoxes.delete(item);
    }

    this.save();
  }

  async rename(name: string) {
    this.name = name;

    this.save();
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
    core: Core,
    data: z.infer<typeof SerializedGraph>
  ): Graph | null {
    const graph = new Graph({
      core,
      id: data.id,
      name: data.name,
    });

    graph.nodeIdCounter = data.nodeIdCounter;

    graph.nodes = new ReactiveMap(
      Object.entries(data.nodes).map(([idStr, serializedNode]) => {
        const id = z.coerce.number().parse(idStr);
        const node = Node.deserialize(graph, serializedNode);

        if (node === null) throw new Error("Node is null!");

        core.addEventNodeMapping(node);

        return [id, node];
      })
    );

    data.connections.forEach(({ from, to }) => {
      const output = graph.nodes.get(from.node)?.output(from.output);
      const input = graph.nodes.get(to.node)?.input(to.input);

      if (!output || !input) return;

      if (output instanceof ExecOutput && input instanceof ExecInput) {
        input.connection = output;
        output.connection = input;
      } else if (output instanceof DataOutput && input instanceof DataInput) {
        input.connection = output;
        output.connections.push(input);
      }
    });

    graph.commentBoxes = new ReactiveSet(
      data.commentBoxes.map((box) => new CommentBox(box))
    );

    return graph;
  }

  save() {
    localStorage.setItem(`graph-${this.id}`, JSON.stringify(this.serialize()));

    localStorage.setItem(
      "graphs",
      JSON.stringify([
        ...new Set([
          ...(JSON.parse(localStorage.getItem("graphs") || "[]") ?? []),
          this.id,
        ]),
      ])
    );
  }
}
