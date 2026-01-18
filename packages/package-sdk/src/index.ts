/** biome-ignore-all lint/complexity/noBannedTypes: {} is used by effect and it's fine */

import { type Rpc, type RpcClient, RpcGroup } from "@effect/rpc";
import {
	Context,
	Data as D,
	Effect,
	Layer,
	type Option,
	type Schema as S,
} from "effect";
import type { YieldWrap } from "effect/Utils";
import * as T from "@macrograph/typesystem";

export class ExecInput extends D.TaggedClass("ExecInput")<{ id: string }> {}
export class ExecOutput extends D.TaggedClass("ExecOutput")<{ id: string }> {}

export class DataInput<T extends T.Type_<any>> extends D.TaggedClass(
	"DataInput",
)<{ id: string; type: T }> {}

export class DataOutput<T extends T.Type_<any>> extends D.TaggedClass(
	"DataOutput",
)<{ id: string; type: T }> {}

export type EffectGenerator<Eff extends Effect.Effect<any, any, any>> =
	Generator<YieldWrap<Eff>, Effect.Effect.Success<Eff>, never>;

export const t = {
	String: new T.String_(),
	Int: new T.Int_(),
	Bool: new T.Bool_(),
	Float: new T.Float_(),
	DateTime: new T.DateTime_(),
	Option: <T extends T.Type_<any>>(t: T) => new T.Option_({ inner: t }),
	List: <T extends T.Type_<any>>(t: T) => new T.List_({ item: t }),
	// List: <T extends IO.DataType.Any>(t: T) =>
	// 	["L", t] satisfies IO.DataType.List<T>,
	// Map: <K extends IO.DataType.MapKey, V extends IO.DataType.Any>(k: K, v: V) =>
	// 	["M", k, v] satisfies IO.DataType.Map<K, V>,
	// _List: <T extends IO.DataType.Encoded.Any>(t: T) =>
	// 	new IO.DataType._List<T>({ value: t }),
};

export namespace PackageEngine {
	export type Any = PackageEngine<
		any,
		any,
		AnyEvent,
		S.Schema.Any,
		Resource.Tag<any, any>
	>;

	export type LayerCtx<Events extends AnyEvent> = {
		emitEvent(event: S.Schema.Type<Events>): void;
		dirtyState: Effect.Effect<void>;
		credentials: Effect.Effect<
			ReadonlyArray<{
				provider: string;
				id: string;
				displayName: string;
				token: {
					access_token: string;
					refresh_token?: string;
					expires_in: number;
				};
			}>
		>;
		refreshCredential(provider: string, id: string): Effect.Effect<void>;
	};

	export type Built<Engine> =
		Engine extends PackageEngine<
			infer ClientRpcs,
			infer RuntimeRpcs,
			any,
			infer ClientState,
			infer Resources
		>
			? LayerBuilderRet<ClientRpcs, RuntimeRpcs, ClientState, Resources>
			: never;

	export type LayerBuilderRet<
		ClientRpcs extends Rpc.Any,
		RuntimeRpcs extends Rpc.Any,
		ClientState extends S.Schema.Any,
		Resources extends Resource.Tag<any, any>,
	> = {
		clientRpcs: RpcGroup.HandlersFrom<ClientRpcs>;
		runtimeRpcs: RpcGroup.HandlersFrom<RuntimeRpcs>;
		clientState: Effect.Effect<S.Schema.Type<ClientState>>;
		resources: {
			[Id in Resources["id"]]: Effect.Effect<
				ReadonlyArray<Resource.Value<Extract<Resources, { id: Id }>>>
			>;
		};
	};

	export interface PackageEngineObj<
		ClientRpcs extends Rpc.Any,
		RuntimeRpcs extends Rpc.Any,
		Events extends AnyEvent,
		ClientState extends S.Schema.Any,
		Resources extends Resource.Tag<any, any>,
	> {
		clientRpcs: RpcGroup.RpcGroup<ClientRpcs>;
		runtimeRpcs: RpcGroup.RpcGroup<RuntimeRpcs>;
		events: ReadonlyArray<Events>;
		clientState: ClientState;
		resources: ReadonlyArray<Resources>;

		toLayer(
			_: (
				ctx: LayerCtx<Events>,
			) => Effect.Effect<
				LayerBuilderRet<ClientRpcs, RuntimeRpcs, ClientState, Resources>
			>,
		): Layer.Layer<EngineImpl, never, CtxTag>;
	}

