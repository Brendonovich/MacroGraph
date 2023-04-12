import { ValueType } from "~/bindings";
import { ExecOutput } from "./IO";
import { Package } from "./Package";

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

  dataInput<T extends DataInputBuilder>(args: T) {
    this.inputs.push({ ...args, variant: "Data" });
  }

  dataOutput<T extends DataOutputBuilder>(args: T) {
    this.outputs.push({ ...args, variant: "Data" });
  }

  execInput<T extends ExecInputBuilder>(args: T) {
    this.inputs.push({ ...args, variant: "Exec" });
  }

  execOutput<T extends ExecOutputBuilder>(args: T) {
    this.outputs.push({ ...args, variant: "Exec" });
  }
}

export interface IOSchema {
  inputs?: Record<string, InputBuilder>;
  outputs?: Record<string, OutputBuilder>;
}

export type RunCtx = {
  exec(t: string): void;
  setOutput(name: string, data: any): void;
  getInput<T>(name: string): T;
};

export type NodeSchema<
  TEvents extends string = string,
  TState extends object = object
> = {
  name: string;
  generateIO: (builder: IOBuilder, state: TState) => void;
  package: Package<TEvents>;
  variant: NodeSchemaVariant;
  event?: TEvents;
  run: (a: { ctx: RunCtx; data?: any }) => void;
};
