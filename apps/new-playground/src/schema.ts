import { Data, Effect, Schema } from "effect";
import { NoSuchElementException } from "effect/Cause";
import { YieldWrap } from "effect/Utils";
import { DataInputRef, DataOutputRef, ExecInputRef, ExecOutputRef } from "./io";
import { SchemaRunGeneratorEffect } from "./runtime";
import { EventRef } from "./package";

export { Schema } from "effect";

export type NodeSchema<
  TIO = any,
  TEventData extends Schema.Schema<any> = Schema.Schema<any>,
> = ExecSchema<TIO> | PureSchema<TIO> | EventSchema<TIO, TEventData>;

export type EffectGenerator<
  Eff extends Effect.Effect<any, any, any>,
  Ret = void,
> = Generator<YieldWrap<Eff>, Ret, never>;

class NotComputationNode extends Data.TaggedError("NotComputationNode") {}

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

export type PureSchemaDefinition<TIO = any> = {
  type: "pure";
  io: (ctx: {
    in: Extract<IOFunctionContext["in"], { data: any }>;
    out: Extract<IOFunctionContext["out"], { data: any }>;
  }) => TIO;
  run: (io: TIO) => EffectGenerator<SchemaRunGeneratorEffect>;
};

export type PureSchema<TIO = any> = Omit<PureSchemaDefinition<TIO>, "run"> & {
  run: ReturnType<PureSchemaDefinition<TIO>["run"]> extends EffectGenerator<
    infer TEff
  >
    ? (...args: Parameters<PureSchemaDefinition<TIO>["run"]>) => TEff
    : never;
};

export type ExecSchemaDefinition<TIO = any> = {
  type: "exec";
  io: (ctx: IOFunctionContext) => TIO;
  run: (
    io: TIO,
  ) => EffectGenerator<SchemaRunGeneratorEffect, ExecOutputRef | void>;
};

export type ExecSchema<TIO = any> = Omit<ExecSchemaDefinition<TIO>, "run"> & {
  run: ReturnType<ExecSchemaDefinition<TIO>["run"]> extends EffectGenerator<
    infer TEff
  >
    ? (...args: Parameters<ExecSchemaDefinition<TIO>["run"]>) => TEff
    : never;
};

export type EventSchemaDefinition<
  TIO = any,
  TEventData extends Schema.Schema<any> = Schema.Schema<any>,
> = {
  type: "event";
  event: EventRef<string, TEventData>;
  io: (ctx: Omit<IOFunctionContext, "in">) => TIO;
  run: (
    io: TIO,
    data: TEventData["Encoded"],
  ) => EffectGenerator<SchemaRunGeneratorEffect, ExecOutputRef>;
};

export type EventSchema<
  TIO = any,
  TEventData extends Schema.Schema<any> = Schema.Schema<any>,
> = Omit<EventSchemaDefinition<TIO, TEventData>, "run"> & {
  run: ReturnType<
    EventSchemaDefinition<TIO, TEventData>["run"]
  > extends EffectGenerator<infer TEff, any>
    ? (
        ...args: Parameters<EventSchemaDefinition<TIO, TEventData>["run"]>
      ) => TEff
    : never;
};

export type SchemaDefinition<
  TIO = any,
  TEventData extends Schema.Schema<any> = Schema.Schema<any>,
> =
  | ExecSchemaDefinition<TIO>
  | PureSchemaDefinition<TIO>
  | EventSchemaDefinition<TIO, TEventData>;
