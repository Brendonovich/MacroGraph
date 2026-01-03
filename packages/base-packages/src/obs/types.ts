import { Schema as S } from "effect";

export const SocketAddress = S.String.pipe(S.brand("SocketID"));
export type SocketAddress = S.Schema.Type<typeof SocketAddress>;

export namespace Event {
	// ===== General Events =====
	export class ExitStarted extends S.TaggedClass<ExitStarted>()("ExitStarted", {
		address: SocketAddress,
	}) {}

	export class CustomEvent extends S.TaggedClass<CustomEvent>()("CustomEvent", {
		eventData: S.String,
		address: SocketAddress,
	}) {}

	// ===== Config Events =====
	export class CurrentSceneCollectionChanging extends S.TaggedClass<CurrentSceneCollectionChanging>()(
		"CurrentSceneCollectionChanging",
		{ sceneCollectionName: S.String, address: SocketAddress },
	) {}

	export class CurrentSceneCollectionChanged extends S.TaggedClass<CurrentSceneCollectionChanged>()(
		"CurrentSceneCollectionChanged",
		{ sceneCollectionName: S.String, address: SocketAddress },
	) {}

	export class SceneCollectionListChanged extends S.TaggedClass<SceneCollectionListChanged>()(
		"SceneCollectionListChanged",
		{ sceneCollections: S.String, address: SocketAddress },
	) {}

	export class CurrentProfileChanging extends S.TaggedClass<CurrentProfileChanging>()(
		"CurrentProfileChanging",
		{ profileName: S.String, address: SocketAddress },
	) {}

	export class CurrentProfileChanged extends S.TaggedClass<CurrentProfileChanged>()(
		"CurrentProfileChanged",
		{ profileName: S.String, address: SocketAddress },
	) {}

	export class ProfileListChanged extends S.TaggedClass<ProfileListChanged>()(
		"ProfileListChanged",
		{ profiles: S.String, address: SocketAddress },
	) {}

	// ===== Filter Events =====
	export class SourceFilterListReindexed extends S.TaggedClass<SourceFilterListReindexed>()(
		"SourceFilterListReindexed",
		{ sourceName: S.String, filters: S.String, address: SocketAddress },
	) {}

	export class SourceFilterCreated extends S.TaggedClass<SourceFilterCreated>()(
		"SourceFilterCreated",
		{
			sourceName: S.String,
			filterName: S.String,
			filterKind: S.String,
			filterIndex: S.Number,
			filterSettings: S.String,
			address: SocketAddress,
		},
	) {}

	export class SourceFilterRemoved extends S.TaggedClass<SourceFilterRemoved>()(
		"SourceFilterRemoved",
		{ sourceName: S.String, filterName: S.String, address: SocketAddress },
	) {}

	export class SourceFilterNameChanged extends S.TaggedClass<SourceFilterNameChanged>()(
		"SourceFilterNameChanged",
		{
			sourceName: S.String,
			oldFilterName: S.String,
			filterName: S.String,
			address: SocketAddress,
		},
	) {}

	export class SourceFilterSettingsChanged extends S.TaggedClass<SourceFilterSettingsChanged>()(
		"SourceFilterSettingsChanged",
		{
			sourceName: S.String,
			filterName: S.String,
			filterSettings: S.String,
			address: SocketAddress,
		},
	) {}

	export class SourceFilterEnableStateChanged extends S.TaggedClass<SourceFilterEnableStateChanged>()(
		"SourceFilterEnableStateChanged",
		{
			sourceName: S.String,
			filterName: S.String,
			filterEnabled: S.Boolean,
			address: SocketAddress,
		},
	) {}

	// ===== Input Events =====
	export class InputCreated extends S.TaggedClass<InputCreated>()(
		"InputCreated",
		{
			inputName: S.String,
			inputUuid: S.String,
			inputKind: S.String,
			inputSettings: S.String,
			address: SocketAddress,
		},
	) {}

