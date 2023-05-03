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
import { z } from "zod";

export interface GraphArgs {
  id: number;
  name: string;
  core: Core;
}

export const SerializedGraph = z.object({
  id: z.number(),
  name: z.string(),
  nodes: z.record(z.coerce.number().int(), SerializedNode),
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

    if ("event" in node.schema) {
      const event = node.schema.event;
      const pkg = args.schema.package;
      const mappings = this.core.eventNodeMappings;

      if (!mappings.has(pkg)) mappings.set(pkg, new Map());

      const pkgMappings = mappings.get(pkg)!;

      if (!pkgMappings.has(event)) pkgMappings.set(event, new Set());

      pkgMappings.get(event)?.add(node);
    }

    this.save();

    return node;
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

  deleteNode(id: number) {
    const node = this.nodes.get(id);

    if (!node) return;

    node.inputs.forEach((i) => i.disconnect(false));
    node.outputs.forEach((o) => o.disconnect(false));

    this.nodes.delete(id);

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
