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
import { Position, XY } from "~/bindings";
import { createMutable } from "solid-js/store";
import { batch } from "solid-js";

export interface NodeArgs {
  id: number;
  name?: string;
  graph: Graph;
  schema: NodeSchema;
  position: Position;
}

export class Node {
  id: number;
  name: string;
  graph: Graph;
  position: Position;
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

    this.schema.generate(builder, {});

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
        const oldOutputIndex = this.inputs.findIndex(
          (oldInput) => oldInput.id === newOutput.id
        );

        if (oldOutputIndex >= 0) {
          const oldInput = this.inputs.splice(oldOutputIndex, 1);
          this.inputs.splice(newIndex, 0, ...oldInput);
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

  setSelected(selected: boolean) {
    this.selected = selected;
  }

  setPosition(position: XY) {
    this.position = position;
  }

  addExecInput(args: Omit<ExecInputArgs, "node"> & { index?: number }) {
    const input = new ExecInput({ ...args, node: this });

    if (args.index === undefined) this.inputs.push(input);
    else this.inputs.splice(args.index, 0, input);
  }

  addDataInput(args: Omit<DataInputArgs, "node"> & { index?: number }) {
    this.inputs.push(new DataInput({ ...args, node: this }));
  }

  addExecOutput(args: Omit<ExecOutputArgs, "node"> & { index?: number }) {
    this.outputs.push(new ExecOutput({ ...args, node: this }));
  }

  addDataOutput(args: Omit<DataOutputArgs, "node"> & { index?: number }) {
    this.outputs.push(new DataOutput({ ...args, node: this }));
  }

  input(name: string) {
    return this.inputs.find((i) => i.name === name);
  }

  output(name: string) {
    return this.outputs.find((o) => o.name === name);
  }
}
