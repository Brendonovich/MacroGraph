import { ValueType } from "~/bindings";

export type NodeSchemaVariant = "Base" | "Pure" | "Exec" | "Event";

export type DataInputBuilder = {
  id: string;
  name: string;
  type: ValueType;
};
export type ExecInputBuilder = {
  id: string;
  name: string;
};

export type InputBuilder =
  | ({ variant: "Data" } & DataInputBuilder)
  | ({ variant: "Exec" } & ExecInputBuilder);

export type DataOutputBuilder = {
  id: string;
  name: string;
  type: ValueType;
};
export type ExecOutputBuilder = {
  id: string;
  name: string;
};

export type OutputBuilder =
  | ({
      variant: "Data";
    } & DataOutputBuilder)
  | ({
      variant: "Exec";
    } & ExecOutputBuilder);

export class IOBuilder {
  inputs: InputBuilder[] = [];
  outputs: OutputBuilder[] = [];

  addDataInput(args: DataInputBuilder) {
    this.inputs.push({ ...args, variant: "Data" });
  }

  addDataOutput(args: DataOutputBuilder) {
    this.outputs.push({ ...args, variant: "Data" });
  }

  addExecInput(args: ExecInputBuilder) {
    this.inputs.push({ ...args, variant: "Exec" });
  }

  addExecOutput(args: ExecOutputBuilder) {
    this.outputs.push({ ...args, variant: "Exec" });
  }
}

export interface NodeSchema<TState extends object = {}> {
  name: string;
  variant: NodeSchemaVariant;
  generate: (builder: IOBuilder, state: TState) => void;
}
