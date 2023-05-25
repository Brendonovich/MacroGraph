import { createMutable } from "solid-js/store";
import { Package, PackageArgs } from "./Package";
import { Node } from "./Node";
import { DataInput, DataOutput, ExecOutput } from "./IO";
import { EventsMap, RunCtx } from "./NodeSchema";
import { z } from "zod";
import { Project, SerializedProject } from "./Project";

class NodeEmit {
  listeners = new Map<Node, Set<(d: Node) => any>>();

  emit(data: Node) {
    this.listeners.get(data)?.forEach((l) => l(data));
  }

  subscribe(SubType: Node, cb: (d: Node) => any) {
    let listeners = this.listeners.get(SubType);
    if (!listeners) this.listeners.set(SubType, new Set());
    listeners = this.listeners.get(SubType);
    listeners?.add(cb);

    return () => {
      listeners?.delete(cb);
      if (listeners?.size === 0) this.listeners.delete(SubType);
    };
  }
}

export const NODE_EMIT = new NodeEmit();

export class Core {
  project: Project = new Project({
    core: this,
  });

  packages = [] as Package[];

  eventNodeMappings = new Map<Package, Map<string, Set<Node>>>();

  constructor() {
    return createMutable(this);
  }

  load(projectData: z.infer<typeof SerializedProject>) {
    this.eventNodeMappings.clear();
    this.project = Project.deserialize(this, projectData);
  }

  createPackage<TEvents extends EventsMap>(args: Omit<PackageArgs, "core">) {
    const pkg = new Package<TEvents>({ ...args, core: this });

    this.packages.push(pkg as any);

    return pkg;
  }

  schema(pkg: string, name: string) {
    return this.packages.find((p) => p.name === pkg)?.schema(name);
  }

  emitEvent<TEvents extends EventsMap, TEvent extends keyof EventsMap>(
    pkg: Package<TEvents>,
    event: { name: TEvent; data: TEvents[TEvent] }
  ) {
    const mappings = this.eventNodeMappings
      .get(pkg as any)
      ?.get(event.name as string);

    mappings?.forEach((n) => new ExecutionContext(n).run(event.data));
  }

  addEventNodeMapping(node: Node) {
    if ("event" in node.schema) {
      const event = node.schema.event;
      const pkg = node.schema.package;
      const mappings = this.eventNodeMappings;

      if (!mappings.has(pkg)) mappings.set(pkg, new Map());

      const pkgMappings = mappings.get(pkg)!;

      if (!pkgMappings.has(event)) pkgMappings.set(event, new Set());

      pkgMappings.get(event)?.add(node);
    }
  }
}

class ExecutionContext {
  data = new Map<DataOutput, any>();

  constructor(public root: Node) {}

  run(data: any) {
    this.root.schema.run({
      ctx: this.createCtx(this.root),
      io: this.root.io,
      data,
    });
  }

  createCtx(node: Node): RunCtx {
    return {
      exec: async (execOutput) => {
        NODE_EMIT.emit(node);
        const output = node.output(execOutput);

        if (!output) throw new Error(`Output ${execOutput} not found!`);
        if (!(output instanceof ExecOutput))
          throw new Error(`Output ${execOutput} is not an ExecOutput!`);

        if (!output.connection) return;

        await this.execNode(output.connection.node as any);
      },
      setOutput: (name, value) => {
        const output = node.output(name);

        if (output === undefined) throw new Error(`Output ${name} not found!`);

        if (!(output instanceof DataOutput))
          throw new Error(`Output ${name} is not a DataOutput!`);

        this.data.set(output, value);
      },
      getInput: (name) => {
        const input = node.input(name);

        if (input === undefined) throw new Error(`Input ${name} not found!`);

        if (!(input instanceof DataInput))
          throw new Error(`Input ${name} is not a DataInput!`);

        if (input.connection) {
          const data = this.data.get(input.connection);

          if (data === undefined)
            throw new Error(`Data not found for ${name}!`);

          return data;
        } else {
          return input.defaultValue;
        }
      },
    };
  }

  async execNode(node: Node) {
    if ("event" in node.schema) throw new Error("Cannot exec an Event node!");

    // calculate previous outputs
    node.inputs.forEach((i) => {
      if (!(i instanceof DataInput)) return;

      const connectedOutput = i.connection;

      if (connectedOutput !== null) {
        const connectedNode = connectedOutput.node;
        const schema = connectedNode.schema;

        if ("variant" in schema && schema.variant === "Pure") {
          // Pure nodes recalculate each time

          this.execNode(connectedNode as any);
        } else {
          // Value should already be present for non-pure nodes

          let value = this.data.get(connectedOutput);

          if (value === undefined)
            throw new Error(
              `Data for Pin ${connectedOutput.name}, Node ${connectedOutput.node.name} not found!`
            );
        }
      }
    });

    await node.schema.run({
      ctx: this.createCtx(node),
      io: node.io,
    });
  }
}

export const core = new Core();
