import { Effect, type Layer, type Schema, type Scope } from "effect";
import type { CREDENTIAL } from "@macrograph/web-api";
import {
	type CredentialsFetchFailed,
	type DataInputRef,
	type DataOutputRef,
	ExecutionContext,
	type ForceRetryError,
	type SchemaDefinition,
} from "@macrograph/domain";
import type { Rpc, RpcGroup } from "@effect/rpc";

export const getInput = <T extends Schema.Schema<any>>(ref: DataInputRef<T>) =>
	Effect.flatMap(ExecutionContext, (ctx) => ctx.getInput(ref));

export const setOutput = <T extends Schema.Schema<any>>(
	ref: DataOutputRef<T>,
	data: T["Type"],
) => Effect.flatMap(ExecutionContext, (ctx) => ctx.setOutput(ref, data));

export namespace PackageEngine {
	export const make =
		<TState = never, TRpcs extends RpcGroup.RpcGroup<any> = never>(props?: {
			rpc?: TRpcs;
		}) =>
		<TEvents>(
			builder: PackageEngineBuilder<TEvents, TState, RpcGroup.Rpcs<TRpcs>>,
		) =>
			new PackageEngine(builder, props?.rpc);

	export type PackageEngineBuilder<
		TEvents,
		TState = never,
		TRpcs extends Rpc.Any = never,
	> = (ctx: {
		credentials: Effect.Effect<
			ReadonlyArray<(typeof CREDENTIAL)["Encoded"]>,
			CredentialsFetchFailed
		>;
		emitEvent(event: TEvents): void;
		refreshCredential(id: string): Effect.Effect<never, ForceRetryError>;
		dirtyState: Effect.Effect<void>;
	}) => Effect.Effect<
		([TState] extends [never]
			? { state?: undefined }
			: { state: Effect.Effect<TState> }) &
			([TRpcs] extends [never]
				? { rpc?: undefined }
				: { rpc: Layer.Layer<Rpc.ToHandler<TRpcs>> }),
		never,
		Scope.Scope
	>;

	export class PackageEngine<
		TEvents,
		TState = never,
		TRpcs extends Rpc.Any = never,
	> {
		constructor(
			public builder: PackageEngineBuilder<TEvents, TState, TRpcs>,
			public rpcs?: RpcGroup.RpcGroup<TRpcs>,
		) {}
	}
}

export namespace Package {
	export const make = <
		TEvents = never,
		TState = never,
		TRpcs extends Rpc.Any = never,
	>(args: {
		engine?: PackageEngine.PackageEngine<TEvents, TState, TRpcs>;
		builder: PackageBuildFn<TEvents>;
	}): UnbuiltPackage<TEvents, TState, TRpcs> => {
		return {
			engine: args.engine,
			builder: args.builder,
		};
	};

	export type PackageBuildFn<TEvents> = (ctx: {
		schema: <TIO, TEvent extends TEvents>(
			id: string,
			schema: SchemaDefinition<TIO, TEvents, TEvent>,
		) => void;
	}) => void;

	export interface UnbuiltPackage<
		TEvents,
		TState = never,
		TRpcs extends Rpc.Any = never,
	> {
		engine?: PackageEngine.PackageEngine<TEvents, TState, TRpcs>;
		builder: PackageBuildFn<TEvents>;
	}
}
