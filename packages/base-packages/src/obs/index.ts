import { Option, pipe, Schema as S } from "effect";
import * as Effect from "effect/Effect";
import {
	getInput,
	Package,
	PackageEngine,
	Resource,
	setOutput,
	t,
} from "@macrograph/package-sdk";
import OBSWebsocket from "obs-websocket-js";

import { Event } from "./event";
import { ConnectionFailed, RPCS } from "./shared";

type OBSWebSocket = {
	name?: string;
	address: string;
	password: Option.Option<string>;
	lock: Effect.Semaphore;
	ws: OBSWebsocket;
	state: "disconnected" | "connecting" | "connected";
};

const OBSWebSocket = Resource.make<OBSWebSocket>()("OBSWebSocket", {
	name: "OBS WebSocket",
	serialize: (instance) => ({
		id: instance.address,
		display: instance.name ?? instance.address,
	}),
});

type State = {
	sockets: Array<{
		address: string;
		password: string | undefined;
		state: any;
	}>;
};

const Engine = PackageEngine.define<State>()({
	rpc: RPCS,
	events: S.Struct({ address: S.String, event: Event.Any }),
	resources: [OBSWebSocket],
}).build((ctx) => {
	const instances = new Map<string, OBSWebSocket>();

	const rpc = RPCS.toLayer({
		AddSocket: Effect.fnUntraced(function* ({ name, address, password }) {
			if (instances.get(address)) return;

			const lock = Effect.unsafeMakeSemaphore(1);

			const withInstanceLock = <A, E, R>(e: Effect.Effect<A, E, R>) =>
				pipe(e, lock.withPermits(1), Effect.ensuring(ctx.dirtyState));

			const instance = yield* Effect.gen(function* () {
				const ws = new OBSWebsocket();

				ws.on("CurrentProgramSceneChanged", (e) => {
					ctx.emitEvent({
						address,
						event: new Event.CurrentProgramSceneChanged(e),
					});
				});

				ws.on("ConnectionError", () =>
					Effect.sync(() => {
						instance.state = "disconnected";
					}).pipe(withInstanceLock, Effect.runFork),
				);

				ws.on("ConnectionClosed", () =>
					Effect.sync(() => {
						instance.state = "disconnected";
					}).pipe(withInstanceLock, Effect.runFork),
				);

				ws.on("ConnectionOpened", () =>
					Effect.sync(() => {
						instance.state = "connected";
					}).pipe(withInstanceLock, Effect.runFork),
				);

				const instance: OBSWebSocket = {
					name: name || address,
					address,
					password: Option.fromNullable(password),
					lock,
					ws,
					state: "connecting",
				};

				instances.set(address, instance);

				return instance;
			}).pipe(withInstanceLock, Effect.ensuring(ctx.dirtyResources));

			yield* Effect.tryPromise({
				try: () => instance.ws.connect(address, password),
				catch: () => new ConnectionFailed(),
			});
		}),
		RemoveSocket: Effect.fnUntraced(function* ({ address }) {
			const instance = instances.get(address);
			if (!instance) return;

			yield* Effect.gen(function* () {
				yield* Effect.promise(() => instance.ws.disconnect()).pipe(
					Effect.ignore,
				);
				instances.delete(address);
			}).pipe(
				instance.lock.withPermits(1),
				Effect.ensuring(ctx.dirtyState),
				Effect.ensuring(ctx.dirtyResources),
			);

			yield* ctx.dirtyState;
		}),
		DisconnectSocket: Effect.fnUntraced(function* ({ address: url }) {
			const instance = instances.get(url);
			if (!instance) return;

			yield* Effect.promise(() => instance.ws.disconnect()).pipe(Effect.ignore);
		}),
		ConnectSocket: Effect.fnUntraced(function* ({ address: url, password }) {
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
		rpc,
		state: Effect.gen(function* () {
			return {
				sockets: yield* Effect.all(
					[...instances.entries()].map(([address, instance]) =>
						Effect.sync(() => {
							return {
								name: instance.name,
								address,
								password: Option.getOrUndefined(instance.password),
								state: instance.state,
							};
						}).pipe(instance.lock.withPermits(1)),
					),
				),
			};
		}),
		resources: OBSWebSocket.toLayer(Effect.sync(() => [...instances.values()])),
	};
});

const OBSConnectionProperty = {
	name: "OBS Socket",
	resource: OBSWebSocket,
};

export default Package.make({
	name: "OBS Studio",
	engine: Engine,
	builder: (ctx) => {
		ctx.schema("request.SetCurrentProgramScene", {
			name: "Set Current Program Scene",
			type: "exec",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				scene: c.in.data("scene", t.String, { name: "Scene Name" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const sceneName = yield* getInput(io.scene);

				yield* Effect.promise(() =>
					connection.ws.call("SetCurrentProgramScene", { sceneName }),
				);
			},
		});

		ctx.schema("event.CurrentProgramSceneChanged", {
			name: "Current Program Scene Changed",
			type: "event",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "CurrentProgramSceneChanged") return e.event;
			},
			io: (c) => ({
				scene: c.out.data("scene", t.String, { name: "Scene Name" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.scene, event.sceneName);
			},
		});
	},
});
