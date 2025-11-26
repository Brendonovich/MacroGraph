import type { Rpc, RpcGroup } from "@effect/rpc";
import { Data, Effect, type Layer, type Schema, type Scope } from "effect";
import {
	type DataInput,
	type DataOutput,
	ExecutionContext,
	type ForceRetryError,
	type Resource,
	type SchemaDefinition,
	type SchemaProperty,
} from "@macrograph/project-domain";
import { type Credential, IO } from "@macrograph/project-domain/updated";
import type { CREDENTIAL } from "@macrograph/web-domain";

export * as DataTime from "effect/DateTime";
export * as Option from "effect/Option";
export { Resource } from "@macrograph/project-domain";

export const getInput = <T extends IO.T.Any>(ref: DataInput<T>) =>
	Effect.flatMap(ExecutionContext, (ctx) => ctx.getInput(ref));

// export const getProperty = <T extends Resource.Resource<any, any>>(
// 	property: SchemaProperty<T>,
// ) => Effect.flatMap(ExecutionContext, (ctx) => ctx.getProperty(property));

export const setOutput = <T extends IO.T.Any>(
	ref: DataOutput<T>,
	data: IO.T.Infer<T>,
) => Effect.flatMap(ExecutionContext, (ctx) => ctx.setOutput<T>(ref, data));

export namespace PackageEngine {
	export class PackageEngineDefinition<
		TState,
		TEvents,
		TRpcs extends RpcGroup.RpcGroup<any>,
		TResources extends Resource.Resource<any, any>,
	> extends Data.Class<{
		events?: Schema.Schema<TEvents>;
		rpc?: TRpcs;
		resources?: Array<TResources>;
	}> {
		build(builder: BuildEngineFn<TState, TEvents, TRpcs, TResources>) {
			return new PackageEngine({ def: this, builder });
		}
	}

	type BuildEngineCtx<TEvents> = {
		credentials: Effect.Effect<
			ReadonlyArray<(typeof CREDENTIAL)["Encoded"]>,
			Credential.FetchFailed
		>;
		emitEvent(event: TEvents): Effect.Effect<void>;
		refreshCredential(
			providerId: string,
			providerUserId: string,
		): Effect.Effect<never, ForceRetryError>;
		dirtyState: Effect.Effect<void>;
	};

	type BuildEngineFn<
		TState,
		TEvents,
		TRpcs extends RpcGroup.RpcGroup<any>,
		TResources extends Resource.Resource<any, any>,
	> = (ctx: BuildEngineCtx<TEvents>) => BuiltEngine<TState, TRpcs, TResources>;

	export class PackageEngine<TEvents> extends Data.Class<{
		def: PackageEngineDefinition<
			any,
			TEvents,
			RpcGroup.RpcGroup<Rpc.Any>,
			Resource.Resource<any, any>
		>;
		builder: BuildEngineFn<any, TEvents, RpcGroup.RpcGroup<Rpc.Any>, any>;
	}> {}

	export type BuiltEngine<
		TState,
		TRpcs extends RpcGroup.RpcGroup<any>,
		TResources extends Resource.Resource<any, any>,
	> = Schema.Simplify<
		([TRpcs] extends [never]
			? { rpc?: never }
			: { rpc: Layer.Layer<Rpc.ToHandler<RpcGroup.Rpcs<TRpcs>>> }) &
			([TState] extends [never]
				? { state?: never }
				: { state: Effect.Effect<TState, Credential.FetchFailed> }) &
			([TResources] extends [never]
				? { resources?: never }
				: { resources: Layer.Layer<Resource.ToHandler<TResources>> })
	>;

	export const define =
		<TState = never>() =>
		<
			TEvents = never,
			TRpcs extends RpcGroup.RpcGroup<any> = never,
			TResources extends Resource.Resource<any, any> = never,
		>(value?: {
			events?: Schema.Schema<TEvents, any, any>;
			rpc?: TRpcs;
			resources?: Array<TResources>;
		}) =>
			new PackageEngineDefinition<TState, TEvents, TRpcs, TResources>(
				value ?? ({} as any),
			);

	export type PackageEngineBuilder<
		TEvents,
		TState = never,
		TRpcs extends Rpc.Any = never,
		TResources = never,
	> = (ctx: {
		credentials: Effect.Effect<
			ReadonlyArray<(typeof CREDENTIAL)["Encoded"]>,
			Credential.FetchFailed
		>;
		emitEvent(event: TEvents): void;
		refreshCredential(
			providerId: string,
			providerUserId: string,
		): Effect.Effect<never, ForceRetryError>;
		dirtyState: Effect.Effect<void>;
	}) => Effect.Effect<
		([TState] extends [never]
			? { state?: undefined }
			: { state: Effect.Effect<TState> }) &
			([TRpcs] extends [never]
				? { rpc?: undefined }
				: { rpc: Layer.Layer<Rpc.ToHandler<TRpcs>> }) &
			([TResources] extends [never]
				? { resources?: undefined }
				: {
						resources: Layer.Layer<
							TResources extends infer T ? Resource.Handler<any, T> : never
						>;
					}),
		never,
		Scope.Scope
	>;
}

export namespace Package {
	export const make = <TEvents = never>(args: {
		name: string;
		engine?: PackageEngine.PackageEngine<TEvents>;
		builder: PackageBuildFn<TEvents>;
	}): UnbuiltPackage<TEvents> => {
		return {
			name: args.name,
			engine: args.engine,
			builder: args.builder,
		};
	};

	export type PackageBuildFn<TEvents> = (ctx: {
		schema: <
			TIO,
			TProperties extends Record<string, SchemaProperty<any>>,
			TEvent extends TEvents,
		>(
			id: string,
			schema: SchemaDefinition<TIO, TProperties, TEvents, TEvent>,
		) => void;
	}) => void;

	export interface UnbuiltPackage<TEvents> {
		name: string;
		engine?: PackageEngine.PackageEngine<TEvents>;
		builder: PackageBuildFn<TEvents>;
	}
}

export namespace Property {
	export type Resource<TValue> = {
		_tag: "Resource";
		resource: Resource.Resource<any, TValue>;
	};

	export const resource = <TValue>(
		name: string,
		resource: Resource.Resource<any, TValue>,
	) => {};
}

export const t = {
	String: new IO.T.String(),
	Int: new IO.T.Int(),
	Bool: new IO.T.Bool(),
	Float: new IO.T.Float(),
	DateTime: new IO.T.DateTime(),
	Option: <T extends IO.T.Any>(t: T) => new IO.T.Option<T>({ inner: t }),
	List: <T extends IO.T.Any>(t: T) => new IO.T.List<T>({ inner: t }),
	// List: <T extends IO.DataType.Any>(t: T) =>
	// 	["L", t] satisfies IO.DataType.List<T>,
	// Map: <K extends IO.DataType.MapKey, V extends IO.DataType.Any>(k: K, v: V) =>
	// 	["M", k, v] satisfies IO.DataType.Map<K, V>,
	// _List: <T extends IO.DataType.Encoded.Any>(t: T) =>
	// 	new IO.DataType._List<T>({ value: t }),
};
