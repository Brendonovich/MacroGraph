import { createMutable } from "solid-js/store";

import {
  AnyType,
  BaseType,
  Maybe,
  None,
  Option,
  PrimitiveType,
  t,
} from "../types";
import { Wildcard } from "../types/wildcard";
import {
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  Scope,
  ScopeBuilder,
  ScopeInput,
  ScopeOutput,
} from "./IO";
import { Package } from "./Package";
import { Node } from "./Node";
import { Graph } from "./Graph";

export type NodeSchemaVariant = "Base" | "Pure" | "Exec" | "Event";

export type DataInputBuilder = {
  id: string;
  name?: string;
  type: AnyType;
};
export type ExecInputBuilder = {
  id: string;
  name?: string;
};

export type ScopeInputBuilder = {
  id: string;
  name?: string;
  scope: ScopeRef;
};

export type InputBuilder =
  | ({ variant: "Data" } & DataInputBuilder)
  | ({ variant: "Exec" } & ExecInputBuilder)
  | ({ variant: "Scope" } & ScopeInputBuilder);

export type DataOutputBuilder = {
  id: string;
  name?: string;
  type: AnyType;
};

export type ExecOutputBuilder = {
  id: string;
  name?: string;
};

export type ScopeOutputBuilder = {
  id: string;
  name?: string;
  scope: (s: ScopeBuilder) => void;
};

export type OutputBuilder =
  | ({
      variant: "Data";
    } & DataOutputBuilder)
  | ({
      variant: "Exec";
    } & ExecOutputBuilder)
  | ({
      variant: "Scope";
    } & ScopeOutputBuilder);

export class ScopeRef {
  value: Option<Scope> = None;

  constructor() {
    return createMutable(this);
  }
}

export class IOBuilder {
  inputs: (DataInput<any> | ExecInput | ScopeInput)[] = [];
  outputs: (DataOutput<any> | ExecOutput | ScopeOutput)[] = [];

  wildcards = new Map<string, Wildcard>();
  scopes = new Map<string, ScopeRef>();

  constructor(public node: Node, public previous?: IOBuilder) {}

  wildcard(id: string) {
    const wildcard = Maybe(this.previous?.wildcards.get(id)).unwrapOrElse(
      () => new Wildcard(id)
    );

    this.wildcards.set(id, wildcard);

    return wildcard;
  }

  scope(id: string) {
    const scope = Maybe(this.previous?.scopes.get(id)).unwrapOrElse(
      () => new ScopeRef()
    );

    this.scopes.set(id, scope);

    return scope;
  }

  dataInput<T extends DataInputBuilder>(args: T) {
    const newInput = Maybe(
      this.previous?.inputs.find(
        (i): i is DataInput<T["type"]> =>
          i.id === args.id && i instanceof DataInput && args.type.eq(i.type)
      )
    ).unwrapOrElse(() => new DataInput({ ...args, node: this.node }));

    this.inputs.push(newInput);

    return newInput;
  }

  dataOutput<T extends DataOutputBuilder>(args: T) {
    const newOutput = Maybe(
      this.previous?.outputs.find(
        (o): o is DataOutput<T["type"]> =>
          o.id === args.id && o instanceof DataOutput && args.type.eq(o.type)
      )
    ).unwrapOrElse(() => new DataOutput({ ...args, node: this.node }));

    this.outputs.push(newOutput);

    return newOutput;
  }

  execInput<T extends ExecInputBuilder>(args: T) {
    const newInput = Maybe(
      this.previous?.inputs.find(
        (i): i is ExecInput => i.id === args.id && i instanceof ExecInput
      )
    ).unwrapOrElse(() => new ExecInput({ ...args, node: this.node }));

    this.inputs.push(newInput);

    return newInput;
  }

  execOutput<T extends ExecOutputBuilder>(args: T) {
    const newOutput = Maybe(
      this.previous?.outputs.find(
        (o): o is ExecOutput => o.id === args.id && o instanceof ExecOutput
      )
    ).unwrapOrElse(() => new ExecOutput({ ...args, node: this.node }));

    this.outputs.push(newOutput);

    return newOutput;
  }

  scopeInput<T extends ScopeInputBuilder>(args: T) {
    const newInput = Maybe(
      this.previous?.inputs.find(
        (i): i is ScopeInput => i.id === args.id && i instanceof ScopeInput
      )
    ).unwrapOrElse(() => new ScopeInput({ ...args, node: this.node }));

    this.inputs.push(newInput);

    return newInput;
  }

