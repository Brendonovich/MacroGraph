import type { Rpc, RpcGroup } from "@effect/rpc";
import type { CREDENTIAL } from "@macrograph/web-domain";
import { Context, Data, Effect, type Layer, Schema } from "effect";

import type { NodeRuntime } from "./runtime";
import type { NodeSchema, SchemaDefinition } from "./schema";

export namespace PackageEngine {
	type Requirements = PackageEngineContext | NodeRuntime;

	export class PackageEngineContext extends Context.Tag("PackageEngineContext")<
		PackageEngineContext,
		{ packageId: string }
	>() {}

	export type PackageEngine = Effect.Effect<void, never, Requirements>;
}

export class DuplicateSchemaId extends Data.TaggedError("DuplicateSchemaId") {}

export class ForceRetryError extends Data.TaggedError("ForceRetryError") {}

export type PackageBuildReturn<
	TRpcs extends Rpc.Any,
	TState extends Schema.Schema<any>,
> = {
	name: string;
	engine: PackageEngine.PackageEngine;
} & (
	| {
			rpc: {
				group: RpcGroup.RpcGroup<TRpcs>;
				layer: Layer.Layer<Rpc.ToHandler<TRpcs>>;
			};
			state: {
				schema: TState;
				get: Effect.Effect<TState["Encoded"]>;
			};
	  }
	| { rpc?: undefined; state?: undefined }
);

export class CredentialsFetchFailed extends Schema.TaggedError<CredentialsFetchFailed>()(
	"CredentialsFetchFailed",
	{ message: Schema.String },
) {}

export interface PackageContext<TEvents> {
	dirtyState: Effect.Effect<void>;
	credentials: Effect.Effect<
		ReadonlyArray<(typeof CREDENTIAL)["Encoded"]>,
		CredentialsFetchFailed
	>;
	refreshCredential(id: string): Effect.Effect<never, ForceRetryError>;
	emitEvent(event: TEvents): Effect.Effect<void>;
}
export type PackageDefinition<
	TRpcs extends Rpc.Any,
	TState extends Schema.Schema<any>,
	TEvents,
> = (
	pkg: PackageBuilder,
	ctx: PackageContext<TEvents>,
) => Effect.Effect<void | PackageBuildReturn<TRpcs, TState>, DuplicateSchemaId>;

export function definePackage<
	TRpcs extends Rpc.Any,
	TState extends Schema.Schema<any>,
	TEvents,
>(cb: PackageDefinition<TRpcs, TState, TEvents>) {
	return cb;
}

export class PackageBuilder {
	private schemas = new Map<string, NodeSchema<any, any, any>>();

	constructor(
		public readonly id: string,
		public readonly name: string,
	) {}

	schema = <TIO>(id: string, schema: SchemaDefinition<TIO, any, any>) => {
		const self = this;
		// return Effect.gen(function* () {
		//   if (self.schemas.has(id)) return yield* new DuplicateSchemaId();

		self.schemas.set(id, {
			...schema,
			run: Effect.fn(schema.run as any),
		} as NodeSchema<TIO, any, any>);
		// });
	};

	/** @internal */
	toPackage(ret?: PackageBuildReturn<any, any>): Package {
		return new Package(this.id, this.name, this.schemas, ret?.engine);
	}
}

export class Package {
	constructor(
		public readonly id: string,
		public readonly name: string,
		public readonly schemas: Map<string, NodeSchema<any, any, any>>,
		public engine?: PackageEngine.PackageEngine,
	) {}
}
