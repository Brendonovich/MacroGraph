import { IOBuilder, NodeSchema } from "./NodeSchema";
import {
  DataInput,
  DataInputArgs,
  DataOutput,
  DataOutputArgs,
  ExecInput,
  ExecInputArgs,
  ExecOutput,
  ExecOutputArgs,
} from "./IO";
import { Graph } from ".";
import { XY } from "../bindings";
import { createMutable } from "solid-js/store";
import { z } from "zod";
import { batch } from "solid-js";

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
  inputs: (DataInput | ExecInput)[] = [];
  outputs: (DataOutput | ExecOutput)[] = [];

  selected = false;

  constructor(args: NodeArgs) {
    this.id = args.id;
    this.name = args.schema.name;
    this.graph = args.graph;
    this.position = args.position;
    this.schema = args.schema;

    this.regenerateIO();

    return createMutable(this);
  }

  regenerateIO() {
    const builder = new IOBuilder();

    this.schema.generateIO(builder, {});

    batch(() => {
      this.inputs = this.inputs.filter((oldInput) =>
        builder.inputs.find(
          (newInput) =>
            oldInput.id === newInput.id && oldInput.variant === newInput.variant
        )
      );

      builder.inputs.forEach((newInput, newIndex) => {
        const oldInputIndex = this.inputs.findIndex(
          (oldInput) => oldInput.id === newInput.id
        );

        if (oldInputIndex >= 0) {
          const oldInput = this.inputs.splice(oldInputIndex, 1);
          this.inputs.splice(newIndex, 0, ...oldInput);
        } else {
          if (newInput.variant === "Data") {
            this.addDataInput({ ...newInput, index: newIndex });
          } else {
            this.addExecInput({ ...newInput, index: newIndex });
          }
        }
      });

      this.outputs = this.outputs.filter((oldOutput) =>
        builder.outputs.find(
          (newOutput) =>
            oldOutput.id === newOutput.id &&
            oldOutput.variant === newOutput.variant
        )
      );

      builder.outputs.forEach((newOutput, newIndex) => {
        const oldOutputIndex = this.outputs.findIndex(
          (oldInput) => oldInput.id === newOutput.id
        );

        if (oldOutputIndex >= 0) {
          const oldInput = this.outputs.splice(oldOutputIndex, 1);
          this.outputs.splice(newIndex, 0, ...oldInput);
        } else {
          if (newOutput.variant === "Data") {
            this.addDataOutput({ ...newOutput, index: newIndex });
          } else {
            this.addExecOutput({ ...newOutput, index: newIndex });
          }
        }
      });
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

    if (save) this.graph.save();
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

  addExecOutput(args: Omit<ExecOutputArgs, "node"> & { index?: number }) {
    this.outputs.push(new ExecOutput({ ...args, node: this as any }));
  }

  addDataOutput(args: Omit<DataOutputArgs, "node"> & { index?: number }) {
    this.outputs.push(new DataOutput({ ...args, node: this as any }));
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
        if (i instanceof ExecInput) return acc;

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
    const schema = graph.core.schema(data.schema.package, data.schema.id);

    if (!schema) return null;

    const node = new Node({
      id: data.id,
      position: data.position,
      schema,
      graph,
    });

    node.inputs.forEach((i) => {
      const defaultValue = data.defaultValues[i.id];

      if (defaultValue === undefined || i instanceof ExecInput) return;

      i.defaultValue = defaultValue;
    });

    return node;
  }
}