	export interface PackageEngine<
		ClientRpcs extends Rpc.Any,
		RuntimeRpcs extends Rpc.Any,
		Events extends AnyEvent,
		ClientState extends S.Schema.Any,
		Resources extends Resource.Tag<any, any>,
	> extends PackageEngineObj<
			ClientRpcs,
			RuntimeRpcs,
			Events,
			ClientState,
			Resources
		> {
		new (_: never): {};
	}

	export class CtxTag extends Context.Tag("CtxTag")<CtxTag, LayerCtx<any>>() {}

	export class EngineImpl extends Context.Tag("EngineImpl")<
		EngineImpl,
		LayerBuilderRet<any, any, any, Resource.Tag<any, any>>
	>() {}

	export const define = <
		ClientRpcs extends Rpc.Any,
		RuntimeRpcs extends Rpc.Any,
		Events extends AnyEvent,
		ClientState extends S.Schema.Any = never,
		Resources extends Resource.Tag<any, any> = never,
	>(opts: {
		clientRpcs?: RpcGroup.RpcGroup<ClientRpcs>;
		runtimeRpcs?: RpcGroup.RpcGroup<RuntimeRpcs>;
		events?: ReadonlyArray<Events>;
		clientState?: ClientState;
		resources?: ReadonlyArray<Resources>;
	}): PackageEngine<
		ClientRpcs,
		RuntimeRpcs,
		Events,
		ClientState,
		Resources
	> => {
		return Object.assign(class {}, {
			clientRpcs: opts.clientRpcs ?? RpcGroup.make(),
			runtimeRpcs: opts.runtimeRpcs ?? RpcGroup.make(),
			events: opts.events ?? [],
			clientState: opts.clientState,
			resources: opts.resources ?? [],
			toLayer: (build) =>
				Layer.unwrapEffect(
					Effect.gen(function* () {
						const built = yield* build(yield* CtxTag);

						return Layer.succeed(EngineImpl, built);
					}),
				),
		} as PackageEngineObj<
			ClientRpcs,
			RuntimeRpcs,
			Events,
			ClientState,
			Resources
		>) as any;
	};

	export type ClientRpcs<Engine> =
		Engine extends PackageEngine<infer ClientRpcs, any, any, any, any>
			? ClientRpcs
			: never;

	export type RuntimeRpcs<Engine> =
		Engine extends PackageEngine<any, infer RuntimeRpcs, any, any, any>
			? RuntimeRpcs
			: never;

	export type RuntimeRpcClient<Engine> = RpcClient.RpcClient<
		RuntimeRpcs<Engine>
	>;

	export type Events<Engine> =
		Engine extends PackageEngine<any, any, infer Events, any, any>
			? S.Schema.Type<Events>
			: never;

	export type AnyEvent = { _tag: string } & S.Any;
}

export namespace Package {
	export interface Package<Engine extends PackageEngine.Any> {
		name: string;
		engine?: Engine;
		/**
		 * @internal
		 */
		schemas: Map<string, Schema.Any<Engine>>;

		addSchema: Schema.MakeFn<Engine, this>;
	}

	export type Any = Package<PackageEngine.Any>;

	export const define = <Engine extends PackageEngine.Any = never>(opts: {
		name: string;
		engine?: Engine;
	}): Package<Engine> => {
		const schemas = new Map<string, Schema.Any>();

		const self: Package<Engine> = {
			...opts,
			schemas,
			addSchema: ((id, schema) => {
				const effectRun: (ctx: any) => Effect.Effect<any, any, any> =
					schema.type === "exec"
						? Effect.fnUntraced(schema.run as any)
						: (ctx) => Effect.sync(() => schema.run(ctx));

				schemas.set(id, {
					id,
					...schema,
					io: (
						ctx: Schema.AnyIOCtx<Engine, NonNullable<typeof schema.properties>>,
					) => {
						const systemIO: Array<ExecInput | ExecOutput> = [];
						if (schema.type === "event") {
							systemIO.push(ctx.out.exec("exec"));
						} else if (schema.type === "exec") {
							systemIO.push(ctx.out.exec("exec"));
							systemIO.push(ctx.in.exec("exec"));
						}

						return [systemIO, schema.io(ctx)];
					},
					run: Effect.fnUntraced(function* (ctx: any) {
						const ret = yield* effectRun({ ...ctx, io: ctx.io[1] });

						if (schema.type === "event" || schema.type === "exec") {
							return ctx.io[0][0];
						}

						return ret;
					}),
				} as any);
				return self;
			}) as Schema.AnyMakeFn<Engine, Package<Engine>>,
		};

		return self;
	};
}