  scopeOutput<T extends ScopeOutputBuilder>(args: T) {
    const newOutput = Maybe(
      this.previous?.outputs.find(
        (o): o is ScopeOutput => o.id === args.id && o instanceof ScopeOutput
      )
    ).unwrapOrElse(() => {
      const builder = new ScopeBuilder();
      args.scope(builder);

      return new ScopeOutput({
        ...args,
        scope: new Scope(builder),
        node: this.node,
      });
    });

    this.outputs.push(newOutput);

    return newOutput;
  }
}

export interface IOSchema {
  inputs?: Record<string, InputBuilder>;
  outputs?: Record<string, OutputBuilder>;
}

export type RunCtx = {
  exec(t: ExecOutput): Promise<void>;
  execScope(t: ScopeOutput, data: Record<string, any>): Promise<void>;
  setOutput<TOutput extends DataOutput<any>>(
    output: TOutput,
    data: t.infer<TOutput["type"]>
  ): void;
  getInput<TInput extends DataInput<BaseType<any>> | ScopeInput>(
    input: TInput
  ): TInput extends DataInput<infer T>
    ? t.infer<T>
    : TInput extends ScopeInput
    ? Record<string, unknown>
    : never;
  getProperty<TProperty extends PropertyDef & { id: string }>(
    property: TProperty
  ): inferPropertyDef<TProperty>;
};

export type EventsMap<T extends string = string> = Record<T, any>;

export type NodeSchema<TEvents extends EventsMap = EventsMap> =
  | NonEventNodeSchema<any, Record<string, PropertyDef>>
  | EventNodeSchema<TEvents, any, any, Record<string, PropertyDef>>;

export type PropertyValue = { id: string | number; display: string };
export type inferPropertyValue<TValue extends PropertyValue> = TValue["id"];

export type PropertySourceFn = (args: { node: Node }) => Array<PropertyValue>;
export type inferPropertySourceFn<TFn extends PropertySourceFn> =
  inferPropertyValue<ReturnType<TFn>[number]>;

export type PropertyDef = { name: string } & (
  | { source: PropertySourceFn }
  | { type: PrimitiveType }
);
export type inferPropertyDef<TProperty extends PropertyDef> =
  TProperty extends { type: PrimitiveType }
    ? t.infer<TProperty["type"]>
    : TProperty extends { source: PropertySourceFn }
    ? inferPropertySourceFn<TProperty["source"]>
    : never;

export type SchemaProperties<TProperties = Record<string, PropertyDef>> = {
  [K in keyof TProperties]: {
    id: K;
  } & TProperties[K];
};

export type GenerateIOCtx = {
  getProperty<TProperty extends PropertyDef & { id: string }>(
    property: TProperty
  ): inferPropertyDef<TProperty>;
};

export type BaseNodeSchema<
  TIO = void,
  TProperties extends Record<string, PropertyDef> = Record<string, PropertyDef>
> = {
  name: string;
  generateIO: (args: {
    io: IOBuilder;
    ctx: GenerateIOCtx;
    properties: SchemaProperties<TProperties>;
  }) => TIO;
  package: Package<EventsMap>;
  properties?: SchemaProperties<TProperties>;
};

type BaseRunArgs<
  TIO = void,
  TProperties extends Record<string, PropertyDef> = Record<string, PropertyDef>
> = {
  ctx: RunCtx;
  io: TIO;
  properties: SchemaProperties<TProperties>;
  graph: Graph;
};

export type NonEventNodeSchema<
  TIO = void,
  TProperties extends Record<string, PropertyDef> = Record<string, PropertyDef>
> = BaseNodeSchema<TIO, TProperties> & {
  variant: Exclude<NodeSchemaVariant, "Event">;
  run: (a: BaseRunArgs<TIO, TProperties>) => void | Promise<void>;
};

export type EventNodeSchema<
  TEvents extends EventsMap = EventsMap,
  TEvent extends keyof TEvents = string,
  TIO = void,
  TProperties extends Record<string, PropertyDef> = Record<string, PropertyDef>
> = BaseNodeSchema<TIO, TProperties> & {
  event: TEvent;
  run: (
    a: BaseRunArgs<TIO, TProperties> & {
      data: TEvents[TEvent];
    }
  ) => void;
};
