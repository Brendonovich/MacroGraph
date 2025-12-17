import { Context, Data, type Effect, Layer } from "effect";
import type { YieldWrap } from "effect/Utils";

import type { DataInput, DataOutput, ExecInput, ExecOutput } from "./IO";
import type { SchemaRunGeneratorEffect } from "./runtime";
import type { Credential } from "./updated";
import type { T } from "./updated/IO";

export type NodeSchema<
	TIO = any,
	TEvents = any,
	TEvent extends TEvents = any,
	TProperties extends Record<string, SchemaProperty<any>> = Record<
		string,
		SchemaProperty<Resource.Resource<string, any>>
	>,
> =
	| ExecSchema<TIO, TProperties>
	| PureSchema<TIO, TProperties>
	| EventSchema<TIO, TProperties, TEvents, TEvent>;

export type EffectGenerator<
	Eff extends Effect.Effect<any, any, any>,
	Ret = void,
> = Generator<YieldWrap<Eff>, Ret, never>;

export type CreateExecIn = (
	id: string,
	options?: { name?: string },
) => ExecInput;
export type CreateDataIn = <T extends T.Any_>(
	id: string,
	type: T,
	options?: { name?: string },
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

export interface IOFunctionContext {
	in: {
		exec: CreateExecIn;
		data: CreateDataIn;
	};
	out: {
		exec: CreateExecOut;
		data: CreateDataOut;
	};
}

export interface SchemaDefinitionBase<
	TProperties extends Record<string, SchemaProperty<any>>,
> {
	type: string;
	name: string;
	description?: string;
	properties?: TProperties;
}

export interface PureSchemaDefinition<
	TIO,
	TProperties extends Record<string, SchemaProperty<any>>,
> extends SchemaDefinitionBase<TProperties> {
	type: "pure";
	io: (ctx: {
		in: { data: CreateDataIn };
		out: { data: CreateDataOut };
	}) => TIO;
	run: (ctx: {
		io: TIO;
		properties: TProperties;
	}) => EffectGenerator<SchemaRunGeneratorEffect>;
}

export interface PureSchema<
	TIO,
	TProperties extends Record<string, SchemaProperty<any>>,
> extends Omit<PureSchemaDefinition<TIO, TProperties>, "run"> {
	run: ReturnType<
		PureSchemaDefinition<TIO, TProperties>["run"]
	> extends EffectGenerator<infer TEff>
		? (
				...args: Parameters<PureSchemaDefinition<TIO, TProperties>["run"]>
			) => TEff
		: never;
}

export interface ExecSchemaDefinition<
	TIO,
	TProperties extends Record<string, SchemaProperty<any>>,
> extends SchemaDefinitionBase<TProperties> {
	type: "exec";
	io: (ctx: {
		in: { data: CreateDataIn };
		out: { data: CreateDataOut };
	}) => TIO;
	run: (ctx: {
		io: TIO;
		properties: {
			[K in keyof TProperties]: TProperties[K] extends SchemaProperty<
				Resource.Resource<any, infer T>
			>
				? T
				: never;
		};
	}) => EffectGenerator<SchemaRunGeneratorEffect, void>;
}

export interface ExecSchema<
	TIO,
	TProperties extends Record<string, SchemaProperty<any>>,
> extends Omit<ExecSchemaDefinition<TIO, TProperties>, "run"> {
	run: ReturnType<
		ExecSchemaDefinition<TIO, TProperties>["run"]
	> extends EffectGenerator<infer TEff, any>
		? (
				...args: Parameters<ExecSchemaDefinition<TIO, TProperties>["run"]>
			) => TEff
		: never;
}

type EventFnCtx<TProperties extends Record<string, SchemaProperty<any>>> = {
	properties: {
		[K in keyof TProperties]: TProperties[K] extends SchemaProperty<
			Resource.Resource<any, infer T>
		>
			? T
			: never;
	};
};

export interface EventSchemaDefinition<
	TIO,
	TProperties extends Record<string, SchemaProperty<any>>,
	TEvents = any,
	TEvent = any,
> extends SchemaDefinitionBase<TProperties> {
	type: "event";
	event: (ctx: EventFnCtx<TProperties>, e: TEvents) => TEvent | undefined;
	io: (ctx: { out: { data: CreateDataOut } }) => TIO;
	run: (
		ctx: {
			io: TIO;
			properties: TProperties;
		},
		data: TEvent,
	) => EffectGenerator<SchemaRunGeneratorEffect, void>;
}

export interface EventSchema<
	TIO,
	TProperties extends Record<string, SchemaProperty<any>>,
	TEvents = never,
	TEvent extends TEvents = never,
> extends Omit<
		EventSchemaDefinition<TIO, TProperties, TEvents, TEvent>,
		"run"
	> {
	run: ReturnType<
		EventSchemaDefinition<TIO, TProperties, TEvents, TEvent>["run"]
	> extends EffectGenerator<infer TEff, any>
		? (
				...args: Parameters<
					EventSchemaDefinition<TIO, TProperties, TEvents, TEvent>["run"]
				>
			) => TEff
		: never;
}

export type SchemaProperty<TResource extends Resource.Resource<any, any>> = {
	name: string;
	resource: TResource;
};

export type SchemaDefinition<
	TIO = any,
	TProperties extends Record<string, SchemaProperty<any>> = Record<
		string,
		never
	>,
	TEvents = never,
	TEvent = never,
> =
	| ExecSchemaDefinition<TIO, TProperties>
	| PureSchemaDefinition<TIO, TProperties>
	| EventSchemaDefinition<TIO, TProperties, TEvents, TEvent>;

import type { ResourceValue } from "./updated/Resource";

export namespace Resource {
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

	export type ToHandler<T> = T extends Resource.Resource<
		infer TId,
		infer TValue
	>
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
