import { Data, Option, Schema } from "effect";
import * as Effect from "effect/Effect";
import OBSWebsocket, {
	type OBSRequestTypes,
	type OBSResponseTypes,
} from "obs-websocket-js";
import { getInput, Package, PackageEngine } from "@macrograph/package-sdk";

import { ConnectionFailed, RPCS } from "./shared";

class OBSWebSocketError extends Data.TaggedError("OBSWebsocketError")<{
	code: number;
	message: string;
}> {}

const Engine = PackageEngine.make<
	{
		connections: Array<{
			address: string;
			password: string | undefined;
			state: any;
		}>;
	},
	typeof RPCS
>({ rpc: RPCS })(
	Effect.fn(function* (ctx) {
		type WsRequestProxy = {
			[K in keyof OBSRequestTypes]: (
				args: OBSRequestTypes[K] extends never ? void : OBSRequestTypes[K],
			) => Effect.Effect<OBSResponseTypes[K], OBSWebSocketError>;
		};

		type Instance = {
			password: Option.Option<string>;
			lock: Effect.Semaphore;
			ws: OBSWebsocket;
			state: "disconnected" | "connecting" | "connected";
		};

		const instances = new Map<string, Instance>();

		const layer = RPCS.toLayer({
			AddSocket: Effect.fn(function* ({ address, password }) {
				if (instances.get(address)) return;

				const lock = Effect.unsafeMakeSemaphore(1);

				const instance = yield* Effect.gen(function* () {
					const ws = new OBSWebsocket();

					ws.on("ConnectionError", () =>
						Effect.gen(function* () {
							instance.state = "disconnected";
						}).pipe(
							lock.withPermits(1),
							Effect.ensuring(ctx.dirtyState),
							Effect.runFork,
						),
					);

					ws.on("ConnectionClosed", () =>
						Effect.gen(function* () {
							instance.state = "disconnected";
						}).pipe(
							lock.withPermits(1),
							Effect.ensuring(ctx.dirtyState),
							Effect.runFork,
						),
					);

					ws.on("ConnectionOpened", () =>
						Effect.gen(function* () {
							instance.state = "connected";
						}).pipe(
							lock.withPermits(1),
							Effect.ensuring(ctx.dirtyState),
							Effect.runFork,
						),
					);

					const instance: Instance = {
						password: Option.fromNullable(password),
						lock,
						ws,
						state: "connecting",
					};

					instances.set(address, instance);

					return instance;
				}).pipe(lock.withPermits(1), Effect.ensuring(ctx.dirtyState));

				yield* Effect.tryPromise({
					try: () => instance.ws.connect(address, password),
					catch: () => new ConnectionFailed(),
				});
			}),
			RemoveSocket: Effect.fn(function* ({ address }) {
				const instance = instances.get(address);
				yield* ctx.dirtyState;
				if (!instance) return;

				yield* Effect.gen(function* () {
					yield* Effect.promise(() => instance.ws.disconnect()).pipe(
						Effect.ignore,
					);
					instances.delete(address);
				}).pipe(instance.lock.withPermits(1));

				yield* ctx.dirtyState;
			}),
			DisconnectSocket: Effect.fn(function* ({ address }) {
				const instance = instances.get(address);
				if (!instance) return;

				yield* Effect.promise(() => instance.ws.disconnect()).pipe(
					Effect.ignore,
				);
			}),
			ConnectSocket: Effect.fn(function* ({ address, password }) {
				const instance = instances.get(address);
				if (!instance) return;

				yield* Effect.gen(function* () {
					yield* Effect.tryPromise({
						try: () => instance.ws.connect(address, password),
						catch: () => new ConnectionFailed(),
					});

					instance.state = "connecting";
				}).pipe(instance.lock.withPermits(1));
				yield* ctx.dirtyState;
			}),
		});

		return {
			rpc: layer,
			state: Effect.gen(function* () {
				return {
					connections: yield* Effect.all(
						[...instances.entries()].map(([address, instance]) =>
							Effect.gen(function* () {
								return {
									address,
									password: Option.getOrUndefined(instance.password),
									state: instance.state,
								};
							}).pipe(instance.lock.withPermits(1)),
						),
					),
				};
			}),
		};
	}),
);

export default Package.make({
	engine: Engine,
	builder: (ctx) => {
		ctx.schema("setCurrentProgramScene", {
			name: "Set Current Program Scene",
			type: "exec",
			io: (c) => ({
				execIn: c.in.exec("exec"),
				execOut: c.out.exec("exec"),
				scene: c.in.data("scene", Schema.String),
			}),
			run: function* (io) {
				const sceneName = yield* getInput(io.scene);

				// yield* Effect.tryPromise(() =>
				//   obs.call("SetCurrentProgramScene", { sceneName }),
				// ).pipe(Effect.catchTag("UnknownException", () => Effect.succeed(null)));
			},
		});
	},
});
