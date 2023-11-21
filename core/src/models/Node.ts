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
  batch,
} from "solid-js";

import { IOBuilder, NodeSchema } from "./NodeSchema";
import {
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  ScopeInput,
  ScopeOutput,
} from "./IO";
import { Graph } from ".";
import { XY } from "../utils";
import { Option } from "../types";

export interface NodeArgs {
  id: number;
  name?: string;
  graph: Graph;
  schema: NodeSchema;
  position: XY;
}

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
  properties: z.record(z.string(), z.any()).default({}),
});

export class Node {
  id: number;
  graph: Graph;
  schema: NodeSchema;
  state: {
    name: string;
    position: XY;
    inputs: (DataInput<any> | ExecInput | ScopeInput)[];
    outputs: (DataOutput<any> | ExecOutput | ScopeOutput)[];
    properties: Record<string, any>;
  };

  io!: IOBuilder;
  ioReturn: any;
  dispose: () => void;

  dataRoots!: Accessor<Set<Node>>;

  constructor(args: NodeArgs) {
    this.id = args.id;
    this.graph = args.graph;
    this.schema = args.schema;

    this.state = createMutable({
      name: args.name ? args.name : args.schema.name,
      position: args.position,
      inputs: [],
      outputs: [],
      properties: {},
    });

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.dispose = dispose;

    runWithOwner(owner, () => {
      createRenderEffect(() => {
        const io = new IOBuilder(this, this.io);

        this.ioReturn = this.schema.generateIO({
          io,
          properties: this.schema.properties ?? {},
          ctx: {
            getProperty: (property) => this.state.properties[property.id]!,
            graph: this.graph,
          },
          graph: this.graph,
        });

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

      this.graph.project.core.addEventNodeMapping(this);

      onCleanup(() => {
        this.graph.project.core.removeEventNodeMapping(this);
      });
    });
  }

  updateIO(io: IOBuilder) {
    this.io?.wildcards.forEach((w) => {
      if (!io.wildcards.has(w.id)) w.dispose();
    });

    const allInputs = new Set([...io.inputs]);
    io.inputs.forEach((i) => {
      if (!allInputs.has(i)) {
        this.graph.disconnectPin(i);

        if (i instanceof DataInput) {
          i.dispose();
        }
      }
    });
    this.state.inputs.splice(0, this.state.inputs.length, ...io.inputs);

    const allOutputs = new Set([...io.outputs]);
    io.outputs.forEach((o) => {
      if (!allOutputs.has(o)) this.graph.disconnectPin(o);
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
      properties: this.state.properties,
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
      schema,
      graph,
    });

    Object.entries(data.defaultValues).forEach(([key, data]) => {
      node.io.inputs.forEach((input) => {
        if (input.id == key && input instanceof DataInput)
          input.defaultValue = data;
      });
    });

    node.state.properties = data.properties;

    return node;
  }
}

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

export function serializeConnections(nodes: IterableIterator<Node>) {
  const connections: z.infer<typeof SerializedConnection>[] = [];

  for (const node of nodes) {
    node.state.inputs.forEach((i) => {
      if (i instanceof ExecInput) {
        i.connections.forEach((conn) => {
          connections.push({
            from: {
              node: conn.node.id,
              output: conn.id,
            },
            to: {
              node: i.node.id,
              input: i.id,
            },
          });
        });
      } else {
        (i.connection as unknown as Option<typeof i>).peek((conn) => {
          connections.push({
            from: {
              node: conn.node.id,
              output: conn.id,
            },
            to: {
              node: i.node.id,
              input: i.id,
            },
          });
        });
      }
    });
  }

  return connections;
}
