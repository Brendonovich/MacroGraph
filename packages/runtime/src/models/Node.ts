import { createMutable } from "solid-js/store";
import { z } from "zod";
import {
  untrack,
  createRoot,
  createRenderEffect,
  getOwner,
  runWithOwner,
  createMemo,
  Accessor,
  onCleanup,
  createEffect,
  catchError,
} from "solid-js";
import { Maybe, None, Option, Some, Disposable } from "@macrograph/typesystem";

import {
  IOBuilder,
  NodeSchema,
  Property,
  inferPropertyDef,
} from "./NodeSchema";
import {
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  ScopeInput,
  ScopeOutput,
} from "./IO";
import { XY } from "../utils";
import type { Graph } from "./Graph";
import { ExecutionContext } from "./Core";

export const SerializedNode = z.object({
  id: z.number(),
  name: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  schema: z.object({
    package: z.string(),
    id: z.string(),
  }),
  defaultValues: z.record(z.string(), z.any()),
  properties: z
    .record(
      z.string(),
      z
        .string()
        .or(z.number())
        .or(z.object({ default: z.literal(true) }))
    )
    .default({}),
});

export interface NodeArgs {
  id: number;
  name?: string;
  graph: Graph;
  schema: NodeSchema;
  position: XY;
  properties?: Record<string, string | typeof DEFAULT>;
}

export const DEFAULT = Symbol("default");
export class Node extends Disposable {
  id: number;
  graph: Graph;
  schema: NodeSchema;
  state: {
    name: string;
    position: XY;
    inputs: (DataInput<any> | ExecInput | ScopeInput)[];
    outputs: (DataOutput<any> | ExecOutput | ScopeOutput)[];
    properties: Record<string, string | number | typeof DEFAULT>;
  };

  io!: IOBuilder;
  ioReturn: any;

  dataRoots!: Accessor<Set<Node>>;

  constructor(args: NodeArgs) {
    super();

    this.id = args.id;
    this.graph = args.graph;
    this.schema = args.schema;

    this.state = createMutable({
      name: args.name ? args.name : args.schema.name,
      position: args.position,
      inputs: [],
      outputs: [],
      properties: Object.values(args.schema.properties ?? {}).reduce(
        (acc, property) => {
          if ("type" in property)
            acc[property.id] =
              args.properties?.[property.id] ??
              property.default ??
              property.type.default();
          else if ("resource" in property) {
            acc[property.id] = args.properties?.[property.id] ?? DEFAULT;
          } else acc[property.id] = args.properties?.[property.id];

          return acc;
        },
        {} as Record<string, any>
      ),
    });

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.addDisposeListener(dispose);

    runWithOwner(owner, () => {
      createRenderEffect(() => {
        const io = new IOBuilder(this, this.io);

        catchError(
          () => {
            this.ioReturn = this.schema.createIO({
              io,
              properties: this.schema.properties ?? {},
              ctx: {
                getProperty: (p) => this.getProperty(p) as any,
                graph: this.graph,
              },
              graph: this.graph,
            });
          },
          (e) => console.error(e)
        );

        untrack(() => this.updateIO(io));

        this.io = io;
      });

      this.dataRoots = createMemo(() => {
        const roots = new Set<Node>();

        for (const input of this.state.inputs) {
          if (input instanceof DataInput) {
            input.connection.peek((c) => {
              c.node.dataRoots().forEach((n) => roots.add(n));
            });
          }
        }

        return roots;
      });

      createEffect(() => {
        const mappings = this.graph.project.core.eventNodeMappings;

        if ("event" in this.schema) {
          const event = (() => {
            const eventFactory = this.schema.event;

            if (typeof eventFactory === "string") return eventFactory;
            else {
              return eventFactory({
                properties: this.schema.properties ?? {},
                ctx: {
                  getProperty: (p) => this.getProperty(p) as any,
                  graph: this.graph,
                },
              });
            }
          })();

          if (event === undefined) return;

          const pkg = this.schema.package;
          if (!mappings.has(pkg)) mappings.set(pkg, new Map());
          const pkgMappings = mappings.get(pkg)!;

          if (!pkgMappings.has(event)) pkgMappings.set(event, new Set());
          pkgMappings.get(event)!.add(this);

          onCleanup(() => {
            pkgMappings.get(event)!.delete(this);
          });
        }
      });

      if ("type" in this.schema && this.schema.type === "event") {
        const s = this.schema;

        createEffect(() => {
          catchError(
            () => {
              s.createListener({
                properties: s.properties ?? {},
                ctx: {
                  getProperty: (p) => this.getProperty(p) as any,
                  graph: this.graph,
                },
              }).listen((data) => new ExecutionContext(this).run(data));
            },
            (e) => console.error(e)
          );
        });
      }
    });
  }

