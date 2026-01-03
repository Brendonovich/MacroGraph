import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema as S } from "effect";

import { Resource } from "../new-sdk";
import { SocketAddress } from "./types";

export class ConnectionFailed extends S.TaggedError<ConnectionFailed>()(
	"ConnectionFailed",
	{},
) {}

export class ClientRpcs extends RpcGroup.make(
	Rpc.make("AddSocket", {
		payload: S.Struct({
			address: SocketAddress,
			password: S.optional(S.String),
			name: S.optional(S.String),
		}),
		error: ConnectionFailed,
	}),
	Rpc.make("RemoveSocket", {
		payload: S.Struct({ address: SocketAddress }),
	}),
	Rpc.make("DisconnectSocket", {
		payload: S.Struct({ address: SocketAddress }),
	}),
	Rpc.make("ConnectSocket", {
		payload: S.Struct({
			address: SocketAddress,
			password: S.optional(S.String),
		}),
		error: ConnectionFailed,
	}),
) {}

export class RuntimeRpcs extends RpcGroup.make(
	Rpc.make("BroadcastCustomEvent", {
		payload: S.Struct({
			address: SocketAddress,
			eventData: S.Any,
		}),
	}),
	Rpc.make("CallVendorRequest", {
		payload: S.Struct({
			address: SocketAddress,
			vendorName: S.String,
			requestType: S.String,
			requestData: S.Any,
		}),
		success: S.Struct({
			vendorName: S.String,
			requestType: S.String,
			responseData: S.Any,
		}),
	}),
	Rpc.make("CreateInput", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.optional(S.String),
			inputName: S.String,
			inputKind: S.String,
			inputSettings: S.optional(S.Any),
			sceneItemEnabled: S.optional(S.Boolean),
		}),
		success: S.Struct({
			inputUuid: S.String,
			sceneItemId: S.Number,
		}),
	}),
	Rpc.make("CreateProfile", {
		payload: S.Struct({
			address: SocketAddress,
			profileName: S.String,
		}),
	}),
	Rpc.make("CreateRecordChapter", {
		payload: S.Struct({
			address: SocketAddress,
			chapterName: S.optional(S.String),
		}),
	}),
	Rpc.make("CreateScene", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
		}),
		success: S.Struct({
			sceneUuid: S.String,
		}),
	}),
	Rpc.make("CreateSceneCollection", {
		payload: S.Struct({
			address: SocketAddress,
			sceneCollectionName: S.String,
		}),
	}),
	Rpc.make("CreateSceneItem", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sourceName: S.String,
			sceneItemEnabled: S.optional(S.Boolean),
		}),
		success: S.Struct({
			sceneItemId: S.Number,
		}),
	}),
	Rpc.make("CreateSourceFilter", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
			filterName: S.String,
			filterKind: S.String,
			filterSettings: S.optional(S.Any),
		}),
	}),
	Rpc.make("DuplicateSceneItem", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
			destinationSceneName: S.optional(S.String),
		}),
		success: S.Struct({
			sceneItemId: S.Number,
		}),
	}),
	Rpc.make("GetCurrentPreviewScene", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			sceneName: S.String,
			sceneUuid: S.String,
		}),
	}),
	Rpc.make("GetCurrentProgramScene", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			sceneName: S.String,
			sceneUuid: S.String,
		}),
	}),
	Rpc.make("GetCurrentSceneTransition", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			transitionName: S.String,
			transitionUuid: S.String,
			transitionKind: S.String,
			transitionFixed: S.Boolean,
			transitionDuration: S.NullOr(S.Number),
			transitionConfigurable: S.Boolean,
			transitionSettings: S.NullOr(S.Any),
		}),
	}),
	Rpc.make("GetCurrentSceneTransitionCursor", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			transitionCursor: S.Number,
		}),
	}),
	Rpc.make("GetGroupList", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			groups: S.Array(S.String),
		}),
	}),
	Rpc.make("GetGroupSceneItemList", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
		}),
		success: S.Struct({
			sceneItems: S.Array(S.Any),
		}),
	}),
	Rpc.make("GetHotkeyList", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			hotkeys: S.Array(S.String),
		}),
	}),
	Rpc.make("GetInputAudioBalance", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
		success: S.Struct({
			inputAudioBalance: S.Number,
		}),
	}),
	Rpc.make("GetInputAudioMonitorType", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
		success: S.Struct({
			monitorType: S.String,
		}),
	}),
	Rpc.make("GetInputAudioSyncOffset", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
		success: S.Struct({
			inputAudioSyncOffset: S.Number,
		}),
	}),
	Rpc.make("GetInputAudioTracks", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
		success: S.Struct({
			inputAudioTracks: S.Any,
		}),
	}),
	Rpc.make("GetInputDefaultSettings", {
		payload: S.Struct({
			address: SocketAddress,
			inputKind: S.String,
		}),
		success: S.Struct({
			defaultInputSettings: S.Any,
		}),
	}),
	Rpc.make("GetInputDeinterlaceFieldOrder", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
		success: S.Struct({
			inputDeinterlaceFieldOrder: S.String,
		}),
	}),
	Rpc.make("GetInputDeinterlaceMode", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
		success: S.Struct({
			inputDeinterlaceMode: S.String,
		}),
	}),
	Rpc.make("GetInputKindList", {
		payload: S.Struct({
			address: SocketAddress,
			unversioned: S.optional(S.Boolean),
		}),
		success: S.Struct({
			inputKinds: S.Array(S.String),
		}),
	}),
	Rpc.make("GetInputList", {
		payload: S.Struct({
			address: SocketAddress,
			inputKind: S.optional(S.String),
		}),
		success: S.Struct({
			inputs: S.Array(S.Any),
		}),
	}),
	Rpc.make("GetInputMute", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
		success: S.Struct({
			inputMuted: S.Boolean,
		}),
	}),
	Rpc.make("GetInputPropertiesListPropertyItems", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			propertyName: S.String,
		}),
		success: S.Struct({
			propertyItems: S.Array(S.Any),
		}),
	}),
	Rpc.make("GetInputSettings", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
		success: S.Struct({
			inputSettings: S.Any,
			inputKind: S.String,
		}),
	}),
	Rpc.make("GetInputVolume", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
		success: S.Struct({
			inputVolumeMul: S.Number,
			inputVolumeDb: S.Number,
		}),
	}),
	Rpc.make("GetLastReplayBufferReplay", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			savedReplayPath: S.String,
		}),
	}),
	Rpc.make("GetMediaInputStatus", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
		success: S.Struct({
			mediaState: S.String,
			mediaDuration: S.NullOr(S.Number),
			mediaCursor: S.NullOr(S.Number),
		}),
	}),
	Rpc.make("GetMonitorList", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			monitors: S.Array(S.Any),
		}),
	}),
	Rpc.make("GetOutputList", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			outputs: S.Array(S.Any),
		}),
	}),
	Rpc.make("GetOutputSettings", {
		payload: S.Struct({
			address: SocketAddress,
			outputName: S.String,
		}),
		success: S.Struct({
			outputSettings: S.Any,
		}),
	}),
	Rpc.make("GetOutputStatus", {
		payload: S.Struct({
			address: SocketAddress,
			outputName: S.String,
		}),
		success: S.Struct({
			outputActive: S.Boolean,
			outputReconnecting: S.Boolean,
			outputTimecode: S.String,
			outputDuration: S.Number,
			outputCongestion: S.Number,
			outputBytes: S.Number,
			outputSkippedFrames: S.Number,
			outputTotalFrames: S.Number,
		}),
	}),
	Rpc.make("GetPersistentData", {
		payload: S.Struct({
			address: SocketAddress,
			realm: S.String,
			slotName: S.String,
		}),
		success: S.Struct({
			slotValue: S.NullOr(S.Any),
		}),
	}),
	Rpc.make("GetProfileList", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			currentProfileName: S.String,
			profiles: S.Array(S.String),
		}),
	}),
	Rpc.make("GetProfileParameter", {
		payload: S.Struct({
			address: SocketAddress,
			parameterCategory: S.String,
			parameterName: S.String,
		}),
		success: S.Struct({
			parameterValue: S.NullOr(S.String),
			defaultParameterValue: S.NullOr(S.String),
		}),
	}),
	Rpc.make("GetRecordDirectory", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			recordDirectory: S.String,
		}),
	}),
	Rpc.make("GetRecordStatus", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			outputActive: S.Boolean,
			outputPaused: S.Boolean,
			outputTimecode: S.String,
			outputDuration: S.Number,
			outputBytes: S.Number,
		}),
	}),
	Rpc.make("GetReplayBufferStatus", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			outputActive: S.Boolean,
		}),
	}),
	Rpc.make("GetSceneCollectionList", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			currentSceneCollectionName: S.String,
			sceneCollections: S.Array(S.String),
		}),
	}),
	Rpc.make("GetSceneItemBlendMode", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
		}),
		success: S.Struct({
			sceneItemBlendMode: S.String,
		}),
	}),
	Rpc.make("GetSceneItemEnabled", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
		}),
		success: S.Struct({
			sceneItemEnabled: S.Boolean,
		}),
	}),
	Rpc.make("GetSceneItemId", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sourceName: S.String,
			searchOffset: S.optional(S.Number.pipe(S.greaterThanOrEqualTo(-1))),
		}),
		success: S.Struct({
			sceneItemId: S.Number,
		}),
	}),
	Rpc.make("GetSceneItemIndex", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
		}),
		success: S.Struct({
			sceneItemIndex: S.Number,
		}),
	}),
	Rpc.make("GetSceneItemList", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
		}),
		success: S.Struct({
			sceneItems: S.Array(S.Any),
		}),
	}),
	Rpc.make("GetSceneItemLocked", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
		}),
		success: S.Struct({
			sceneItemLocked: S.Boolean,
		}),
	}),
	Rpc.make("GetSceneItemSource", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
		}),
		success: S.Struct({
			sourceName: S.String,
			sourceUuid: S.String,
		}),
	}),
	Rpc.make("GetSceneItemTransform", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
		}),
		success: S.Struct({
			sceneItemTransform: S.Any,
		}),
	}),
	Rpc.make("GetSceneList", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			currentProgramSceneName: S.NullOr(S.String),
			currentProgramSceneUuid: S.NullOr(S.String),
			currentPreviewSceneName: S.NullOr(S.String),
			currentPreviewSceneUuid: S.NullOr(S.String),
			scenes: S.Array(S.Struct({ sceneName: S.String, sceneIndex: S.Number })),
		}),
	}),
	Rpc.make("GetSceneSceneTransitionOverride", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
		}),
		success: S.Struct({
			transitionName: S.NullOr(S.String),
			transitionDuration: S.NullOr(S.Number),
		}),
	}),
	Rpc.make("GetSceneTransitionList", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			currentSceneTransitionName: S.NullOr(S.String),
			currentSceneTransitionUuid: S.NullOr(S.String),
			currentSceneTransitionKind: S.NullOr(S.String),
			transitions: S.Array(S.Any),
		}),
	}),
	Rpc.make("GetSourceActive", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
		}),
		success: S.Struct({
			videoActive: S.Boolean,
			videoShowing: S.Boolean,
		}),
	}),
	Rpc.make("GetSourceFilter", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
			filterName: S.String,
		}),
		success: S.Struct({
			filterEnabled: S.Boolean,
			filterIndex: S.Number,
			filterKind: S.String,
			filterSettings: S.Any,
		}),
	}),
	Rpc.make("GetSourceFilterDefaultSettings", {
		payload: S.Struct({
			address: SocketAddress,
			filterKind: S.String,
		}),
		success: S.Struct({
			defaultFilterSettings: S.Any,
		}),
	}),
	Rpc.make("GetSourceFilterKindList", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			sourceFilterKinds: S.Array(S.String),
		}),
	}),
	Rpc.make("GetSourceFilterList", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
		}),
		success: S.Struct({
			filters: S.Array(S.Any),
		}),
	}),
	Rpc.make("GetSourceScreenshot", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
			imageFormat: S.String,
			imageWidth: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(8), S.lessThanOrEqualTo(4096)),
			),
			imageHeight: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(8), S.lessThanOrEqualTo(4096)),
			),
			imageCompressionQuality: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(-1), S.lessThanOrEqualTo(100)),
			),
		}),
		success: S.Struct({
			imageData: S.String,
		}),
	}),
	Rpc.make("GetSpecialInputs", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			desktop1: S.String,
			desktop2: S.String,
			mic1: S.String,
			mic2: S.String,
			mic3: S.String,
			mic4: S.String,
		}),
	}),
	Rpc.make("GetStats", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			cpuUsage: S.Number,
			memoryUsage: S.Number,
			availableDiskSpace: S.Number,
			activeFps: S.Number,
			averageFrameRenderTime: S.Number,
			renderSkippedFrames: S.Number,
			renderTotalFrames: S.Number,
			outputSkippedFrames: S.Number,
			outputTotalFrames: S.Number,
			webSocketSessionIncomingMessages: S.Number,
			webSocketSessionOutgoingMessages: S.Number,
		}),
	}),
	Rpc.make("GetStreamServiceSettings", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			streamServiceType: S.String,
			streamServiceSettings: S.Any,
		}),
	}),
	Rpc.make("GetStreamStatus", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			outputActive: S.Boolean,
			outputReconnecting: S.Boolean,
			outputTimecode: S.String,
			outputDuration: S.Number,
			outputCongestion: S.Number,
			outputBytes: S.Number,
			outputSkippedFrames: S.Number,
			outputTotalFrames: S.Number,
		}),
	}),
	Rpc.make("GetStudioModeEnabled", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			studioModeEnabled: S.Boolean,
		}),
	}),
	Rpc.make("GetTransitionKindList", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			transitionKinds: S.Array(S.String),
		}),
	}),
	Rpc.make("GetVersion", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			obsVersion: S.String,
			obsWebSocketVersion: S.String,
			rpcVersion: S.Number,
			availableRequests: S.Array(S.String),
			supportedImageFormats: S.Array(S.String),
			platform: S.String,
			platformDescription: S.String,
		}),
	}),
	Rpc.make("GetVideoSettings", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			fpsNumerator: S.Number,
			fpsDenominator: S.Number,
			baseWidth: S.Number,
			baseHeight: S.Number,
			outputWidth: S.Number,
			outputHeight: S.Number,
		}),
	}),
	Rpc.make("GetVirtualCamStatus", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			outputActive: S.Boolean,
		}),
	}),
	Rpc.make("OffsetMediaInputCursor", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			mediaCursorOffset: S.Number,
		}),
	}),
	Rpc.make("OpenInputFiltersDialog", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
	}),
	Rpc.make("OpenInputInteractDialog", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
	}),
	Rpc.make("OpenInputPropertiesDialog", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
	}),
	Rpc.make("OpenSourceProjector", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
			monitorIndex: S.optional(S.Number),
			projectorGeometry: S.optional(S.String),
		}),
	}),
	Rpc.make("OpenVideoMixProjector", {
		payload: S.Struct({
			address: SocketAddress,
			videoMixType: S.String,
			monitorIndex: S.optional(S.Number),
			projectorGeometry: S.optional(S.String),
		}),
	}),
	Rpc.make("PauseRecord", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("PressInputPropertiesButton", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			propertyName: S.String,
		}),
	}),
	Rpc.make("RemoveInput", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
	}),
	Rpc.make("RemoveProfile", {
		payload: S.Struct({
			address: SocketAddress,
			profileName: S.String,
		}),
	}),
	Rpc.make("RemoveScene", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
		}),
	}),
	Rpc.make("RemoveSceneItem", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
		}),
	}),
	Rpc.make("RemoveSourceFilter", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
			filterName: S.String,
		}),
	}),
	Rpc.make("ResumeRecord", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("SaveReplayBuffer", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("SaveSourceScreenshot", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
			imageFormat: S.String,
			imageFilePath: S.String,
			imageWidth: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(8), S.lessThanOrEqualTo(4096)),
			),
			imageHeight: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(8), S.lessThanOrEqualTo(4096)),
			),
			imageCompressionQuality: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(-1), S.lessThanOrEqualTo(100)),
			),
		}),
	}),
	Rpc.make("SendStreamCaption", {
		payload: S.Struct({
			address: SocketAddress,
			captionText: S.String,
		}),
	}),
	Rpc.make("SetCurrentPreviewScene", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
		}),
	}),
	Rpc.make("SetCurrentProfile", {
		payload: S.Struct({
			address: SocketAddress,
			profileName: S.String,
		}),
	}),
	Rpc.make("SetCurrentProgramScene", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
		}),
	}),
	Rpc.make("SetCurrentSceneCollection", {
		payload: S.Struct({
			address: SocketAddress,
			sceneCollectionName: S.String,
		}),
	}),
	Rpc.make("SetCurrentSceneTransition", {
		payload: S.Struct({
			address: SocketAddress,
			transitionName: S.String,
		}),
	}),
	Rpc.make("SetCurrentSceneTransitionDuration", {
		payload: S.Struct({
			address: SocketAddress,
			transitionDuration: S.Number.pipe(
				S.greaterThanOrEqualTo(50),
				S.lessThanOrEqualTo(20000),
			),
		}),
	}),
	Rpc.make("SetCurrentSceneTransitionSettings", {
		payload: S.Struct({
			address: SocketAddress,
			transitionSettings: S.Any,
			overlay: S.optional(S.Boolean),
		}),
	}),
	Rpc.make("SetInputAudioBalance", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			inputAudioBalance: S.Number.pipe(
				S.greaterThanOrEqualTo(0.0),
				S.lessThanOrEqualTo(1.0),
			),
		}),
	}),
	Rpc.make("SetInputAudioMonitorType", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			monitorType: S.String,
		}),
	}),
	Rpc.make("SetInputAudioSyncOffset", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			inputAudioSyncOffset: S.Number.pipe(
				S.greaterThanOrEqualTo(-950),
				S.lessThanOrEqualTo(20000),
			),
		}),
	}),
	Rpc.make("SetInputAudioTracks", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			inputAudioTracks: S.Any,
		}),
	}),
	Rpc.make("SetInputDeinterlaceFieldOrder", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			inputDeinterlaceFieldOrder: S.String,
		}),
	}),
	Rpc.make("SetInputDeinterlaceMode", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			inputDeinterlaceMode: S.String,
		}),
	}),
	Rpc.make("SetInputMute", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			inputMuted: S.Boolean,
		}),
	}),
	Rpc.make("SetInputName", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			newInputName: S.String,
		}),
	}),
	Rpc.make("SetInputSettings", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			inputSettings: S.Any,
			overlay: S.optional(S.Boolean),
		}),
	}),
	Rpc.make("SetInputVolume", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			inputVolumeMul: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(20)),
			),
			inputVolumeDb: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(-100), S.lessThanOrEqualTo(26)),
			),
		}),
	}),
	Rpc.make("SetMediaInputCursor", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			mediaCursor: S.Number.pipe(S.greaterThanOrEqualTo(0)),
		}),
	}),
	Rpc.make("SetOutputSettings", {
		payload: S.Struct({
			address: SocketAddress,
			outputName: S.String,
			outputSettings: S.Any,
		}),
	}),
	Rpc.make("SetPersistentData", {
		payload: S.Struct({
			address: SocketAddress,
			realm: S.String,
			slotName: S.String,
			slotValue: S.Any,
		}),
	}),
	Rpc.make("SetProfileParameter", {
		payload: S.Struct({
			address: SocketAddress,
			parameterCategory: S.String,
			parameterName: S.String,
			parameterValue: S.String,
		}),
	}),
	Rpc.make("SetRecordDirectory", {
		payload: S.Struct({
			address: SocketAddress,
			recordDirectory: S.String,
		}),
	}),
	Rpc.make("SetSceneItemBlendMode", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
			sceneItemBlendMode: S.String,
		}),
	}),
	Rpc.make("SetSceneItemEnabled", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
			sceneItemEnabled: S.Boolean,
		}),
	}),
	Rpc.make("SetSceneItemIndex", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
			sceneItemIndex: S.Number.pipe(S.greaterThanOrEqualTo(0)),
		}),
	}),
	Rpc.make("SetSceneItemLocked", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
			sceneItemLocked: S.Boolean,
		}),
	}),
	Rpc.make("SetSceneItemTransform", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			sceneItemId: S.Number.pipe(S.greaterThanOrEqualTo(0)),
			sceneItemTransform: S.Any,
		}),
	}),
	Rpc.make("SetSceneName", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			newSceneName: S.String,
		}),
	}),
	Rpc.make("SetSceneSceneTransitionOverride", {
		payload: S.Struct({
			address: SocketAddress,
			sceneName: S.String,
			transitionName: S.optional(S.String),
			transitionDuration: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(50), S.lessThanOrEqualTo(20000)),
			),
		}),
	}),
	Rpc.make("SetSourceFilterEnabled", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
			filterName: S.String,
			filterEnabled: S.Boolean,
		}),
	}),
	Rpc.make("SetSourceFilterIndex", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
			filterName: S.String,
			filterIndex: S.Number.pipe(S.greaterThanOrEqualTo(0)),
		}),
	}),
	Rpc.make("SetSourceFilterName", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
			filterName: S.String,
			newFilterName: S.String,
		}),
	}),
	Rpc.make("SetSourceFilterSettings", {
		payload: S.Struct({
			address: SocketAddress,
			sourceName: S.String,
			filterName: S.String,
			filterSettings: S.Any,
			overlay: S.optional(S.Boolean),
		}),
	}),
	Rpc.make("SetStreamServiceSettings", {
		payload: S.Struct({
			address: SocketAddress,
			streamServiceType: S.String,
			streamServiceSettings: S.Any,
		}),
	}),
	Rpc.make("SetStudioModeEnabled", {
		payload: S.Struct({
			address: SocketAddress,
			studioModeEnabled: S.Boolean,
		}),
	}),
	Rpc.make("SetTBarPosition", {
		payload: S.Struct({
			address: SocketAddress,
			position: S.Number.pipe(
				S.greaterThanOrEqualTo(0.0),
				S.lessThanOrEqualTo(1.0),
			),
			release: S.optional(S.Boolean),
		}),
	}),
	Rpc.make("SetVideoSettings", {
		payload: S.Struct({
			address: SocketAddress,
			fpsNumerator: S.optional(S.Number.pipe(S.greaterThanOrEqualTo(1))),
			fpsDenominator: S.optional(S.Number.pipe(S.greaterThanOrEqualTo(1))),
			baseWidth: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(4096)),
			),
			baseHeight: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(4096)),
			),
			outputWidth: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(4096)),
			),
			outputHeight: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(4096)),
			),
		}),
	}),
	Rpc.make("Sleep", {
		payload: S.Struct({
			address: SocketAddress,
			sleepMillis: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(50000)),
			),
			sleepFrames: S.optional(
				S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(10000)),
			),
		}),
	}),
	Rpc.make("SplitRecordFile", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("StartOutput", {
		payload: S.Struct({
			address: SocketAddress,
			outputName: S.String,
		}),
	}),
	Rpc.make("StartRecord", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("StartReplayBuffer", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("StartStream", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("StartVirtualCam", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("StopOutput", {
		payload: S.Struct({
			address: SocketAddress,
			outputName: S.String,
		}),
	}),
	Rpc.make("StopRecord", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			outputPath: S.String,
		}),
	}),
	Rpc.make("StopReplayBuffer", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("StopStream", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("StopVirtualCam", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("ToggleInputMute", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
		}),
		success: S.Struct({
			inputMuted: S.Boolean,
		}),
	}),
	Rpc.make("ToggleOutput", {
		payload: S.Struct({
			address: SocketAddress,
			outputName: S.String,
		}),
		success: S.Struct({
			outputActive: S.Boolean,
		}),
	}),
	Rpc.make("ToggleRecord", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			outputActive: S.Boolean,
		}),
	}),
	Rpc.make("ToggleRecordPause", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
	Rpc.make("ToggleReplayBuffer", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			outputActive: S.Boolean,
		}),
	}),
	Rpc.make("ToggleStream", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			outputActive: S.Boolean,
		}),
	}),
	Rpc.make("ToggleVirtualCam", {
		payload: S.Struct({
			address: SocketAddress,
		}),
		success: S.Struct({
			outputActive: S.Boolean,
		}),
	}),
	Rpc.make("TriggerHotkeyByKeySequence", {
		payload: S.Struct({
			address: SocketAddress,
			keyId: S.optional(S.String),
			keyModifiers: S.optional(S.Any),
		}),
	}),
	Rpc.make("TriggerHotkeyByName", {
		payload: S.Struct({
			address: SocketAddress,
			hotkeyName: S.String,
			contextName: S.optional(S.String),
		}),
	}),
	Rpc.make("TriggerMediaInputAction", {
		payload: S.Struct({
			address: SocketAddress,
			inputName: S.String,
			mediaAction: S.String,
		}),
	}),
	Rpc.make("TriggerStudioModeTransition", {
		payload: S.Struct({
			address: SocketAddress,
		}),
	}),
) {}

export class ClientState extends S.Struct({
	sockets: S.Array(
		S.Struct({
			name: S.optional(S.String),
			address: S.String,
			password: S.optional(S.String),
			state: S.Union(
				S.Literal("connected"),
				S.Literal("connecting"),
				S.Literal("disconnected"),
			),
		}),
	),
}) {}

export class SocketResource extends Resource.Tag("OBSWebSocket")<SocketAddress>(
	{ name: "OBS WebSocket" },
) {}
