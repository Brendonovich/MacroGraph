import { Data, Effect, Option, Schema } from "effect";
import { YieldWrap } from "effect/Utils";
import { DataInputRef, DataOutputRef, ExecInputRef, ExecOutputRef } from "./io";
import { SchemaRunGeneratorEffect } from "./runtime";

export type NodeSchema<
  TIO = any,
  TEvents = never,
  TEvent extends TEvents = never,
> = ExecSchema<TIO> | PureSchema<TIO> | EventSchema<TIO, TEvents, TEvent>;

export type EffectGenerator<
  Eff extends Effect.Effect<any, any, any>,
  Ret = void,
> = Generator<YieldWrap<Eff>, Ret, never>;

export interface IOFunctionContext {
  in: {
    exec: (id: string) => ExecInputRef;
    data: <T extends Schema.Any>(id: string, type: T) => DataInputRef<T>;
  };
  out: {
    exec: (id: string) => ExecOutputRef;
    data: <T extends Schema.Any>(id: string, type: T) => DataOutputRef<T>;
  };
}

export interface SchemaDefinitionBase {
  type: string;
  name?: string;
}

export interface PureSchemaDefinition<TIO = any> extends SchemaDefinitionBase {
  type: "pure";
  io: (ctx: {
    in: Extract<IOFunctionContext["in"], { data: any }>;
    out: Extract<IOFunctionContext["out"], { data: any }>;
  }) => TIO;
  run: (io: TIO) => EffectGenerator<SchemaRunGeneratorEffect>;
}

export interface PureSchema<TIO = any>
  extends Omit<PureSchemaDefinition<TIO>, "run"> {
  run: ReturnType<PureSchemaDefinition<TIO>["run"]> extends EffectGenerator<
    infer TEff
  >
    ? (...args: Parameters<PureSchemaDefinition<TIO>["run"]>) => TEff
    : never;
}

export interface ExecSchemaDefinition<TIO = any> extends SchemaDefinitionBase {
  type: "exec";
  io: (ctx: IOFunctionContext) => TIO;
  run: (
    io: TIO,
  ) => EffectGenerator<SchemaRunGeneratorEffect, ExecOutputRef | void>;
}

export interface ExecSchema<TIO = any>
  extends Omit<ExecSchemaDefinition<TIO>, "run"> {
  run: ReturnType<ExecSchemaDefinition<TIO>["run"]> extends EffectGenerator<
    infer TEff
  >
    ? (...args: Parameters<ExecSchemaDefinition<TIO>["run"]>) => TEff
    : never;
}

export interface EventSchemaDefinition<
  TIO = any,
  TEvents = never,
  TEvent extends TEvents = never,
> extends SchemaDefinitionBase {
  type: "event";
  event: (e: TEvents) => Option.Option<TEvent>;
  io: (ctx: Omit<IOFunctionContext, "in">) => TIO;
  run: (
    io: TIO,
    data: TEvent,
  ) => EffectGenerator<SchemaRunGeneratorEffect, ExecOutputRef>;
}

export interface EventSchema<
  TIO = any,
  TEvents = never,
  TEvent extends TEvents = never,
> extends Omit<EventSchemaDefinition<TIO, TEvents, TEvent>, "run"> {
  run: ReturnType<
    EventSchemaDefinition<TIO, TEvents, TEvent>["run"]
  > extends EffectGenerator<infer TEff, any>
    ? (
        ...args: Parameters<EventSchemaDefinition<TIO, TEvents, TEvent>["run"]>
      ) => TEff
    : never;
}

export type SchemaDefinition<
  TIO = any,
  TEvents = never,
  TEvent extends TEvents = never,
> =
  | ExecSchemaDefinition<TIO>
  | PureSchemaDefinition<TIO>
  | EventSchemaDefinition<TIO, TEvents, TEvent>;
