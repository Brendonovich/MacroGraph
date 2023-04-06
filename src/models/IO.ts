import { Node } from "./Node";
import { Input, Output, Primitive, ValueType } from "~/bindings";
import { createMutable } from "solid-js/store";

export interface DataInputArgs extends Extract<Input, { variant: "Data" }> {
  node: Node;
}

export class DataInput {
  id: string;
  name: string;
  defaultValue?: Primitive;
  type: ValueType;
  node: Node;
  connection: DataOutput | null = null;

  constructor(args: DataInputArgs) {
    this.id = args.id;
    this.name = args.name;
    this.defaultValue = args.defaultValue;
    this.node = args.node;
    this.type = args.type;

    createMutable(this);
  }

  async disconnect(_send = true) {
    this.connection?.connections.splice(
      this.connection.connections.indexOf(this),
      1
    );
    this.connection = null;
  }

  async setDefaultValue(value: Primitive) {
    this.defaultValue = value;
  }

  get connected() {
    return this.connection !== null;
  }

  get variant() {
    return "data" as const;
  }
}

export interface DataOutputArgs extends Extract<Output, { variant: "Data" }> {
  node: Node;
}

export class DataOutput {
  id: string;
  connections: DataInput[] = [];
  node: Node;
  name: string;
  type: ValueType;

  constructor(args: DataOutputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;
    this.type = args.type;

    return createMutable(this);
  }

  async disconnect() {
    this.connections.forEach((c) => (c.connection = null));
    this.connections = [];
  }

  get connected() {
    return this.connections.length > 0;
  }

  get variant() {
    return "data";
  }
}

export interface ExecInputArgs extends Extract<Input, { variant: "Exec" }> {
  node: Node;
}

export class ExecInput {
  id: string;
  connection: ExecOutput | null = null;
  node: Node;
  name: string;

  constructor(args: ExecInputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

    createMutable(this);
  }

  async disconnect(_send = true) {
    if (this.connection) this.connection.connection = null;
    this.connection = null;
  }

  get connected() {
    return this.connection !== null;
  }

  get variant() {
    return "exec";
  }
}

export interface ExecOutputArgs extends Extract<Output, { variant: "Exec" }> {
  node: Node;
}

export class ExecOutput {
  id: string;
  connection: ExecInput | null = null;
  public node: Node;
  public name: string;

  constructor(args: ExecOutputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

    createMutable(this);
  }

  async disconnect(_send = true) {
    if (this.connection) this.connection.connection = null;
    this.connection = null;
  }

  get connected() {
    return this.connection !== null;
  }

  get variant() {
    return "exec";
  }
}

export type ExecPin = ExecInput | ExecOutput;
export type DataPin = DataInput | DataOutput;
export type Pin = ExecPin | DataPin;
