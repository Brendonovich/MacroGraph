import type { Rpc } from "@effect/rpc";
import { Context, Effect, type Layer } from "effect";
import { PackageEngine } from "@macrograph/package-sdk";

export namespace EngineHost {
	export type EngineHost = {
		clientRpcs: Layer.Layer<Rpc.Handler<string>>;
		state: Effect.Effect<any>;
	};

	const tag = Context.GenericTag<EngineHost>("EngineHost");
	export const EngineHost = tag;

	export const makeMemory = Effect.fn(function* (engine: PackageEngine.Any) {
		const impl = yield* PackageEngine.EngineImpl;

		const clientRpcs = engine.clientRpcs.toLayer(impl.clientRpcs);
		const state = impl.clientState;

		return { clientRpcs, state } as EngineHost;
	});
}
