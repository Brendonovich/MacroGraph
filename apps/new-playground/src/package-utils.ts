import { Effect, Schema } from "effect";
import { DataInputRef, DataOutputRef } from "./io";
import { ExecutionContext } from "./runtime";

export const getInput = <T extends Schema.Schema<any>>(ref: DataInputRef<T>) =>
  Effect.andThen(ExecutionContext, (ctx) => ctx.getInput(ref));

export const setOutput = <T extends Schema.Schema<any>>(
  ref: DataOutputRef<T>,
  data: T["Encoded"],
) => Effect.andThen(ExecutionContext, (ctx) => ctx.setOutput(ref, data));
