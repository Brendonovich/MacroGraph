import { Effect, Iterable, pipe, Record } from "effect";
import { LookupRef, type PackageEngine } from "@macrograph/package-sdk";
import OBSWebsocket, { type OBSRequestTypes } from "obs-websocket-js";

import { EngineDef, EngineState } from "./index";
import { ConnectionFailed } from "./new-shared";
import { Event, SocketAddress } from "./types";

type Socket = {
	address: SocketAddress;
	password: string | null;
	ws: OBSWebsocket;
	state: "disconnected" | "connecting" | "connected";
};

export default EngineDef.toLayer((ctx) =>
	Effect.gen(function* () {
		const sockets = new Map<SocketAddress, Socket>();

		const saveState = Effect.gen(function* () {
			if (!ctx.saveState) return;

			yield* pipe(
				sockets.entries(),
				Iterable.map(
					([key, value]) =>
						[
							key,
							{ password: value.password ?? undefined, connectOnStartup: true },
						] as const,
				),
				Record.fromEntries,
				(sockets) => new EngineState({ sockets }),
				ctx.saveState,
			);
		});

		const callSocket = Effect.fnUntraced(function* <
			Type extends keyof OBSRequestTypes,
		>(
			address: SocketAddress,
			requestType: Type,
			requestData?: OBSRequestTypes[Type],
		) {
			const socket = sockets.get(address);
			if (!socket) return yield* Effect.die("Socket not found");
			return yield* Effect.promise(() =>
				socket.ws.call(requestType, requestData),
			);
		});

		const createSocket = Effect.fnUntraced(function* (
			address: SocketAddress,
			password?: string,
		) {
			const ws = new OBSWebsocket();

			const socket: Socket = {
				address: address,
				password: password ?? null,
				ws,
				state: "disconnected",
			};
			sockets.set(address, socket);

			yield* saveState;

			const runSocketEdit = <A, E>(e: Effect.Effect<A, E>) =>
				pipe(e, Effect.andThen(ctx.dirtyState), Effect.runFork);

			ws.on("ConnectionError", () =>
				Effect.sync(() => {
					socket.state = "disconnected";
				}).pipe(runSocketEdit),
			);

			ws.on("ConnectionClosed", () =>
				Effect.sync(() => {
					socket.state = "disconnected";
				}).pipe(runSocketEdit),
			);

			ws.on("ConnectionOpened", () =>
				Effect.sync(() => {
					socket.state = "connected";
				}).pipe(runSocketEdit),
			);

			addWsEventListeners(ws, address, ctx.emitEvent);

			return socket;
		});

		const connectSocket = Effect.fnUntraced(function* (address: SocketAddress) {
			const socket = sockets.get(address);
			if (!socket) return;

			socket.state = "connecting";
			yield* ctx.dirtyState;

			yield* Effect.tryPromise({
				try: () => socket.ws.connect(address, socket.password ?? undefined),
				catch: () => new ConnectionFailed(),
			});
		});

		if (ctx.initialState)
			yield* Effect.all(
				pipe(
					ctx.initialState.sockets,
					Record.map((value, address) =>
						createSocket(address, value.password ?? undefined).pipe(
							Effect.zipLeft(
								value.connectOnStartup
									? connectSocket(address).pipe(
											Effect.catchAll(() => Effect.void),
										)
									: Effect.void,
							),
						),
					),
				),
			);

		return {
			clientState: Effect.gen(function* () {
				return {
					sockets: [...sockets.entries()].map(([address, socket]) => ({
						name: address,
						address,
						state: socket.state,
					})),
				};
			}),
			resources: {
				OBSWebSocket: yield* LookupRef.make(
					Effect.sync(() =>
						[...sockets.keys()].map((address) => ({
							id: address,
							display: address,
						})),
					),
				),
			},
			clientRpcs: {
				AddSocket: Effect.fnUntraced(function* (opts) {
					const socket = yield* createSocket(opts.address, opts.password);
					yield* ctx.dirtyState;

					yield* Effect.tryPromise({
						try: () => socket.ws.connect(opts.address, opts.password),
						catch: () => new ConnectionFailed(),
					});
				}),
				RemoveSocket: Effect.fnUntraced(function* ({ address: address_ }) {
					const address = SocketAddress.make(address_);
					const socket = sockets.get(address);
					if (!socket) return;

					yield* Effect.promise(() => socket.ws.disconnect()).pipe(
						Effect.ignore,
					);

					sockets.delete(address);
					yield* ctx.dirtyState;
					yield* saveState;
				}),
				ConnectSocket: ({ address }) => connectSocket(address),
				DisconnectSocket: Effect.fnUntraced(function* ({ address: address_ }) {
					const address = SocketAddress.make(address_);
					const socket = sockets.get(address);
					if (!socket) return;

					yield* Effect.promise(() => socket.ws.disconnect()).pipe(
						Effect.ignore,
					);
				}),
			},
			runtimeRpcs: {
				BroadcastCustomEvent: ({ address, eventData }) =>
					callSocket(address, "BroadcastCustomEvent", { eventData }),
				CallVendorRequest: ({
					address,
					vendorName,
					requestType,
					requestData,
				}) =>
					callSocket(address, "CallVendorRequest", {
						vendorName,
						requestType,
						requestData,
					}),
				CreateInput: ({
					address,
					sceneName,
					inputName,
					inputKind,
					inputSettings,
					sceneItemEnabled,
				}) =>
					callSocket(address, "CreateInput", {
						sceneName,
						inputName,
						inputKind,
						inputSettings,
						sceneItemEnabled,
					}),
				CreateProfile: ({ address, profileName }) =>
					callSocket(address, "CreateProfile", { profileName }),
				CreateRecordChapter: ({ address, chapterName }) =>
					callSocket(address, "CreateRecordChapter", { chapterName }),
				CreateScene: ({ address, sceneName }) =>
					callSocket(address, "CreateScene", { sceneName }),
				CreateSceneCollection: ({ address, sceneCollectionName }) =>
					callSocket(address, "CreateSceneCollection", { sceneCollectionName }),
				CreateSceneItem: ({
					address,
					sceneName,
					sourceName,
					sceneItemEnabled,
				}) =>
					callSocket(address, "CreateSceneItem", {
						sceneName,
						sourceName,
						sceneItemEnabled,
					}),
				CreateSourceFilter: ({
					address,
					sourceName,
					filterName,
					filterKind,
					filterSettings,
				}) =>
					callSocket(address, "CreateSourceFilter", {
						sourceName,
						filterName,
						filterKind,
						filterSettings,
					}),
				DuplicateSceneItem: ({
					address,
					sceneName,
					sceneItemId,
					destinationSceneName,
				}) =>
					callSocket(address, "DuplicateSceneItem", {
						sceneName,
						sceneItemId,
						destinationSceneName,
					}),
				GetCurrentPreviewScene: ({ address }) =>
					callSocket(address, "GetCurrentPreviewScene"),
				GetCurrentProgramScene: ({ address }) =>
					callSocket(address, "GetCurrentProgramScene"),
				GetCurrentSceneTransition: ({ address }) =>
					callSocket(address, "GetCurrentSceneTransition"),
				GetCurrentSceneTransitionCursor: ({ address }) =>
					callSocket(address, "GetCurrentSceneTransitionCursor"),
				GetGroupList: ({ address }) => callSocket(address, "GetGroupList"),
				GetGroupSceneItemList: ({ address, sceneName }) =>
					callSocket(address, "GetGroupSceneItemList", { sceneName }),
				GetHotkeyList: ({ address }) => callSocket(address, "GetHotkeyList"),
				GetInputAudioBalance: ({ address, inputName }) =>
					callSocket(address, "GetInputAudioBalance", { inputName }),
				GetInputAudioMonitorType: ({ address, inputName }) =>
					callSocket(address, "GetInputAudioMonitorType", { inputName }),
				GetInputAudioSyncOffset: ({ address, inputName }) =>
					callSocket(address, "GetInputAudioSyncOffset", { inputName }),
				GetInputAudioTracks: ({ address, inputName }) =>
					callSocket(address, "GetInputAudioTracks", { inputName }),
				GetInputDefaultSettings: ({ address, inputKind }) =>
					callSocket(address, "GetInputDefaultSettings", { inputKind }),
				GetInputDeinterlaceFieldOrder: ({ address, inputName }) =>
					callSocket(address, "GetInputDeinterlaceFieldOrder", { inputName }),
				GetInputDeinterlaceMode: ({ address, inputName }) =>
					callSocket(address, "GetInputDeinterlaceMode", { inputName }),
				GetInputKindList: ({ address, unversioned }) =>
					callSocket(address, "GetInputKindList", { unversioned }),
				GetInputList: ({ address, inputKind }) =>
					callSocket(address, "GetInputList", { inputKind }),
				GetInputMute: ({ address, inputName }) =>
					callSocket(address, "GetInputMute", { inputName }),
				GetInputPropertiesListPropertyItems: ({
					address,
					inputName,
					propertyName,
				}) =>
					callSocket(address, "GetInputPropertiesListPropertyItems", {
						inputName,
						propertyName,
					}),
				GetInputSettings: ({ address, inputName }) =>
					callSocket(address, "GetInputSettings", { inputName }),
				GetInputVolume: ({ address, inputName }) =>
					callSocket(address, "GetInputVolume", { inputName }),
				GetLastReplayBufferReplay: ({ address }) =>
					callSocket(address, "GetLastReplayBufferReplay"),
				GetMediaInputStatus: ({ address, inputName }) =>
					callSocket(address, "GetMediaInputStatus", { inputName }),
				GetMonitorList: ({ address }) => callSocket(address, "GetMonitorList"),
				GetOutputList: ({ address }) => callSocket(address, "GetOutputList"),
				GetOutputSettings: ({ address, outputName }) =>
					callSocket(address, "GetOutputSettings", { outputName }),
				GetOutputStatus: ({ address, outputName }) =>
					callSocket(address, "GetOutputStatus", { outputName }),
				GetPersistentData: ({ address, realm, slotName }) =>
					callSocket(address, "GetPersistentData", { realm, slotName }),
				GetProfileList: ({ address }) => callSocket(address, "GetProfileList"),
				GetProfileParameter: ({ address, parameterCategory, parameterName }) =>
					callSocket(address, "GetProfileParameter", {
						parameterCategory,
						parameterName,
					}),
				GetRecordDirectory: ({ address }) =>
					callSocket(address, "GetRecordDirectory"),
				GetRecordStatus: ({ address }) =>
					callSocket(address, "GetRecordStatus"),
				GetReplayBufferStatus: ({ address }) =>
					callSocket(address, "GetReplayBufferStatus"),
				GetSceneCollectionList: ({ address }) =>
					callSocket(address, "GetSceneCollectionList"),
				GetSceneItemBlendMode: ({ address, sceneName, sceneItemId }) =>
					callSocket(address, "GetSceneItemBlendMode", {
						sceneName,
						sceneItemId,
					}),
				GetSceneItemEnabled: ({ address, sceneName, sceneItemId }) =>
					callSocket(address, "GetSceneItemEnabled", {
						sceneName,
						sceneItemId,
					}),
				GetSceneItemId: ({ address, sceneName, sourceName, searchOffset }) =>
					callSocket(address, "GetSceneItemId", {
						sceneName,
						sourceName,
						searchOffset,
					}),
				GetSceneItemIndex: ({ address, sceneName, sceneItemId }) =>
					callSocket(address, "GetSceneItemIndex", { sceneName, sceneItemId }),
				GetSceneItemList: ({ address, sceneName }) =>
					callSocket(address, "GetSceneItemList", { sceneName }),
				GetSceneItemLocked: ({ address, sceneName, sceneItemId }) =>
					callSocket(address, "GetSceneItemLocked", { sceneName, sceneItemId }),
				GetSceneItemSource: ({ address, sceneName, sceneItemId }) =>
					callSocket(address, "GetSceneItemSource", { sceneName, sceneItemId }),
				GetSceneItemTransform: ({ address, sceneName, sceneItemId }) =>
					callSocket(address, "GetSceneItemTransform", {
						sceneName,
						sceneItemId,
					}),
				GetSceneList: ({ address }) =>
					callSocket(address, "GetSceneList").pipe(Effect.map((v) => v as any)),
				GetSceneSceneTransitionOverride: ({ address, sceneName }) =>
					callSocket(address, "GetSceneSceneTransitionOverride", { sceneName }),
				GetSceneTransitionList: ({ address }) =>
					callSocket(address, "GetSceneTransitionList"),
				GetSourceActive: ({ address, sourceName }) =>
					callSocket(address, "GetSourceActive", { sourceName }),
				GetSourceFilter: ({ address, sourceName, filterName }) =>
					callSocket(address, "GetSourceFilter", { sourceName, filterName }),
				GetSourceFilterDefaultSettings: ({ address, filterKind }) =>
					callSocket(address, "GetSourceFilterDefaultSettings", { filterKind }),
				GetSourceFilterKindList: ({ address }) =>
					callSocket(address, "GetSourceFilterKindList"),
				GetSourceFilterList: ({ address, sourceName }) =>
					callSocket(address, "GetSourceFilterList", { sourceName }),
				GetSourceScreenshot: ({
					address,
					sourceName,
					imageFormat,
					imageWidth,
					imageHeight,
					imageCompressionQuality,
				}) =>
					callSocket(address, "GetSourceScreenshot", {
						sourceName,
						imageFormat,
						imageWidth,
						imageHeight,
						imageCompressionQuality,
					}),
				GetSpecialInputs: ({ address }) =>
					callSocket(address, "GetSpecialInputs"),
				GetStats: ({ address }) => callSocket(address, "GetStats"),
				GetStreamServiceSettings: ({ address }) =>
					callSocket(address, "GetStreamServiceSettings"),
				GetStreamStatus: ({ address }) =>
					callSocket(address, "GetStreamStatus"),
				GetStudioModeEnabled: ({ address }) =>
					callSocket(address, "GetStudioModeEnabled"),
				GetTransitionKindList: ({ address }) =>
					callSocket(address, "GetTransitionKindList"),
				GetVersion: ({ address }) => callSocket(address, "GetVersion"),
				GetVideoSettings: ({ address }) =>
					callSocket(address, "GetVideoSettings"),
				GetVirtualCamStatus: ({ address }) =>
					callSocket(address, "GetVirtualCamStatus"),
				OffsetMediaInputCursor: ({ address, inputName, mediaCursorOffset }) =>
					callSocket(address, "OffsetMediaInputCursor", {
						inputName,
						mediaCursorOffset,
					}),
				OpenInputFiltersDialog: ({ address, inputName }) =>
					callSocket(address, "OpenInputFiltersDialog", { inputName }),
				OpenInputInteractDialog: ({ address, inputName }) =>
					callSocket(address, "OpenInputInteractDialog", { inputName }),
				OpenInputPropertiesDialog: ({ address, inputName }) =>
					callSocket(address, "OpenInputPropertiesDialog", { inputName }),
				OpenSourceProjector: ({
					address,
					sourceName,
					monitorIndex,
					projectorGeometry,
				}) =>
					callSocket(address, "OpenSourceProjector", {
						sourceName,
						monitorIndex,
						projectorGeometry,
					}),
				OpenVideoMixProjector: ({
					address,
					videoMixType,
					monitorIndex,
					projectorGeometry,
				}) =>
					callSocket(address, "OpenVideoMixProjector", {
						videoMixType,
						monitorIndex,
						projectorGeometry,
					}),
				PauseRecord: ({ address }) => callSocket(address, "PauseRecord"),
				PressInputPropertiesButton: ({ address, inputName, propertyName }) =>
					callSocket(address, "PressInputPropertiesButton", {
						inputName,
						propertyName,
					}),
				RemoveInput: ({ address, inputName }) =>
					callSocket(address, "RemoveInput", { inputName }),
				RemoveProfile: ({ address, profileName }) =>
					callSocket(address, "RemoveProfile", { profileName }),
				RemoveScene: ({ address, sceneName }) =>
					callSocket(address, "RemoveScene", { sceneName }),
				RemoveSceneItem: ({ address, sceneName, sceneItemId }) =>
					callSocket(address, "RemoveSceneItem", { sceneName, sceneItemId }),
				RemoveSourceFilter: ({ address, sourceName, filterName }) =>
					callSocket(address, "RemoveSourceFilter", { sourceName, filterName }),
				ResumeRecord: ({ address }) => callSocket(address, "ResumeRecord"),
				SaveReplayBuffer: ({ address }) =>
					callSocket(address, "SaveReplayBuffer"),
				SaveSourceScreenshot: ({
					address,
					sourceName,
					imageFormat,
					imageFilePath,
					imageWidth,
					imageHeight,
					imageCompressionQuality,
				}) =>
					callSocket(address, "SaveSourceScreenshot", {
						sourceName,
						imageFormat,
						imageFilePath,
						imageWidth,
						imageHeight,
						imageCompressionQuality,
					}),
				SendStreamCaption: ({ address, captionText }) =>
					callSocket(address, "SendStreamCaption", { captionText }),
				SetCurrentPreviewScene: ({ address, sceneName }) =>
					callSocket(address, "SetCurrentPreviewScene", { sceneName }),
				SetCurrentProfile: ({ address, profileName }) =>
					callSocket(address, "SetCurrentProfile", { profileName }),
				SetCurrentProgramScene: ({ address, sceneName }) =>
					callSocket(address, "SetCurrentProgramScene", { sceneName }),
				SetCurrentSceneCollection: ({ address, sceneCollectionName }) =>
					callSocket(address, "SetCurrentSceneCollection", {
						sceneCollectionName,
					}),
				SetCurrentSceneTransition: ({ address, transitionName }) =>
					callSocket(address, "SetCurrentSceneTransition", { transitionName }),
				SetCurrentSceneTransitionDuration: ({ address, transitionDuration }) =>
					callSocket(address, "SetCurrentSceneTransitionDuration", {
						transitionDuration,
					}),
				SetCurrentSceneTransitionSettings: ({
					address,
					transitionSettings,
					overlay,
				}) =>
					callSocket(address, "SetCurrentSceneTransitionSettings", {
						transitionSettings,
						overlay,
					}),
				SetInputAudioBalance: ({ address, inputName, inputAudioBalance }) =>
					callSocket(address, "SetInputAudioBalance", {
						inputName,
						inputAudioBalance,
					}),
				SetInputAudioMonitorType: ({ address, inputName, monitorType }) =>
					callSocket(address, "SetInputAudioMonitorType", {
						inputName,
						monitorType,
					}),
				SetInputAudioSyncOffset: ({
					address,
					inputName,
					inputAudioSyncOffset,
				}) =>
					callSocket(address, "SetInputAudioSyncOffset", {
						inputName,
						inputAudioSyncOffset,
					}),
				SetInputAudioTracks: ({ address, inputName, inputAudioTracks }) =>
					callSocket(address, "SetInputAudioTracks", {
						inputName,
						inputAudioTracks,
					}),
				SetInputDeinterlaceFieldOrder: ({
					address,
					inputName,
					inputDeinterlaceFieldOrder,
				}) =>
					callSocket(address, "SetInputDeinterlaceFieldOrder", {
						inputName,
						inputDeinterlaceFieldOrder,
					}),
				SetInputDeinterlaceMode: ({
					address,
					inputName,
					inputDeinterlaceMode,
				}) =>
					callSocket(address, "SetInputDeinterlaceMode", {
						inputName,
						inputDeinterlaceMode,
					}),
				SetInputMute: ({ address, inputName, inputMuted }) =>
					callSocket(address, "SetInputMute", { inputName, inputMuted }),
				SetInputName: ({ address, inputName, newInputName }) =>
					callSocket(address, "SetInputName", { inputName, newInputName }),
				SetInputSettings: ({ address, inputName, inputSettings, overlay }) =>
					callSocket(address, "SetInputSettings", {
						inputName,
						inputSettings,
						overlay,
					}),
				SetInputVolume: ({
					address,
					inputName,
					inputVolumeMul,
					inputVolumeDb,
				}) =>
					callSocket(address, "SetInputVolume", {
						inputName,
						inputVolumeMul,
						inputVolumeDb,
					}),
				SetMediaInputCursor: ({ address, inputName, mediaCursor }) =>
					callSocket(address, "SetMediaInputCursor", {
						inputName,
						mediaCursor,
					}),
				SetOutputSettings: ({ address, outputName, outputSettings }) =>
					callSocket(address, "SetOutputSettings", {
						outputName,
						outputSettings,
					}),
				SetPersistentData: ({ address, realm, slotName, slotValue }) =>
					callSocket(address, "SetPersistentData", {
						realm,
						slotName,
						slotValue,
					}),
				SetProfileParameter: ({
					address,
					parameterCategory,
					parameterName,
					parameterValue,
				}) =>
					callSocket(address, "SetProfileParameter", {
						parameterCategory,
						parameterName,
						parameterValue,
					}),
				SetRecordDirectory: ({ address, recordDirectory }) =>
					callSocket(address, "SetRecordDirectory", { recordDirectory }),
				SetSceneItemBlendMode: ({
					address,
					sceneName,
					sceneItemId,
					sceneItemBlendMode,
				}) =>
					callSocket(address, "SetSceneItemBlendMode", {
						sceneName,
						sceneItemId,
						sceneItemBlendMode,
					}),
				SetSceneItemEnabled: ({
					address,
					sceneName,
					sceneItemId,
					sceneItemEnabled,
				}) =>
					callSocket(address, "SetSceneItemEnabled", {
						sceneName,
						sceneItemId,
						sceneItemEnabled,
					}),
				SetSceneItemIndex: ({
					address,
					sceneName,
					sceneItemId,
					sceneItemIndex,
				}) =>
					callSocket(address, "SetSceneItemIndex", {
						sceneName,
						sceneItemId,
						sceneItemIndex,
					}),
				SetSceneItemLocked: ({
					address,
					sceneName,
					sceneItemId,
					sceneItemLocked,
				}) =>
					callSocket(address, "SetSceneItemLocked", {
						sceneName,
						sceneItemId,
						sceneItemLocked,
					}),
				SetSceneItemTransform: ({
					address,
					sceneName,
					sceneItemId,
					sceneItemTransform,
				}) =>
					callSocket(address, "SetSceneItemTransform", {
						sceneName,
						sceneItemId,
						sceneItemTransform,
					}),
				SetSceneName: ({ address, sceneName, newSceneName }) =>
					callSocket(address, "SetSceneName", { sceneName, newSceneName }),
				SetSceneSceneTransitionOverride: ({
					address,
					sceneName,
					transitionName,
					transitionDuration,
				}) =>
					callSocket(address, "SetSceneSceneTransitionOverride", {
						sceneName,
						transitionName,
						transitionDuration,
					}),
				SetSourceFilterEnabled: ({
					address,
					sourceName,
					filterName,
					filterEnabled,
				}) =>
					callSocket(address, "SetSourceFilterEnabled", {
						sourceName,
						filterName,
						filterEnabled,
					}),
				SetSourceFilterIndex: ({
					address,
					sourceName,
					filterName,
					filterIndex,
				}) =>
					callSocket(address, "SetSourceFilterIndex", {
						sourceName,
						filterName,
						filterIndex,
					}),
				SetSourceFilterName: ({
					address,
					sourceName,
					filterName,
					newFilterName,
				}) =>
					callSocket(address, "SetSourceFilterName", {
						sourceName,
						filterName,
						newFilterName,
					}),
				SetSourceFilterSettings: ({
					address,
					sourceName,
					filterName,
					filterSettings,
					overlay,
				}) =>
					callSocket(address, "SetSourceFilterSettings", {
						sourceName,
						filterName,
						filterSettings,
						overlay,
					}),
				SetStreamServiceSettings: ({
					address,
					streamServiceType,
					streamServiceSettings,
				}) =>
					callSocket(address, "SetStreamServiceSettings", {
						streamServiceType,
						streamServiceSettings,
					}),
				SetStudioModeEnabled: ({ address, studioModeEnabled }) =>
					callSocket(address, "SetStudioModeEnabled", { studioModeEnabled }),
				SetTBarPosition: ({ address, position, release }) =>
					callSocket(address, "SetTBarPosition", { position, release }),
				SetVideoSettings: ({
					address,
					fpsNumerator,
					fpsDenominator,
					baseWidth,
					baseHeight,
					outputWidth,
					outputHeight,
				}) =>
					callSocket(address, "SetVideoSettings", {
						fpsNumerator,
						fpsDenominator,
						baseWidth,
						baseHeight,
						outputWidth,
						outputHeight,
					}),
				Sleep: ({ address, sleepMillis, sleepFrames }) =>
					callSocket(address, "Sleep", { sleepMillis, sleepFrames }),
				SplitRecordFile: ({ address }) =>
					callSocket(address, "SplitRecordFile"),
				StartOutput: ({ address, outputName }) =>
					callSocket(address, "StartOutput", { outputName }),
				StartRecord: ({ address }) => callSocket(address, "StartRecord"),
				StartReplayBuffer: ({ address }) =>
					callSocket(address, "StartReplayBuffer"),
				StartStream: ({ address }) => callSocket(address, "StartStream"),
				StartVirtualCam: ({ address }) =>
					callSocket(address, "StartVirtualCam"),
				StopOutput: ({ address, outputName }) =>
					callSocket(address, "StopOutput", { outputName }),
				StopRecord: ({ address }) => callSocket(address, "StopRecord"),
				StopReplayBuffer: ({ address }) =>
					callSocket(address, "StopReplayBuffer"),
				StopStream: ({ address }) => callSocket(address, "StopStream"),
				StopVirtualCam: ({ address }) => callSocket(address, "StopVirtualCam"),
				ToggleInputMute: ({ address, inputName }) =>
					callSocket(address, "ToggleInputMute", { inputName }),
				ToggleOutput: ({ address, outputName }) =>
					callSocket(address, "ToggleOutput", { outputName }),
				ToggleRecord: ({ address }) => callSocket(address, "ToggleRecord"),
				ToggleRecordPause: ({ address }) =>
					callSocket(address, "ToggleRecordPause"),
				ToggleReplayBuffer: ({ address }) =>
					callSocket(address, "ToggleReplayBuffer"),
				ToggleStream: ({ address }) => callSocket(address, "ToggleStream"),
				ToggleVirtualCam: ({ address }) =>
					callSocket(address, "ToggleVirtualCam"),
				TriggerHotkeyByKeySequence: ({ address, keyId, keyModifiers }) =>
					callSocket(address, "TriggerHotkeyByKeySequence", {
						keyId,
						keyModifiers,
					}),
				TriggerHotkeyByName: ({ address, hotkeyName, contextName }) =>
					callSocket(address, "TriggerHotkeyByName", {
						hotkeyName,
						contextName,
					}),
				TriggerMediaInputAction: ({ address, inputName, mediaAction }) =>
					callSocket(address, "TriggerMediaInputAction", {
						inputName,
						mediaAction,
					}),
				TriggerStudioModeTransition: ({ address }) =>
					callSocket(address, "TriggerStudioModeTransition"),
			},
		} satisfies PackageEngine.Built<typeof EngineDef>;
	}),
);

