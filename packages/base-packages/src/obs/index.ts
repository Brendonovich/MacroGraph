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
				scene: c.in.data("scene", t.String, { name: "Scene Name" }),
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
			description: "Sets the current program scene in OBS.",
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