	export class InputRemoved extends S.TaggedClass<InputRemoved>()(
		"InputRemoved",
		{ inputName: S.String, inputUuid: S.String, address: SocketAddress },
	) {}

	export class InputNameChanged extends S.TaggedClass<InputNameChanged>()(
		"InputNameChanged",
		{
			inputUuid: S.String,
			oldInputName: S.String,
			inputName: S.String,
			address: SocketAddress,
		},
	) {}

	export class InputSettingsChanged extends S.TaggedClass<InputSettingsChanged>()(
		"InputSettingsChanged",
		{
			inputName: S.String,
			inputUuid: S.String,
			inputSettings: S.String,
			address: SocketAddress,
		},
	) {}

	export class InputMuteStateChanged extends S.TaggedClass<InputMuteStateChanged>()(
		"InputMuteStateChanged",
		{
			inputName: S.String,
			inputUuid: S.String,
			inputMuted: S.Boolean,
			address: SocketAddress,
		},
	) {}

	export class InputVolumeChanged extends S.TaggedClass<InputVolumeChanged>()(
		"InputVolumeChanged",
		{
			inputName: S.String,
			inputUuid: S.String,
			inputVolumeMul: S.Number,
			inputVolumeDb: S.Number,
			address: SocketAddress,
		},
	) {}

	export class InputAudioBalanceChanged extends S.TaggedClass<InputAudioBalanceChanged>()(
		"InputAudioBalanceChanged",
		{
			inputName: S.String,
			inputUuid: S.String,
			inputAudioBalance: S.Number,
			address: SocketAddress,
		},
	) {}

	export class InputAudioSyncOffsetChanged extends S.TaggedClass<InputAudioSyncOffsetChanged>()(
		"InputAudioSyncOffsetChanged",
		{
			inputName: S.String,
			inputUuid: S.String,
			inputAudioSyncOffset: S.Number,
			address: SocketAddress,
		},
	) {}

	export class InputAudioTracksChanged extends S.TaggedClass<InputAudioTracksChanged>()(
		"InputAudioTracksChanged",
		{
			inputName: S.String,
			inputUuid: S.String,
			inputAudioTracks: S.String,
			address: SocketAddress,
		},
	) {}

	export class InputAudioMonitorTypeChanged extends S.TaggedClass<InputAudioMonitorTypeChanged>()(
		"InputAudioMonitorTypeChanged",
		{
			inputName: S.String,
			inputUuid: S.String,
			monitorType: S.String,
			address: SocketAddress,
		},
	) {}

	// ===== Media Input Events =====
	export class MediaInputPlaybackStarted extends S.TaggedClass<MediaInputPlaybackStarted>()(
		"MediaInputPlaybackStarted",
		{ inputName: S.String, inputUuid: S.String, address: SocketAddress },
	) {}

	export class MediaInputPlaybackEnded extends S.TaggedClass<MediaInputPlaybackEnded>()(
		"MediaInputPlaybackEnded",
		{ inputName: S.String, inputUuid: S.String, address: SocketAddress },
	) {}

	export class MediaInputActionTriggered extends S.TaggedClass<MediaInputActionTriggered>()(
		"MediaInputActionTriggered",
		{
			inputName: S.String,
			inputUuid: S.String,
			mediaAction: S.String,
			address: SocketAddress,
		},
	) {}

	// ===== Output Events =====
	export class StreamStateChanged extends S.TaggedClass<StreamStateChanged>()(
		"StreamStateChanged",
		{ outputActive: S.Boolean, outputState: S.String, address: SocketAddress },
	) {}

	export class RecordStateChanged extends S.TaggedClass<RecordStateChanged>()(
		"RecordStateChanged",
		{
			outputActive: S.Boolean,
			outputState: S.String,
			outputPath: S.String,
			address: SocketAddress,
		},
	) {}

	export class ReplayBufferStateChanged extends S.TaggedClass<ReplayBufferStateChanged>()(
		"ReplayBufferStateChanged",
		{ outputActive: S.Boolean, outputState: S.String, address: SocketAddress },
	) {}