function addWsEventListeners(
	ws: OBSWebsocket,
	address: SocketAddress,
	onEvent: (event: Event.Any) => void,
) {
	ws.on("CurrentProgramSceneChanged", (e) => {
		onEvent(new Event.CurrentProgramSceneChanged({ ...e, address: address }));
	});

	ws.on("ExitStarted", () => {
		onEvent(new Event.ExitStarted({ address: address }));
	});

	ws.on("CustomEvent", (e) => {
		onEvent(
			new Event.CustomEvent({
				address: address,
				eventData: JSON.stringify(e.eventData),
			}),
		);
	});

	ws.on("CurrentSceneCollectionChanging", (e) => {
		onEvent(
			new Event.CurrentSceneCollectionChanging({ ...e, address: address }),
		);
	});

	ws.on("CurrentSceneCollectionChanged", (e) => {
		onEvent(
			new Event.CurrentSceneCollectionChanged({ ...e, address: address }),
		);
	});

	ws.on("SceneCollectionListChanged", (e) => {
		onEvent(
			new Event.SceneCollectionListChanged({
				address: address,
				sceneCollections: JSON.stringify(e.sceneCollections),
			}),
		);
	});

	ws.on("CurrentProfileChanging", (e) => {
		onEvent(new Event.CurrentProfileChanging({ ...e, address: address }));
	});

	ws.on("CurrentProfileChanged", (e) => {
		onEvent(new Event.CurrentProfileChanged({ ...e, address: address }));
	});

	ws.on("ProfileListChanged", (e) => {
		onEvent(
			new Event.ProfileListChanged({
				address: address,
				profiles: JSON.stringify(e.profiles),
			}),
		);
	});

	ws.on("SourceFilterListReindexed", (e) => {
		onEvent(
			new Event.SourceFilterListReindexed({
				address: address,
				sourceName: e.sourceName,
				filters: JSON.stringify(e.filters),
			}),
		);
	});

	ws.on("SourceFilterCreated", (e) => {
		onEvent(
			new Event.SourceFilterCreated({
				address: address,
				sourceName: e.sourceName,
				filterName: e.filterName,
				filterKind: e.filterKind,
				filterIndex: e.filterIndex,
				filterSettings: JSON.stringify(e.filterSettings),
			}),
		);
	});

	ws.on("SourceFilterRemoved", (e) => {
		onEvent(new Event.SourceFilterRemoved({ ...e, address: address }));
	});

	ws.on("SourceFilterNameChanged", (e) => {
		onEvent(new Event.SourceFilterNameChanged({ ...e, address: address }));
	});

	ws.on("SourceFilterSettingsChanged", (e) => {
		onEvent(
			new Event.SourceFilterSettingsChanged({
				address: address,
				sourceName: e.sourceName,
				filterName: e.filterName,
				filterSettings: JSON.stringify(e.filterSettings),
			}),
		);
	});

	ws.on("SourceFilterEnableStateChanged", (e) => {
		onEvent(
			new Event.SourceFilterEnableStateChanged({ ...e, address: address }),
		);
	});

	ws.on("InputCreated", (e) => {
		onEvent(
			new Event.InputCreated({
				address: address,
				inputName: e.inputName,
				inputUuid: e.inputUuid,
				inputKind: e.inputKind,
				inputSettings: JSON.stringify(e.inputSettings),
			}),
		);
	});

	ws.on("InputRemoved", (e) => {
		onEvent(new Event.InputRemoved({ ...e, address: address }));
	});

	ws.on("InputNameChanged", (e) => {
		onEvent(new Event.InputNameChanged({ ...e, address: address }));
	});

	ws.on("InputSettingsChanged", (e) => {
		onEvent(
			new Event.InputSettingsChanged({
				address: address,
				inputName: e.inputName,
				inputUuid: e.inputUuid,
				inputSettings: JSON.stringify(e.inputSettings),
			}),
		);
	});

	ws.on("InputMuteStateChanged", (e) => {
		onEvent(new Event.InputMuteStateChanged({ ...e, address: address }));
	});

	ws.on("InputVolumeChanged", (e) => {
		onEvent(new Event.InputVolumeChanged({ ...e, address: address }));
	});

	ws.on("InputAudioBalanceChanged", (e) => {
		onEvent(new Event.InputAudioBalanceChanged({ ...e, address: address }));
	});

	ws.on("InputAudioSyncOffsetChanged", (e) => {
		onEvent(new Event.InputAudioSyncOffsetChanged({ ...e, address: address }));
	});

	ws.on("InputAudioTracksChanged", (e) => {
		onEvent(
			new Event.InputAudioTracksChanged({
				address: address,
				inputName: e.inputName,
				inputUuid: e.inputUuid,
				inputAudioTracks: JSON.stringify(e.inputAudioTracks),
			}),
		);
	});

	ws.on("InputAudioMonitorTypeChanged", (e) => {
		onEvent(new Event.InputAudioMonitorTypeChanged({ ...e, address: address }));
	});

	ws.on("MediaInputPlaybackStarted", (e) => {
		onEvent(new Event.MediaInputPlaybackStarted({ ...e, address: address }));
	});

	ws.on("MediaInputPlaybackEnded", (e) => {
		onEvent(new Event.MediaInputPlaybackEnded({ ...e, address: address }));
	});

	ws.on("MediaInputActionTriggered", (e) => {
		onEvent(new Event.MediaInputActionTriggered({ ...e, address: address }));
	});

	ws.on("StreamStateChanged", (e) => {
		onEvent(new Event.StreamStateChanged({ ...e, address: address }));
	});

	ws.on("RecordStateChanged", (e) => {
		onEvent(new Event.RecordStateChanged({ ...e, address: address }));
	});

	ws.on("ReplayBufferStateChanged", (e) => {
		onEvent(new Event.ReplayBufferStateChanged({ ...e, address: address }));
	});

	ws.on("VirtualcamStateChanged", (e) => {
		onEvent(new Event.VirtualcamStateChanged({ ...e, address: address }));
	});

	ws.on("ReplayBufferSaved", (e) => {
		onEvent(new Event.ReplayBufferSaved({ ...e, address: address }));
	});

	ws.on("SceneItemCreated", (e) => {
		onEvent(new Event.SceneItemCreated({ ...e, address: address }));
	});

	ws.on("SceneItemRemoved", (e) => {
		onEvent(new Event.SceneItemRemoved({ ...e, address: address }));
	});

	ws.on("SceneItemListReindexed", (e) => {
		onEvent(
			new Event.SceneItemListReindexed({
				address: address,
				sceneName: e.sceneName,
				sceneUuid: e.sceneUuid,
				sceneItems: JSON.stringify(e.sceneItems),
			}),
		);
	});

	ws.on("SceneItemEnableStateChanged", (e) => {
		onEvent(new Event.SceneItemEnableStateChanged({ ...e, address: address }));
	});

	ws.on("SceneItemLockStateChanged", (e) => {
		onEvent(new Event.SceneItemLockStateChanged({ ...e, address: address }));
	});

	ws.on("SceneItemSelected", (e) => {
		onEvent(new Event.SceneItemSelected({ ...e, address: address }));
	});

	ws.on("SceneCreated", (e) => {
		onEvent(new Event.SceneCreated({ ...e, address: address }));
	});

	ws.on("SceneRemoved", (e) => {
		onEvent(new Event.SceneRemoved({ ...e, address: address }));
	});

	ws.on("SceneNameChanged", (e) => {
		onEvent(new Event.SceneNameChanged({ ...e, address: address }));
	});

	ws.on("CurrentPreviewSceneChanged", (e) => {
		onEvent(new Event.CurrentPreviewSceneChanged({ ...e, address: address }));
	});

	ws.on("SceneListChanged", (e) => {
		onEvent(
			new Event.SceneListChanged({
				address: address,
				scenes: JSON.stringify(e.scenes),
			}),
		);
	});

	ws.on("CurrentSceneTransitionChanged", (e) => {
		onEvent(
			new Event.CurrentSceneTransitionChanged({ ...e, address: address }),
		);
	});

	ws.on("CurrentSceneTransitionDurationChanged", (e) => {
		onEvent(
			new Event.CurrentSceneTransitionDurationChanged({
				...e,
				address: address,
			}),
		);
	});

	ws.on("SceneTransitionStarted", (e) => {
		onEvent(new Event.SceneTransitionStarted({ ...e, address: address }));
	});

	ws.on("SceneTransitionEnded", (e) => {
		onEvent(new Event.SceneTransitionEnded({ ...e, address: address }));
	});

	ws.on("SceneTransitionVideoEnded", (e) => {
		onEvent(new Event.SceneTransitionVideoEnded({ ...e, address: address }));
	});

	ws.on("StudioModeStateChanged", (e) => {
		onEvent(new Event.StudioModeStateChanged({ ...e, address: address }));
	});

	ws.on("ScreenshotSaved", (e) => {
		onEvent(new Event.ScreenshotSaved({ ...e, address: address }));
	});

	ws.on("VendorEvent", (e) => {
		onEvent(
			new Event.VendorEvent({
				address: address,
				vendorName: e.vendorName,
				eventType: e.eventType,
				eventData: JSON.stringify(e.eventData),
			}),
		);
	});
}
