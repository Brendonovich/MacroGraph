import { createMutable } from "solid-js/store";
import { ReactiveSet } from "@solid-primitives/set";
import { Node } from "./Node";
import {
  t,
  Option,
  None,
  BaseType,
  PrimitiveType,
  BasePrimitiveType,
} from "../types";
import { DataOutputBuilder, ScopeRef } from "./NodeSchema";
import {
  createEffect,
  createRoot,
  getOwner,
  onCleanup,
  runWithOwner,
} from "solid-js";

export type DataInputArgs<T extends BaseType<any>> = {
  id: string;
  name?: string;
  type: T;
  node: Node;
};

export class DataInput<T extends BaseType<any>> {
  id: string;
  name?: string;
  defaultValue: t.infer<PrimitiveType> | null = null;
  type: T;
  node: Node;
  connection: Option<DataOutput<T>> = None;
  dispose: () => void;

  constructor(args: DataInputArgs<T>) {
    this.id = args.id;
    this.name = args.name;
    this.defaultValue =
      args.type instanceof BasePrimitiveType ? args.type.default() : null;
    this.node = args.node;
    this.type = args.type;

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.dispose = dispose;

    const reactiveThis = createMutable(this);

    runWithOwner(owner, () => {
      createEffect(() => {
        const type = this.type;
        if (!(type instanceof t.Wildcard)) return;

        const value = type.wildcard.value();

        if (value.isSome() && value.unwrap() instanceof BasePrimitiveType)
          reactiveThis.defaultValue = value.unwrap().default();
        else reactiveThis.defaultValue = null;
      });
    });

    return reactiveThis;
  }

  setDefaultValue(value: any) {
    this.defaultValue = value;

    this.node.graph.project.save();
  }

  get variant() {
    return "Data";
  }
}

export interface DataOutputArgs<T extends BaseType<any>> {
  node: Node;
  id: string;
  name?: string;
  type: T;
}

export class DataOutput<T extends BaseType> {
  id: string;
  connections = new ReactiveSet<DataInput<BaseType>>();
  node: Node;
  name?: string;
  type: T;

  constructor(args: DataOutputArgs<T>) {
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
  id: string;
  name?: string;
  connection?: Connection | null;
}

export class ExecInput {
  id: string;
  connections = new ReactiveSet<ExecOutput>();
  public node: Node;
  public name?: string;

  constructor(args: ExecInputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

    createMutable(this);
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
  connection: Option<ExecInput> = None;
  public node: Node;
  public name?: string;

  constructor(args: ExecOutputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

    createMutable(this);
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
  connection: Option<ScopeInput> = None;
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
  connection: Option<ScopeOutput> = None;
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
export type DataPin = DataInput<any> | DataOutput<any>;
export type ScopePin = ScopeInput | ScopeOutput;
export type Pin = ExecPin | DataPin | ScopePin;

export interface Connection {
  node: number;
  io: string;
}
