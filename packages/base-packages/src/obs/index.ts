import { Data, Option, Schema } from "effect";
import * as Effect from "effect/Effect";
import {
	getInput,
	getProperty,
	Package,
	PackageEngine,
	Resource,
} from "@macrograph/package-sdk";
import OBSWebsocket, {
	type OBSRequestTypes,
	type OBSResponseTypes,
} from "obs-websocket-js";

import { ConnectionFailed, RPCS } from "./shared";

class OBSWebSocketError extends Data.TaggedError("OBSWebsocketError")<{
	code: number;
	message: string;
}> {}

type Instance = {
	url: string;
	password: Option.Option<string>;
	lock: Effect.Semaphore;
	ws: OBSWebsocket;
	state: "disconnected" | "connecting" | "connected";
};

const OBSConnection = Resource.make<Instance>({
	name: "OBS Socket",
	serialize: (instance) => ({ id: instance.url, display: instance.url }),
});

const Engine = PackageEngine.make<
	{
		connections: Array<{
			url: string;
			password: string | undefined;
			state: any;
		}>;
	},
	typeof RPCS,
	Instance
>({ rpc: RPCS })(
	Effect.fn(function* (ctx) {
		const instances = new Map<string, Instance>();

		const layer = RPCS.toLayer({
			AddSocket: Effect.fn(function* ({ url, password }) {
				if (instances.get(url)) return;

				const lock = Effect.unsafeMakeSemaphore(1);

				const instance = yield* Effect.gen(function* () {
					const ws = new OBSWebsocket();

					ws.on("ConnectionError", () =>
						Effect.sync(() => {
							instance.state = "disconnected";
						}).pipe(
							lock.withPermits(1),
							Effect.ensuring(ctx.dirtyState),
							Effect.runFork,
						),
					);

					ws.on("ConnectionClosed", () =>
						Effect.sync(() => {
							instance.state = "disconnected";
						}).pipe(
							lock.withPermits(1),
							Effect.ensuring(ctx.dirtyState),
							Effect.runFork,
						),
					);

					ws.on("ConnectionOpened", () =>
						Effect.sync(() => {
							instance.state = "connected";
						}).pipe(
							lock.withPermits(1),
							Effect.ensuring(ctx.dirtyState),
							Effect.runFork,
						),
					);

					const instance: Instance = {
						url,
						password: Option.fromNullable(password),
						lock,
						ws,
						state: "connecting",
					};

					instances.set(url, instance);

					return instance;
				}).pipe(lock.withPermits(1), Effect.ensuring(ctx.dirtyState));

				yield* Effect.tryPromise({
					try: () => instance.ws.connect(url, password),
					catch: () => new ConnectionFailed(),
				});
			}),
			RemoveSocket: Effect.fn(function* ({ url }) {
				const instance = instances.get(url);
				yield* ctx.dirtyState;
				if (!instance) return;

				yield* Effect.gen(function* () {
					yield* Effect.promise(() => instance.ws.disconnect()).pipe(
						Effect.ignore,
					);
					instances.delete(url);
				}).pipe(instance.lock.withPermits(1));

				yield* ctx.dirtyState;
			}),
			DisconnectSocket: Effect.fn(function* ({ url }) {
				const instance = instances.get(url);
				if (!instance) return;

				yield* Effect.promise(() => instance.ws.disconnect()).pipe(
					Effect.ignore,
				);
			}),
			ConnectSocket: Effect.fn(function* ({ url, password }) {
				const instance = instances.get(url);
				if (!instance) return;

				yield* Effect.gen(function* () {
					yield* Effect.tryPromise({
						try: () => instance.ws.connect(url, password),
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
						[...instances.entries()].map(([url, instance]) =>
							Effect.sync(() => {
								return {
									url,
									password: Option.getOrUndefined(instance.password),
									state: instance.state,
								};
							}).pipe(instance.lock.withPermits(1)),
						),
					),
				};
			}),
			resources: OBSConnection.makeHandler(
				Effect.sync(() => [...instances.values()]),
			),
		};
	}),
);

const OBSConnectionProperty = {
	name: "OBS Socket",
	resource: OBSConnection,
};

export default Package.make({
	name: "OBS Studio",
	engine: Engine,
	builder: (ctx) => {
		ctx.schema("setCurrentProgramScene", {
			name: "Set Current Program Scene",
			type: "exec",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				execIn: c.in.exec("exec"),
				execOut: c.out.exec("exec"),
				scene: c.in.data("scene", Schema.String, {
					name: "Scene Name",
				}),
			}),
			run: function* ({ io, properties }) {
				const sceneName = yield* getInput(io.scene);
				const connection = yield* getProperty(properties.connection);

				yield* Effect.tryPromise(() =>
					connection.ws.call("SetCurrentProgramScene", { sceneName }),
				).pipe(Effect.catchTag("UnknownException", () => Effect.succeed(null)));
			},
		});
	},
});