	export class VirtualcamStateChanged extends S.TaggedClass<VirtualcamStateChanged>()(
		"VirtualcamStateChanged",
		{ outputActive: S.Boolean, outputState: S.String, address: SocketAddress },
	) {}

	export class ReplayBufferSaved extends S.TaggedClass<ReplayBufferSaved>()(
		"ReplayBufferSaved",
		{ savedReplayPath: S.String, address: SocketAddress },
	) {}

	// ===== Scene Item Events =====
	export class SceneItemCreated extends S.TaggedClass<SceneItemCreated>()(
		"SceneItemCreated",
		{
			sceneName: S.String,
			sceneUuid: S.String,
			sourceName: S.String,
			sourceUuid: S.String,
			sceneItemId: S.Number,
			sceneItemIndex: S.Number,
			address: SocketAddress,
		},
	) {}

	export class SceneItemRemoved extends S.TaggedClass<SceneItemRemoved>()(
		"SceneItemRemoved",
		{
			sceneName: S.String,
			sceneUuid: S.String,
			sourceName: S.String,
			sourceUuid: S.String,
			sceneItemId: S.Number,
			address: SocketAddress,
		},
	) {}

	export class SceneItemListReindexed extends S.TaggedClass<SceneItemListReindexed>()(
		"SceneItemListReindexed",
		{
			sceneName: S.String,
			sceneUuid: S.String,
			sceneItems: S.String,
			address: SocketAddress,
		},
	) {}

	export class SceneItemEnableStateChanged extends S.TaggedClass<SceneItemEnableStateChanged>()(
		"SceneItemEnableStateChanged",
		{
			sceneName: S.String,
			sceneUuid: S.String,
			sceneItemId: S.Number,
			sceneItemEnabled: S.Boolean,
			address: SocketAddress,
		},
	) {}

	export class SceneItemLockStateChanged extends S.TaggedClass<SceneItemLockStateChanged>()(
		"SceneItemLockStateChanged",
		{
			sceneName: S.String,
			sceneUuid: S.String,
			sceneItemId: S.Number,
			sceneItemLocked: S.Boolean,
			address: SocketAddress,
		},
	) {}

	export class SceneItemSelected extends S.TaggedClass<SceneItemSelected>()(
		"SceneItemSelected",
		{
			sceneName: S.String,
			sceneUuid: S.String,
			sceneItemId: S.Number,
			address: SocketAddress,
		},
	) {}

	// ===== Scene Events =====
	export class SceneCreated extends S.TaggedClass<SceneCreated>()(
		"SceneCreated",
		{
			sceneName: S.String,
			sceneUuid: S.String,
			isGroup: S.Boolean,
			address: SocketAddress,
		},
	) {}

	export class SceneRemoved extends S.TaggedClass<SceneRemoved>()(
		"SceneRemoved",
		{
			sceneName: S.String,
			sceneUuid: S.String,
			isGroup: S.Boolean,
			address: SocketAddress,
		},
	) {}

	export class SceneNameChanged extends S.TaggedClass<SceneNameChanged>()(
		"SceneNameChanged",
		{
			sceneUuid: S.String,
			oldSceneName: S.String,
			sceneName: S.String,
			address: SocketAddress,
		},
	) {}

	export class CurrentProgramSceneChanged extends S.TaggedClass<CurrentProgramSceneChanged>()(
		"CurrentProgramSceneChanged",
		{ sceneName: S.String, sceneUuid: S.String, address: SocketAddress },
	) {}

	export class CurrentPreviewSceneChanged extends S.TaggedClass<CurrentPreviewSceneChanged>()(
		"CurrentPreviewSceneChanged",
		{ sceneName: S.String, sceneUuid: S.String, address: SocketAddress },
	) {}

	export class SceneListChanged extends S.TaggedClass<SceneListChanged>()(
		"SceneListChanged",
		{ scenes: S.String, address: SocketAddress },
	) {}

