import { Context, Data, type Effect, Layer, Schema as S } from "effect";
import type { YieldWrap } from "effect/Utils";

import type * as Credential from "./Credential";
import type * as Graph from "./Graph";
import type * as Node from "./Node";

export class NotComputationNode extends Data.TaggedError(
	"@macrograph/project-domain/NotComputationNode",
) {}

export class NotEventNode extends Data.TaggedError(
	"@macrograph/project-domain/NotEventNode",
) {}

export class SchemaNotFound extends S.TaggedError<SchemaNotFound>()(
	"@macrograph/project-domain/SchemaNotFound",
	{ pkgId: S.String, schemaId: S.String },
) {}

export type SchemaRunGeneratorEffect<Ret = any> = Effect.Effect<
	Ret,
	NotComputationNode,
	RunFunctionAvailableRequirements
>;

export type RunFunctionAvailableRequirements =
	// | Logger
	ExecutionContext | NodeExecutionContext;

Data.TaggedClass;

export class ExecutionContext extends Context.Tag("ExecutionContext")<
	ExecutionContext,
	{
		traceId: string;
		// getProperty<T>(property: SchemaProperty<T>): Effect.Effect<T>;
		graph: Graph.Graph;
	}
>() {}

// @effect-leakable-service
export class NodeExecutionContext extends Context.Tag("NodeExecutionContext")<
	NodeExecutionContext,
	{ node: { id: Node.Id } }
>() {}

export type EffectGenerator<Eff extends Effect.Effect<any, any, any>> =
	Generator<YieldWrap<Eff>, Effect.Effect.Success<Eff>, never>;

export interface SchemaDefinitionBase<TProperties extends PropertiesSchema> {
	type: string;
	name: string;
	description?: string;
	properties?: TProperties;
}

export type PropertiesSchema = Record<string, SchemaProperty<any>>;

export type InferProperties<TProperties extends PropertiesSchema> = {
	[K in keyof TProperties]: TProperties[K] extends SchemaProperty<
		Resource.Resource<any, infer T>
	>
		? T
		: never;
};

export type SchemaProperty<TResource extends Resource.Resource<any, any>> = {
	name: string;
	resource: TResource;
};

export namespace Resource {
	export const ResourceValue = S.Struct({ id: S.String, display: S.String });
	export type ResourceValue = typeof ResourceValue.Type;

	export class Handler<TId extends string, T> extends Data.Class<{
		get: Effect.Effect<Array<T>, Credential.FetchFailed>;
		resource: Resource.Resource<TId, T>;
	}> {}

	export class Resource<TId extends string, T> extends Data.Class<{
		id: TId;
		name: string;
		tag: Context.TagClass<Handler<TId, T>, string, Handler<TId, T>>;
		serialize(value: T): ResourceValue;
	}> {
		toLayer(
			get: Effect.Effect<Array<T>, Credential.FetchFailed>,
		): Layer.Layer<Handler<TId, T>> {
			return Layer.succeed(this.tag, new Handler({ get, resource: this }));
		}
	}

	export type ToHandler<T> =
		T extends Resource.Resource<infer TId, infer TValue>
			? Handler<TId, TValue>
			: never;

	export const make =
		<T>() =>
		<TId extends string>(
			id: TId,
			args: {
				name: string;
				serialize(value: T): { id: string; display: string };
			},
		) => {
			const tag = class Tag extends Context.Tag(`Resource/${id}`)<
				Tag,
				Handler<TId, T>
			>() {};

			return new Resource({ id, tag: tag as any, ...args });
		};
}
