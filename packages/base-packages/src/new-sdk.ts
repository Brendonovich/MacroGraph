import { type Rpc, type RpcClient, RpcGroup } from "@effect/rpc";
import {
	Context,
	type Effect,
	type Layer,
	type Option,
	type Schema as S,
} from "effect";
import type { EffectGenerator, IO } from "@macrograph/project-domain";

type AnyEvent = { _tag: string } & S.Any;

export namespace PackageEngine {
	export type Any = PackageEngine<any, any, any, any, any>;

	export type LayerCtx<Events extends AnyEvent> = {
		emitEvent(event: S.Schema.Type<Events>): void;
		dirtyState(): void;
	};

	export type LayerBuilderRet<
		Engine extends PackageEngineObj<any, any, any, any, any>,
	> = Engine extends PackageEngineObj<
		infer ClientRpcs,
		infer RuntimeRpcs,
		any,
		infer ClientState,
		infer Resources
	>
		? {
				clientRpcs: RpcGroup.HandlersFrom<ClientRpcs>;
				runtimeRpcs: RpcGroup.HandlersFrom<RuntimeRpcs>;
				clientState: Effect.Effect<S.Schema.Type<ClientState>>;
				resources: {
					[Id in Resources["id"]]: Effect.Effect<
						ReadonlyArray<Resource.Value<Extract<Resources, { id: Id }>>>
					>;
				};
			}
		: never;

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
				LayerBuilderRet<
					PackageEngineObj<
						ClientRpcs,
						RuntimeRpcs,
						Events,
						ClientState,
						Resources
					>
				>
			>,
		): void;
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
		return Object.assign(() => {}, {
			clientRpcs: opts.clientRpcs ?? RpcGroup.make(),
			runtimeRpcs: opts.runtimeRpcs ?? RpcGroup.make(),
			events: opts.events ?? [],
			clientState: opts.clientState,
			resources: opts.resources ?? [],
			toLayer(build) {},
		} as PackageEngineObj<
			ClientRpcs,
			RuntimeRpcs,
			Events,
			ClientState,
			Resources
		>) as any;
	};

	export type ClientRpcs<Engine> = Engine extends PackageEngine<
		infer ClientRpcs,
		any,
		any,
		any,
		any
	>
		? ClientRpcs
		: never;

	export type RuntimeRpcs<Engine> = Engine extends PackageEngine<
		any,
		infer RuntimeRpcs,
		any,
		any,
		any
	>
		? RuntimeRpcs
		: never;

	export type RuntimeRpcClient<Engine> = RpcClient.RpcClient<
		RuntimeRpcs<Engine>
	>;

	export type Events<Engine> = Engine extends PackageEngine<
		any,
		any,
		infer Events,
		any,
		any
	>
		? S.Schema.Type<Events>
		: never;
}

export namespace Package {
	export interface Package<Engine extends PackageEngine.Any> {
		name: string;
		engine: Engine;

		addSchema: MakeSchema<Engine, this>;
	}

	export const define = <Engine extends PackageEngine.Any>(opts: {
		name: string;
		engine: Engine;
	}): Package<Engine> => {
		return opts as any;
	};
}

export interface MakeSchema<Engine extends PackageEngine.Any, Ret> {
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
}

export namespace Resource {
	export interface TagObject<Id extends string, Value> {
		id: Id;
		name: string;

		toLayer(
			handler: Effect.Effect<
				ReadonlyArray<{
					raw: Value;
					display: string;
				}>
			>,
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
			return Object.assign(() => {}, {
				id,
				name: opts.name,
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
	export type ValueSource = {
		type: IO.T.Any_;
	};
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
			? IO.T.Infer_<T["type"]>
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
		description: string;
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
	) => IO.ExecInput;
	export type CreateDataIn<
		Engine extends PackageEngine.Any,
		Properties extends PropertiesSchema.Any,
	> = <T extends IO.T.Any_>(
		id: string,
		type: T,
		options?: {
			name?: string;
		} & (IO.T.Infer_<T> extends string
			? {
					suggestions?: (
						ctx: SuggestionsCtx<Engine, Properties>,
					) => Effect.Effect<ReadonlyArray<string>>;
				}
			: {}),
	) => IO.DataInput<T>;

	export type CreateExecOut = (
		id: string,
		options?: { name?: string },
	) => IO.ExecOutput;
	export type CreateDataOut = <T extends IO.T.Any_>(
		id: string,
		type: T,
		options?: { name?: string },
	) => IO.DataOutput<T>;

	export type InferIO<IO> = IO extends IO.DataInput<infer T>
		? IO.T.Infer_<T>
		: IO extends IO.DataOutput<infer T>
			? (v: IO.T.Infer_<T>) => void
			: IO extends Record<string, any>
				? { [K in keyof IO]: InferIO<IO[K]> }
				: IO;

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
		}) => IO;
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
		Engine extends PackageEngine.Any = never,
		Id extends string = string,
		Properties extends PropertiesSchema.Any = PropertiesSchema.Any,
		IO = any,
		E extends PackageEngine.Events<Engine> = PackageEngine.Events<Engine>,
	> =
		| Exec<Engine, Id, Properties, IO>
		| Pure<Engine, Id, Properties, IO>
		| Event<Engine, Id, Properties, IO, E>;
}
