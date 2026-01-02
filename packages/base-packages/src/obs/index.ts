import { Option, pipe, Schema as S } from "effect";
import * as Effect from "effect/Effect";
import {
	getInput,
	NodeSchema,
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

const EngineDef = PackageEngine.define<State>()({
	rpc: RPCS,
	events: S.Struct({ address: S.String, event: Event.Any }),
	resources: [OBSWebSocket],
});

const Engine = EngineDef.build((ctx) => {
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
					ctx
						.emitEvent({
							address,
							event: new Event.CurrentProgramSceneChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("ExitStarted", () => {
					ctx
						.emitEvent({ address, event: new Event.ExitStarted({}) })
						.pipe(Effect.runFork);
				});

				ws.on("CustomEvent", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.CustomEvent({
								eventData: JSON.stringify(e.eventData),
							}),
						})
						.pipe(Effect.runFork);
				});

				ws.on("CurrentSceneCollectionChanging", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.CurrentSceneCollectionChanging(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("CurrentSceneCollectionChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.CurrentSceneCollectionChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("SceneCollectionListChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.SceneCollectionListChanged({
								sceneCollections: JSON.stringify(e.sceneCollections),
							}),
						})
						.pipe(Effect.runFork);
				});

				ws.on("CurrentProfileChanging", (e) => {
					ctx
						.emitEvent({ address, event: new Event.CurrentProfileChanging(e) })
						.pipe(Effect.runFork);
				});

				ws.on("CurrentProfileChanged", (e) => {
					ctx
						.emitEvent({ address, event: new Event.CurrentProfileChanged(e) })
						.pipe(Effect.runFork);
				});

				ws.on("ProfileListChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.ProfileListChanged({
								profiles: JSON.stringify(e.profiles),
							}),
						})
						.pipe(Effect.runFork);
				});

				ws.on("SourceFilterListReindexed", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.SourceFilterListReindexed({
								sourceName: e.sourceName,
								filters: JSON.stringify(e.filters),
							}),
						})
						.pipe(Effect.runFork);
				});

				ws.on("SourceFilterCreated", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.SourceFilterCreated({
								sourceName: e.sourceName,
								filterName: e.filterName,
								filterKind: e.filterKind,
								filterIndex: e.filterIndex,
								filterSettings: JSON.stringify(e.filterSettings),
							}),
						})
						.pipe(Effect.runFork);
				});

				ws.on("SourceFilterRemoved", (e) => {
					ctx
						.emitEvent({ address, event: new Event.SourceFilterRemoved(e) })
						.pipe(Effect.runFork);
				});

				ws.on("SourceFilterNameChanged", (e) => {
					ctx
						.emitEvent({ address, event: new Event.SourceFilterNameChanged(e) })
						.pipe(Effect.runFork);
				});

				ws.on("SourceFilterSettingsChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.SourceFilterSettingsChanged({
								sourceName: e.sourceName,
								filterName: e.filterName,
								filterSettings: JSON.stringify(e.filterSettings),
							}),
						})
						.pipe(Effect.runFork);
				});

				ws.on("SourceFilterEnableStateChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.SourceFilterEnableStateChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("InputCreated", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.InputCreated({
								inputName: e.inputName,
								inputUuid: e.inputUuid,
								inputKind: e.inputKind,
								inputSettings: JSON.stringify(e.inputSettings),
							}),
						})
						.pipe(Effect.runFork);
				});

				ws.on("InputRemoved", (e) => {
					ctx
						.emitEvent({ address, event: new Event.InputRemoved(e) })
						.pipe(Effect.runFork);
				});

				ws.on("InputNameChanged", (e) => {
					ctx
						.emitEvent({ address, event: new Event.InputNameChanged(e) })
						.pipe(Effect.runFork);
				});

				ws.on("InputSettingsChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.InputSettingsChanged({
								inputName: e.inputName,
								inputUuid: e.inputUuid,
								inputSettings: JSON.stringify(e.inputSettings),
							}),
						})
						.pipe(Effect.runFork);
				});

				ws.on("InputMuteStateChanged", (e) => {
					ctx
						.emitEvent({ address, event: new Event.InputMuteStateChanged(e) })
						.pipe(Effect.runFork);
				});

				ws.on("InputVolumeChanged", (e) => {
					ctx
						.emitEvent({ address, event: new Event.InputVolumeChanged(e) })
						.pipe(Effect.runFork);
				});

				ws.on("InputAudioBalanceChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.InputAudioBalanceChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("InputAudioSyncOffsetChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.InputAudioSyncOffsetChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("InputAudioTracksChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.InputAudioTracksChanged({
								inputName: e.inputName,
								inputUuid: e.inputUuid,
								inputAudioTracks: JSON.stringify(e.inputAudioTracks),
							}),
						})
						.pipe(Effect.runFork);
				});

				ws.on("InputAudioMonitorTypeChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.InputAudioMonitorTypeChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("MediaInputPlaybackStarted", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.MediaInputPlaybackStarted(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("MediaInputPlaybackEnded", (e) => {
					ctx
						.emitEvent({ address, event: new Event.MediaInputPlaybackEnded(e) })
						.pipe(Effect.runFork);
				});

				ws.on("MediaInputActionTriggered", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.MediaInputActionTriggered(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("StreamStateChanged", (e) => {
					ctx
						.emitEvent({ address, event: new Event.StreamStateChanged(e) })
						.pipe(Effect.runFork);
				});

				ws.on("RecordStateChanged", (e) => {
					ctx
						.emitEvent({ address, event: new Event.RecordStateChanged(e) })
						.pipe(Effect.runFork);
				});

				ws.on("ReplayBufferStateChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.ReplayBufferStateChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("VirtualcamStateChanged", (e) => {
					ctx
						.emitEvent({ address, event: new Event.VirtualcamStateChanged(e) })
						.pipe(Effect.runFork);
				});

				ws.on("ReplayBufferSaved", (e) => {
					ctx
						.emitEvent({ address, event: new Event.ReplayBufferSaved(e) })
						.pipe(Effect.runFork);
				});

				ws.on("SceneItemCreated", (e) => {
					ctx
						.emitEvent({ address, event: new Event.SceneItemCreated(e) })
						.pipe(Effect.runFork);
				});

				ws.on("SceneItemRemoved", (e) => {
					ctx
						.emitEvent({ address, event: new Event.SceneItemRemoved(e) })
						.pipe(Effect.runFork);
				});

				ws.on("SceneItemListReindexed", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.SceneItemListReindexed({
								sceneName: e.sceneName,
								sceneUuid: e.sceneUuid,
								sceneItems: JSON.stringify(e.sceneItems),
							}),
						})
						.pipe(Effect.runFork);
				});

				ws.on("SceneItemEnableStateChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.SceneItemEnableStateChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("SceneItemLockStateChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.SceneItemLockStateChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("SceneItemSelected", (e) => {
					ctx
						.emitEvent({ address, event: new Event.SceneItemSelected(e) })
						.pipe(Effect.runFork);
				});

				ws.on("SceneCreated", (e) => {
					ctx
						.emitEvent({ address, event: new Event.SceneCreated(e) })
						.pipe(Effect.runFork);
				});

				ws.on("SceneRemoved", (e) => {
					ctx
						.emitEvent({ address, event: new Event.SceneRemoved(e) })
						.pipe(Effect.runFork);
				});

				ws.on("SceneNameChanged", (e) => {
					ctx
						.emitEvent({ address, event: new Event.SceneNameChanged(e) })
						.pipe(Effect.runFork);
				});

				ws.on("CurrentPreviewSceneChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.CurrentPreviewSceneChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("SceneListChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.SceneListChanged({
								scenes: JSON.stringify(e.scenes),
							}),
						})
						.pipe(Effect.runFork);
				});

				ws.on("CurrentSceneTransitionChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.CurrentSceneTransitionChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("CurrentSceneTransitionDurationChanged", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.CurrentSceneTransitionDurationChanged(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("SceneTransitionStarted", (e) => {
					ctx
						.emitEvent({ address, event: new Event.SceneTransitionStarted(e) })
						.pipe(Effect.runFork);
				});

				ws.on("SceneTransitionEnded", (e) => {
					ctx
						.emitEvent({ address, event: new Event.SceneTransitionEnded(e) })
						.pipe(Effect.runFork);
				});

				ws.on("SceneTransitionVideoEnded", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.SceneTransitionVideoEnded(e),
						})
						.pipe(Effect.runFork);
				});

				ws.on("StudioModeStateChanged", (e) => {
					ctx
						.emitEvent({ address, event: new Event.StudioModeStateChanged(e) })
						.pipe(Effect.runFork);
				});

				ws.on("ScreenshotSaved", (e) => {
					ctx
						.emitEvent({ address, event: new Event.ScreenshotSaved(e) })
						.pipe(Effect.runFork);
				});

				ws.on("VendorEvent", (e) => {
					ctx
						.emitEvent({
							address,
							event: new Event.VendorEvent({
								vendorName: e.vendorName,
								eventType: e.eventType,
								eventData: JSON.stringify(e.eventData),
							}),
						})
						.pipe(Effect.runFork);
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

const OBSPackage = Package._make({
	name: "OBS Studio",
	engine: EngineDef,
	schemas: [
		NodeSchema.make("SetCurrentProgramScene", {
			type: "exec",
			properties: { connection: OBSConnectionProperty },
			name: "Set Current Program Scene",
			description: "Sets the current program scene in OBS.",
		}),
		NodeSchema.make("CreateInput", {
			type: "exec",
			properties: { connection: OBSConnectionProperty },
			name: "Create Input",
			description: "Creates a new input in OBS.",
		}),
		NodeSchema.make("CurrentProgramSceneChanged", {
			type: "event",
			properties: { connection: OBSConnectionProperty },
			name: "Current Program Scene Changed",
			description: "Fires when the current program scene in OBS is changed.",
		}),
	],
});

export const _default = OBSPackage.toLayer((builder) =>
	builder
		.schema("SetCurrentProgramScene", {
			io: (c) => ({
				scene: c.in.data("scene", t.String, {
					name: "Scene Name",
					suggestions: ({ properties }) =>
						Effect.tryPromise(() =>
							properties.connection.ws.call("GetSceneList"),
						).pipe(
							Effect.map((r) =>
								r.scenes.map((scene) => scene.sceneName as string),
							),
						),
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const sceneName = yield* getInput(io.scene);
				yield* Effect.promise(() =>
					connection.ws.call("SetCurrentProgramScene", { sceneName }),
				);
			},
		})
		.schema("CreateInput", {
			io: (c) => ({
				inputName: c.in.data("inputName", t.String, { name: "Input Name" }),
				inputKind: c.in.data("inputKind", t.String, { name: "Input Kind" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const inputName = yield* getInput(io.inputName);
				const inputKind = yield* getInput(io.inputKind);

				yield* Effect.promise(() =>
					connection.ws.call("CreateInput", { inputName, inputKind }),
				);
			},
		})
		.schema("CurrentProgramSceneChanged", {
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
		}),
);

export default Package.make({
	name: "OBS Studio",
	engine: Engine,
	builder: (ctx) => {
		ctx.schema("request.SetCurrentProgramScene", {
			name: "Set Current Program Scene",
			type: "exec",
			description: "Sets the current program scene in OBS.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				scene: c.in.data("scene", t.String, {
					name: "Scene Name",
					suggestions: ({ properties }) =>
						Effect.tryPromise(() =>
							properties.connection.ws.call("GetSceneList"),
						).pipe(
							Effect.map((r) =>
								r.scenes.map((scene) => scene.sceneName as string),
							),
						),
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const sceneName = yield* getInput(io.scene);

				yield* Effect.promise(() =>
					connection.ws.call("SetCurrentProgramScene", { sceneName }),
				);
			},
		});

		ctx.schema("request.CreateInput", {
			name: "Create Input",
			type: "exec",
			description: "Creates a new input in OBS.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				inputName: c.in.data("inputName", t.String, { name: "Input Name" }),
				inputKind: c.in.data("inputKind", t.String, { name: "Input Kind" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const inputName = yield* getInput(io.inputName);
				const inputKind = yield* getInput(io.inputKind);

				yield* Effect.promise(() =>
					connection.ws.call("CreateInput", { inputName, inputKind }),
				);
			},
		});

		// === General ===

		ctx.schema("request.GetVersion", {
			name: "Get Version",
			type: "exec",
			description: "Gets the version of OBS and obs-websocket.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				obsVersion: c.out.data("obsVersion", t.String, { name: "OBS Version" }),
				obsWebSocketVersion: c.out.data("obsWebSocketVersion", t.String, {
					name: "OBS WebSocket Version",
				}),
				rpcVersion: c.out.data("rpcVersion", t.Int, { name: "RPC Version" }),
				platform: c.out.data("platform", t.String, { name: "Platform" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetVersion"),
				);
				yield* setOutput(io.obsVersion, result.obsVersion);
				yield* setOutput(io.obsWebSocketVersion, result.obsWebSocketVersion);
				yield* setOutput(io.rpcVersion, result.rpcVersion);
				yield* setOutput(io.platform, result.platform);
			},
		});

		ctx.schema("request.GetStats", {
			name: "Get Stats",
			type: "exec",
			description: "Gets statistics about OBS.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				cpuUsage: c.out.data("cpuUsage", t.Float, { name: "CPU Usage (%)" }),
				memoryUsage: c.out.data("memoryUsage", t.Float, {
					name: "Memory Usage (MB)",
				}),
				activeFps: c.out.data("activeFps", t.Float, { name: "Active FPS" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetStats"),
				);
				yield* setOutput(io.cpuUsage, result.cpuUsage);
				yield* setOutput(io.memoryUsage, result.memoryUsage);
				yield* setOutput(io.activeFps, result.activeFps);
			},
		});

		// === Scene Collections ===

		ctx.schema("request.GetSceneCollectionList", {
			name: "Get Scene Collection List",
			type: "exec",
			description: "Gets the list of available scene collections.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				currentSceneCollectionName: c.out.data(
					"currentSceneCollectionName",
					t.String,
					{ name: "Current Scene Collection" },
				),
				sceneCollections: c.out.data("sceneCollections", t.String, {
					name: "Scene Collections (JSON)",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetSceneCollectionList"),
				);
				yield* setOutput(
					io.currentSceneCollectionName,
					result.currentSceneCollectionName,
				);
				yield* setOutput(
					io.sceneCollections,
					JSON.stringify(result.sceneCollections),
				);
			},
		});

		ctx.schema("request.SetCurrentSceneCollection", {
			name: "Set Current Scene Collection",
			type: "exec",
			description: "Sets the current scene collection.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				sceneCollectionName: c.in.data("sceneCollectionName", t.String, {
					name: "Scene Collection Name",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const sceneCollectionName = yield* getInput(io.sceneCollectionName);
				yield* Effect.promise(() =>
					connection.ws.call("SetCurrentSceneCollection", {
						sceneCollectionName,
					}),
				);
			},
		});

		ctx.schema("request.CreateSceneCollection", {
			name: "Create Scene Collection",
			type: "exec",
			description: "Creates a new scene collection.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				sceneCollectionName: c.in.data("sceneCollectionName", t.String, {
					name: "Scene Collection Name",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const sceneCollectionName = yield* getInput(io.sceneCollectionName);
				yield* Effect.promise(() =>
					connection.ws.call("CreateSceneCollection", { sceneCollectionName }),
				);
			},
		});

		// === Profiles ===

		ctx.schema("request.GetProfileList", {
			name: "Get Profile List",
			type: "exec",
			description: "Gets the list of available profiles.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				currentProfileName: c.out.data("currentProfileName", t.String, {
					name: "Current Profile",
				}),
				profiles: c.out.data("profiles", t.String, { name: "Profiles (JSON)" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetProfileList"),
				);
				yield* setOutput(io.currentProfileName, result.currentProfileName);
				yield* setOutput(io.profiles, JSON.stringify(result.profiles));
			},
		});

		ctx.schema("request.SetCurrentProfile", {
			name: "Set Current Profile",
			type: "exec",
			description: "Sets the current profile.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				profileName: c.in.data("profileName", t.String, {
					name: "Profile Name",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const profileName = yield* getInput(io.profileName);
				yield* Effect.promise(() =>
					connection.ws.call("SetCurrentProfile", { profileName }),
				);
			},
		});

		ctx.schema("request.CreateProfile", {
			name: "Create Profile",
			type: "exec",
			description: "Creates a new profile.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				profileName: c.in.data("profileName", t.String, {
					name: "Profile Name",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const profileName = yield* getInput(io.profileName);
				yield* Effect.promise(() =>
					connection.ws.call("CreateProfile", { profileName }),
				);
			},
		});

		ctx.schema("request.RemoveProfile", {
			name: "Remove Profile",
			type: "exec",
			description: "Removes a profile.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				profileName: c.in.data("profileName", t.String, {
					name: "Profile Name",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const profileName = yield* getInput(io.profileName);
				yield* Effect.promise(() =>
					connection.ws.call("RemoveProfile", { profileName }),
				);
			},
		});

		ctx.schema("request.GetProfileParameter", {
			name: "Get Profile Parameter",
			type: "exec",
			description: "Gets a profile parameter value.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				parameterCategory: c.in.data("parameterCategory", t.String, {
					name: "Parameter Category",
				}),
				parameterName: c.in.data("parameterName", t.String, {
					name: "Parameter Name",
				}),
				parameterValue: c.out.data("parameterValue", t.String, {
					name: "Parameter Value",
				}),
				defaultParameterValue: c.out.data("defaultParameterValue", t.String, {
					name: "Default Value",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const parameterCategory = yield* getInput(io.parameterCategory);
				const parameterName = yield* getInput(io.parameterName);
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetProfileParameter", {
						parameterCategory,
						parameterName,
					}),
				);
				yield* setOutput(io.parameterValue, result.parameterValue);
				yield* setOutput(
					io.defaultParameterValue,
					result.defaultParameterValue,
				);
			},
		});

		ctx.schema("request.SetProfileParameter", {
			name: "Set Profile Parameter",
			type: "exec",
			description: "Sets a profile parameter value.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				parameterCategory: c.in.data("parameterCategory", t.String, {
					name: "Parameter Category",
				}),
				parameterName: c.in.data("parameterName", t.String, {
					name: "Parameter Name",
				}),
				parameterValue: c.in.data("parameterValue", t.String, {
					name: "Parameter Value",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const parameterCategory = yield* getInput(io.parameterCategory);
				const parameterName = yield* getInput(io.parameterName);
				const parameterValue = yield* getInput(io.parameterValue);
				yield* Effect.promise(() =>
					connection.ws.call("SetProfileParameter", {
						parameterCategory,
						parameterName,
						parameterValue,
					}),
				);
			},
		});

		// === Video Settings ===

		ctx.schema("request.GetVideoSettings", {
			name: "Get Video Settings",
			type: "exec",
			description: "Gets video settings.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				fpsNumerator: c.out.data("fpsNumerator", t.Int, {
					name: "FPS Numerator",
				}),
				fpsDenominator: c.out.data("fpsDenominator", t.Int, {
					name: "FPS Denominator",
				}),
				baseWidth: c.out.data("baseWidth", t.Int, { name: "Base Width" }),
				baseHeight: c.out.data("baseHeight", t.Int, { name: "Base Height" }),
				outputWidth: c.out.data("outputWidth", t.Int, { name: "Output Width" }),
				outputHeight: c.out.data("outputHeight", t.Int, {
					name: "Output Height",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetVideoSettings"),
				);
				yield* setOutput(io.fpsNumerator, result.fpsNumerator);
				yield* setOutput(io.fpsDenominator, result.fpsDenominator);
				yield* setOutput(io.baseWidth, result.baseWidth);
				yield* setOutput(io.baseHeight, result.baseHeight);
				yield* setOutput(io.outputWidth, result.outputWidth);
				yield* setOutput(io.outputHeight, result.outputHeight);
			},
		});

		ctx.schema("request.SetVideoSettings", {
			name: "Set Video Settings",
			type: "exec",
			description: "Sets video settings.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				fpsNumerator: c.in.data("fpsNumerator", t.Int, {
					name: "FPS Numerator",
				}),
				fpsDenominator: c.in.data("fpsDenominator", t.Int, {
					name: "FPS Denominator",
				}),
				baseWidth: c.in.data("baseWidth", t.Int, { name: "Base Width" }),
				baseHeight: c.in.data("baseHeight", t.Int, { name: "Base Height" }),
				outputWidth: c.in.data("outputWidth", t.Int, { name: "Output Width" }),
				outputHeight: c.in.data("outputHeight", t.Int, {
					name: "Output Height",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const fpsNumerator = yield* getInput(io.fpsNumerator);
				const fpsDenominator = yield* getInput(io.fpsDenominator);
				const baseWidth = yield* getInput(io.baseWidth);
				const baseHeight = yield* getInput(io.baseHeight);
				const outputWidth = yield* getInput(io.outputWidth);
				const outputHeight = yield* getInput(io.outputHeight);

				const params: any = {};
				if (fpsNumerator !== undefined) params.fpsNumerator = fpsNumerator;
				if (fpsDenominator !== undefined)
					params.fpsDenominator = fpsDenominator;
				if (baseWidth !== undefined) params.baseWidth = baseWidth;
				if (baseHeight !== undefined) params.baseHeight = baseHeight;
				if (outputWidth !== undefined) params.outputWidth = outputWidth;
				if (outputHeight !== undefined) params.outputHeight = outputHeight;

				yield* Effect.promise(() =>
					connection.ws.call("SetVideoSettings", params),
				);
			},
		});

		// === Stream Service ===

		ctx.schema("request.GetStreamServiceSettings", {
			name: "Get Stream Service Settings",
			type: "exec",
			description: "Gets stream service settings.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				streamServiceType: c.out.data("streamServiceType", t.String, {
					name: "Stream Service Type",
				}),
				streamServiceSettings: c.out.data("streamServiceSettings", t.String, {
					name: "Stream Service Settings",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetStreamServiceSettings"),
				);
				yield* setOutput(io.streamServiceType, result.streamServiceType);
				yield* setOutput(
					io.streamServiceSettings,
					JSON.stringify(result.streamServiceSettings),
				);
			},
		});

		ctx.schema("request.SetStreamServiceSettings", {
			name: "Set Stream Service Settings",
			type: "exec",
			description: "Sets stream service settings.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				streamServiceType: c.in.data("streamServiceType", t.String, {
					name: "Stream Service Type",
				}),
				streamServiceSettings: c.in.data("streamServiceSettings", t.String, {
					name: "Stream Service Settings (JSON)",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const streamServiceType = yield* getInput(io.streamServiceType);
				const streamServiceSettings = yield* getInput(io.streamServiceSettings);
				const data = (
					typeof streamServiceSettings === "string"
						? JSON.parse(streamServiceSettings)
						: streamServiceSettings
				) as any;
				yield* Effect.promise(() =>
					connection.ws.call("SetStreamServiceSettings", {
						streamServiceType,
						streamServiceSettings: data,
					}),
				);
			},
		});

		// === Record Directory ===

		ctx.schema("request.GetRecordDirectory", {
			name: "Get Record Directory",
			type: "exec",
			description: "Gets the record directory.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				recordDirectory: c.out.data("recordDirectory", t.String, {
					name: "Record Directory",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetRecordDirectory"),
				);
				yield* setOutput(io.recordDirectory, result.recordDirectory);
			},
		});

		ctx.schema("request.SetRecordDirectory", {
			name: "Set Record Directory",
			type: "exec",
			description: "Sets the record directory.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				recordDirectory: c.in.data("recordDirectory", t.String, {
					name: "Record Directory",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const recordDirectory = yield* getInput(io.recordDirectory);
				yield* Effect.promise(() =>
					connection.ws.call("SetRecordDirectory", { recordDirectory }),
				);
			},
		});

		// === Scenes ===

		ctx.schema("request.GetSceneList", {
			name: "Get Scene List",
			type: "exec",
			description: "Gets the list of scenes.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				currentProgramSceneName: c.out.data(
					"currentProgramSceneName",
					t.String,
					{ name: "Current Program Scene" },
				),
				currentPreviewSceneName: c.out.data(
					"currentPreviewSceneName",
					t.String,
					{ name: "Current Preview Scene" },
				),
				scenes: c.out.data("scenes", t.String, { name: "Scenes (JSON)" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetSceneList"),
				);
				yield* setOutput(
					io.currentProgramSceneName,
					result.currentProgramSceneName,
				);
				yield* setOutput(
					io.currentPreviewSceneName,
					result.currentPreviewSceneName,
				);
				yield* setOutput(io.scenes, JSON.stringify(result.scenes));
			},
		});

		ctx.schema("request.GetCurrentProgramScene", {
			name: "Get Current Program Scene",
			type: "exec",
			description: "Gets the current program scene.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetCurrentProgramScene"),
				);
				yield* setOutput(io.sceneName, result.sceneName);
				yield* setOutput(io.sceneUuid, result.sceneUuid);
			},
		});

		ctx.schema("request.GetCurrentPreviewScene", {
			name: "Get Current Preview Scene",
			type: "exec",
			description: "Gets the current preview scene.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetCurrentPreviewScene"),
				);
				yield* setOutput(io.sceneName, result.sceneName);
				yield* setOutput(io.sceneUuid, result.sceneUuid);
			},
		});

		ctx.schema("request.CreateScene", {
			name: "Create Scene",
			type: "exec",
			description: "Creates a new scene.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				sceneName: c.in.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const sceneName = yield* getInput(io.sceneName);
				const result = yield* Effect.promise(() =>
					connection.ws.call("CreateScene", { sceneName }),
				);
				yield* setOutput(io.sceneUuid, result.sceneUuid);
			},
		});

		ctx.schema("request.RemoveScene", {
			name: "Remove Scene",
			type: "exec",
			description: "Removes a scene.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				sceneName: c.in.data("sceneName", t.String, { name: "Scene Name" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const sceneName = yield* getInput(io.sceneName);
				yield* Effect.promise(() =>
					connection.ws.call("RemoveScene", { sceneName }),
				);
			},
		});

		ctx.schema("request.SetSceneName", {
			name: "Set Scene Name",
			type: "exec",
			description: "Renames a scene.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				sceneName: c.in.data("sceneName", t.String, {
					name: "Current Scene Name",
				}),
				newSceneName: c.in.data("newSceneName", t.String, {
					name: "New Scene Name",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const sceneName = yield* getInput(io.sceneName);
				const newSceneName = yield* getInput(io.newSceneName);
				yield* Effect.promise(() =>
					connection.ws.call("SetSceneName", { sceneName, newSceneName }),
				);
			},
		});

		// === Stream ===

		ctx.schema("request.GetStreamStatus", {
			name: "Get Stream Status",
			type: "exec",
			description: "Gets the status of the stream.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
				outputReconnecting: c.out.data("outputReconnecting", t.Bool, {
					name: "Output Reconnecting",
				}),
				outputTimecode: c.out.data("outputTimecode", t.String, {
					name: "Timecode",
				}),
				outputDuration: c.out.data("outputDuration", t.Int, {
					name: "Duration (ms)",
				}),
				outputBytes: c.out.data("outputBytes", t.Int, { name: "Bytes Sent" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetStreamStatus"),
				);
				yield* setOutput(io.outputActive, result.outputActive);
				yield* setOutput(io.outputReconnecting, result.outputReconnecting);
				yield* setOutput(io.outputTimecode, result.outputTimecode);
				yield* setOutput(io.outputDuration, result.outputDuration);
				yield* setOutput(io.outputBytes, result.outputBytes);
			},
		});

		ctx.schema("request.ToggleStream", {
			name: "Toggle Stream",
			type: "exec",
			description: "Toggles the status of the stream.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("ToggleStream"),
				);
				yield* setOutput(io.outputActive, result.outputActive);
			},
		});

		ctx.schema("request.StartStream", {
			name: "Start Stream",
			type: "exec",
			description: "Starts the stream.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({}),
			run: function* ({ properties: { connection } }) {
				yield* Effect.promise(() => connection.ws.call("StartStream"));
			},
		});

		ctx.schema("request.StopStream", {
			name: "Stop Stream",
			type: "exec",
			description: "Stops the stream.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({}),
			run: function* ({ properties: { connection } }) {
				yield* Effect.promise(() => connection.ws.call("StopStream"));
			},
		});

		ctx.schema("request.SendStreamCaption", {
			name: "Send Stream Caption",
			type: "exec",
			description: "Sends a caption to the stream.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				captionText: c.in.data("captionText", t.String, {
					name: "Caption Text",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const captionText = yield* getInput(io.captionText);
				yield* Effect.promise(() =>
					connection.ws.call("SendStreamCaption", { captionText }),
				);
			},
		});

		// === Record ===

		ctx.schema("request.GetRecordStatus", {
			name: "Get Record Status",
			type: "exec",
			description: "Gets the status of the record.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
				outputPaused: c.out.data("outputPaused", t.Bool, {
					name: "Output Paused",
				}),
				outputTimecode: c.out.data("outputTimecode", t.String, {
					name: "Timecode",
				}),
				outputDuration: c.out.data("outputDuration", t.Int, {
					name: "Duration (ms)",
				}),
				outputBytes: c.out.data("outputBytes", t.Int, {
					name: "Bytes Written",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetRecordStatus"),
				);
				yield* setOutput(io.outputActive, result.outputActive);
				yield* setOutput(io.outputPaused, result.outputPaused);
				yield* setOutput(io.outputTimecode, result.outputTimecode);
				yield* setOutput(io.outputDuration, result.outputDuration);
				yield* setOutput(io.outputBytes, result.outputBytes);
			},
		});

		ctx.schema("request.ToggleRecord", {
			name: "Toggle Record",
			type: "exec",
			description: "Toggles the status of the record.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("ToggleRecord"),
				);
				yield* setOutput(io.outputActive, result.outputActive);
			},
		});

		ctx.schema("request.StartRecord", {
			name: "Start Record",
			type: "exec",
			description: "Starts the record.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({}),
			run: function* ({ properties: { connection } }) {
				yield* Effect.promise(() => connection.ws.call("StartRecord"));
			},
		});

		ctx.schema("request.StopRecord", {
			name: "Stop Record",
			type: "exec",
			description: "Stops the record.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				outputPath: c.out.data("outputPath", t.String, { name: "Output Path" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("StopRecord"),
				);
				yield* setOutput(io.outputPath, result.outputPath);
			},
		});

		ctx.schema("request.ToggleRecordPause", {
			name: "Toggle Record Pause",
			type: "exec",
			description: "Toggles pause on the record.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({}),
			run: function* ({ properties: { connection } }) {
				yield* Effect.promise(() => connection.ws.call("ToggleRecordPause"));
			},
		});

		ctx.schema("request.PauseRecord", {
			name: "Pause Record",
			type: "exec",
			description: "Pauses the record.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({}),
			run: function* ({ properties: { connection } }) {
				yield* Effect.promise(() => connection.ws.call("PauseRecord"));
			},
		});

		ctx.schema("request.ResumeRecord", {
			name: "Resume Record",
			type: "exec",
			description: "Resumes the record.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({}),
			run: function* ({ properties: { connection } }) {
				yield* Effect.promise(() => connection.ws.call("ResumeRecord"));
			},
		});

		// === Virtual Camera ===

		ctx.schema("request.GetVirtualCamStatus", {
			name: "Get Virtual Cam Status",
			type: "exec",
			description: "Gets the status of the virtual camera.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetVirtualCamStatus"),
				);
				yield* setOutput(io.outputActive, result.outputActive);
			},
		});

		ctx.schema("request.ToggleVirtualCam", {
			name: "Toggle Virtual Cam",
			type: "exec",
			description: "Toggles the status of the virtual camera.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("ToggleVirtualCam"),
				);
				yield* setOutput(io.outputActive, result.outputActive);
			},
		});

		ctx.schema("request.StartVirtualCam", {
			name: "Start Virtual Cam",
			type: "exec",
			description: "Starts the virtual camera.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({}),
			run: function* ({ properties: { connection } }) {
				yield* Effect.promise(() => connection.ws.call("StartVirtualCam"));
			},
		});

		ctx.schema("request.StopVirtualCam", {
			name: "Stop Virtual Cam",
			type: "exec",
			description: "Stops the virtual camera.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({}),
			run: function* ({ properties: { connection } }) {
				yield* Effect.promise(() => connection.ws.call("StopVirtualCam"));
			},
		});

		// === Replay Buffer ===

		ctx.schema("request.GetReplayBufferStatus", {
			name: "Get Replay Buffer Status",
			type: "exec",
			description: "Gets the status of the replay buffer.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetReplayBufferStatus"),
				);
				yield* setOutput(io.outputActive, result.outputActive);
			},
		});

		ctx.schema("request.ToggleReplayBuffer", {
			name: "Toggle Replay Buffer",
			type: "exec",
			description: "Toggles the status of the replay buffer.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const result = yield* Effect.promise(() =>
					connection.ws.call("ToggleReplayBuffer"),
				);
				yield* setOutput(io.outputActive, result.outputActive);
			},
		});

		ctx.schema("request.StartReplayBuffer", {
			name: "Start Replay Buffer",
			type: "exec",
			description: "Starts the replay buffer.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({}),
			run: function* ({ properties: { connection } }) {
				yield* Effect.promise(() => connection.ws.call("StartReplayBuffer"));
			},
		});

		ctx.schema("request.StopReplayBuffer", {
			name: "Stop Replay Buffer",
			type: "exec",
			description: "Stops the replay buffer.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({}),
			run: function* ({ properties: { connection } }) {
				yield* Effect.promise(() => connection.ws.call("StopReplayBuffer"));
			},
		});

		ctx.schema("request.SaveReplayBuffer", {
			name: "Save Replay Buffer",
			type: "exec",
			description: "Saves the replay buffer.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({}),
			run: function* ({ properties: { connection } }) {
				yield* Effect.promise(() => connection.ws.call("SaveReplayBuffer"));
			},
		});

		// === Input Audio Controls ===

		ctx.schema("request.GetInputMute", {
			name: "Get Input Mute",
			type: "exec",
			description: "Gets the mute state of an input.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				inputName: c.in.data("inputName", t.String, { name: "Input Name" }),
				inputMuted: c.out.data("inputMuted", t.Bool, { name: "Input Muted" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const inputName = yield* getInput(io.inputName);
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetInputMute", { inputName }),
				);
				yield* setOutput(io.inputMuted, result.inputMuted);
			},
		});

		ctx.schema("request.SetInputMute", {
			name: "Set Input Mute",
			type: "exec",
			description: "Sets the mute state of an input.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				inputName: c.in.data("inputName", t.String, { name: "Input Name" }),
				inputMuted: c.in.data("inputMuted", t.Bool, { name: "Input Muted" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const inputName = yield* getInput(io.inputName);
				const inputMuted = yield* getInput(io.inputMuted);
				yield* Effect.promise(() =>
					connection.ws.call("SetInputMute", { inputName, inputMuted }),
				);
			},
		});

		ctx.schema("request.ToggleInputMute", {
			name: "Toggle Input Mute",
			type: "exec",
			description: "Toggles the mute state of an input.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				inputName: c.in.data("inputName", t.String, { name: "Input Name" }),
				inputMuted: c.out.data("inputMuted", t.Bool, { name: "Input Muted" }),
			}),
			run: function* ({ io, properties: { connection } }) {
				const inputName = yield* getInput(io.inputName);
				const result = yield* Effect.promise(() =>
					connection.ws.call("ToggleInputMute", { inputName }),
				);
				yield* setOutput(io.inputMuted, result.inputMuted);
			},
		});

		ctx.schema("request.GetInputVolume", {
			name: "Get Input Volume",
			type: "exec",
			description: "Gets the volume of an input.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				inputName: c.in.data("inputName", t.String, { name: "Input Name" }),
				inputVolumeMul: c.out.data("inputVolumeMul", t.Float, {
					name: "Volume Multiplier",
				}),
				inputVolumeDb: c.out.data("inputVolumeDb", t.Float, {
					name: "Volume dB",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const inputName = yield* getInput(io.inputName);
				const result = yield* Effect.promise(() =>
					connection.ws.call("GetInputVolume", { inputName }),
				);
				yield* setOutput(io.inputVolumeMul, result.inputVolumeMul);
				yield* setOutput(io.inputVolumeDb, result.inputVolumeDb);
			},
		});

		ctx.schema("request.SetInputVolume", {
			name: "Set Input Volume",
			type: "exec",
			description: "Sets the volume of an input.",
			properties: { connection: OBSConnectionProperty },
			io: (c) => ({
				inputName: c.in.data("inputName", t.String, { name: "Input Name" }),
				inputVolumeMul: c.in.data("inputVolumeMul", t.Float, {
					name: "Volume Multiplier",
				}),
			}),
			run: function* ({ io, properties: { connection } }) {
				const inputName = yield* getInput(io.inputName);
				const inputVolumeMul = yield* getInput(io.inputVolumeMul);
				yield* Effect.promise(() =>
					connection.ws.call("SetInputVolume", { inputName, inputVolumeMul }),
				);
			},
		});

		ctx.schema("event.CurrentProgramSceneChanged", {
			name: "Current Program Scene Changed",
			type: "event",
			description: "Fires when the current program scene in OBS is changed.",
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

		ctx.schema("event.ExitStarted", {
			name: "Exit Started",
			type: "event",
			description: "Fires when OBS is beginning to close.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "ExitStarted") return e.event;
			},
			io: () => ({}),
			run: function* () {},
		});

		ctx.schema("event.CustomEvent", {
			name: "Custom Event",
			type: "event",
			description: "Fires when a custom event is emitted.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "CustomEvent") return e.event;
			},
			io: (c) => ({
				eventData: c.out.data("eventData", t.String, { name: "Event Data" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.eventData, event.eventData);
			},
		});

		ctx.schema("event.CurrentSceneCollectionChanging", {
			name: "Current Scene Collection Changing",
			type: "event",
			description:
				"Fires when the current scene collection is about to change.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "CurrentSceneCollectionChanging") return e.event;
			},
			io: (c) => ({
				sceneCollectionName: c.out.data("sceneCollectionName", t.String, {
					name: "Scene Collection Name",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneCollectionName, event.sceneCollectionName);
			},
		});

		ctx.schema("event.CurrentSceneCollectionChanged", {
			name: "Current Scene Collection Changed",
			type: "event",
			description: "Fires when the current scene collection has changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "CurrentSceneCollectionChanged") return e.event;
			},
			io: (c) => ({
				sceneCollectionName: c.out.data("sceneCollectionName", t.String, {
					name: "Scene Collection Name",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneCollectionName, event.sceneCollectionName);
			},
		});

		ctx.schema("event.SceneCollectionListChanged", {
			name: "Scene Collection List Changed",
			type: "event",
			description: "Fires when the list of scene collections has changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneCollectionListChanged") return e.event;
			},
			io: (c) => ({
				sceneCollections: c.out.data("sceneCollections", t.String, {
					name: "Scene Collections",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneCollections, event.sceneCollections);
			},
		});

		ctx.schema("event.CurrentProfileChanging", {
			name: "Current Profile Changing",
			type: "event",
			description: "Fires when the current profile is about to change.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "CurrentProfileChanging") return e.event;
			},
			io: (c) => ({
				profileName: c.out.data("profileName", t.String, {
					name: "Profile Name",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.profileName, event.profileName);
			},
		});

		ctx.schema("event.CurrentProfileChanged", {
			name: "Current Profile Changed",
			type: "event",
			description: "Fires when the current profile has changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "CurrentProfileChanged") return e.event;
			},
			io: (c) => ({
				profileName: c.out.data("profileName", t.String, {
					name: "Profile Name",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.profileName, event.profileName);
			},
		});

		ctx.schema("event.ProfileListChanged", {
			name: "Profile List Changed",
			type: "event",
			description: "Fires when the list of profiles has changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "ProfileListChanged") return e.event;
			},
			io: (c) => ({
				profiles: c.out.data("profiles", t.String, { name: "Profiles" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.profiles, event.profiles);
			},
		});

		ctx.schema("event.SourceFilterListReindexed", {
			name: "Source Filter List Reindexed",
			type: "event",
			description: "Fires when the filters of a source are reindexed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SourceFilterListReindexed") return e.event;
			},
			io: (c) => ({
				sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
				filters: c.out.data("filters", t.String, { name: "Filters" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sourceName, event.sourceName);
				yield* setOutput(io.filters, event.filters);
			},
		});

		ctx.schema("event.SourceFilterCreated", {
			name: "Source Filter Created",
			type: "event",
			description: "Fires when a filter is created on a source.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SourceFilterCreated") return e.event;
			},
			io: (c) => ({
				sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
				filterName: c.out.data("filterName", t.String, { name: "Filter Name" }),
				filterKind: c.out.data("filterKind", t.String, { name: "Filter Kind" }),
				filterIndex: c.out.data("filterIndex", t.Int, {
					name: "Filter Index",
				}),
				filterSettings: c.out.data("filterSettings", t.String, {
					name: "Filter Settings",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sourceName, event.sourceName);
				yield* setOutput(io.filterName, event.filterName);
				yield* setOutput(io.filterKind, event.filterKind);
				yield* setOutput(io.filterIndex, event.filterIndex);
				yield* setOutput(io.filterSettings, event.filterSettings);
			},
		});

		ctx.schema("event.SourceFilterRemoved", {
			name: "Source Filter Removed",
			type: "event",
			description: "Fires when a filter is removed from a source.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SourceFilterRemoved") return e.event;
			},
			io: (c) => ({
				sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
				filterName: c.out.data("filterName", t.String, { name: "Filter Name" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sourceName, event.sourceName);
				yield* setOutput(io.filterName, event.filterName);
			},
		});

		ctx.schema("event.SourceFilterNameChanged", {
			name: "Source Filter Name Changed",
			type: "event",
			description: "Fires when a filter's name is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SourceFilterNameChanged") return e.event;
			},
			io: (c) => ({
				sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
				oldFilterName: c.out.data("oldFilterName", t.String, {
					name: "Old Filter Name",
				}),
				filterName: c.out.data("filterName", t.String, { name: "Filter Name" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sourceName, event.sourceName);
				yield* setOutput(io.oldFilterName, event.oldFilterName);
				yield* setOutput(io.filterName, event.filterName);
			},
		});

		ctx.schema("event.SourceFilterSettingsChanged", {
			name: "Source Filter Settings Changed",
			type: "event",
			description: "Fires when a filter's settings are changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SourceFilterSettingsChanged") return e.event;
			},
			io: (c) => ({
				sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
				filterName: c.out.data("filterName", t.String, { name: "Filter Name" }),
				filterSettings: c.out.data("filterSettings", t.String, {
					name: "Filter Settings",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sourceName, event.sourceName);
				yield* setOutput(io.filterName, event.filterName);
				yield* setOutput(io.filterSettings, event.filterSettings);
			},
		});

		ctx.schema("event.SourceFilterEnableStateChanged", {
			name: "Source Filter Enable State Changed",
			type: "event",
			description: "Fires when a filter's enable state is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SourceFilterEnableStateChanged") return e.event;
			},
			io: (c) => ({
				sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
				filterName: c.out.data("filterName", t.String, { name: "Filter Name" }),
				filterEnabled: c.out.data("filterEnabled", t.Bool, {
					name: "Filter Enabled",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sourceName, event.sourceName);
				yield* setOutput(io.filterName, event.filterName);
				yield* setOutput(io.filterEnabled, event.filterEnabled);
			},
		});

		ctx.schema("event.InputCreated", {
			name: "Input Created",
			type: "event",
			description: "Fires when an input is created.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "InputCreated") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
				inputKind: c.out.data("inputKind", t.String, { name: "Input Kind" }),
				inputSettings: c.out.data("inputSettings", t.String, {
					name: "Input Settings",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
				yield* setOutput(io.inputKind, event.inputKind);
				yield* setOutput(io.inputSettings, event.inputSettings);
			},
		});

		ctx.schema("event.InputRemoved", {
			name: "Input Removed",
			type: "event",
			description: "Fires when an input is removed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "InputRemoved") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
			},
		});

		ctx.schema("event.InputNameChanged", {
			name: "Input Name Changed",
			type: "event",
			description: "Fires when an input's name is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "InputNameChanged") return e.event;
			},
			io: (c) => ({
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
				oldInputName: c.out.data("oldInputName", t.String, {
					name: "Old Input Name",
				}),
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputUuid, event.inputUuid);
				yield* setOutput(io.oldInputName, event.oldInputName);
				yield* setOutput(io.inputName, event.inputName);
			},
		});

		ctx.schema("event.InputSettingsChanged", {
			name: "Input Settings Changed",
			type: "event",
			description: "Fires when an input's settings are changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "InputSettingsChanged") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
				inputSettings: c.out.data("inputSettings", t.String, {
					name: "Input Settings",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
				yield* setOutput(io.inputSettings, event.inputSettings);
			},
		});

		ctx.schema("event.InputMuteStateChanged", {
			name: "Input Mute State Changed",
			type: "event",
			description: "Fires when an input's mute state is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "InputMuteStateChanged") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
				inputMuted: c.out.data("inputMuted", t.Bool, { name: "Input Muted" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
				yield* setOutput(io.inputMuted, event.inputMuted);
			},
		});

		ctx.schema("event.InputVolumeChanged", {
			name: "Input Volume Changed",
			type: "event",
			description: "Fires when an input's volume is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "InputVolumeChanged") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
				inputVolumeMul: c.out.data("inputVolumeMul", t.Float, {
					name: "Input Volume Multiplier",
				}),
				inputVolumeDb: c.out.data("inputVolumeDb", t.Float, {
					name: "Input Volume dB",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
				yield* setOutput(io.inputVolumeMul, event.inputVolumeMul);
				yield* setOutput(io.inputVolumeDb, event.inputVolumeDb);
			},
		});

		ctx.schema("event.InputAudioBalanceChanged", {
			name: "Input Audio Balance Changed",
			type: "event",
			description: "Fires when an input's audio balance is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "InputAudioBalanceChanged") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
				inputAudioBalance: c.out.data("inputAudioBalance", t.Float, {
					name: "Input Audio Balance",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
				yield* setOutput(io.inputAudioBalance, event.inputAudioBalance);
			},
		});

		ctx.schema("event.InputAudioSyncOffsetChanged", {
			name: "Input Audio Sync Offset Changed",
			type: "event",
			description: "Fires when an input's audio sync offset is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "InputAudioSyncOffsetChanged") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
				inputAudioSyncOffset: c.out.data("inputAudioSyncOffset", t.Float, {
					name: "Input Audio Sync Offset",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
				yield* setOutput(io.inputAudioSyncOffset, event.inputAudioSyncOffset);
			},
		});

		ctx.schema("event.InputAudioTracksChanged", {
			name: "Input Audio Tracks Changed",
			type: "event",
			description: "Fires when an input's audio tracks are changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "InputAudioTracksChanged") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
				inputAudioTracks: c.out.data("inputAudioTracks", t.String, {
					name: "Input Audio Tracks",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
				yield* setOutput(io.inputAudioTracks, event.inputAudioTracks);
			},
		});

		ctx.schema("event.InputAudioMonitorTypeChanged", {
			name: "Input Audio Monitor Type Changed",
			type: "event",
			description: "Fires when an input's audio monitor type is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "InputAudioMonitorTypeChanged") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
				monitorType: c.out.data("monitorType", t.String, {
					name: "Monitor Type",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
				yield* setOutput(io.monitorType, event.monitorType);
			},
		});

		ctx.schema("event.MediaInputPlaybackStarted", {
			name: "Media Input Playback Started",
			type: "event",
			description: "Fires when a media input's playback has started.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "MediaInputPlaybackStarted") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
			},
		});

		ctx.schema("event.MediaInputPlaybackEnded", {
			name: "Media Input Playback Ended",
			type: "event",
			description: "Fires when a media input's playback has ended.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "MediaInputPlaybackEnded") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
			},
		});

		ctx.schema("event.MediaInputActionTriggered", {
			name: "Media Input Action Triggered",
			type: "event",
			description: "Fires when a media input action is triggered.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "MediaInputActionTriggered") return e.event;
			},
			io: (c) => ({
				inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
				inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
				mediaAction: c.out.data("mediaAction", t.String, {
					name: "Media Action",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.inputName, event.inputName);
				yield* setOutput(io.inputUuid, event.inputUuid);
				yield* setOutput(io.mediaAction, event.mediaAction);
			},
		});

		ctx.schema("event.StreamStateChanged", {
			name: "Stream State Changed",
			type: "event",
			description: "Fires when the output stream state changes.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "StreamStateChanged") return e.event;
			},
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
				outputState: c.out.data("outputState", t.String, {
					name: "Output State",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.outputActive, event.outputActive);
				yield* setOutput(io.outputState, event.outputState);
			},
		});

		ctx.schema("event.RecordStateChanged", {
			name: "Record State Changed",
			type: "event",
			description: "Fires when the recording state changes.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "RecordStateChanged") return e.event;
			},
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
				outputState: c.out.data("outputState", t.String, {
					name: "Output State",
				}),
				outputPath: c.out.data("outputPath", t.String, { name: "Output Path" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.outputActive, event.outputActive);
				yield* setOutput(io.outputState, event.outputState);
				yield* setOutput(io.outputPath, event.outputPath);
			},
		});

		ctx.schema("event.ReplayBufferStateChanged", {
			name: "Replay Buffer State Changed",
			type: "event",
			description: "Fires when the replay buffer state changes.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "ReplayBufferStateChanged") return e.event;
			},
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
				outputState: c.out.data("outputState", t.String, {
					name: "Output State",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.outputActive, event.outputActive);
				yield* setOutput(io.outputState, event.outputState);
			},
		});

		ctx.schema("event.VirtualcamStateChanged", {
			name: "Virtualcam State Changed",
			type: "event",
			description: "Fires when the virtual camera state changes.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "VirtualcamStateChanged") return e.event;
			},
			io: (c) => ({
				outputActive: c.out.data("outputActive", t.Bool, {
					name: "Output Active",
				}),
				outputState: c.out.data("outputState", t.String, {
					name: "Output State",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.outputActive, event.outputActive);
				yield* setOutput(io.outputState, event.outputState);
			},
		});

		ctx.schema("event.ReplayBufferSaved", {
			name: "Replay Buffer Saved",
			type: "event",
			description: "Fires when the replay buffer is saved.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "ReplayBufferSaved") return e.event;
			},
			io: (c) => ({
				savedReplayPath: c.out.data("savedReplayPath", t.String, {
					name: "Saved Replay Path",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.savedReplayPath, event.savedReplayPath);
			},
		});

		ctx.schema("event.SceneItemCreated", {
			name: "Scene Item Created",
			type: "event",
			description: "Fires when a scene item is created.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneItemCreated") return e.event;
			},
			io: (c) => ({
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
				sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
				sourceUuid: c.out.data("sourceUuid", t.String, { name: "Source UUID" }),
				sceneItemId: c.out.data("sceneItemId", t.Int, {
					name: "Scene Item ID",
				}),
				sceneItemIndex: c.out.data("sceneItemIndex", t.Int, {
					name: "Scene Item Index",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneName, event.sceneName);
				yield* setOutput(io.sceneUuid, event.sceneUuid);
				yield* setOutput(io.sourceName, event.sourceName);
				yield* setOutput(io.sourceUuid, event.sourceUuid);
				yield* setOutput(io.sceneItemId, event.sceneItemId);
				yield* setOutput(io.sceneItemIndex, event.sceneItemIndex);
			},
		});

		ctx.schema("event.SceneItemRemoved", {
			name: "Scene Item Removed",
			type: "event",
			description: "Fires when a scene item is removed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneItemRemoved") return e.event;
			},
			io: (c) => ({
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
				sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
				sourceUuid: c.out.data("sourceUuid", t.String, { name: "Source UUID" }),
				sceneItemId: c.out.data("sceneItemId", t.Int, {
					name: "Scene Item ID",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneName, event.sceneName);
				yield* setOutput(io.sceneUuid, event.sceneUuid);
				yield* setOutput(io.sourceName, event.sourceName);
				yield* setOutput(io.sourceUuid, event.sourceUuid);
				yield* setOutput(io.sceneItemId, event.sceneItemId);
			},
		});

		ctx.schema("event.SceneItemListReindexed", {
			name: "Scene Item List Reindexed",
			type: "event",
			description: "Fires when scene items are reindexed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneItemListReindexed") return e.event;
			},
			io: (c) => ({
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
				sceneItems: c.out.data("sceneItems", t.String, { name: "Scene Items" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneName, event.sceneName);
				yield* setOutput(io.sceneUuid, event.sceneUuid);
				yield* setOutput(io.sceneItems, event.sceneItems);
			},
		});

		ctx.schema("event.SceneItemEnableStateChanged", {
			name: "Scene Item Enable State Changed",
			type: "event",
			description: "Fires when a scene item's enable state is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneItemEnableStateChanged") return e.event;
			},
			io: (c) => ({
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
				sceneItemId: c.out.data("sceneItemId", t.Int, {
					name: "Scene Item ID",
				}),
				sceneItemEnabled: c.out.data("sceneItemEnabled", t.Bool, {
					name: "Scene Item Enabled",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneName, event.sceneName);
				yield* setOutput(io.sceneUuid, event.sceneUuid);
				yield* setOutput(io.sceneItemId, event.sceneItemId);
				yield* setOutput(io.sceneItemEnabled, event.sceneItemEnabled);
			},
		});

		ctx.schema("event.SceneItemLockStateChanged", {
			name: "Scene Item Lock State Changed",
			type: "event",
			description: "Fires when a scene item's lock state is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneItemLockStateChanged") return e.event;
			},
			io: (c) => ({
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
				sceneItemId: c.out.data("sceneItemId", t.Int, {
					name: "Scene Item ID",
				}),
				sceneItemLocked: c.out.data("sceneItemLocked", t.Bool, {
					name: "Scene Item Locked",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneName, event.sceneName);
				yield* setOutput(io.sceneUuid, event.sceneUuid);
				yield* setOutput(io.sceneItemId, event.sceneItemId);
				yield* setOutput(io.sceneItemLocked, event.sceneItemLocked);
			},
		});

		ctx.schema("event.SceneItemSelected", {
			name: "Scene Item Selected",
			type: "event",
			description: "Fires when a scene item is selected.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneItemSelected") return e.event;
			},
			io: (c) => ({
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
				sceneItemId: c.out.data("sceneItemId", t.Int, {
					name: "Scene Item ID",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneName, event.sceneName);
				yield* setOutput(io.sceneUuid, event.sceneUuid);
				yield* setOutput(io.sceneItemId, event.sceneItemId);
			},
		});

		ctx.schema("event.SceneCreated", {
			name: "Scene Created",
			type: "event",
			description: "Fires when a scene is created.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneCreated") return e.event;
			},
			io: (c) => ({
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
				isGroup: c.out.data("isGroup", t.Bool, { name: "Is Group" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneName, event.sceneName);
				yield* setOutput(io.sceneUuid, event.sceneUuid);
				yield* setOutput(io.isGroup, event.isGroup);
			},
		});

		ctx.schema("event.SceneRemoved", {
			name: "Scene Removed",
			type: "event",
			description: "Fires when a scene is removed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneRemoved") return e.event;
			},
			io: (c) => ({
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
				isGroup: c.out.data("isGroup", t.Bool, { name: "Is Group" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneName, event.sceneName);
				yield* setOutput(io.sceneUuid, event.sceneUuid);
				yield* setOutput(io.isGroup, event.isGroup);
			},
		});

		ctx.schema("event.SceneNameChanged", {
			name: "Scene Name Changed",
			type: "event",
			description: "Fires when a scene's name is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneNameChanged") return e.event;
			},
			io: (c) => ({
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
				oldSceneName: c.out.data("oldSceneName", t.String, {
					name: "Old Scene Name",
				}),
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneUuid, event.sceneUuid);
				yield* setOutput(io.oldSceneName, event.oldSceneName);
				yield* setOutput(io.sceneName, event.sceneName);
			},
		});

		ctx.schema("event.CurrentPreviewSceneChanged", {
			name: "Current Preview Scene Changed",
			type: "event",
			description: "Fires when the current preview scene is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "CurrentPreviewSceneChanged") return e.event;
			},
			io: (c) => ({
				sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
				sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.sceneName, event.sceneName);
				yield* setOutput(io.sceneUuid, event.sceneUuid);
			},
		});

		ctx.schema("event.SceneListChanged", {
			name: "Scene List Changed",
			type: "event",
			description: "Fires when the list of scenes has changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneListChanged") return e.event;
			},
			io: (c) => ({
				scenes: c.out.data("scenes", t.String, { name: "Scenes" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.scenes, event.scenes);
			},
		});

		ctx.schema("event.CurrentSceneTransitionChanged", {
			name: "Current Scene Transition Changed",
			type: "event",
			description: "Fires when the current scene transition is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "CurrentSceneTransitionChanged") return e.event;
			},
			io: (c) => ({
				transitionName: c.out.data("transitionName", t.String, {
					name: "Transition Name",
				}),
				transitionUuid: c.out.data("transitionUuid", t.String, {
					name: "Transition UUID",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.transitionName, event.transitionName);
				yield* setOutput(io.transitionUuid, event.transitionUuid);
			},
		});

		ctx.schema("event.CurrentSceneTransitionDurationChanged", {
			name: "Current Scene Transition Duration Changed",
			type: "event",
			description:
				"Fires when the duration of the current scene transition is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "CurrentSceneTransitionDurationChanged")
					return e.event;
			},
			io: (c) => ({
				transitionDuration: c.out.data("transitionDuration", t.Int, {
					name: "Transition Duration",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.transitionDuration, event.transitionDuration);
			},
		});

		ctx.schema("event.SceneTransitionStarted", {
			name: "Scene Transition Started",
			type: "event",
			description: "Fires when a scene transition has started.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneTransitionStarted") return e.event;
			},
			io: (c) => ({
				transitionName: c.out.data("transitionName", t.String, {
					name: "Transition Name",
				}),
				transitionUuid: c.out.data("transitionUuid", t.String, {
					name: "Transition UUID",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.transitionName, event.transitionName);
				yield* setOutput(io.transitionUuid, event.transitionUuid);
			},
		});

		ctx.schema("event.SceneTransitionEnded", {
			name: "Scene Transition Ended",
			type: "event",
			description: "Fires when a scene transition has ended.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneTransitionEnded") return e.event;
			},
			io: (c) => ({
				transitionName: c.out.data("transitionName", t.String, {
					name: "Transition Name",
				}),
				transitionUuid: c.out.data("transitionUuid", t.String, {
					name: "Transition UUID",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.transitionName, event.transitionName);
				yield* setOutput(io.transitionUuid, event.transitionUuid);
			},
		});

		ctx.schema("event.SceneTransitionVideoEnded", {
			name: "Scene Transition Video Ended",
			type: "event",
			description:
				"Fires when the video portion of a scene transition has ended.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "SceneTransitionVideoEnded") return e.event;
			},
			io: (c) => ({
				transitionName: c.out.data("transitionName", t.String, {
					name: "Transition Name",
				}),
				transitionUuid: c.out.data("transitionUuid", t.String, {
					name: "Transition UUID",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.transitionName, event.transitionName);
				yield* setOutput(io.transitionUuid, event.transitionUuid);
			},
		});

		ctx.schema("event.StudioModeStateChanged", {
			name: "Studio Mode State Changed",
			type: "event",
			description: "Fires when the studio mode state is changed.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "StudioModeStateChanged") return e.event;
			},
			io: (c) => ({
				studioModeEnabled: c.out.data("studioModeEnabled", t.Bool, {
					name: "Studio Mode Enabled",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.studioModeEnabled, event.studioModeEnabled);
			},
		});

		ctx.schema("event.ScreenshotSaved", {
			name: "Screenshot Saved",
			type: "event",
			description: "Fires when a screenshot is saved.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "ScreenshotSaved") return e.event;
			},
			io: (c) => ({
				savedScreenshotPath: c.out.data("savedScreenshotPath", t.String, {
					name: "Saved Screenshot Path",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.savedScreenshotPath, event.savedScreenshotPath);
			},
		});

		ctx.schema("event.VendorEvent", {
			name: "Vendor Event",
			type: "event",
			description: "Fires when a vendor event is emitted.",
			properties: { connection: OBSConnectionProperty },
			event: ({ properties }, e) => {
				if (properties.connection.address !== e.address) return;
				if (e.event._tag === "VendorEvent") return e.event;
			},
			io: (c) => ({
				vendorName: c.out.data("vendorName", t.String, { name: "Vendor Name" }),
				eventType: c.out.data("eventType", t.String, { name: "Event Type" }),
				eventData: c.out.data("eventData", t.String, { name: "Event Data" }),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.vendorName, event.vendorName);
				yield* setOutput(io.eventType, event.eventType);
				yield* setOutput(io.eventData, event.eventData);
			},
		});
	},
});
