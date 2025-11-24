import { Context, Data, type Effect, Schema as S } from "effect";
import type { NoSuchElementException } from "effect/Cause";

import type { DataInputRef, DataOutputRef } from "./IO";
import type { Graph, Package, Schema } from "./updated/index.ts";
import type * as Node from "./updated/Node.ts";

export class NotComputationNode extends Data.TaggedError(
	"@macrograph/project-domain/NotComputationNode",
) {}

export class NotEventNode extends Data.TaggedError(
	"@macrograph/project-domain/NotEventNode",
) {}

export class SchemaNotFound extends S.TaggedError<SchemaNotFound>()(
	"@macrograph/project-domain/SchemaNotFound",
	{
		pkgId: S.String,
		schemaId: S.String,
	},
) {}

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
	NotComputationNode,
	RunFunctionAvailableRequirements
>;

export class Logger extends Context.Tag("Logger")<
	Logger,
	{ print: (value: string) => Effect.Effect<void> }
>() {}

export type RunFunctionAvailableRequirements =
	// | Logger
	ExecutionContext | NodeExecutionContext;

export class ExecutionContext extends Context.Tag("ExecutionContext")<
	ExecutionContext,
	{
		traceId: string;
		// getProperty<T>(property: SchemaProperty<T>): Effect.Effect<T>;
		getInput<T extends S.Schema<any>>(
			input: DataInputRef<T>,
		): Effect.Effect<
			T["Encoded"],
			never,
			NodeExecutionContext | RunFunctionAvailableRequirements
		>;
		setOutput<T extends S.Schema<any>>(
			output: DataOutputRef<T>,
			data: T,
		): Effect.Effect<void, never, NodeExecutionContext>;
		graph: Graph.Graph;
	}
>() {}

// @effect-leakable-service
export class NodeExecutionContext extends Context.Tag("NodeExecutionContext")<
	NodeExecutionContext,
	{ node: { id: Node.Id } }
>() {}
