import { IOBuilder, NodeSchema, ScopeRef } from "./NodeSchema";
import {
  DataInput,
  DataInputArgs,
  DataOutput,
  DataOutputArgs,
  ExecInput,
  ExecInputArgs,
  ExecOutput,
  ExecOutputArgs,
  Scope,
  ScopeBuilder,
  ScopeInput,
  ScopeInputArgs,
  ScopeOutput,
  ScopeOutputArgs,
} from "./IO";
import { Graph } from ".";
import { XY } from "../bindings";
import { createMutable } from "solid-js/store";
import { z } from "zod";
import { untrack, createRoot, createRenderEffect } from "solid-js";
import { typesCanConnect, Wildcard } from "../types";

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
  inputs: (DataInput | ExecInput | ScopeInput)[] = [];
  outputs: (DataOutput | ExecOutput | ScopeOutput)[] = [];
  wildcards = new Map<string, Wildcard>();
  scopes = new Map<string, ScopeRef>();

  io!: IOBuilder;
  dispose: () => void;

  selected = false;

  constructor(args: NodeArgs) {
    this.id = args.id;
    this.name = args.schema.name;
    this.graph = args.graph;
    this.position = args.position;
    this.schema = args.schema;

    const reactiveThis = createMutable(this);

    this.dispose = createRoot((dispose) => {
      createRenderEffect(() => {
        const builder = new IOBuilder(this.wildcards, this.scopes);

        reactiveThis.schema.generateIO(builder, {});

        untrack(() => this.updateIO(reactiveThis, builder));

        this.io = builder;
      });

      return dispose;
    });

    return reactiveThis;
  }

  updateIO(reactiveThis: this, io: IOBuilder) {
    reactiveThis.wildcards = io.wildcards;
    reactiveThis.scopes = io.scopes;

    reactiveThis.inputs = reactiveThis.inputs.filter((oldInput) =>
      io.inputs.find(
        (newInput) =>
          oldInput.id === newInput.id && oldInput.variant === newInput.variant
      )
    );

    io.inputs.forEach((newInput, newIndex) => {
      const oldInputIndex = reactiveThis.inputs.findIndex(
        (oldInput) => oldInput.id === newInput.id
      );

      if (oldInputIndex >= 0) {
        const oldInput = reactiveThis.inputs.splice(oldInputIndex, 1);
        reactiveThis.inputs.splice(newIndex, 0, ...oldInput);
      } else {
        if (newInput.variant === "Data") {
          reactiveThis.addDataInput({ ...newInput, index: newIndex });
        } else if (newInput.variant === "Exec") {
          reactiveThis.addExecInput({ ...newInput, index: newIndex });
        } else {
          reactiveThis.addScopeInput({ ...newInput, index: newIndex });
        }
      }
    });

    reactiveThis.outputs = reactiveThis.outputs.filter((oldOutput) =>
      io.outputs.find(
        (newOutput) =>
          oldOutput.id === newOutput.id &&
          oldOutput.variant === newOutput.variant &&
          (oldOutput instanceof DataOutput && newOutput.variant === "Data"
            ? typesCanConnect(oldOutput.type, newOutput.type)
            : true)
      )
    );

    io.outputs.forEach((newOutput, newIndex) => {
      const oldOutputIndex = reactiveThis.outputs.findIndex(
        (oldInput) => oldInput.id === newOutput.id
      );

      if (oldOutputIndex >= 0) {
        const oldInput = reactiveThis.outputs.splice(oldOutputIndex, 1);
        reactiveThis.outputs.splice(newIndex, 0, ...oldInput);
      } else {
        if (newOutput.variant === "Data") {
          reactiveThis.addDataOutput({ ...newOutput, index: newIndex });
        } else if (newOutput.variant === "Exec") {
          reactiveThis.addExecOutput({ ...newOutput, index: newIndex });
        } else {
          const builder = new ScopeBuilder();
          newOutput.scope(builder);

          reactiveThis.addScopeOutput({
            ...newOutput,
            scope: new Scope(builder),
            index: newIndex,
          });
        }
      }
    });
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

  // IO Creators

  addExecInput(args: Omit<ExecInputArgs, "node"> & { index?: number }) {
    const input = new ExecInput({ ...args, node: this as any });

    if (args.index === undefined) this.inputs.push(input);
    else this.inputs.splice(args.index, 0, input);
  }

  addDataInput(args: Omit<DataInputArgs, "node"> & { index?: number }) {
    this.inputs.push(new DataInput({ ...args, node: this as any }));
  }

  addScopeInput(args: Omit<ScopeInputArgs, "node"> & { index?: number }) {
    this.inputs.push(new ScopeInput({ ...args, node: this as any }));
  }

  addExecOutput(args: Omit<ExecOutputArgs, "node"> & { index?: number }) {
    this.outputs.push(new ExecOutput({ ...args, node: this as any }));
  }

  addDataOutput(args: Omit<DataOutputArgs, "node"> & { index?: number }) {
    this.outputs.push(new DataOutput({ ...args, node: this as any }));
  }

  addScopeOutput(args: Omit<ScopeOutputArgs, "node"> & { index?: number }) {
    this.outputs.push(new ScopeOutput({ ...args, node: this as any }));
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
