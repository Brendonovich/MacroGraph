import type { Rpc, RpcGroup } from "@effect/rpc";
import { Context, Data, Effect, Layer, type Schema, type Scope } from "effect";
import type { UnknownException } from "effect/Cause";
import {
	type CreateDataIn,
	type CreateDataOut,
	type CreateExecOut,
	type Credential,
	type EffectGenerator,
	ExecutionContext,
	type InferProperties,
	IO,
	type NodeExecutionContext,
	type PropertiesSchema,
	type Resource,
	type RunFunctionAvailableRequirements,
	type SchemaDefinition,
	type SchemaProperty,
	type SchemaRunGeneratorEffect,
} from "@macrograph/project-domain";
import type { CREDENTIAL } from "@macrograph/web-domain";

export * as DataTime from "effect/DateTime";
export * as Option from "effect/Option";
export { Resource } from "@macrograph/project-domain";

export const getInput = <T extends IO.T.Any_>(ref: IO.DataInput<T>) =>
	Effect.flatMap(ExecutionContext, (ctx) =>
		ctx.getInput(ref),
	) satisfies Effect.Effect<any, any, RunFunctionAvailableRequirements>;

// export const getProperty = <T extends Resource.Resource<any, any>>(
// 	property: SchemaProperty<T>,
// ) => Effect.flatMap(ExecutionContext, (ctx) => ctx.getProperty(property));

export const setOutput = <T extends IO.T.Any_>(
	ref: IO.DataOutput<T>,
	data: IO.T.Infer_<T>,
) =>
	Effect.flatMap(ExecutionContext, (ctx) =>
		ctx.setOutput(ref, data),
	) satisfies Effect.Effect<
		any,
		any,
		RunFunctionAvailableRequirements | NodeExecutionContext
	>;

export namespace PackageEngine {
	export class PackageEngineDefinition<
		TState,
		TEvents,
		TRpcs extends RpcGroup.RpcGroup<any>,
		TResources extends Resource.Resource<string, any>,
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
		): Effect.Effect<void, UnknownException>;
		dirtyState: Effect.Effect<void>;
		dirtyResources: Effect.Effect<void>;
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
			Resource.Resource<string, any>
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
		): Effect.Effect<never, UnknownException>;
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
			TEvent,
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

	// export type SchemaImplsFrom<Schema extends NodeSchema.Any> = {
	// 	readonly [Current in Schema as Schema["id"]]: NodeSchema.ToImpl<Current>;
	// };

	export interface PackageBuilder<Schemas extends NodeSchema.Any, Events> {
		schema<Id extends Extract<Schemas, { type: "exec" }>["id"], TIO>(
			id: Id,
			schema: NodeSchema.ExecImpl<Extract<Schemas, { id: Id }>, TIO>,
		): PackageBuilder<Exclude<Schemas, Extract<Schemas, { id: Id }>>, Events>;
		schema<Id extends Extract<Schemas, { type: "event" }>["id"], TIO, Event>(
			id: Id,
			schema: NodeSchema.EventImpl<
				Extract<Schemas, { id: Id }>,
				TIO,
				Events,
				Event
			>,
		): PackageBuilder<Exclude<Schemas, Extract<Schemas, { id: Id }>>, Events>;
	}

	interface PackageDef<
		Schemas extends NodeSchema.Any,
		Engine extends PackageEngine.PackageEngineDefinition<any, any, any, any>,
	> {
		name: string;
		schemas: Schemas[];
		engine?: Engine;
	}

	interface Package<
		Schemas extends NodeSchema.Any,
		Engine extends PackageEngine.PackageEngineDefinition<any, any, any, any>,
	> extends PackageDef<Schemas, Engine> {
		toLayer: (
			build: (
				builder: PackageBuilder<Schemas, Schema.Schema.Type<Engine["events"]>>,
			) => PackageBuilder<never, Schema.Schema.Type<Engine["events"]>>,
		) => Layer.Layer<never>;
	}

	export class Tag extends Context.Tag("@macrograph/package-sdk/Package/Tag")<
		Tag,
		{
			def: PackageDef<any, any>;
			schemas: Map<string, NodeSchema.AnyImpl>;
		}
	>() {}

	export const _make = <
		const Schemas extends NodeSchema.Any,
		const Engine extends PackageEngine.PackageEngineDefinition<
			any,
			any,
			any,
			any
		> = never,
	>(
		def: PackageDef<Schemas, Engine>,
	): Package<Schemas, Engine> => ({
		...def,
		toLayer: (build) =>
			Layer.effect(
				Tag,
				Effect.sync(() => {
					return { def, schemas: new Map() };
				}),
			),
	});
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
	String: new IO.T.String_(),
	Int: new IO.T.Int_(),
	Bool: new IO.T.Bool_(),
	Float: new IO.T.Float_(),
	DateTime: new IO.T.DateTime_(),
	Option: <T extends IO.T.Type_<any>>(t: T) => new IO.T.Option_({ inner: t }),
	List: <T extends IO.T.Type_<any>>(t: T) => new IO.T.List_({ item: t }),
	// List: <T extends IO.DataType.Any>(t: T) =>
	// 	["L", t] satisfies IO.DataType.List<T>,
	// Map: <K extends IO.DataType.MapKey, V extends IO.DataType.Any>(k: K, v: V) =>
	// 	["M", k, v] satisfies IO.DataType.Map<K, V>,
	// _List: <T extends IO.DataType.Encoded.Any>(t: T) =>
	// 	new IO.DataType._List<T>({ value: t }),
};

export namespace NodeSchema {
	export type Schema<
		Id extends string,
		Type extends "exec" | "base" | "pure" | "event",
		Properties extends PropertiesSchema,
	> = {
		id: Id;
		type: Type;
		properties: Properties;
		name: string;
		description: string;
	};

	export type Any = Schema<
		string,
		"exec" | "base" | "pure" | "event",
		PropertiesSchema
	>;

	export const make = <
		const Id extends string,
		const Type extends "exec" | "base" | "pure" | "event",
		const Properties extends PropertiesSchema,
	>(
		id: Id,
		value: Omit<Schema<Id, Type, Properties>, "id">,
	) => Object.assign(value, { id });

	interface ExecIOCtx<S extends Any> {
		in: { data: CreateDataIn<S["properties"]> };
		out: { data: CreateDataOut };
	}

	interface EventIOCtx {
		out: { exec: CreateExecOut; data: CreateDataOut };
	}

	export interface ExecImpl<S extends Any, IO> {
		io: (_: ExecIOCtx<S>) => IO;
		run: (ctx: {
			io: IO;
			properties: InferProperties<S["properties"]>;
		}) => EffectGenerator<SchemaRunGeneratorEffect, void>;
	}

	export interface EventImpl<S extends Any, IO, Events, Event> {
		io: (_: EventIOCtx) => IO;
		event: (
			ctx: { properties: InferProperties<S["properties"]> },
			e: Events,
		) => Event | undefined;
		run: (
			ctx: {
				io: IO;
				properties: InferProperties<S["properties"]>;
			},
			event: Event,
		) => EffectGenerator<SchemaRunGeneratorEffect, void>;
	}

	export type AnyImpl<
		S extends Any = Any,
		IO = any,
		Events = any,
		Event extends Events = any,
	> = ExecImpl<S, IO> | EventImpl<S, IO, Events, Event>;
}
