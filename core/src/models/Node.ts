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
import { XY } from "../bindings";
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
} from "solid-js";

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
});

export class Node {
  id: number;
  name: string;
  graph: Graph;
  position: XY;
  schema: NodeSchema;
  inputs: (DataInput<any> | ExecInput | ScopeInput)[] = [];
  outputs: (DataOutput<any> | ExecOutput | ScopeOutput)[] = [];

  io!: IOBuilder;
  ioReturn: any;
  dispose: () => void;

  dataRoots: Accessor<Set<Node>>;

  constructor(args: NodeArgs) {
    this.name = args.schema.name;
    this.id = args.id;
    this.graph = args.graph;
    this.position = args.position;
    this.schema = args.schema;

    const reactiveThis = createMutable(this);

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.dispose = dispose;

    runWithOwner(owner, () => {
      createRenderEffect(() => {
        const builder = new IOBuilder(this, this.io);

        this.ioReturn = reactiveThis.schema.generateIO(builder, {});

        untrack(() => this.updateIO(reactiveThis, builder));

        this.io = builder;
      });
    });

    this.dataRoots = createMemo(() => {
      const roots = new Set<Node>();

      for (const input of reactiveThis.inputs) {
        if (input instanceof DataInput) {
          input.connection.peek((c) => {
            c.node.dataRoots().forEach((n) => roots.add(n));
          });
        }
      }

      return roots;
    });

    return reactiveThis;
  }

  updateIO(reactiveThis: this, io: IOBuilder) {
    this.io?.wildcards.forEach((w) => {
      if (!io.wildcards.has(w.id)) w.dispose();
    });

    const allInputs = new Set([...io.inputs]);
    io.inputs.forEach((i) => {
      if (!allInputs.has(i)) this.graph.disconnectPin(i);
    });
    reactiveThis.inputs.splice(0, this.inputs.length, ...io.inputs);

    const allOutputs = new Set([...io.outputs]);
    io.outputs.forEach((o) => {
      if (!allOutputs.has(o)) this.graph.disconnectPin(o);
    });

    reactiveThis.outputs.splice(0, this.outputs.length, ...io.outputs);
  }

  // Getters

  input(id: string) {
    return this.inputs.find((i) => i.id === id);
  }

  output(id: string) {
    return this.outputs.find((o) => o.id === id);
  }

  // Setters

  setPosition(position: XY, save = false) {
    this.position = position;

    if (save) this.graph.project.save();
  }

  serialize(): z.infer<typeof SerializedNode> {
    return {
      id: this.id,
      name: this.name,
      position: this.position,
      schema: {
        package: this.schema.package.name,
        id: this.schema.name,
      },
      defaultValues: this.inputs.reduce((acc, i) => {
        if (!(i instanceof DataInput)) return acc;

        return {
          ...acc,
          [i.id]: i.defaultValue,
        };
      }, {}),
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
      position: data.position,
      schema,
      graph,
    });

    node.inputs.forEach((i) => {
      const defaultValue = data.defaultValues[i.id];

      if (defaultValue === undefined || !(i instanceof DataInput)) return;

      i.defaultValue = defaultValue;
    });

    return node;
  }
}
