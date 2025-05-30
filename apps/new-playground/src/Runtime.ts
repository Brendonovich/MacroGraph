import { Context, Effect, Schema } from "effect";
import { NoSuchElementException } from "effect/Cause";

import { NotComputationNode } from "./errors";
import { DataInputRef, DataOutputRef } from "./io";
import { Node } from "./domain/Node/data";

export class NodeRuntime extends Context.Tag("NodeRuntime")<
  NodeRuntime,
  {
    emitEvent: (
      packageId: string,
      eventId: string,
      data?: any,
    ) => Effect.Effect<void, NoSuchElementException>;
  }
>() {}

export type SchemaRunGeneratorEffect = Effect.Effect<
  any,
  NoSuchElementException | NotComputationNode,
  RunFunctionAvailableRequirements
>;

export class Logger extends Context.Tag("Logger")<
  Logger,
  { print: (value: string) => Effect.Effect<void> }
>() {}

export type RunFunctionAvailableRequirements =
  | Logger
  | ExecutionContext
  | NodeExecutionContext;

export class ExecutionContext extends Context.Tag("ExecutionContext")<
  ExecutionContext,
  {
    traceId: string;
    getInput<T extends Schema.Schema<any>>(
      input: DataInputRef<T>,
    ): Effect.Effect<
      T["Encoded"],
      NoSuchElementException | NotComputationNode,
      NodeExecutionContext | RunFunctionAvailableRequirements
    >;
    setOutput<T extends Schema.Schema<any>>(
      output: DataOutputRef<T>,
      data: T,
    ): Effect.Effect<void, never, NodeExecutionContext>;
  }
>() {}

export class NodeExecutionContext extends Context.Tag("NodeExecutionContext")<
  NodeExecutionContext,
  { node: Node }
>() {}
