import { createMutable } from "solid-js/store";
import { ReactiveSet } from "@solid-primitives/set";
import { Node } from "./Node";
import { t } from "../types";
import { DataOutputBuilder, ScopeRef } from "./NodeSchema";

export type DataInputArgs = {
  variant: "Data";
  id: string;
  name?: string;
  type: t.Any;
  defaultValue?: any;
  connection?: Connection | null;
  node: Node;
};

export class DataInput {
  id: string;
  name?: string;
  defaultValue: any = null;
  type: t.Any;
  node: Node;
  connection: DataOutput | null = null;

  constructor(args: DataInputArgs) {
    this.id = args.id;
    this.name = args.name;
    this.defaultValue = args.defaultValue || args.type.default();
    this.node = args.node;
    this.type = args.type;

    return createMutable(this);
  }

  setDefaultValue(value: any) {
    this.defaultValue = value;

    this.node.graph.project.save();
  }

  get connected() {
    return this.connection !== null;
  }

  get variant() {
    return "Data";
  }
}

export interface DataOutputArgs {
  node: Node;
  id: string;
  name?: string;
  type: t.Any;
}

export class DataOutput {
  id: string;
  connections = new ReactiveSet<DataInput>();
  node: Node;
  name?: string;
  type: t.Any;

  constructor(args: DataOutputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;
    this.type = args.type;

    return createMutable(this);
  }

  get variant() {
    return "Data";
  }
}

export interface ExecInputArgs {
  node: Node;
  variant: "Exec";
  id: string;
  name?: string;
  connection?: Connection | null;
}

export class ExecInput {
  id: string;
  connection: ExecOutput | null = null;
  public node: Node;
  public name?: string;

  constructor(args: ExecInputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

    createMutable(this);
  }

  get connected() {
    return this.connection !== null;
  }

  get variant() {
    return "Exec";
  }
}

export interface ExecOutputArgs {
  node: Node;
  id: string;
  name?: string;
}

export class ExecOutput {
  id: string;
  connection: ExecInput | null = null;
  public node: Node;
  public name?: string;

  constructor(args: ExecOutputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

    createMutable(this);
  }

  get connected() {
    return this.connection !== null;
  }

  get variant() {
    return "Exec";
  }
}

export class ScopeBuilder {
  outputs: DataOutputBuilder[] = [];

  output<T extends DataOutputBuilder>(args: T) {
    this.outputs.push(args);
  }
}

export class Scope {
  outputs: { id: string; name?: string; type: t.Any }[];

  constructor(builder: ScopeBuilder) {
    this.outputs = builder.outputs;
  }
}

export interface ScopeOutputArgs {
  node: Node;
  id: string;
  name?: string;
  scope: Scope;
}

export class ScopeOutput {
  id: string;
  connection: ScopeInput | null = null;
  node: Node;
  name?: string;
  scope: Scope;

  constructor(args: ScopeOutputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;
    this.scope = args.scope;

    return createMutable(this);
  }

  get variant() {
    return "Scope";
  }
}

export interface ScopeInputArgs {
  node: Node;
  id: string;
  name?: string;
  scope: ScopeRef;
}

export class ScopeInput {
  id: string;
  connection: ScopeOutput | null = null;
  node: Node;
  name?: string;
  scope: ScopeRef;

  constructor(args: ScopeInputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;
    this.scope = args.scope;

    return createMutable(this);
  }

  get variant() {
    return "Scope";
  }
}

export type ExecPin = ExecInput | ExecOutput;
export type DataPin = DataInput | DataOutput;
export type ScopePin = ScopeInput | ScopeOutput;
export type Pin = ExecPin | DataPin | ScopePin;

export interface Connection {
  node: number;
  io: string;
}