export namespace Resource {
	export interface TagObject<Id extends string, Value> {
		id: Id;
		name_: string;

		toLayer(
			handler: Effect.Effect<ReadonlyArray<{ raw: Value; display: string }>>,
		): Layer.Layer<Handler<Id, Value>>;
	}

	export interface Tag<Id extends string, Value> extends TagObject<Id, Value> {
		new (_: never): {};
	}

	export type Value<Tag extends Resource.Tag<any, any>> =
		Tag extends Resource.Tag<any, infer Value> ? Value : never;

	export interface Handler<Id extends string, Value> {
		id: Id;
		handler: Effect.Effect<{ raw: Value; display: string }>;
	}

	export const Tag =
		<const Id extends string>(id: Id) =>
		<Value extends string = string>(opts: { name: string }): Tag<Id, Value> => {
			return Object.assign(class {}, {
				id,
				name_: opts.name,
				toLayer(handler) {
					Context.unsafeMake(new Map([[id, { id, handler }]]));
					throw new Error("");
				},
			} as TagObject<Id, Value>) as any;
		};
}

export namespace Property {
	export type ResourceSource<Id extends string, Value> = {
		resource: Resource.Tag<Id, Value>;
	};
	export type ValueSource = { type: T.Any_ };
	export type AnySource<Id extends string = any, Value = any> =
		| ResourceSource<Id, Value>
		| ValueSource;

	export type Property<Id extends string, Value> = AnySource<Id, Value> & {
		name: string;
	};

	export type Infer<
		T extends Property<any, any>,
		Engine extends PackageEngine.Any,
	> = T extends Property.ResourceSource<any, infer Value>
		? { engine: PackageEngine.RuntimeRpcClient<Engine>; value: Value }
		: T extends ValueSource
			? T.Infer_<T["type"]>
			: never;
}

export namespace PropertiesSchema {
	export type Any = Record<string, Property.Property<any, any>>;
}

export namespace Schema {
	export interface Metadata<
		Id extends string,
		Properties extends PropertiesSchema.Any,
	> {
		id: Id;
		name: string;
		type: string;
		description?: string;
		properties?: Properties;
	}

	export type SuggestionsCtx<
		Engine extends PackageEngine.Any,
		Properties extends PropertiesSchema.Any,
	> = {
		properties: {
			[K in keyof Properties]: Property.Infer<Properties[K], Engine>;
		};
	};

	export type CreateExecIn = (
		id: string,
		options?: { name?: string },
	) => ExecInput;
	export type CreateDataIn<
		Engine extends PackageEngine.Any,
		Properties extends PropertiesSchema.Any,
	> = <T extends T.Any_>(
		id: string,
		type: T,
		options?: { name?: string } & (T.Infer_<T> extends string
			? {
					suggestions?: (
						ctx: SuggestionsCtx<Engine, Properties>,
					) => Effect.Effect<ReadonlyArray<string>>;
				}
			: {}),
	) => DataInput<T>;

	export type CreateExecOut = (
		id: string,
		options?: { name?: string },
	) => ExecOutput;
	export type CreateDataOut = <T extends T.Any_>(
		id: string,
		type: T,
		options?: { name?: string },
	) => DataOutput<T>;

	export type InferIO<IO> =
		IO extends DataInput<infer T>
			? T.Infer_<T>
			: IO extends DataOutput<infer T>
				? (v: T.Infer_<T>) => void
				: IO extends ExecOutput
					? IO
					: IO extends ExecInput
						? never
						: IO extends Record<string, any>
							? { [K in keyof IO]: InferIO<IO[K]> }
							: IO;

	export type AnyIOCtx<
		Engine extends PackageEngine.Any,
		Properties extends PropertiesSchema.Any,
	> = {
		in: { data: CreateDataIn<Engine, Properties>; exec: CreateExecIn };
		out: { data: CreateDataOut; exec: CreateExecOut };
		properties: IOProperties<Properties, Engine>;
	};

	type IOProperties<
		Properties extends PropertiesSchema.Any,
		Engine extends PackageEngine.Any,
	> = {
		[K in keyof Properties]: Properties[K] extends Property.ValueSource
			? Property.Infer<Properties[K], Engine>
			: never;
	};