  getProperty(property: Property) {
    if ("type" in property)
      return this.state.properties[property.id] as inferPropertyDef<
        typeof property
      >;

    if ("source" in property)
      return property
        .source({ node: this })
        .find((s) => s.id === (this.state.properties[property.id] as any))
        ?.id as inferPropertyDef<typeof property>;

    const { resource } = property;

    const value = this.state.properties[property.id];

    return Maybe(this.graph.project.resources.get(resource))
      .andThen((instance) =>
        Maybe(
          instance.items.find(
            (i) => i.id === (value === DEFAULT ? instance.default : value)
          )
        )
      )
      .andThen((item) => {
        if ("value" in item) return Some(item.value);
        if (!("sources" in resource)) return None;

        return Maybe(
          resource.sources(resource.package).find((s) => s.id === item.sourceId)
        ).map((s) => s.value);
      }) as inferPropertyDef<typeof property>;
  }

  updateIO(io: IOBuilder) {
    this.io?.wildcards.forEach((w) => {
      if (!io.wildcards.has(w.id)) w.dispose();
    });

    const allInputs = new Set([...io.inputs]);
    io.inputs.forEach((i) => {
      if (allInputs.has(i)) return;

      this.graph.disconnectPin(i);

      if ("dispose" in i) i.dispose();
    });
    this.state.inputs.splice(0, this.state.inputs.length, ...io.inputs);

    const allOutputs = new Set([...io.outputs]);
    io.outputs.forEach((o) => {
      if (allOutputs.has(o)) return;

      this.graph.disconnectPin(o);

      if ("dispose" in o) o.dispose();
    });

    this.state.outputs.splice(0, this.state.outputs.length, ...io.outputs);
  }

  // Getters

  input(id: string) {
    return this.state.inputs.find((i) => i.id === id);
  }

  output(id: string) {
    return this.state.outputs.find((o) => o.id === id);
  }

  // Setters

  setPosition(position: XY, save = false) {
    this.state.position = position;

    if (save) this.graph.project.save();
  }

  setProperty(property: string, value: any) {
    this.state.properties[property] = value;

    this.graph.project.save();
  }

  serialize(): z.infer<typeof SerializedNode> {
    return {
      id: this.id,
      name: this.state.name,
      position: this.state.position,
      schema: {
        package: this.schema.package.name,
        id: this.schema.name,
      },
      defaultValues: this.state.inputs.reduce((acc, i) => {
        if (!(i instanceof DataInput)) return acc;

        return {
          ...acc,
          [i.id]: i.defaultValue,
        };
      }, {}),
      properties: Object.entries(this.state.properties).reduce(
        (acc, [k, v]) => ({
          ...acc,
          [k]: v === DEFAULT ? { default: true } : v,
        }),
        {}
      ),
    };
  }

  static deserialize(
    graph: Graph,
    data: z.infer<typeof SerializedNode>
  ): Node | null {
    const schema = graph.project.core.schema(
      data.schema.package,
      data.schema.id
    );

    if (!schema) return null;

    const node = new Node({
      id: data.id,
      name: data.name,
      position: data.position,
      schema: schema as any,
      graph,
      properties: Object.entries(data.properties).reduce(
        (acc, [k, v]) => ({
          ...acc,
          [k]: typeof v === "object" ? DEFAULT : v,
        }),
        {}
      ),
    });

    Object.entries(data.defaultValues).forEach(([key, data]) => {
      node.io.inputs.forEach((input) => {
        if (input.id == key && input instanceof DataInput)
          input.defaultValue = data;
      });
    });

    return node;
  }

  ancestor(): Option<Node> {
    for (const input of this.state.inputs) {
      if (input instanceof ExecInput) {
        for (const conn of input.connections) {
          const anc = conn.node.ancestor();

          if (anc.isSome()) return anc;
          else return Some(conn.node);
        }
      }
    }

    return None;
  }
}
