import { createMutable } from "solid-js/store";
import { Package, PackageArgs } from "./Package";
import { Node } from "./Node";
import { DataInput, DataOutput, ScopeOutput } from "./IO";
import { EventsMap, RunCtx } from "./NodeSchema";
import { z } from "zod";
import { Project, SerializedProject } from "./Project";
import { Option } from "../types";

class NodeEmit {
  listeners = new Map<Node, Set<(d: Node) => any>>();

  emit(node: Node) {
    this.listeners.get(node)?.forEach((l) => l(node));
  }

  subscribe(node: Node, cb: (d: Node) => any) {
    if (!this.listeners.has(node)) this.listeners.set(node, new Set());
    const listeners = this.listeners.get(node)!;

    listeners?.add(cb);

    return () => {
      listeners?.delete(cb);
      if (listeners?.size === 0) this.listeners.delete(node);
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

  async load(projectData: z.infer<typeof SerializedProject>) {
    this.eventNodeMappings.clear();
    this.project = await Project.deserialize(this, projectData);
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
      pkgMappings.get(event)!.add(node);
    }
  }

  removeEventNodeMapping(node: Node) {
    if ("event" in node.schema) {
      const event = node.schema.event;
      const pkg = node.schema.package;
      const mappings = this.eventNodeMappings;

      const pkgMappings = mappings.get(pkg);
      if (!pkgMappings) return;

      const eventMappings = pkgMappings.get(event);
      if (!eventMappings) return;

      eventMappings.delete(node);
    }
  }
}

class ExecutionContext {
  data = new Map<DataOutput<any> | ScopeOutput, any>();

  constructor(public root: Node) {}

  run(data: any) {
    NODE_EMIT.emit(this.root);

    this.root.schema.run({
      ctx: this.createCtx(),
      io: this.root.ioReturn,
      data,
    });
  }

  createCtx(): RunCtx {
    return {
      exec: async (execOutput) => {
        await execOutput.connection.peekAsync((conn) =>
          this.execNode(conn.node)
        );
      },
      execScope: async (scopeOutput, data) => {
        await scopeOutput.connection.peekAsync(async (conn) => {
          this.data.set(scopeOutput, data);

          await this.execNode(conn.node);
        });
      },
      setOutput: (output, value) => {
        this.data.set(output, value);
      },
      getInput: (input) => {
        return (
          input.connection as Option<DataOutput<any> | ScopeOutput>
        ).mapOrElse(
          () => {
            if (input instanceof DataInput) return input.defaultValue;
          },
          (conn) => {
            const data = this.data.get(conn);

            if (data === undefined)
              throw new Error(`Data not found for ${input.name}!`);

            return data;
          }
        );
      },
    };
  }

  async execNode(node: Node) {
    if ("event" in node.schema) throw new Error("Cannot exec an Event node!");

    NODE_EMIT.emit(node);

    // calculate previous outputs
    node.state.inputs.forEach((i) => {
      if (!(i instanceof DataInput)) return;

      i.connection.peek((conn) => {
        const connectedNode = conn.node;
        const schema = connectedNode.schema;

        if ("variant" in schema && schema.variant === "Pure") {
          // Pure nodes recalculate each time

          this.execNode(connectedNode as any);
        } else {
          // Value should already be present for non-pure nodes

          let value = this.data.get(conn);

          if (value === undefined)
            throw new Error(
              `Data for Pin ${conn.name}, Node ${conn.node.state.name} not found!`
            );
        }
      });
    });

    await node.schema.run({
      ctx: this.createCtx(),
      io: node.ioReturn,
    });
  }
}

export const core = new Core();