	// ===== Transition Events =====
	export class CurrentSceneTransitionChanged extends S.TaggedClass<CurrentSceneTransitionChanged>()(
		"CurrentSceneTransitionChanged",
		{
			transitionName: S.String,
			transitionUuid: S.String,
			address: SocketAddress,
		},
	) {}

	export class CurrentSceneTransitionDurationChanged extends S.TaggedClass<CurrentSceneTransitionDurationChanged>()(
		"CurrentSceneTransitionDurationChanged",
		{ transitionDuration: S.Number, address: SocketAddress },
	) {}

	export class SceneTransitionStarted extends S.TaggedClass<SceneTransitionStarted>()(
		"SceneTransitionStarted",
		{
			transitionName: S.String,
			transitionUuid: S.String,
			address: SocketAddress,
		},
	) {}

	export class SceneTransitionEnded extends S.TaggedClass<SceneTransitionEnded>()(
		"SceneTransitionEnded",
		{
			transitionName: S.String,
			transitionUuid: S.String,
			address: SocketAddress,
		},
	) {}

	export class SceneTransitionVideoEnded extends S.TaggedClass<SceneTransitionVideoEnded>()(
		"SceneTransitionVideoEnded",
		{
			transitionName: S.String,
			transitionUuid: S.String,
			address: SocketAddress,
		},
	) {}

	// ===== UI Events =====
	export class StudioModeStateChanged extends S.TaggedClass<StudioModeStateChanged>()(
		"StudioModeStateChanged",
		{ studioModeEnabled: S.Boolean, address: SocketAddress },
	) {}

	export class ScreenshotSaved extends S.TaggedClass<ScreenshotSaved>()(
		"ScreenshotSaved",
		{ savedScreenshotPath: S.String, address: SocketAddress },
	) {}

	// ===== Vendor Events =====
	export class VendorEvent extends S.TaggedClass<VendorEvent>()("VendorEvent", {
		vendorName: S.String,
		eventType: S.String,
		eventData: S.String,
		address: SocketAddress,
	}) {}

	export const Any = S.Union(
		ExitStarted,
		CustomEvent,
		CurrentSceneCollectionChanging,
		CurrentSceneCollectionChanged,
		SceneCollectionListChanged,
		CurrentProfileChanging,
		CurrentProfileChanged,
		ProfileListChanged,
		SourceFilterListReindexed,
		SourceFilterCreated,
		SourceFilterRemoved,
		SourceFilterNameChanged,
		SourceFilterSettingsChanged,
		SourceFilterEnableStateChanged,
		InputCreated,
		InputRemoved,
		InputNameChanged,
		InputSettingsChanged,
		InputMuteStateChanged,
		InputVolumeChanged,
		InputAudioBalanceChanged,
		InputAudioSyncOffsetChanged,
		InputAudioTracksChanged,
		InputAudioMonitorTypeChanged,
		MediaInputPlaybackStarted,
		MediaInputPlaybackEnded,
		MediaInputActionTriggered,
		StreamStateChanged,
		RecordStateChanged,
		ReplayBufferStateChanged,
		VirtualcamStateChanged,
		ReplayBufferSaved,
		SceneItemCreated,
		SceneItemRemoved,
		SceneItemListReindexed,
		SceneItemEnableStateChanged,
		SceneItemLockStateChanged,
		SceneItemSelected,
		SceneCreated,
		SceneRemoved,
		SceneNameChanged,
		CurrentProgramSceneChanged,
		CurrentPreviewSceneChanged,
		SceneListChanged,
		CurrentSceneTransitionChanged,
		CurrentSceneTransitionDurationChanged,
		SceneTransitionStarted,
		SceneTransitionEnded,
		SceneTransitionVideoEnded,
		StudioModeStateChanged,
		ScreenshotSaved,
		VendorEvent,
	);
	export type Any = S.Schema.Type<typeof Any>;
}
