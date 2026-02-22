import { Effect, Option, Schema as S } from "effect";
import { Package, PackageEngine, t } from "@macrograph/package-sdk";

import {
	ClientRpcs,
	ClientState,
	RuntimeRpcs,
	SocketResource,
} from "./new-shared";
import { Event, SocketAddress } from "./types";

export class EngineState extends S.Class<EngineState>("EngineState")({
	sockets: S.Record({
		key: SocketAddress,
		value: S.Struct({
			password: S.optional(S.String),
			connectOnStartup: S.Boolean,
		}),
	}),
}) {}

export class EngineDef extends PackageEngine.define({
	clientRpcs: ClientRpcs,
	runtimeRpcs: RuntimeRpcs,
	events: Event.Any.members,
	clientState: ClientState,
	resources: [SocketResource],
	engineState: EngineState,
}) {}

const OBSSocketProperty = { name: "OBS Socket", resource: SocketResource };

export default Package.define({ name: "OBS Studio", engine: EngineDef })
	.addSchema("GetCurrentProgramScene", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Current Program Scene",
		description: "Gets the current program scene from OBS.",
		io: (c) => ({
			scene: c.out.data("scene", t.String, { name: "Scene Name" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine
				.GetCurrentProgramScene({ address: socket.value })
				.pipe(Effect.map((v) => io.scene(v.sceneName)));
		},
	})
	.addSchema("SetCurrentProgramScene", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Current Program Scene",
		description: "Sets the current program scene in OBS.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetCurrentProgramScene({
				address: socket.value,
				sceneName: io.scene,
			});
		},
	})
	.addSchema("CreateInput", {
		type: "exec",
		properties: { connection: OBSSocketProperty },
		name: "Create Input",
		description: "Creates a new input in OBS.",
		io: (c) => ({
			name: c.in.data("name", t.String, { name: "Input Name" }),
			kind: c.in.data("kind", t.String, {
				name: "Input Kind",
				suggestions: ({ properties: { connection } }) =>
					connection.engine
						.GetInputKindList({ address: connection.value })
						.pipe(Effect.map((v) => v.inputKinds)),
			}),
		}),
		run: function* ({ io, properties: { connection } }) {
			yield* connection.engine.CreateInput({
				inputName: io.name,
				inputKind: io.kind,
				address: connection.value,
			});
		},
	})
	.addSchema("CurrentProgramSceneChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Current Program Scene Changed",
		description: "Fires when the current program scene in OBS is changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "CurrentProgramSceneChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			scene: c.out.data("scene", t.String, { name: "Scene Name" }),
		}),
		run: ({ io, event }) => {
			io.scene(event.sceneName);
		},
	})
	// ===== General Events =====
	.addSchema("ExitStarted", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Exit Started",
		description: "Fires when OBS has begun the shutdown process.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "ExitStarted"),
				Option.filter((data) => connection.value === data.address),
			),
		io: () => ({}),
		run: () => {},
	})
	.addSchema("CustomEvent", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Custom Event",
		description: "Fires when a custom event is broadcast.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "CustomEvent"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			eventData: c.out.data("eventData", t.String, { name: "Event Data" }),
		}),
		run: ({ io, event }) => {
			io.eventData(event.eventData);
		},
	})
	// ===== Config Events =====
	.addSchema("CurrentSceneCollectionChanging", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Current Scene Collection Changing",
		description: "Fires when the current scene collection begins changing.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "CurrentSceneCollectionChanging"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneCollectionName: c.out.data("sceneCollectionName", t.String, {
				name: "Scene Collection Name",
			}),
		}),
		run: ({ io, event }) => {
			io.sceneCollectionName(event.sceneCollectionName);
		},
	})
	.addSchema("CurrentSceneCollectionChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Current Scene Collection Changed",
		description: "Fires when the current scene collection has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "CurrentSceneCollectionChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneCollectionName: c.out.data("sceneCollectionName", t.String, {
				name: "Scene Collection Name",
			}),
		}),
		run: ({ io, event }) => {
			io.sceneCollectionName(event.sceneCollectionName);
		},
	})
	.addSchema("SceneCollectionListChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Collection List Changed",
		description: "Fires when the scene collection list has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneCollectionListChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneCollections: c.out.data("sceneCollections", t.String, {
				name: "Scene Collections",
			}),
		}),
		run: ({ io, event }) => {
			io.sceneCollections(event.sceneCollections);
		},
	})
	.addSchema("CurrentProfileChanging", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Current Profile Changing",
		description: "Fires when the current profile begins changing.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "CurrentProfileChanging"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			profileName: c.out.data("profileName", t.String, {
				name: "Profile Name",
			}),
		}),
		run: ({ io, event }) => {
			io.profileName(event.profileName);
		},
	})
	.addSchema("CurrentProfileChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Current Profile Changed",
		description: "Fires when the current profile has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "CurrentProfileChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			profileName: c.out.data("profileName", t.String, {
				name: "Profile Name",
			}),
		}),
		run: ({ io, event }) => {
			io.profileName(event.profileName);
		},
	})
	.addSchema("ProfileListChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Profile List Changed",
		description: "Fires when the profile list has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "ProfileListChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			profiles: c.out.data("profiles", t.String, { name: "Profiles" }),
		}),
		run: ({ io, event }) => {
			io.profiles(event.profiles);
		},
	})
	// ===== Filter Events =====
	.addSchema("SourceFilterListReindexed", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Source Filter List Reindexed",
		description: "Fires when a source's filter list has been reindexed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SourceFilterListReindexed"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
			filters: c.out.data("filters", t.String, { name: "Filters (JSON)" }),
		}),
		run: ({ io, event }) => {
			io.sourceName(event.sourceName);
			io.filters(event.filters);
		},
	})
	.addSchema("SourceFilterCreated", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Source Filter Created",
		description: "Fires when a filter has been added to a source.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SourceFilterCreated"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
			filterName: c.out.data("filterName", t.String, { name: "Filter Name" }),
			filterKind: c.out.data("filterKind", t.String, { name: "Filter Kind" }),
			filterIndex: c.out.data("filterIndex", t.Int, { name: "Filter Index" }),
			filterSettings: c.out.data("filterSettings", t.String, {
				name: "Filter Settings (JSON)",
			}),
		}),
		run: ({ io, event }) => {
			io.sourceName(event.sourceName);
			io.filterName(event.filterName);
			io.filterKind(event.filterKind);
			io.filterIndex(event.filterIndex);
			io.filterSettings(event.filterSettings);
		},
	})
	.addSchema("SourceFilterRemoved", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Source Filter Removed",
		description: "Fires when a filter has been removed from a source.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SourceFilterRemoved"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
			filterName: c.out.data("filterName", t.String, { name: "Filter Name" }),
		}),
		run: ({ io, event }) => {
			io.sourceName(event.sourceName);
			io.filterName(event.filterName);
		},
	})
	.addSchema("SourceFilterNameChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Source Filter Name Changed",
		description: "Fires when a filter's name has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SourceFilterNameChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
			oldFilterName: c.out.data("oldFilterName", t.String, {
				name: "Old Filter Name",
			}),
			filterName: c.out.data("filterName", t.String, { name: "Filter Name" }),
		}),
		run: ({ io, event }) => {
			io.sourceName(event.sourceName);
			io.oldFilterName(event.oldFilterName);
			io.filterName(event.filterName);
		},
	})
	.addSchema("SourceFilterSettingsChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Source Filter Settings Changed",
		description: "Fires when a filter's settings have changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SourceFilterSettingsChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
			filterName: c.out.data("filterName", t.String, { name: "Filter Name" }),
			filterSettings: c.out.data("filterSettings", t.String, {
				name: "Filter Settings (JSON)",
			}),
		}),
		run: ({ io, event }) => {
			io.sourceName(event.sourceName);
			io.filterName(event.filterName);
			io.filterSettings(event.filterSettings);
		},
	})
	.addSchema("SourceFilterEnableStateChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Source Filter Enable State Changed",
		description: "Fires when a filter's enable state has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SourceFilterEnableStateChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
			filterName: c.out.data("filterName", t.String, { name: "Filter Name" }),
			filterEnabled: c.out.data("filterEnabled", t.Bool, {
				name: "Filter Enabled",
			}),
		}),
		run: ({ io, event }) => {
			io.sourceName(event.sourceName);
			io.filterName(event.filterName);
			io.filterEnabled(event.filterEnabled);
		},
	})
	// ===== Input Events =====
	.addSchema("InputCreated", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Input Created",
		description: "Fires when an input has been created.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "InputCreated"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			inputKind: c.out.data("inputKind", t.String, { name: "Input Kind" }),
			inputSettings: c.out.data("inputSettings", t.String, {
				name: "Input Settings (JSON)",
			}),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
			io.inputKind(event.inputKind);
			io.inputSettings(event.inputSettings);
		},
	})
	.addSchema("InputRemoved", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Input Removed",
		description: "Fires when an input has been removed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "InputRemoved"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
		},
	})
	.addSchema("InputNameChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Input Name Changed",
		description: "Fires when an input's name has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "InputNameChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			oldInputName: c.out.data("oldInputName", t.String, {
				name: "Old Input Name",
			}),
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
		}),
		run: ({ io, event }) => {
			io.inputUuid(event.inputUuid);
			io.oldInputName(event.oldInputName);
			io.inputName(event.inputName);
		},
	})
	.addSchema("InputSettingsChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Input Settings Changed",
		description: "Fires when an input's settings have changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "InputSettingsChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			inputSettings: c.out.data("inputSettings", t.String, {
				name: "Input Settings (JSON)",
			}),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
			io.inputSettings(event.inputSettings);
		},
	})
	.addSchema("InputMuteStateChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Input Mute State Changed",
		description: "Fires when an input's mute state has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "InputMuteStateChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			inputMuted: c.out.data("inputMuted", t.Bool, { name: "Input Muted" }),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
			io.inputMuted(event.inputMuted);
		},
	})
	.addSchema("InputVolumeChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Input Volume Changed",
		description: "Fires when an input's volume has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "InputVolumeChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			inputVolumeMul: c.out.data("inputVolumeMul", t.Float, {
				name: "Volume Multiplier",
			}),
			inputVolumeDb: c.out.data("inputVolumeDb", t.Float, {
				name: "Volume (dB)",
			}),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
			io.inputVolumeMul(event.inputVolumeMul);
			io.inputVolumeDb(event.inputVolumeDb);
		},
	})
	.addSchema("InputAudioBalanceChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Input Audio Balance Changed",
		description: "Fires when an input's audio balance has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "InputAudioBalanceChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			inputAudioBalance: c.out.data("inputAudioBalance", t.Float, {
				name: "Audio Balance",
			}),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
			io.inputAudioBalance(event.inputAudioBalance);
		},
	})
	.addSchema("InputAudioSyncOffsetChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Input Audio Sync Offset Changed",
		description: "Fires when an input's audio sync offset has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "InputAudioSyncOffsetChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			inputAudioSyncOffset: c.out.data("inputAudioSyncOffset", t.Int, {
				name: "Audio Sync Offset",
			}),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
			io.inputAudioSyncOffset(event.inputAudioSyncOffset);
		},
	})
	.addSchema("InputAudioTracksChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Input Audio Tracks Changed",
		description: "Fires when an input's audio tracks have changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "InputAudioTracksChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			inputAudioTracks: c.out.data("inputAudioTracks", t.String, {
				name: "Audio Tracks (JSON)",
			}),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
			io.inputAudioTracks(event.inputAudioTracks);
		},
	})
	.addSchema("InputAudioMonitorTypeChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Input Audio Monitor Type Changed",
		description: "Fires when an input's audio monitor type has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "InputAudioMonitorTypeChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			monitorType: c.out.data("monitorType", t.String, {
				name: "Monitor Type",
			}),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
			io.monitorType(event.monitorType);
		},
	})
	// ===== Media Input Events =====
	.addSchema("MediaInputPlaybackStarted", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Media Input Playback Started",
		description: "Fires when a media input has started playing.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "MediaInputPlaybackStarted"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
		},
	})
	.addSchema("MediaInputPlaybackEnded", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Media Input Playback Ended",
		description: "Fires when a media input has finished playing.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "MediaInputPlaybackEnded"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
		},
	})
	.addSchema("MediaInputActionTriggered", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Media Input Action Triggered",
		description: "Fires when a media action has been triggered on an input.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "MediaInputActionTriggered"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			inputName: c.out.data("inputName", t.String, { name: "Input Name" }),
			inputUuid: c.out.data("inputUuid", t.String, { name: "Input UUID" }),
			mediaAction: c.out.data("mediaAction", t.String, {
				name: "Media Action",
			}),
		}),
		run: ({ io, event }) => {
			io.inputName(event.inputName);
			io.inputUuid(event.inputUuid);
			io.mediaAction(event.mediaAction);
		},
	})
	// ===== Output Events =====
	.addSchema("StreamStateChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Stream State Changed",
		description: "Fires when the stream output state has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "StreamStateChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			outputActive: c.out.data("outputActive", t.Bool, {
				name: "Output Active",
			}),
			outputState: c.out.data("outputState", t.String, {
				name: "Output State",
			}),
		}),
		run: ({ io, event }) => {
			io.outputActive(event.outputActive);
			io.outputState(event.outputState);
		},
	})
	.addSchema("RecordStateChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Record State Changed",
		description: "Fires when the record output state has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "RecordStateChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			outputActive: c.out.data("outputActive", t.Bool, {
				name: "Output Active",
			}),
			outputState: c.out.data("outputState", t.String, {
				name: "Output State",
			}),
			outputPath: c.out.data("outputPath", t.String, { name: "Output Path" }),
		}),
		run: ({ io, event }) => {
			io.outputActive(event.outputActive);
			io.outputState(event.outputState);
			io.outputPath(event.outputPath);
		},
	})
	.addSchema("ReplayBufferStateChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Replay Buffer State Changed",
		description: "Fires when the replay buffer output state has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "ReplayBufferStateChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			outputActive: c.out.data("outputActive", t.Bool, {
				name: "Output Active",
			}),
			outputState: c.out.data("outputState", t.String, {
				name: "Output State",
			}),
		}),
		run: ({ io, event }) => {
			io.outputActive(event.outputActive);
			io.outputState(event.outputState);
		},
	})
	.addSchema("VirtualcamStateChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Virtual Camera State Changed",
		description: "Fires when the virtual camera output state has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "VirtualcamStateChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			outputActive: c.out.data("outputActive", t.Bool, {
				name: "Output Active",
			}),
			outputState: c.out.data("outputState", t.String, {
				name: "Output State",
			}),
		}),
		run: ({ io, event }) => {
			io.outputActive(event.outputActive);
			io.outputState(event.outputState);
		},
	})
	.addSchema("ReplayBufferSaved", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Replay Buffer Saved",
		description: "Fires when the replay buffer has been saved.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "ReplayBufferSaved"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			savedReplayPath: c.out.data("savedReplayPath", t.String, {
				name: "Saved Replay Path",
			}),
		}),
		run: ({ io, event }) => {
			io.savedReplayPath(event.savedReplayPath);
		},
	})
	// ===== Scene Item Events =====
	.addSchema("SceneItemCreated", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Item Created",
		description: "Fires when a scene item has been created.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneItemCreated"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
			sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
			sourceUuid: c.out.data("sourceUuid", t.String, { name: "Source UUID" }),
			sceneItemId: c.out.data("sceneItemId", t.Int, { name: "Scene Item ID" }),
			sceneItemIndex: c.out.data("sceneItemIndex", t.Int, {
				name: "Scene Item Index",
			}),
		}),
		run: ({ io, event }) => {
			io.sceneName(event.sceneName);
			io.sceneUuid(event.sceneUuid);
			io.sourceName(event.sourceName);
			io.sourceUuid(event.sourceUuid);
			io.sceneItemId(event.sceneItemId);
			io.sceneItemIndex(event.sceneItemIndex);
		},
	})
	.addSchema("SceneItemRemoved", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Item Removed",
		description: "Fires when a scene item has been removed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneItemRemoved"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
			sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			sourceName: c.out.data("sourceName", t.String, { name: "Source Name" }),
			sourceUuid: c.out.data("sourceUuid", t.String, { name: "Source UUID" }),
			sceneItemId: c.out.data("sceneItemId", t.Int, { name: "Scene Item ID" }),
		}),
		run: ({ io, event }) => {
			io.sceneName(event.sceneName);
			io.sceneUuid(event.sceneUuid);
			io.sourceName(event.sourceName);
			io.sourceUuid(event.sourceUuid);
			io.sceneItemId(event.sceneItemId);
		},
	})
	.addSchema("SceneItemListReindexed", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Item List Reindexed",
		description: "Fires when a scene's item list has been reindexed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneItemListReindexed"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
			sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			sceneItems: c.out.data("sceneItems", t.String, {
				name: "Scene Items (JSON)",
			}),
		}),
		run: ({ io, event }) => {
			io.sceneName(event.sceneName);
			io.sceneUuid(event.sceneUuid);
			io.sceneItems(event.sceneItems);
		},
	})
	.addSchema("SceneItemEnableStateChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Item Enable State Changed",
		description: "Fires when a scene item's enable state has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneItemEnableStateChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
			sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			sceneItemId: c.out.data("sceneItemId", t.Int, { name: "Scene Item ID" }),
			sceneItemEnabled: c.out.data("sceneItemEnabled", t.Bool, {
				name: "Scene Item Enabled",
			}),
		}),
		run: ({ io, event }) => {
			io.sceneName(event.sceneName);
			io.sceneUuid(event.sceneUuid);
			io.sceneItemId(event.sceneItemId);
			io.sceneItemEnabled(event.sceneItemEnabled);
		},
	})
	.addSchema("SceneItemLockStateChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Item Lock State Changed",
		description: "Fires when a scene item's lock state has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneItemLockStateChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
			sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			sceneItemId: c.out.data("sceneItemId", t.Int, { name: "Scene Item ID" }),
			sceneItemLocked: c.out.data("sceneItemLocked", t.Bool, {
				name: "Scene Item Locked",
			}),
		}),
		run: ({ io, event }) => {
			io.sceneName(event.sceneName);
			io.sceneUuid(event.sceneUuid);
			io.sceneItemId(event.sceneItemId);
			io.sceneItemLocked(event.sceneItemLocked);
		},
	})
	.addSchema("SceneItemSelected", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Item Selected",
		description: "Fires when a scene item has been selected in the UI.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneItemSelected"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
			sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			sceneItemId: c.out.data("sceneItemId", t.Int, { name: "Scene Item ID" }),
		}),
		run: ({ io, event }) => {
			io.sceneName(event.sceneName);
			io.sceneUuid(event.sceneUuid);
			io.sceneItemId(event.sceneItemId);
		},
	})
	// ===== Scene Events =====
	.addSchema("SceneCreated", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Created",
		description: "Fires when a scene has been created.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneCreated"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
			sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			isGroup: c.out.data("isGroup", t.Bool, { name: "Is Group" }),
		}),
		run: ({ io, event }) => {
			io.sceneName(event.sceneName);
			io.sceneUuid(event.sceneUuid);
			io.isGroup(event.isGroup);
		},
	})
	.addSchema("SceneRemoved", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Removed",
		description: "Fires when a scene has been removed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneRemoved"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
			sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			isGroup: c.out.data("isGroup", t.Bool, { name: "Is Group" }),
		}),
		run: ({ io, event }) => {
			io.sceneName(event.sceneName);
			io.sceneUuid(event.sceneUuid);
			io.isGroup(event.isGroup);
		},
	})
	.addSchema("SceneNameChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Name Changed",
		description: "Fires when a scene's name has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneNameChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
			oldSceneName: c.out.data("oldSceneName", t.String, {
				name: "Old Scene Name",
			}),
			sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
		}),
		run: ({ io, event }) => {
			io.sceneUuid(event.sceneUuid);
			io.oldSceneName(event.oldSceneName);
			io.sceneName(event.sceneName);
		},
	})
	.addSchema("CurrentPreviewSceneChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Current Preview Scene Changed",
		description: "Fires when the current preview scene has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "CurrentPreviewSceneChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			sceneName: c.out.data("sceneName", t.String, { name: "Scene Name" }),
			sceneUuid: c.out.data("sceneUuid", t.String, { name: "Scene UUID" }),
		}),
		run: ({ io, event }) => {
			io.sceneName(event.sceneName);
			io.sceneUuid(event.sceneUuid);
		},
	})
	.addSchema("SceneListChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene List Changed",
		description: "Fires when the scene list has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneListChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			scenes: c.out.data("scenes", t.String, { name: "Scenes (JSON)" }),
		}),
		run: ({ io, event }) => {
			io.scenes(event.scenes);
		},
	})
	// ===== Transition Events =====
	.addSchema("CurrentSceneTransitionChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Current Scene Transition Changed",
		description: "Fires when the current scene transition has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "CurrentSceneTransitionChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			transitionName: c.out.data("transitionName", t.String, {
				name: "Transition Name",
			}),
			transitionUuid: c.out.data("transitionUuid", t.String, {
				name: "Transition UUID",
			}),
		}),
		run: ({ io, event }) => {
			io.transitionName(event.transitionName);
			io.transitionUuid(event.transitionUuid);
		},
	})
	.addSchema("CurrentSceneTransitionDurationChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Current Scene Transition Duration Changed",
		description:
			"Fires when the current scene transition duration has changed.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter(
					(data) => data._tag === "CurrentSceneTransitionDurationChanged",
				),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			transitionDuration: c.out.data("transitionDuration", t.Int, {
				name: "Transition Duration",
			}),
		}),
		run: ({ io, event }) => {
			io.transitionDuration(event.transitionDuration);
		},
	})
	.addSchema("SceneTransitionStarted", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Transition Started",
		description: "Fires when a scene transition has started.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneTransitionStarted"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			transitionName: c.out.data("transitionName", t.String, {
				name: "Transition Name",
			}),
			transitionUuid: c.out.data("transitionUuid", t.String, {
				name: "Transition UUID",
			}),
		}),
		run: ({ io, event }) => {
			io.transitionName(event.transitionName);
			io.transitionUuid(event.transitionUuid);
		},
	})
	.addSchema("SceneTransitionEnded", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Transition Ended",
		description: "Fires when a scene transition has ended.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneTransitionEnded"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			transitionName: c.out.data("transitionName", t.String, {
				name: "Transition Name",
			}),
			transitionUuid: c.out.data("transitionUuid", t.String, {
				name: "Transition UUID",
			}),
		}),
		run: ({ io, event }) => {
			io.transitionName(event.transitionName);
			io.transitionUuid(event.transitionUuid);
		},
	})
	.addSchema("SceneTransitionVideoEnded", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Scene Transition Video Ended",
		description: "Fires when a scene transition's video has ended.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "SceneTransitionVideoEnded"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			transitionName: c.out.data("transitionName", t.String, {
				name: "Transition Name",
			}),
			transitionUuid: c.out.data("transitionUuid", t.String, {
				name: "Transition UUID",
			}),
		}),
		run: ({ io, event }) => {
			io.transitionName(event.transitionName);
			io.transitionUuid(event.transitionUuid);
		},
	})
	// ===== UI Events =====
	.addSchema("StudioModeStateChanged", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Studio Mode State Changed",
		description: "Fires when studio mode has been enabled or disabled.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "StudioModeStateChanged"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			studioModeEnabled: c.out.data("studioModeEnabled", t.Bool, {
				name: "Studio Mode Enabled",
			}),
		}),
		run: ({ io, event }) => {
			io.studioModeEnabled(event.studioModeEnabled);
		},
	})
	.addSchema("ScreenshotSaved", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Screenshot Saved",
		description: "Fires when a screenshot has been saved.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "ScreenshotSaved"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			savedScreenshotPath: c.out.data("savedScreenshotPath", t.String, {
				name: "Saved Screenshot Path",
			}),
		}),
		run: ({ io, event }) => {
			io.savedScreenshotPath(event.savedScreenshotPath);
		},
	})
	// ===== Vendor Events =====
	.addSchema("VendorEvent", {
		type: "event",
		properties: { connection: OBSSocketProperty },
		name: "Vendor Event",
		description: "Fires when a vendor-specific event occurs.",
		event: (data, { properties: { connection } }) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "VendorEvent"),
				Option.filter((data) => connection.value === data.address),
			),
		io: (c) => ({
			vendorName: c.out.data("vendorName", t.String, { name: "Vendor Name" }),
			eventType: c.out.data("eventType", t.String, { name: "Event Type" }),
			eventData: c.out.data("eventData", t.String, {
				name: "Event Data (JSON)",
			}),
		}),
		run: ({ io, event }) => {
			io.vendorName(event.vendorName);
			io.eventType(event.eventType);
			io.eventData(event.eventData);
		},
	})
	// System & Meta
	.addSchema("GetVersion", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Version",
		description: "Gets version information from OBS.",
		io: (c) => ({
			obsVersion: c.out.data("obsVersion", t.String, { name: "OBS Version" }),
			wsVersion: c.out.data("wsVersion", t.String, {
				name: "WebSocket Version",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetVersion({ address: socket.value });
			io.obsVersion(result.obsVersion);
			io.wsVersion(result.obsWebSocketVersion);
		},
	})
	.addSchema("GetStats", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Stats",
		description: "Gets statistics from OBS.",
		io: (c) => ({
			cpuUsage: c.out.data("cpuUsage", t.Float, { name: "CPU Usage" }),
			memoryUsage: c.out.data("memoryUsage", t.Float, {
				name: "Memory Usage (MB)",
			}),
			fps: c.out.data("fps", t.Float, { name: "Current FPS" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetStats({ address: socket.value });
			io.cpuUsage(result.cpuUsage);
			io.memoryUsage(result.memoryUsage);
			io.fps(result.activeFps);
		},
	})
	.addSchema("BroadcastCustomEvent", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Broadcast Custom Event",
		description: "Broadcasts a custom event to all WebSocket clients.",
		io: (c) => ({
			data: c.in.data("data", t.String, { name: "Event Data (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.BroadcastCustomEvent({
				address: socket.value,
				eventData: JSON.parse(io.data),
			});
		},
	})
	.addSchema("CallVendorRequest", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Call Vendor Request",
		description: "Calls a vendor-specific request.",
		io: (c) => ({
			vendorName: c.in.data("vendorName", t.String, { name: "Vendor Name" }),
			requestType: c.in.data("requestType", t.String, { name: "Request Type" }),
			requestData: c.in.data("requestData", t.String, {
				name: "Request Data (JSON)",
			}),
			responseData: c.out.data("responseData", t.String, {
				name: "Response Data (JSON)",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.CallVendorRequest({
				address: socket.value,
				vendorName: io.vendorName,
				requestType: io.requestType,
				requestData: JSON.parse(io.requestData),
			});
			io.responseData(JSON.stringify(result.responseData));
		},
	})
	.addSchema("Sleep", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Sleep",
		description: "Sleeps for a specified time (for testing purposes).",
		io: (c) => ({
			duration: c.in.data("duration", t.Int, { name: "Duration (ms)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.Sleep({
				address: socket.value,
				sleepMillis: io.duration,
			});
		},
	})
	// Config & General
	.addSchema("GetPersistentData", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Persistent Data",
		description: "Gets persistent data from OBS.",
		io: (c) => ({
			realm: c.in.data("realm", t.String, { name: "Realm" }),
			slotName: c.in.data("slotName", t.String, { name: "Slot Name" }),
			value: c.out.data("value", t.String, { name: "Value (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetPersistentData({
				address: socket.value,
				realm: io.realm,
				slotName: io.slotName,
			});
			io.value(JSON.stringify(result.slotValue));
		},
	})
	.addSchema("SetPersistentData", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Persistent Data",
		description: "Sets persistent data in OBS.",
		io: (c) => ({
			realm: c.in.data("realm", t.String, { name: "Realm" }),
			slotName: c.in.data("slotName", t.String, { name: "Slot Name" }),
			value: c.in.data("value", t.String, { name: "Value (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetPersistentData({
				address: socket.value,
				realm: io.realm,
				slotName: io.slotName,
				slotValue: JSON.parse(io.value),
			});
		},
	})
	.addSchema("GetSceneCollectionList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene Collection List",
		description: "Gets all scene collections.",
		io: (c) => ({
			current: c.out.data("current", t.String, { name: "Current Collection" }),
			collections: c.out.data("collections", t.List(t.String), {
				name: "Collections",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSceneCollectionList({
				address: socket.value,
			});
			io.current(result.currentSceneCollectionName);
			io.collections([...result.sceneCollections]);
		},
	})
	.addSchema("SetCurrentSceneCollection", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Current Scene Collection",
		description: "Switches to a scene collection.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Collection Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneCollectionList({ address: socket.value })
						.pipe(Effect.map((v) => [...v.sceneCollections])),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetCurrentSceneCollection({
				address: socket.value,
				sceneCollectionName: io.name,
			});
		},
	})
	.addSchema("CreateSceneCollection", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Create Scene Collection",
		description: "Creates a new scene collection.",
		io: (c) => ({
			name: c.in.data("name", t.String, { name: "Collection Name" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.CreateSceneCollection({
				address: socket.value,
				sceneCollectionName: io.name,
			});
		},
	})
	.addSchema("GetProfileList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Profile List",
		description: "Gets all profiles.",
		io: (c) => ({
			current: c.out.data("current", t.String, { name: "Current Profile" }),
			profiles: c.out.data("profiles", t.List(t.String), { name: "Profiles" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetProfileList({
				address: socket.value,
			});
			io.current(result.currentProfileName);
			io.profiles([...result.profiles]);
		},
	})
	.addSchema("SetCurrentProfile", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Current Profile",
		description: "Switches to a profile.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Profile Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetProfileList({ address: socket.value })
						.pipe(Effect.map((v) => [...v.profiles])),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetCurrentProfile({
				address: socket.value,
				profileName: io.name,
			});
		},
	})
	.addSchema("CreateProfile", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Create Profile",
		description: "Creates a new profile.",
		io: (c) => ({
			name: c.in.data("name", t.String, { name: "Profile Name" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.CreateProfile({
				address: socket.value,
				profileName: io.name,
			});
		},
	})
	.addSchema("RemoveProfile", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Remove Profile",
		description: "Removes a profile.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Profile Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetProfileList({ address: socket.value })
						.pipe(Effect.map((v) => [...v.profiles])),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.RemoveProfile({
				address: socket.value,
				profileName: io.name,
			});
		},
	})
	.addSchema("GetProfileParameter", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Profile Parameter",
		description: "Gets a profile parameter value.",
		io: (c) => ({
			category: c.in.data("category", t.String, { name: "Category" }),
			name: c.in.data("name", t.String, { name: "Parameter Name" }),
			value: c.out.data("value", t.String, { name: "Value" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetProfileParameter({
				address: socket.value,
				parameterCategory: io.category,
				parameterName: io.name,
			});
			io.value(result.parameterValue || "");
		},
	})
	.addSchema("SetProfileParameter", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Profile Parameter",
		description: "Sets a profile parameter value.",
		io: (c) => ({
			category: c.in.data("category", t.String, { name: "Category" }),
			name: c.in.data("name", t.String, { name: "Parameter Name" }),
			value: c.in.data("value", t.String, { name: "Value" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetProfileParameter({
				address: socket.value,
				parameterCategory: io.category,
				parameterName: io.name,
				parameterValue: io.value,
			});
		},
	})
	.addSchema("GetVideoSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Video Settings",
		description: "Gets video settings.",
		io: (c) => ({
			fpsNum: c.out.data("fpsNum", t.Int, { name: "FPS Numerator" }),
			fpsDen: c.out.data("fpsDen", t.Int, { name: "FPS Denominator" }),
			baseWidth: c.out.data("baseWidth", t.Int, { name: "Base Width" }),
			baseHeight: c.out.data("baseHeight", t.Int, { name: "Base Height" }),
			outputWidth: c.out.data("outputWidth", t.Int, { name: "Output Width" }),
			outputHeight: c.out.data("outputHeight", t.Int, {
				name: "Output Height",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetVideoSettings({
				address: socket.value,
			});
			io.fpsNum(result.fpsNumerator);
			io.fpsDen(result.fpsDenominator);
			io.baseWidth(result.baseWidth);
			io.baseHeight(result.baseHeight);
			io.outputWidth(result.outputWidth);
			io.outputHeight(result.outputHeight);
		},
	})
	.addSchema("SetVideoSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Video Settings",
		description: "Sets video settings.",
		io: (c) => ({
			fpsNum: c.in.data("fpsNum", t.Int, { name: "FPS Numerator" }),
			fpsDen: c.in.data("fpsDen", t.Int, { name: "FPS Denominator" }),
			baseWidth: c.in.data("baseWidth", t.Int, { name: "Base Width" }),
			baseHeight: c.in.data("baseHeight", t.Int, { name: "Base Height" }),
			outputWidth: c.in.data("outputWidth", t.Int, { name: "Output Width" }),
			outputHeight: c.in.data("outputHeight", t.Int, { name: "Output Height" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetVideoSettings({
				address: socket.value,
				fpsNumerator: io.fpsNum,
				fpsDenominator: io.fpsDen,
				baseWidth: io.baseWidth,
				baseHeight: io.baseHeight,
				outputWidth: io.outputWidth,
				outputHeight: io.outputHeight,
			});
		},
	})
	.addSchema("GetStreamServiceSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Stream Service Settings",
		description: "Gets stream service settings.",
		io: (c) => ({
			type: c.out.data("type", t.String, { name: "Service Type" }),
			settings: c.out.data("settings", t.String, { name: "Settings (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetStreamServiceSettings({
				address: socket.value,
			});
			io.type(result.streamServiceType);
			io.settings(JSON.stringify(result.streamServiceSettings));
		},
	})
	.addSchema("SetStreamServiceSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Stream Service Settings",
		description: "Sets stream service settings.",
		io: (c) => ({
			type: c.in.data("type", t.String, { name: "Service Type" }),
			settings: c.in.data("settings", t.String, { name: "Settings (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetStreamServiceSettings({
				address: socket.value,
				streamServiceType: io.type,
				streamServiceSettings: JSON.parse(io.settings),
			});
		},
	})
	.addSchema("GetRecordDirectory", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Record Directory",
		description: "Gets the record directory.",
		io: (c) => ({
			directory: c.out.data("directory", t.String, { name: "Directory" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetRecordDirectory({
				address: socket.value,
			});
			io.directory(result.recordDirectory);
		},
	})
	.addSchema("SetRecordDirectory", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Record Directory",
		description: "Sets the record directory.",
		io: (c) => ({
			directory: c.in.data("directory", t.String, { name: "Directory" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetRecordDirectory({
				address: socket.value,
				recordDirectory: io.directory,
			});
		},
	})
	// Streaming
	.addSchema("GetStreamStatus", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Stream Status",
		description: "Gets stream output status.",
		io: (c) => ({
			active: c.out.data("active", t.Bool, { name: "Active" }),
			reconnecting: c.out.data("reconnecting", t.Bool, {
				name: "Reconnecting",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetStreamStatus({
				address: socket.value,
			});
			io.active(result.outputActive);
			io.reconnecting(result.outputReconnecting);
		},
	})
	.addSchema("ToggleStream", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Toggle Stream",
		description: "Toggles the stream output.",
		io: (c) => ({ active: c.out.data("active", t.Bool, { name: "Active" }) }),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.ToggleStream({
				address: socket.value,
			});
			io.active(result.outputActive);
		},
	})
	.addSchema("StartStream", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Start Stream",
		description: "Starts streaming.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.StartStream({ address: socket.value });
		},
	})
	.addSchema("StopStream", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Stop Stream",
		description: "Stops streaming.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.StopStream({ address: socket.value });
		},
	})
	.addSchema("SendStreamCaption", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Send Stream Caption",
		description: "Sends a caption to the stream.",
		io: (c) => ({
			text: c.in.data("text", t.String, { name: "Caption Text" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SendStreamCaption({
				address: socket.value,
				captionText: io.text,
			});
		},
	})
	// Recording
	.addSchema("GetRecordStatus", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Record Status",
		description: "Gets record output status.",
		io: (c) => ({
			active: c.out.data("active", t.Bool, { name: "Active" }),
			paused: c.out.data("paused", t.Bool, { name: "Paused" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetRecordStatus({
				address: socket.value,
			});
			io.active(result.outputActive);
			io.paused(result.outputPaused);
		},
	})
	.addSchema("ToggleRecord", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Toggle Record",
		description: "Toggles recording.",
		io: (c) => ({ active: c.out.data("active", t.Bool, { name: "Active" }) }),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.ToggleRecord({
				address: socket.value,
			});
			io.active(result.outputActive);
		},
	})
	.addSchema("StartRecord", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Start Record",
		description: "Starts recording.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.StartRecord({ address: socket.value });
		},
	})
	.addSchema("StopRecord", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Stop Record",
		description: "Stops recording.",
		io: (c) => ({
			path: c.out.data("path", t.String, { name: "Output Path" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.StopRecord({ address: socket.value });
			io.path(result.outputPath);
		},
	})
	.addSchema("ToggleRecordPause", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Toggle Record Pause",
		description: "Toggles record pause.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.ToggleRecordPause({ address: socket.value });
		},
	})
	.addSchema("PauseRecord", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Pause Record",
		description: "Pauses recording.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.PauseRecord({ address: socket.value });
		},
	})
	.addSchema("ResumeRecord", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Resume Record",
		description: "Resumes recording.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.ResumeRecord({ address: socket.value });
		},
	})
	.addSchema("SplitRecordFile", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Split Record File",
		description: "Splits the current record file.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.SplitRecordFile({ address: socket.value });
		},
	})
	.addSchema("CreateRecordChapter", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Create Record Chapter",
		description: "Creates a chapter in the recording.",
		io: (c) => ({
			name: c.in.data("name", t.String, { name: "Chapter Name" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.CreateRecordChapter({
				address: socket.value,
				chapterName: io.name,
			});
		},
	})
	// Replay Buffer
	.addSchema("GetReplayBufferStatus", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Replay Buffer Status",
		description: "Gets replay buffer status.",
		io: (c) => ({ active: c.out.data("active", t.Bool, { name: "Active" }) }),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetReplayBufferStatus({
				address: socket.value,
			});
			io.active(result.outputActive);
		},
	})
	.addSchema("ToggleReplayBuffer", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Toggle Replay Buffer",
		description: "Toggles replay buffer.",
		io: (c) => ({ active: c.out.data("active", t.Bool, { name: "Active" }) }),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.ToggleReplayBuffer({
				address: socket.value,
			});
			io.active(result.outputActive);
		},
	})
	.addSchema("StartReplayBuffer", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Start Replay Buffer",
		description: "Starts replay buffer.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.StartReplayBuffer({ address: socket.value });
		},
	})
	.addSchema("StopReplayBuffer", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Stop Replay Buffer",
		description: "Stops replay buffer.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.StopReplayBuffer({ address: socket.value });
		},
	})
	.addSchema("SaveReplayBuffer", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Save Replay Buffer",
		description: "Saves the replay buffer.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.SaveReplayBuffer({ address: socket.value });
		},
	})
	.addSchema("GetLastReplayBufferReplay", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Last Replay Buffer Replay",
		description: "Gets the last replay buffer path.",
		io: (c) => ({ path: c.out.data("path", t.String, { name: "Saved Path" }) }),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetLastReplayBufferReplay({
				address: socket.value,
			});
			io.path(result.savedReplayPath);
		},
	})
	// Virtual Camera
	.addSchema("GetVirtualCamStatus", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Virtual Cam Status",
		description: "Gets virtual camera status.",
		io: (c) => ({ active: c.out.data("active", t.Bool, { name: "Active" }) }),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetVirtualCamStatus({
				address: socket.value,
			});
			io.active(result.outputActive);
		},
	})
	.addSchema("ToggleVirtualCam", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Toggle Virtual Cam",
		description: "Toggles virtual camera.",
		io: (c) => ({ active: c.out.data("active", t.Bool, { name: "Active" }) }),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.ToggleVirtualCam({
				address: socket.value,
			});
			io.active(result.outputActive);
		},
	})
	.addSchema("StartVirtualCam", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Start Virtual Cam",
		description: "Starts virtual camera.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.StartVirtualCam({ address: socket.value });
		},
	})
	.addSchema("StopVirtualCam", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Stop Virtual Cam",
		description: "Stops virtual camera.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.StopVirtualCam({ address: socket.value });
		},
	})
	// Scenes
	.addSchema("GetSceneList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene List",
		description: "Gets all scenes.",
		io: (c) => ({
			currentProgram: c.out.data("currentProgram", t.String, {
				name: "Current Program Scene",
			}),
			scenes: c.out.data("scenes", t.List(t.String), { name: "Scene Names" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSceneList({
				address: socket.value,
			});
			io.currentProgram(result.currentProgramSceneName || "");
			io.scenes(result.scenes.map((s) => s.sceneName));
		},
	})
	.addSchema("GetGroupList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Group List",
		description: "Gets all groups.",
		io: (c) => ({
			groups: c.out.data("groups", t.List(t.String), { name: "Groups" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetGroupList({
				address: socket.value,
			});
			io.groups([...result.groups]);
		},
	})
	.addSchema("GetCurrentPreviewScene", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Current Preview Scene",
		description: "Gets current preview scene.",
		io: (c) => ({
			scene: c.out.data("scene", t.String, { name: "Scene Name" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetCurrentPreviewScene({
				address: socket.value,
			});
			io.scene(result.sceneName);
		},
	})
	.addSchema("SetCurrentPreviewScene", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Current Preview Scene",
		description: "Sets current preview scene.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetCurrentPreviewScene({
				address: socket.value,
				sceneName: io.scene,
			});
		},
	})
	.addSchema("CreateScene", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Create Scene",
		description: "Creates a new scene.",
		io: (c) => ({ name: c.in.data("name", t.String, { name: "Scene Name" }) }),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.CreateScene({
				address: socket.value,
				sceneName: io.name,
			});
		},
	})
	.addSchema("RemoveScene", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Remove Scene",
		description: "Removes a scene.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.RemoveScene({
				address: socket.value,
				sceneName: io.name,
			});
		},
	})
	.addSchema("SetSceneName", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Scene Name",
		description: "Renames a scene.",
		io: (c) => ({
			oldName: c.in.data("oldName", t.String, {
				name: "Current Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			newName: c.in.data("newName", t.String, { name: "New Name" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetSceneName({
				address: socket.value,
				sceneName: io.oldName,
				newSceneName: io.newName,
			});
		},
	})
	.addSchema("GetSceneSceneTransitionOverride", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene Transition Override",
		description: "Gets scene transition override.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			transition: c.out.data("transition", t.String, {
				name: "Transition Name",
			}),
			duration: c.out.data("duration", t.Int, { name: "Duration (ms)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSceneSceneTransitionOverride({
				address: socket.value,
				sceneName: io.scene,
			});
			io.transition(result.transitionName || "");
			io.duration(result.transitionDuration || 0);
		},
	})
	.addSchema("SetSceneSceneTransitionOverride", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Scene Transition Override",
		description: "Sets scene transition override.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			transition: c.in.data("transition", t.String, {
				name: "Transition Name",
			}),
			duration: c.in.data("duration", t.Int, { name: "Duration (ms)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetSceneSceneTransitionOverride({
				address: socket.value,
				sceneName: io.scene,
				transitionName: io.transition,
				transitionDuration: io.duration,
			});
		},
	})
	// Scene Items
	.addSchema("GetSceneItemList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene Item List",
		description: "Gets scene items in a scene.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.GetSceneItemList({
				address: socket.value,
				sceneName: io.scene,
			});
		},
	})
	.addSchema("GetGroupSceneItemList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Group Scene Item List",
		description: "Gets scene items in a group.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.GetGroupSceneItemList({
				address: socket.value,
				sceneName: io.scene,
			});
		},
	})
	.addSchema("GetSceneItemId", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene Item ID",
		description: "Gets a scene item ID by name.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			source: c.in.data("source", t.String, {
				name: "Source Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			itemId: c.out.data("itemId", t.Int, { name: "Scene Item ID" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSceneItemId({
				address: socket.value,
				sceneName: io.scene,
				sourceName: io.source,
			});
			io.itemId(result.sceneItemId);
		},
	})
	.addSchema("GetSceneItemSource", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene Item Source",
		description: "Gets the source of a scene item.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			source: c.out.data("source", t.String, { name: "Source Name" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSceneItemSource({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
			});
			io.source(result.sourceName);
		},
	})
	.addSchema("CreateSceneItem", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Create Scene Item",
		description: "Creates a scene item from a source.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			source: c.in.data("source", t.String, {
				name: "Source Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			itemId: c.out.data("itemId", t.Int, { name: "Scene Item ID" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.CreateSceneItem({
				address: socket.value,
				sceneName: io.scene,
				sourceName: io.source,
			});
			io.itemId(result.sceneItemId);
		},
	})
	.addSchema("RemoveSceneItem", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Remove Scene Item",
		description: "Removes a scene item.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.RemoveSceneItem({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
			});
		},
	})
	.addSchema("DuplicateSceneItem", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Duplicate Scene Item",
		description: "Duplicates a scene item.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			newItemId: c.out.data("newItemId", t.Int, { name: "New Scene Item ID" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.DuplicateSceneItem({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
			});
			io.newItemId(result.sceneItemId);
		},
	})
	.addSchema("GetSceneItemTransform", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene Item Transform",
		description: "Gets scene item transform.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			transform: c.out.data("transform", t.String, {
				name: "Transform (JSON)",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSceneItemTransform({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
			});
			io.transform(JSON.stringify(result.sceneItemTransform));
		},
	})
	.addSchema("SetSceneItemTransform", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Scene Item Transform",
		description: "Sets scene item transform.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			transform: c.in.data("transform", t.String, { name: "Transform (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetSceneItemTransform({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
				sceneItemTransform: JSON.parse(io.transform),
			});
		},
	})
	.addSchema("GetSceneItemEnabled", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene Item Enabled",
		description: "Gets if scene item is enabled.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			enabled: c.out.data("enabled", t.Bool, { name: "Enabled" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSceneItemEnabled({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
			});
			io.enabled(result.sceneItemEnabled);
		},
	})
	.addSchema("SetSceneItemEnabled", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Scene Item Enabled",
		description: "Sets if scene item is enabled.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			enabled: c.in.data("enabled", t.Bool, { name: "Enabled" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetSceneItemEnabled({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
				sceneItemEnabled: io.enabled,
			});
		},
	})
	.addSchema("GetSceneItemLocked", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene Item Locked",
		description: "Gets if scene item is locked.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			locked: c.out.data("locked", t.Bool, { name: "Locked" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSceneItemLocked({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
			});
			io.locked(result.sceneItemLocked);
		},
	})
	.addSchema("SetSceneItemLocked", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Scene Item Locked",
		description: "Sets if scene item is locked.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			locked: c.in.data("locked", t.Bool, { name: "Locked" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetSceneItemLocked({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
				sceneItemLocked: io.locked,
			});
		},
	})
	.addSchema("GetSceneItemIndex", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene Item Index",
		description: "Gets scene item index.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			index: c.out.data("index", t.Int, { name: "Index" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSceneItemIndex({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
			});
			io.index(result.sceneItemIndex);
		},
	})
	.addSchema("SetSceneItemIndex", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Scene Item Index",
		description: "Sets scene item index.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			index: c.in.data("index", t.Int, { name: "Index" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetSceneItemIndex({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
				sceneItemIndex: io.index,
			});
		},
	})
	.addSchema("GetSceneItemBlendMode", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene Item Blend Mode",
		description: "Gets scene item blend mode.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			blendMode: c.out.data("blendMode", t.String, { name: "Blend Mode" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSceneItemBlendMode({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
			});
			io.blendMode(result.sceneItemBlendMode);
		},
	})
	.addSchema("SetSceneItemBlendMode", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Scene Item Blend Mode",
		description: "Sets scene item blend mode.",
		io: (c) => ({
			scene: c.in.data("scene", t.String, {
				name: "Scene Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneList({ address: socket.value })
						.pipe(Effect.map((v) => v.scenes.map((s) => s.sceneName))),
			}),
			itemId: c.in.data("itemId", t.Int, { name: "Scene Item ID" }),
			blendMode: c.in.data("blendMode", t.String, {
				name: "Blend Mode",
				suggestions: () =>
					Effect.succeed([
						"OBS_BLEND_NORMAL",
						"OBS_BLEND_ADDITIVE",
						"OBS_BLEND_SUBTRACT",
						"OBS_BLEND_SCREEN",
						"OBS_BLEND_MULTIPLY",
						"OBS_BLEND_LIGHTEN",
						"OBS_BLEND_DARKEN",
					]),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetSceneItemBlendMode({
				address: socket.value,
				sceneName: io.scene,
				sceneItemId: io.itemId,
				sceneItemBlendMode: io.blendMode,
			});
		},
	})
	// Inputs/Sources
	.addSchema("GetInputList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input List",
		description: "Gets all inputs.",
		io: (c) => ({
			inputs: c.out.data("inputs", t.List(t.String), { name: "Input Names" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputList({
				address: socket.value,
			});
			io.inputs(result.inputs.map((i: any) => i.inputName));
		},
	})
	.addSchema("GetInputKindList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Kind List",
		description: "Gets all input kinds.",
		io: (c) => ({
			kinds: c.out.data("kinds", t.List(t.String), { name: "Input Kinds" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputKindList({
				address: socket.value,
			});
			io.kinds([...result.inputKinds]);
		},
	})
	.addSchema("GetSpecialInputs", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Special Inputs",
		description: "Gets special input names.",
		io: (c) => ({
			desktop1: c.out.data("desktop1", t.String, { name: "Desktop Audio 1" }),
			desktop2: c.out.data("desktop2", t.String, { name: "Desktop Audio 2" }),
			mic1: c.out.data("mic1", t.String, { name: "Mic/Aux 1" }),
			mic2: c.out.data("mic2", t.String, { name: "Mic/Aux 2" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSpecialInputs({
				address: socket.value,
			});
			io.desktop1(result.desktop1 || "");
			io.desktop2(result.desktop2 || "");
			io.mic1(result.mic1 || "");
			io.mic2(result.mic2 || "");
		},
	})
	.addSchema("RemoveInput", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Remove Input",
		description: "Removes an input.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.RemoveInput({
				address: socket.value,
				inputName: io.name,
			});
		},
	})
	.addSchema("SetInputName", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Input Name",
		description: "Renames an input.",
		io: (c) => ({
			oldName: c.in.data("oldName", t.String, {
				name: "Current Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			newName: c.in.data("newName", t.String, { name: "New Name" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetInputName({
				address: socket.value,
				inputName: io.oldName,
				newInputName: io.newName,
			});
		},
	})
	.addSchema("GetInputDefaultSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Default Settings",
		description: "Gets default settings for an input kind.",
		io: (c) => ({
			kind: c.in.data("kind", t.String, { name: "Input Kind" }),
			settings: c.out.data("settings", t.String, { name: "Settings (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputDefaultSettings({
				address: socket.value,
				inputKind: io.kind,
			});
			io.settings(JSON.stringify(result.defaultInputSettings));
		},
	})
	.addSchema("GetInputSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Settings",
		description: "Gets input settings.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			settings: c.out.data("settings", t.String, { name: "Settings (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputSettings({
				address: socket.value,
				inputName: io.name,
			});
			io.settings(JSON.stringify(result.inputSettings));
		},
	})
	.addSchema("SetInputSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Input Settings",
		description: "Sets input settings.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			settings: c.in.data("settings", t.String, { name: "Settings (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetInputSettings({
				address: socket.value,
				inputName: io.name,
				inputSettings: JSON.parse(io.settings),
			});
		},
	})
	.addSchema("GetInputMute", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Mute",
		description: "Gets input mute state.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			muted: c.out.data("muted", t.Bool, { name: "Muted" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputMute({
				address: socket.value,
				inputName: io.name,
			});
			io.muted(result.inputMuted);
		},
	})
	.addSchema("SetInputMute", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Input Mute",
		description: "Sets input mute state.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			muted: c.in.data("muted", t.Bool, { name: "Muted" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetInputMute({
				address: socket.value,
				inputName: io.name,
				inputMuted: io.muted,
			});
		},
	})
	.addSchema("ToggleInputMute", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Toggle Input Mute",
		description: "Toggles input mute.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			muted: c.out.data("muted", t.Bool, { name: "Muted" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.ToggleInputMute({
				address: socket.value,
				inputName: io.name,
			});
			io.muted(result.inputMuted);
		},
	})
	.addSchema("GetInputVolume", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Volume",
		description: "Gets input volume.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			volumeMul: c.out.data("volumeMul", t.Float, {
				name: "Volume Multiplier",
			}),
			volumeDb: c.out.data("volumeDb", t.Float, { name: "Volume (dB)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputVolume({
				address: socket.value,
				inputName: io.name,
			});
			io.volumeMul(result.inputVolumeMul);
			io.volumeDb(result.inputVolumeDb);
		},
	})
	.addSchema("SetInputVolume", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Input Volume",
		description: "Sets input volume.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			volumeMul: c.in.data("volumeMul", t.Float, { name: "Volume Multiplier" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetInputVolume({
				address: socket.value,
				inputName: io.name,
				inputVolumeMul: io.volumeMul,
			});
		},
	})
	.addSchema("GetInputAudioBalance", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Audio Balance",
		description: "Gets input audio balance.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			balance: c.out.data("balance", t.Float, { name: "Balance" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputAudioBalance({
				address: socket.value,
				inputName: io.name,
			});
			io.balance(result.inputAudioBalance);
		},
	})
	.addSchema("SetInputAudioBalance", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Input Audio Balance",
		description: "Sets input audio balance.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			balance: c.in.data("balance", t.Float, { name: "Balance (0.0-1.0)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetInputAudioBalance({
				address: socket.value,
				inputName: io.name,
				inputAudioBalance: io.balance,
			});
		},
	})
	.addSchema("GetInputAudioSyncOffset", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Audio Sync Offset",
		description: "Gets input audio sync offset.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			offset: c.out.data("offset", t.Int, { name: "Offset (ms)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputAudioSyncOffset({
				address: socket.value,
				inputName: io.name,
			});
			io.offset(result.inputAudioSyncOffset);
		},
	})
	.addSchema("SetInputAudioSyncOffset", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Input Audio Sync Offset",
		description: "Sets input audio sync offset.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			offset: c.in.data("offset", t.Int, { name: "Offset (ms)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetInputAudioSyncOffset({
				address: socket.value,
				inputName: io.name,
				inputAudioSyncOffset: io.offset,
			});
		},
	})
	.addSchema("GetInputAudioMonitorType", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Audio Monitor Type",
		description: "Gets input audio monitor type.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			monitorType: c.out.data("monitorType", t.String, {
				name: "Monitor Type",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputAudioMonitorType({
				address: socket.value,
				inputName: io.name,
			});
			io.monitorType(result.monitorType);
		},
	})
	.addSchema("SetInputAudioMonitorType", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Input Audio Monitor Type",
		description: "Sets input audio monitor type.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			monitorType: c.in.data("monitorType", t.String, {
				name: "Monitor Type",
				suggestions: () =>
					Effect.succeed([
						"OBS_MONITORING_TYPE_NONE",
						"OBS_MONITORING_TYPE_MONITOR_ONLY",
						"OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT",
					]),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetInputAudioMonitorType({
				address: socket.value,
				inputName: io.name,
				monitorType: io.monitorType,
			});
		},
	})
	.addSchema("GetInputAudioTracks", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Audio Tracks",
		description: "Gets input audio tracks.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			tracks: c.out.data("tracks", t.String, { name: "Tracks (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputAudioTracks({
				address: socket.value,
				inputName: io.name,
			});
			io.tracks(JSON.stringify(result.inputAudioTracks));
		},
	})
	.addSchema("SetInputAudioTracks", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Input Audio Tracks",
		description: "Sets input audio tracks.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			tracks: c.in.data("tracks", t.String, { name: "Tracks (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetInputAudioTracks({
				address: socket.value,
				inputName: io.name,
				inputAudioTracks: JSON.parse(io.tracks),
			});
		},
	})
	.addSchema("GetInputPropertiesListPropertyItems", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Properties List Property Items",
		description: "Gets list property items.",
		io: (c) => ({
			inputName: c.in.data("inputName", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			propertyName: c.in.data("propertyName", t.String, {
				name: "Property Name",
			}),
			items: c.out.data("items", t.String, { name: "Items (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputPropertiesListPropertyItems({
				address: socket.value,
				inputName: io.inputName,
				propertyName: io.propertyName,
			});
			io.items(JSON.stringify(result.propertyItems));
		},
	})
	.addSchema("PressInputPropertiesButton", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Press Input Properties Button",
		description: "Presses a button in input properties.",
		io: (c) => ({
			inputName: c.in.data("inputName", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			propertyName: c.in.data("propertyName", t.String, {
				name: "Property Name",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.PressInputPropertiesButton({
				address: socket.value,
				inputName: io.inputName,
				propertyName: io.propertyName,
			});
		},
	})
	.addSchema("GetInputDeinterlaceMode", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Deinterlace Mode",
		description: "Gets input deinterlace mode.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			mode: c.out.data("mode", t.String, { name: "Deinterlace Mode" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputDeinterlaceMode({
				address: socket.value,
				inputName: io.name,
			});
			io.mode(result.inputDeinterlaceMode);
		},
	})
	.addSchema("SetInputDeinterlaceMode", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Input Deinterlace Mode",
		description: "Sets input deinterlace mode.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			mode: c.in.data("mode", t.String, {
				name: "Deinterlace Mode",
				suggestions: () =>
					Effect.succeed([
						"OBS_DEINTERLACE_MODE_DISABLE",
						"OBS_DEINTERLACE_MODE_DISCARD",
						"OBS_DEINTERLACE_MODE_RETRO",
						"OBS_DEINTERLACE_MODE_BLEND",
						"OBS_DEINTERLACE_MODE_BLEND_2X",
						"OBS_DEINTERLACE_MODE_LINEAR",
						"OBS_DEINTERLACE_MODE_LINEAR_2X",
						"OBS_DEINTERLACE_MODE_YADIF",
						"OBS_DEINTERLACE_MODE_YADIF_2X",
					]),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetInputDeinterlaceMode({
				address: socket.value,
				inputName: io.name,
				inputDeinterlaceMode: io.mode,
			});
		},
	})
	.addSchema("GetInputDeinterlaceFieldOrder", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Input Deinterlace Field Order",
		description: "Gets input deinterlace field order.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			order: c.out.data("order", t.String, { name: "Field Order" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetInputDeinterlaceFieldOrder({
				address: socket.value,
				inputName: io.name,
			});
			io.order(result.inputDeinterlaceFieldOrder);
		},
	})
	.addSchema("SetInputDeinterlaceFieldOrder", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Input Deinterlace Field Order",
		description: "Sets input deinterlace field order.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			order: c.in.data("order", t.String, {
				name: "Field Order",
				suggestions: () =>
					Effect.succeed([
						"OBS_DEINTERLACE_FIELD_ORDER_TOP",
						"OBS_DEINTERLACE_FIELD_ORDER_BOTTOM",
					]),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetInputDeinterlaceFieldOrder({
				address: socket.value,
				inputName: io.name,
				inputDeinterlaceFieldOrder: io.order,
			});
		},
	})
	.addSchema("GetSourceActive", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Source Active",
		description: "Gets if a source is active.",
		io: (c) => ({
			name: c.in.data("name", t.String, { name: "Source Name" }),
			active: c.out.data("active", t.Bool, { name: "Active" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSourceActive({
				address: socket.value,
				sourceName: io.name,
			});
			io.active(result.videoActive);
		},
	})
	.addSchema("GetSourceScreenshot", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Source Screenshot",
		description: "Gets a base64 screenshot of a source.",
		io: (c) => ({
			name: c.in.data("name", t.String, { name: "Source Name" }),
			format: c.in.data("format", t.String, { name: "Image Format" }),
			width: c.in.data("width", t.Int, { name: "Width" }),
			height: c.in.data("height", t.Int, { name: "Height" }),
			data: c.out.data("data", t.String, { name: "Image Data (Base64)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSourceScreenshot({
				address: socket.value,
				sourceName: io.name,
				imageFormat: io.format,
				imageWidth: io.width,
				imageHeight: io.height,
			});
			io.data(result.imageData);
		},
	})
	.addSchema("SaveSourceScreenshot", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Save Source Screenshot",
		description: "Saves a screenshot of a source to file.",
		io: (c) => ({
			name: c.in.data("name", t.String, { name: "Source Name" }),
			format: c.in.data("format", t.String, { name: "Image Format" }),
			filePath: c.in.data("filePath", t.String, { name: "File Path" }),
			width: c.in.data("width", t.Int, { name: "Width" }),
			height: c.in.data("height", t.Int, { name: "Height" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SaveSourceScreenshot({
				address: socket.value,
				sourceName: io.name,
				imageFormat: io.format,
				imageFilePath: io.filePath,
				imageWidth: io.width,
				imageHeight: io.height,
			});
		},
	})
	// Filters
	.addSchema("GetSourceFilterList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Source Filter List",
		description: "Gets all filters on a source.",
		io: (c) => ({
			source: c.in.data("source", t.String, {
				name: "Source Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			filters: c.out.data("filters", t.List(t.String), {
				name: "Filter Names",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSourceFilterList({
				address: socket.value,
				sourceName: io.source,
			});
			io.filters(result.filters.map((f: any) => f.filterName));
		},
	})
	.addSchema("GetSourceFilterDefaultSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Source Filter Default Settings",
		description: "Gets default settings for a filter kind.",
		io: (c) => ({
			kind: c.in.data("kind", t.String, {
				name: "Filter Kind",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSourceFilterKindList({ address: socket.value })
						.pipe(Effect.map((v) => [...v.sourceFilterKinds])),
			}),
			settings: c.out.data("settings", t.String, { name: "Settings (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSourceFilterDefaultSettings({
				address: socket.value,
				filterKind: io.kind,
			});
			io.settings(JSON.stringify(result.defaultFilterSettings));
		},
	})
	.addSchema("CreateSourceFilter", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Create Source Filter",
		description: "Creates a filter on a source.",
		io: (c) => ({
			source: c.in.data("source", t.String, {
				name: "Source Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			filter: c.in.data("filter", t.String, { name: "Filter Name" }),
			kind: c.in.data("kind", t.String, {
				name: "Filter Kind",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSourceFilterKindList({ address: socket.value })
						.pipe(Effect.map((v) => [...v.sourceFilterKinds])),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.CreateSourceFilter({
				address: socket.value,
				sourceName: io.source,
				filterName: io.filter,
				filterKind: io.kind,
			});
		},
	})
	.addSchema("RemoveSourceFilter", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Remove Source Filter",
		description: "Removes a filter from a source.",
		io: (c) => ({
			source: c.in.data("source", t.String, {
				name: "Source Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			filter: c.in.data("filter", t.String, { name: "Filter Name" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.RemoveSourceFilter({
				address: socket.value,
				sourceName: io.source,
				filterName: io.filter,
			});
		},
	})
	.addSchema("SetSourceFilterName", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Source Filter Name",
		description: "Renames a filter.",
		io: (c) => ({
			source: c.in.data("source", t.String, {
				name: "Source Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			oldName: c.in.data("oldName", t.String, { name: "Current Filter Name" }),
			newName: c.in.data("newName", t.String, { name: "New Filter Name" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetSourceFilterName({
				address: socket.value,
				sourceName: io.source,
				filterName: io.oldName,
				newFilterName: io.newName,
			});
		},
	})
	.addSchema("GetSourceFilter", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Source Filter",
		description: "Gets a filter's settings.",
		io: (c) => ({
			source: c.in.data("source", t.String, {
				name: "Source Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			filter: c.in.data("filter", t.String, { name: "Filter Name" }),
			settings: c.out.data("settings", t.String, { name: "Settings (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSourceFilter({
				address: socket.value,
				sourceName: io.source,
				filterName: io.filter,
			});
			io.settings(JSON.stringify(result.filterSettings));
		},
	})
	.addSchema("SetSourceFilterSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Source Filter Settings",
		description: "Sets a filter's settings.",
		io: (c) => ({
			source: c.in.data("source", t.String, {
				name: "Source Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			filter: c.in.data("filter", t.String, { name: "Filter Name" }),
			settings: c.in.data("settings", t.String, { name: "Settings (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetSourceFilterSettings({
				address: socket.value,
				sourceName: io.source,
				filterName: io.filter,
				filterSettings: JSON.parse(io.settings),
			});
		},
	})
	.addSchema("SetSourceFilterEnabled", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Source Filter Enabled",
		description: "Enables/disables a filter.",
		io: (c) => ({
			source: c.in.data("source", t.String, {
				name: "Source Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			filter: c.in.data("filter", t.String, { name: "Filter Name" }),
			enabled: c.in.data("enabled", t.Bool, { name: "Enabled" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetSourceFilterEnabled({
				address: socket.value,
				sourceName: io.source,
				filterName: io.filter,
				filterEnabled: io.enabled,
			});
		},
	})
	.addSchema("SetSourceFilterIndex", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Source Filter Index",
		description: "Sets a filter's index.",
		io: (c) => ({
			source: c.in.data("source", t.String, {
				name: "Source Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			filter: c.in.data("filter", t.String, { name: "Filter Name" }),
			index: c.in.data("index", t.Int, { name: "Index" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetSourceFilterIndex({
				address: socket.value,
				sourceName: io.source,
				filterName: io.filter,
				filterIndex: io.index,
			});
		},
	})
	.addSchema("GetSourceFilterKindList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Source Filter Kind List",
		description: "Gets all filter kinds.",
		io: (c) => ({
			kinds: c.out.data("kinds", t.List(t.String), { name: "Filter Kinds" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSourceFilterKindList({
				address: socket.value,
			});
			io.kinds([...result.sourceFilterKinds]);
		},
	})
	// Transitions
	.addSchema("GetSceneTransitionList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Scene Transition List",
		description: "Gets all transitions.",
		io: (c) => ({
			current: c.out.data("current", t.String, { name: "Current Transition" }),
			transitions: c.out.data("transitions", t.List(t.String), {
				name: "Transitions",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetSceneTransitionList({
				address: socket.value,
			});
			io.current(result.currentSceneTransitionName || "");
			io.transitions(result.transitions.map((t: any) => t.transitionName));
		},
	})
	.addSchema("GetCurrentSceneTransition", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Current Scene Transition",
		description: "Gets current scene transition.",
		io: (c) => ({
			name: c.out.data("name", t.String, { name: "Transition Name" }),
			duration: c.out.data("duration", t.Int, { name: "Duration (ms)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetCurrentSceneTransition({
				address: socket.value,
			});
			io.name(result.transitionName);
			io.duration(result.transitionDuration || 0);
		},
	})
	.addSchema("SetCurrentSceneTransition", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Current Scene Transition",
		description: "Sets current scene transition.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Transition Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetSceneTransitionList({ address: socket.value })
						.pipe(
							Effect.map((v) =>
								v.transitions.map((t: any) => t.transitionName),
							),
						),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetCurrentSceneTransition({
				address: socket.value,
				transitionName: io.name,
			});
		},
	})
	.addSchema("SetCurrentSceneTransitionDuration", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Current Scene Transition Duration",
		description: "Sets current transition duration.",
		io: (c) => ({
			duration: c.in.data("duration", t.Int, { name: "Duration (ms)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetCurrentSceneTransitionDuration({
				address: socket.value,
				transitionDuration: io.duration,
			});
		},
	})
	.addSchema("SetCurrentSceneTransitionSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Current Scene Transition Settings",
		description: "Sets current transition settings.",
		io: (c) => ({
			settings: c.in.data("settings", t.String, { name: "Settings (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetCurrentSceneTransitionSettings({
				address: socket.value,
				transitionSettings: JSON.parse(io.settings),
			});
		},
	})
	.addSchema("GetCurrentSceneTransitionCursor", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Current Scene Transition Cursor",
		description: "Gets current transition cursor position.",
		io: (c) => ({
			cursor: c.out.data("cursor", t.Float, { name: "Cursor Position" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetCurrentSceneTransitionCursor({
				address: socket.value,
			});
			io.cursor(result.transitionCursor);
		},
	})
	.addSchema("TriggerStudioModeTransition", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Trigger Studio Mode Transition",
		description: "Triggers a studio mode transition.",
		io: (_c) => ({}),
		run: function* ({ properties: { socket } }) {
			yield* socket.engine.TriggerStudioModeTransition({
				address: socket.value,
			});
		},
	})
	.addSchema("SetTBarPosition", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set T-Bar Position",
		description: "Sets T-Bar position.",
		io: (c) => ({
			position: c.in.data("position", t.Float, { name: "Position (0.0-1.0)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetTBarPosition({
				address: socket.value,
				position: io.position,
			});
		},
	})
	.addSchema("GetTransitionKindList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Transition Kind List",
		description: "Gets all transition kinds.",
		io: (c) => ({
			kinds: c.out.data("kinds", t.List(t.String), {
				name: "Transition Kinds",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetTransitionKindList({
				address: socket.value,
			});
			io.kinds([...result.transitionKinds]);
		},
	})
	.addSchema("GetStudioModeEnabled", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Studio Mode Enabled",
		description: "Gets if studio mode is enabled.",
		io: (c) => ({
			enabled: c.out.data("enabled", t.Bool, { name: "Enabled" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetStudioModeEnabled({
				address: socket.value,
			});
			io.enabled(result.studioModeEnabled);
		},
	})
	.addSchema("SetStudioModeEnabled", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Studio Mode Enabled",
		description: "Enables/disables studio mode.",
		io: (c) => ({ enabled: c.in.data("enabled", t.Bool, { name: "Enabled" }) }),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetStudioModeEnabled({
				address: socket.value,
				studioModeEnabled: io.enabled,
			});
		},
	})
	// Outputs
	.addSchema("GetOutputList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Output List",
		description: "Gets all outputs.",
		io: (c) => ({
			outputs: c.out.data("outputs", t.List(t.String), {
				name: "Output Names",
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetOutputList({
				address: socket.value,
			});
			io.outputs(result.outputs.map((o: any) => o.outputName));
		},
	})
	.addSchema("GetOutputStatus", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Output Status",
		description: "Gets output status.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Output Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetOutputList({ address: socket.value })
						.pipe(Effect.map((v) => v.outputs.map((o: any) => o.outputName))),
			}),
			active: c.out.data("active", t.Bool, { name: "Active" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetOutputStatus({
				address: socket.value,
				outputName: io.name,
			});
			io.active(result.outputActive);
		},
	})
	.addSchema("ToggleOutput", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Toggle Output",
		description: "Toggles an output.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Output Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetOutputList({ address: socket.value })
						.pipe(Effect.map((v) => v.outputs.map((o: any) => o.outputName))),
			}),
			active: c.out.data("active", t.Bool, { name: "Active" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.ToggleOutput({
				address: socket.value,
				outputName: io.name,
			});
			io.active(result.outputActive);
		},
	})
	.addSchema("StartOutput", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Start Output",
		description: "Starts an output.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Output Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetOutputList({ address: socket.value })
						.pipe(Effect.map((v) => v.outputs.map((o: any) => o.outputName))),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.StartOutput({
				address: socket.value,
				outputName: io.name,
			});
		},
	})
	.addSchema("StopOutput", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Stop Output",
		description: "Stops an output.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Output Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetOutputList({ address: socket.value })
						.pipe(Effect.map((v) => v.outputs.map((o: any) => o.outputName))),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.StopOutput({
				address: socket.value,
				outputName: io.name,
			});
		},
	})
	.addSchema("GetOutputSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Output Settings",
		description: "Gets output settings.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Output Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetOutputList({ address: socket.value })
						.pipe(Effect.map((v) => v.outputs.map((o: any) => o.outputName))),
			}),
			settings: c.out.data("settings", t.String, { name: "Settings (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetOutputSettings({
				address: socket.value,
				outputName: io.name,
			});
			io.settings(JSON.stringify(result.outputSettings));
		},
	})
	.addSchema("SetOutputSettings", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Output Settings",
		description: "Sets output settings.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Output Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetOutputList({ address: socket.value })
						.pipe(Effect.map((v) => v.outputs.map((o: any) => o.outputName))),
			}),
			settings: c.in.data("settings", t.String, { name: "Settings (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetOutputSettings({
				address: socket.value,
				outputName: io.name,
				outputSettings: JSON.parse(io.settings),
			});
		},
	})
	// Media Inputs
	.addSchema("GetMediaInputStatus", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Media Input Status",
		description: "Gets media input status.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			state: c.out.data("state", t.String, { name: "Media State" }),
			duration: c.out.data("duration", t.Int, { name: "Duration (ms)" }),
			cursor: c.out.data("cursor", t.Int, { name: "Cursor (ms)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetMediaInputStatus({
				address: socket.value,
				inputName: io.name,
			});
			io.state(result.mediaState);
			io.duration(result.mediaDuration || 0);
			io.cursor(result.mediaCursor || 0);
		},
	})
	.addSchema("SetMediaInputCursor", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Set Media Input Cursor",
		description: "Sets media cursor position.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			cursor: c.in.data("cursor", t.Int, { name: "Cursor (ms)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.SetMediaInputCursor({
				address: socket.value,
				inputName: io.name,
				mediaCursor: io.cursor,
			});
		},
	})
	.addSchema("OffsetMediaInputCursor", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Offset Media Input Cursor",
		description: "Offsets media cursor position.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			offset: c.in.data("offset", t.Int, { name: "Offset (ms)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.OffsetMediaInputCursor({
				address: socket.value,
				inputName: io.name,
				mediaCursorOffset: io.offset,
			});
		},
	})
	.addSchema("TriggerMediaInputAction", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Trigger Media Input Action",
		description: "Triggers a media action.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			action: c.in.data("action", t.String, {
				name: "Media Action",
				suggestions: () =>
					Effect.succeed([
						"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NONE",
						"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY",
						"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE",
						"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
						"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
						"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT",
						"OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS",
					]),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.TriggerMediaInputAction({
				address: socket.value,
				inputName: io.name,
				mediaAction: io.action,
			});
		},
	})
	// Hotkeys
	.addSchema("GetHotkeyList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Hotkey List",
		description: "Gets all hotkeys.",
		io: (c) => ({
			hotkeys: c.out.data("hotkeys", t.List(t.String), { name: "Hotkeys" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetHotkeyList({
				address: socket.value,
			});
			io.hotkeys([...result.hotkeys]);
		},
	})
	.addSchema("TriggerHotkeyByName", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Trigger Hotkey By Name",
		description: "Triggers a hotkey by name.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Hotkey Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetHotkeyList({ address: socket.value })
						.pipe(Effect.map((v) => [...v.hotkeys])),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.TriggerHotkeyByName({
				address: socket.value,
				hotkeyName: io.name,
			});
		},
	})
	.addSchema("TriggerHotkeyByKeySequence", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Trigger Hotkey By Key Sequence",
		description: "Triggers a hotkey by key sequence.",
		io: (c) => ({
			keyId: c.in.data("keyId", t.String, { name: "Key ID" }),
			shift: c.in.data("shift", t.Bool, { name: "Shift" }),
			control: c.in.data("control", t.Bool, { name: "Control" }),
			alt: c.in.data("alt", t.Bool, { name: "Alt" }),
			command: c.in.data("command", t.Bool, { name: "Command" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.TriggerHotkeyByKeySequence({
				address: socket.value,
				keyId: io.keyId,
				keyModifiers: {
					shift: io.shift,
					control: io.control,
					alt: io.alt,
					command: io.command,
				},
			});
		},
	})
	// UI/Dialogs
	.addSchema("GetMonitorList", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Get Monitor List",
		description: "Gets all monitors.",
		io: (c) => ({
			monitors: c.out.data("monitors", t.String, { name: "Monitors (JSON)" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			const result = yield* socket.engine.GetMonitorList({
				address: socket.value,
			});
			io.monitors(JSON.stringify(result.monitors));
		},
	})
	.addSchema("OpenInputPropertiesDialog", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Open Input Properties Dialog",
		description: "Opens input properties dialog.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.OpenInputPropertiesDialog({
				address: socket.value,
				inputName: io.name,
			});
		},
	})
	.addSchema("OpenInputFiltersDialog", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Open Input Filters Dialog",
		description: "Opens input filters dialog.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.OpenInputFiltersDialog({
				address: socket.value,
				inputName: io.name,
			});
		},
	})
	.addSchema("OpenInputInteractDialog", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Open Input Interact Dialog",
		description: "Opens input interact dialog.",
		io: (c) => ({
			name: c.in.data("name", t.String, {
				name: "Input Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.OpenInputInteractDialog({
				address: socket.value,
				inputName: io.name,
			});
		},
	})
	.addSchema("OpenVideoMixProjector", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Open Video Mix Projector",
		description: "Opens a video mix projector.",
		io: (c) => ({
			type: c.in.data("type", t.String, {
				name: "Video Mix Type",
				suggestions: () =>
					Effect.succeed([
						"OBS_WEBSOCKET_VIDEO_MIX_TYPE_PREVIEW",
						"OBS_WEBSOCKET_VIDEO_MIX_TYPE_PROGRAM",
						"OBS_WEBSOCKET_VIDEO_MIX_TYPE_MULTIVIEW",
					]),
			}),
			monitor: c.in.data("monitor", t.Int, { name: "Monitor Index" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.OpenVideoMixProjector({
				address: socket.value,
				videoMixType: io.type,
				monitorIndex: io.monitor,
			});
		},
	})
	.addSchema("OpenSourceProjector", {
		type: "exec",
		properties: { socket: OBSSocketProperty },
		name: "Open Source Projector",
		description: "Opens a source projector.",
		io: (c) => ({
			source: c.in.data("source", t.String, {
				name: "Source Name",
				suggestions: ({ properties: { socket } }) =>
					socket.engine
						.GetInputList({ address: socket.value })
						.pipe(Effect.map((v) => v.inputs.map((i: any) => i.inputName))),
			}),
			monitor: c.in.data("monitor", t.Int, { name: "Monitor Index" }),
		}),
		run: function* ({ io, properties: { socket } }) {
			yield* socket.engine.OpenSourceProjector({
				address: socket.value,
				sourceName: io.source,
				monitorIndex: io.monitor,
			});
		},
	});
