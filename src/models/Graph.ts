import {
  Core,
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  Node,
  NodeArgs,
} from ".";
import { createMutable } from "solid-js/store";
import { pinsCanConnect } from "~/utils";
import { ReactiveMap } from "@solid-primitives/map";

export interface GraphArgs {
  id: number;
  name: string;
  core: Core;
}

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

    const event = args.schema.event;

    if (event !== undefined) {
      const pkg = args.schema.package;
      const mappings = this.core.eventNodeMappings;

      if (!mappings.has(pkg)) mappings.set(pkg, new Map());

      const pkgMappings = mappings.get(pkg)!;

      if (!pkgMappings.has(event)) pkgMappings.set(event, new Set());

      pkgMappings.get(event)?.add(node);
    }

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
  }

  deleteNode(id: number) {
    const node = this.nodes.get(id);

    if (!node) return;

    node.inputs.forEach((i) => i.disconnect(false));
    node.outputs.forEach((o) => o.disconnect(false));

    this.nodes.delete(id);
  }

  async rename(name: string) {
    this.name = name;
  }
}