	export interface Base<
		Engine extends PackageEngine.Any,
		Id extends string,
		Properties extends PropertiesSchema.Any,
		IO,
	> extends Metadata<Id, Properties> {
		type: "base";
		io: (ctx: {
			in: { data: CreateDataIn<Engine, Properties>; exec: CreateExecIn };
			out: { data: CreateDataOut; exec: CreateExecOut };
			properties: IOProperties<Properties, Engine>;
		}) => IO;
		run: (ctx: {
			io: InferIO<IO>;
			properties: {
				[K in keyof Properties]: Property.Infer<Properties[K], Engine>;
			};
		}) => EffectGenerator<Effect.Effect<void | ExecOutput>>;
	}

	export interface Exec<
		Engine extends PackageEngine.Any,
		Id extends string,
		Properties extends PropertiesSchema.Any,
		IO,
	> extends Metadata<Id, Properties> {
		type: "exec";
		io: (ctx: {
			in: { data: CreateDataIn<Engine, Properties> };
			out: { data: CreateDataOut };
			properties: IOProperties<Properties, Engine>;
		}) => IO;
		run: (ctx: {
			io: InferIO<IO>;
			properties: {
				[K in keyof Properties]: Property.Infer<Properties[K], Engine>;
			};
		}) => EffectGenerator<Effect.Effect<void>>;
	}

	export interface Pure<
		Engine extends PackageEngine.Any,
		Id extends string,
		Properties extends PropertiesSchema.Any,
		IO,
	> extends Metadata<Id, Properties> {
		type: "pure";
		io: (ctx: {
			in: { data: CreateDataIn<Engine, Properties> };
			out: { data: CreateDataOut };
			properties: IOProperties<Properties, Engine>;
		}) => IO;
		run: (ctx: {
			io: InferIO<IO>;
			properties: {
				[K in keyof Properties]: Property.Infer<Properties[K], Engine>;
			};
		}) => void;
	}

	export interface Event<
		Engine extends PackageEngine.Any,
		Id extends string,
		Properties extends PropertiesSchema.Any,
		IO,
		Event extends PackageEngine.Events<Engine>,
	> extends Metadata<Id, Properties> {
		type: "event";
		io: (ctx: { out: { data: CreateDataOut; exec: CreateExecOut } }) => IO;
		event: (
			data: PackageEngine.Events<Engine>,
			ctx: {
				properties: {
					[K in keyof Properties]: Property.Infer<Properties[K], Engine>;
				};
			},
		) => Option.Option<Event>;
		run: (ctx: { io: InferIO<IO>; event: Event }) => void;
	}

	export type Any<
		Engine extends PackageEngine.Any = any,
		Id extends string = string,
		Properties extends PropertiesSchema.Any = PropertiesSchema.Any,
		IO = any,
		E extends PackageEngine.Events<Engine> = PackageEngine.Events<Engine>,
	> =
		| Exec<Engine, Id, Properties, IO>
		| Pure<Engine, Id, Properties, IO>
		| Event<Engine, Id, Properties, IO, E>
		| Base<Engine, Id, Properties, IO>;

	export type AnyMakeFn<Engine extends PackageEngine.Any, Ret> = <
		Id extends string,
		Properties extends PropertiesSchema.Any,
		IO,
		E extends PackageEngine.Events<Engine>,
	>(
		id: Id,
		schema: Omit<Schema.Any<Engine, Id, Properties, IO, E>, "id">,
	) => Ret;

	export interface MakeFn<Engine extends PackageEngine.Any, Ret> {
		<Id extends string, IO, Properties extends PropertiesSchema.Any = never>(
			id: Id,
			schema: Omit<Schema.Exec<Engine, Id, Properties, IO>, "id">,
		): Ret;
		<Id extends string, IO, Properties extends PropertiesSchema.Any = never>(
			id: Id,
			schema: Omit<Schema.Pure<Engine, Id, Properties, IO>, "id">,
		): Ret;
		<
			Id extends string,
			IO,
			Event extends PackageEngine.Events<Engine>,
			Properties extends PropertiesSchema.Any = never,
		>(
			id: Id,
			schema: Omit<Schema.Event<Engine, Id, Properties, IO, Event>, "id">,
		): Ret;
		<Id extends string, IO, Properties extends PropertiesSchema.Any = never>(
			id: Id,
			schema: Omit<Schema.Base<Engine, Id, Properties, IO>, "id">,
		): Ret;
	}
}
