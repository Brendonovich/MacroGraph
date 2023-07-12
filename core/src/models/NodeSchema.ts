import { createMutable } from "solid-js/store";
import { AnyType, Maybe, None, Option } from "../types";
import { Wildcard } from "../types/wildcard";
import { Scope, ScopeBuilder } from "./IO";
import { Package } from "./Package";

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
  inputs: InputBuilder[] = [];
  outputs: OutputBuilder[] = [];

  wildcards = new Map<string, Wildcard>();
  scopes = new Map<string, ScopeRef>();

  constructor(public previous?: IOBuilder) {}

  wildcard(id: string) {
    const wildcard = Maybe(this.previous?.wildcards.get(id)).unwrapOrElse(
      () => {
        return new Wildcard(id);
      }
    );

    this.wildcards.set(id, wildcard);

    return wildcard;
  }

  scope(id: string) {
    const scope = Maybe(this.previous?.scopes.get(id)).unwrapOrElse(() => {
      return new ScopeRef();
    });

    this.scopes.set(id, scope);

    return scope;
  }

  dataInput<T extends DataInputBuilder>(args: T) {
    this.inputs.push(
      Maybe(
        this.previous?.inputs.find(
          (i) =>
            i.id === args.id && i.variant === "Data" && args.type.eq(i.type)
        )
      ).unwrapOrElse(() => {
        return { ...args, variant: "Data" };
      })
    );
  }

  dataOutput<T extends DataOutputBuilder>(args: T) {
    this.outputs.push(
      Maybe(
        this.previous?.outputs.find(
          (i) =>
            i.id === args.id && i.variant === "Data" && args.type.eq(i.type)
        )
      ).unwrapOrElse(() => {
        return { ...args, variant: "Data" };
      })
    );
  }

  execInput<T extends ExecInputBuilder>(args: T) {
    this.inputs.push(
      Maybe(
        this.previous?.inputs.find(
          (i) => i.id === args.id && i.variant === "Exec"
        )
      ).unwrapOrElse(() => {
        return { ...args, variant: "Exec" };
      })
    );
  }

  execOutput<T extends ExecOutputBuilder>(args: T) {
    this.outputs.push(
      Maybe(
        this.previous?.outputs.find(
          (o) => o.id === args.id && o.variant === "Exec"
        )
      ).unwrapOrElse(() => {
        return { ...args, variant: "Exec" };
      })
    );
  }

  scopeInput<T extends ScopeInputBuilder>(args: T) {
    this.inputs.push(
      Maybe(
        this.previous?.inputs.find(
          (i) => i.id === args.id && i.variant === "Scope"
        )
      ).unwrapOrElse(() => {
        return { ...args, variant: "Scope" };
      })
    );
  }

  scopeOutput<T extends ScopeOutputBuilder>(args: T) {
    this.outputs.push(
      Maybe(
        this.previous?.outputs.find(
          (o) => o.id === args.id && o.variant === "Scope"
        )
      ).unwrapOrElse(() => {
        return { ...args, variant: "Scope" };
      })
    );
  }
}

export interface IOSchema {
  inputs?: Record<string, InputBuilder>;
  outputs?: Record<string, OutputBuilder>;
}

export type RunCtx = {
  exec(t: string): Promise<void>;
  execScope(t: string, data: Record<string, any>): Promise<void>;
  setOutput<T>(name: string, data: T): void;
  getInput<T>(name: string): T;
};

export type EventsMap = Record<string, any>;

export type NodeSchema<TEvents extends EventsMap = EventsMap> =
  | NonEventNodeSchema
  | EventNodeSchema<TEvents>;

export type NonEventNodeSchema<TState extends object = object> = {
  name: string;
  generateIO: (builder: IOBuilder, state: TState) => void;
  package: Package<EventsMap>;
  variant: Exclude<NodeSchemaVariant, "Event">;
  run: (a: { ctx: RunCtx; io: IOBuilder }) => void | Promise<void>;
};

export type EventNodeSchema<
  TEvents extends EventsMap = EventsMap,
  TEvent extends keyof TEvents = string,
  TState extends object = object
> = {
  name: string;
  generateIO: (builder: IOBuilder, state: TState) => void;
  package: Package<EventsMap>;
  event: TEvent;
  run: (a: { ctx: RunCtx; data: TEvents[TEvent]; io: IOBuilder }) => void;
};
