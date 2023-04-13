import OBS, { EventTypes } from "obs-websocket-js";

import { core } from "../models";
import { types } from "../types";

const pkg = core.createPackage<EventTypes>({
  name: "OBS Websocket",
});

const ws = new OBS();

pkg.createNonEventSchema({
  name: "Connect OBS Websocket",
  variant: "Exec",
  generateIO() {},
  run() {
    return ws.connect();
  },
});

pkg.createNonEventSchema({
  name: "Disconnect OBS Websocket",
  variant: "Exec",
  generateIO() {},
  run() {
    return ws.disconnect();
  },
});
//missing availableRequests & supportedImageForamts Array<string>

const versionOutputs = [
  {
    id: "obsVersion",
    name: "OBS Version",
    type: types.string(),
  },
  {
    id: "obsWebSocketVersion",
    name: "OBS WS Version",
    type: types.string(),
  },
  {
    id: "rpcVersion",
    name: "RPC Version",
    type: types.int(),
  },
  {
    id: "platform",
    name: "Platform",
    type: types.string(),
  },
  {
    id: "supportedImageFormats",
    name: "Supported Image Formats",
    type: types.list(types.string()),
  },
  {
    id: "availableRequests",
    name: "Available Requests",
    type: types.list(types.string()),
  },
  {
    id: "platformDescription",
    name: "Platform Description",
    type: types.string(),
  },
] as const;

pkg.createNonEventSchema({
  name: "Get OBS Version",
  variant: "Exec",
  generateIO(t) {
    versionOutputs.forEach((data) => t.dataOutput(data));
  },
  async run({ ctx }) {
    const data = await ws.call("GetVersion");
    versionOutputs.forEach(({ id }) => ctx.setOutput(id, data[id]));
  },
});

const statsOutputs = [
  ["cpuUsage", "CPU Usage"],
  ["memoryUsage", "Memory Usage"],
  ["availableDiskSpace", "Available Disk Space"],
  ["activeFps", "Active FPS"],
  ["averageFrameRenderTime", "Avg Frame Render Time"],
  ["renderSkippedFrames", "Render Skipped Frames"],
  ["renderTotalFrames", "Render Total Frames"],
  ["outputSkippedFrames", "Output Skipped Frames"],
  ["outputTotalFrames", "Output Total Frames"],
  ["webSocketSessionIncomingMessages", "Incoming Messages"],
  ["webSocketSessionOutgoingMessages", "Outgoing Messaes"],
] as const;

pkg.createNonEventSchema({
  name: "Get OBS Stats",
  variant: "Exec",
  generateIO(t) {
    statsOutputs.map(([id, name]) =>
      t.dataOutput({ id, name, type: types.int() })
    );
  },
  async run({ ctx }) {
    const data = await ws.call("GetStats");
    statsOutputs.forEach(([id]) => ctx.setOutput(id, data[id]));
  },
});

// Missing BroadcastCustomEvent requires OBject request

// Missing CallVendorRequest requires Object request and response

pkg.createNonEventSchema({
  name: "Get Hotkey list",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "hotkeys",
      name: "Hotkeys",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetHotkeyList");
    ctx.setOutput("hotkeys", data.hotkeys);
  },
});

pkg.createNonEventSchema({
  name: "Trigger Hotkey By Name",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "hotkeyName",
      name: "Hotkey Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("TriggerHotkeyByName", { hotkeyName: ctx.getInput("hotkeyName") });
  },
});

// Missing TriggerHotkeyByKeySequence requires object in requests

// Missing Sleep as it is batch specific

// Missing GetPersistentData as it has any type in response

// Missing SetPersistentData as it has any type in request

pkg.createNonEventSchema({
  name: "Get Scene Collection List",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "currentSceneCollectionName",
      name: "Scene Collection Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "sceneCollections",
      name: "Scene Collections",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetSceneCollectionList");
    ctx.setOutput(
      "currentSceneCollectionName",
      data.currentSceneCollectionName
    );
    ctx.setOutput("sceneCollections", data.sceneCollections);
  },
});

pkg.createNonEventSchema({
  name: "Set Current Scene Collection",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneCollectionName",
      name: "Scene Collection Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("SetCurrentSceneCollection", {
      sceneCollectionName: ctx.getInput("sceneCollectionName"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Create Scene Collection",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "SceneCollectionName",
      name: "Scene Collection Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("CreateSceneCollection", {
      sceneCollectionName: ctx.getInput("sceneCollectionName"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Get Profile list",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "currentProfileName",
      name: "Profile Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "profiles",
      name: "Profiles",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetProfileList");
    ctx.setOutput("currentProfileName", data.currentProfileName);
    ctx.setOutput("profiles", data.profiles);
  },
});
pkg.createNonEventSchema({
  name: "Set Current Profile",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "profileName",
      name: "Profile Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("SetCurrentProfile", { profileName: ctx.getInput("profileName") });
  },
});

pkg.createNonEventSchema({
  name: "Create Profile",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "profileName",
      name: "Profile Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("CreateProfile", { profileName: ctx.getInput("profileName") });
  },
});

pkg.createNonEventSchema({
  name: "Remove Profile",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "profileName",
      name: "Profile Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("RemoveProfile", { profileName: ctx.getInput("profileName") });
  },
});

pkg.createNonEventSchema({
  name: "Get Profile Parameter",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "parameterCategory",
      name: "Catagory",
      type: types.string(),
    });
    t.dataInput({
      id: "parameterName",
      name: "Name",
      type: types.string(),
    });

    t.dataOutput({
      id: "parameterValue",
      name: "Value",
      type: types.string(),
    });
    t.dataOutput({
      id: "defaultParameterValue",
      name: "Default Value",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetProfileParameter", {
      parameterCategory: ctx.getInput("parameterCategory"),
      parameterName: ctx.getInput("parameterName"),
    });
    ctx.setOutput("parameterValue", data.parameterValue);
    ctx.setOutput("defaultParameterValue", data.defaultParameterValue);
  },
});

pkg.createNonEventSchema({
  name: "Set Profile Parameter",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "parameterCategory",
      name: "Catagory",
      type: types.string(),
    });
    t.dataInput({
      id: "parameterName",
      name: "Name",
      type: types.string(),
    });
    t.dataInput({
      id: "parameterValue",
      name: "Value",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("SetProfileParameter", {
      parameterCategory: ctx.getInput("parameterCategory"),
      parameterName: ctx.getInput("parameterName"),
      parameterValue: ctx.getInput("parameterValue"),
    });
  },
});

const videoSettingOutputs = [
  ["fpsNumerator", "FPS Numerator"],
  ["fpsDenominator", "FPS Denominator"],
  ["baseWidth", "Base Width"],
  ["baseHeight", "Base Height"],
  ["outputWidth", "Output Width"],
  ["outputHeight", "Output Height"],
] as const;

pkg.createNonEventSchema({
  name: "Get Video Settings",
  variant: "Exec",
  generateIO(t) {
    videoSettingOutputs.forEach(([id, name]) =>
      t.dataOutput({ id, name, type: types.int() })
    );
  },
  async run({ ctx }) {
    const data = await ws.call("GetVideoSettings");
    videoSettingOutputs.forEach(([id]) => ctx.setOutput(id, data[id]));
  },
});

pkg.createNonEventSchema({
  name: "Set Video Settings",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "fpsNumerator",
      name: "FPS Numberator",
      type: types.int(),
    }),
      t.dataInput({
        id: "fpsDenominator",
        name: "FPS Denominator",
        type: types.int(),
      }),
      t.dataInput({
        id: "baseWidth",
        name: "Base Width",
        type: types.int(),
      }),
      t.dataInput({
        id: "baseHeight",
        name: "Base Height",
        type: types.int(),
      }),
      t.dataInput({
        id: "outputWidth",
        name: "Output Width",
        type: types.int(),
      }),
      t.dataInput({
        id: "outputHeight",
        name: "Output Height",
        type: types.int(),
      });
  },
  run({ ctx }) {
    ws.call("SetVideoSettings", {
      fpsNumerator: ctx.getInput("fpsNumerator"),
      fpsDenominator: ctx.getInput("fpsDenominator"),
      baseWidth: ctx.getInput("baseWidth"),
      baseHeight: ctx.getInput("baseHeight"),
      outputWidth: ctx.getInput("outputWidth"),
      outputHeight: ctx.getInput("outputHeight"),
    });
  },
});

//Missing GetStreamServiceSettings as it contains Object

//Missing SetStreamingServiceSettings as it contains object

pkg.createNonEventSchema({
  name: "Get Record Directory",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "recordDirectory",
      name: "Record Directory",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetRecordDirectory");
    ctx.setOutput("recordDirectory", data.recordDirectory);
  },
});

pkg.createNonEventSchema({
  name: "Get Source Active",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sourceName",
      name: "Source Name",
      type: types.string(),
    }),
      t.dataOutput({
        id: "videoActive",
        name: "Video Active",
        type: types.bool(),
      }),
      t.dataOutput({
        id: "videoShowing",
        name: "Video Showing",
        type: types.bool(),
      });
  },
  async run({ ctx }) {
    const data = await ws.call("GetSourceActive", {
      sourceName: ctx.getInput("sourceName"),
    });
    ctx.setOutput("videoActive", data.videoActive);
    ctx.setOutput("videoShowing", data.videoShowing);
  },
});

//Missing GetSourceScreenshot as it has Base64-Encoded Screenshot data

//Missing SaveSourceScreenshot as it has Base64-Encoded Screenshot data

//Missing GetSceneList as it contains array of object

pkg.createNonEventSchema({
  name: "Get Group List",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "groups",
      name: "Groups",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetGroupList");
    ctx.setOutput("groups", data.groups);
  },
});

pkg.createNonEventSchema({
  name: "Get Current Program Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "currentProgramSceneName",
      name: "Current Program Scene Name",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetCurrentProgramScene");
    ctx.setOutput("currentProgramSceneName", data.currentProgramSceneName);
  },
});

pkg.createNonEventSchema({
  name: "Set Current Program Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("SetCurrentProgramScene", { sceneName: ctx.getInput("sceneName") });
  },
});

pkg.createNonEventSchema({
  name: "Get Current Preview Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "currentPreviewSceneName",
      name: "Current Program Scene Name",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetCurrentPreviewScene");
    ctx.setOutput("currentPreviewSceneName", data.currentPreviewSceneName);
  },
});

pkg.createNonEventSchema({
  name: "Set Current Preview Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("SetCurrentPreviewScene", { sceneName: ctx.getInput("sceneName") });
  },
});

pkg.createNonEventSchema({
  name: "Create Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("CreateScene", { sceneName: ctx.getInput("sceneName") });
  },
});

pkg.createNonEventSchema({
  name: "Remove Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("RemoveScene", { sceneName: ctx.getInput("sceneName") });
  },
});

pkg.createNonEventSchema({
  name: "Set Scene Name",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "newSceneName",
      name: "New Scene Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("SetSceneName", {
      sceneName: ctx.getInput("sceneName"),
      newSceneName: ctx.getInput("newSceneName"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Set Scene Transition Override",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "transitionName",
      name: "Transition Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "transitionDuration",
      name: "Transition Duration",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetSceneSceneTransitionOverride", {
      sceneName: ctx.getInput("sceneName"),
    });
    ctx.setOutput("transitionName", data.transitionName);
    ctx.setOutput("transitionDuration", data.transitionDuration);
  },
});

pkg.createNonEventSchema({
  name: "Set Scene Transition Override",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "transitionName",
      name: "Transition Name",
      type: types.string(),
    });
    t.dataInput({
      id: "transitionDuration",
      name: "Transition Duration",
      type: types.int(),
    });
  },
  run({ ctx }) {
    ws.call("SetSceneSceneTransitionOverride", {
      sceneName: ctx.getInput("sceneName"),
      transitionName: ctx.getInput("transitionName"),
      transitionDuration: ctx.getInput("transitionDuration"),
    });
  },
});

//GetInputList has array of objects

pkg.createNonEventSchema({
  name: "Get Input Kind List",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "unversioned",
      name: "Unversioned",
      type: types.bool(),
    });
    t.dataOutput({
      id: "inputKinds",
      name: "Input Kinds",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetInputKindList", {
      unversioned: ctx.getInput("unversioned"),
    });
    ctx.setOutput("inputKinds", data.inputKinds);
  },
});

const SpecialInputsOutputs = [
  ["desktop1", "Desktop 1"],
  ["desktop2", "Desktop 2"],
  ["mic1", "Mic1"],
  ["mic2", "Mic2"],
  ["mic3", "Mic3"],
  ["mic4", "Mic4"],
] as const;

pkg.createNonEventSchema({
  name: "Get Special Inputs",
  variant: "Exec",
  generateIO(t) {
    SpecialInputsOutputs.map(([id, name]) =>
      t.dataOutput({ id, name, type: types.string() })
    );
  },
  async run({ ctx }) {
    const data = await ws.call("GetSpecialInputs");
    SpecialInputsOutputs.forEach(([id]) => ctx.setOutput(id, data[id]));
  },
});

//Create Input doesnt allow custom init settings as its an objecy

pkg.createNonEventSchema({
  name: "Create Input",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataInput({
      id: "inputKind",
      name: "Input kind",
      type: types.string(),
    });
    t.dataInput({
      id: "sceneItemEnabled",
      name: "Scene Item Enabled",
      type: types.bool(),
    });
    t.dataOutput({
      id: "sceneItemId",
      name: "Scene Item Id",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("CreateInput", {
      inputKind: ctx.getInput("inputKind"),
      sceneName: ctx.getInput("sceneName"),
      inputName: ctx.getInput("inputName"),
      sceneItemEnabled: ctx.getInput("sceneItemEnabled")
     });
    ctx.setOutput("sceneItemId", data.sceneItemId);
  },
});

pkg.createNonEventSchema({
  name: "Remove Input",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("RemoveInput", {
      inputName: ctx.getInput("inputName"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Set Input Name",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataInput({
      id: "newInputName",
      name: "New Input Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("SetInputName", {
      inputName: ctx.getInput("inputName"),
      newInputName: ctx.getInput("newInputName"),
    });
  },
});

//GetInputDefaultSettings has object

//GetINputSettings has object

//SetInputSettings has object

pkg.createNonEventSchema({
  name: "Get Input Mute",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "inputMuted",
      name: "Input Muted",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetInputMute", {
      inputName: ctx.getInput("inputName"),
    });
    ctx.setOutput("inputMuted", data.inputMuted);
  },
});

pkg.createNonEventSchema({
  name: "Set Input Mute",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataInput({
      id: "inputMuted",
      name: "Input Muted",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    ws.call("SetInputMute", {
      inputName: ctx.getInput("inputName"),
      inputMuted: ctx.getInput("inputMuted")
    });
  },
});

pkg.createNonEventSchema({
  name: "Toggle Input Mute",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "inputMuted",
      name: "Input Muted",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("ToggleInputMute", {
      inputName: ctx.getInput("inputName"),
    });
    ctx.setOutput("inputMuted", data.inputMuted);
  },
});

pkg.createNonEventSchema({
  name: "Get Input Volume",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "inputVolumeMul",
      name: "Input Volume Mul",
      type: types.int(),
    });
    t.dataOutput({
      id: "inputVolumeDb",
      name: "Input Volume Db",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetInputVolume", {
      inputName: ctx.getInput("inputName"),
    });
    ctx.setOutput("inputVolumeMul", data.inputVolumeMul);
    ctx.setOutput("inputVolumeDb", data.inputVolumeDb);
  },
});

pkg.createNonEventSchema({
  name: "Set Input Volume",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataInput({
      id: "inputVolumeMul",
      name: "Input Volume Mul",
      type: types.bool(),
    });
    t.dataInput({
      id: "inputVolumeDb",
      name: "Input Volume Db",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    ws.call("SetInputVolume", {
      inputName: ctx.getInput("inputName"),
      inputVolumeMul: ctx.getInput("inputVolumeMul"),
      inputVolumeDb: ctx.getInput("inputVolumeDb"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Get Input Audio Balance",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "inputAudioBalance",
      name: "Input Audio Balance",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetInputAudioBalance", {
      inputName: ctx.getInput("inputName"),
    });
    ctx.setOutput("inputAudioBalance", data.inputAudioBalance);
  },
});

pkg.createNonEventSchema({
  name: "Set Input Audio Balance",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataInput({
      id: "inputAudioBalance",
      name: "Input Audio Balance",
      type: types.int(),
    });

  },
  async run({ ctx }) {
    ws.call("SetInputAudioBalance", {
      inputName: ctx.getInput("inputName"),
      inputAudioBalance: ctx.getInput("inputAudioBalance"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Get Input Audio Sync Offset",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "inputAudioSyncOffset",
      name: "Input Audio Sync Offset",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetInputAudioSyncOffset", {
      inputName: ctx.getInput("inputName"),
    });
    ctx.setOutput("inputAudioSyncOffset", data.inputAudioSyncOffset);
  },
});

pkg.createNonEventSchema({
  name: "Set Input Audio Sync Offset",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataInput({
      id: "inputAudioSyncOffset",
      name: "Input Audio Sync Offset",
      type: types.int(),
    });

  },
  async run({ ctx }) {
    ws.call("SetInputAudioSyncOffset", {
      inputName: ctx.getInput("inputName"),
      inputAudioSyncOffset: ctx.getInput("inputAudioSyncOffset"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Get Input Audio Monitor Type",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "monitorType",
      name: "Monitor Type",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetInputAudioMonitorType", {
      inputName: ctx.getInput("inputName"),
    });
    ctx.setOutput("monitorType", data.monitorType);
  },
});

pkg.createNonEventSchema({
  name: "Set Input Audio Monitor Type",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataInput({
      id: "monitorType",
      name: "Monitor Type",
      type: types.string(),
    });

  },
  async run({ ctx }) {
    ws.call("SetInputAudioMonitorType", {
      inputName: ctx.getInput("inputName"),
      monitorType: ctx.getInput("monitorType"),
    });
  },
});

//GetInputAudioTracks contains object

//SetInputAudioTracks contains object

//GetInputPropertiesListPropertyItems contains array of objects

pkg.createNonEventSchema({
  name: "Press Input Properties Button",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "inputName",
      name: "Input Name",
      type: types.string(),
    });
    t.dataInput({
      id: "propertyName",
      name: "Property Name",
      type: types.int(),
    });

  },
  async run({ ctx }) {
    ws.call("PressInputPropertiesButton", {
      inputName: ctx.getInput("inputName"),
      propertyName: ctx.getInput("propertyName"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Get Transition Kind List",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "transitionKinds",
      name: "Transition Kinds",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetTransitionKindList");
    ctx.setOutput("transitionKinds", data.transitionKinds);
  },
});

//GetSceneTransitionList contains array of objects

//GetCurrentSceneTransition contains object

pkg.createNonEventSchema({
  name: "Set Current Scene Transition",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "transitionName",
      name: "Transition Name",
      type: types.string(),
    });

  },
  async run({ ctx }) {
    ws.call("SetCurrentSceneTransition", {
      transitionName: ctx.getInput("transitionName"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Set Current Scene Transition Duration",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "transitionDuration",
      name: "Transition Duration",
      type: types.int(),
    });

  },
  async run({ ctx }) {
    ws.call("SetCurrentSceneTransitionDuration", {
      transitionDuration: ctx.getInput("transitionDuration"),
    });
  },
});

//SetCurrentSceneTransitionSettings contains object

pkg.createNonEventSchema({
  name: "Get Current Scene Transition Cursor",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "transitionCursor",
      name: "Transition Cursor",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetCurrentSceneTransitionCursor");
    ctx.setOutput("transitionCursor", data.transitionCursor);
  },
});

pkg.createNonEventSchema({
  name: "Trigger Studio Mode Transition",
  variant: "Exec",
  generateIO(t) {},
  async run({ ctx }) {
    ws.call("TriggerStudioModeTransition");
  },
});

pkg.createNonEventSchema({
  name: "Set T Bar Position",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "position",
      name: "Position",
      type: types.int(),
    });
    t.dataInput({
      id: "release",
      name: "Release",
      type: types.bool(),
    });

  },
  async run({ ctx }) {
    ws.call("SetTBarPosition", {
      position: ctx.getInput("position"),
      release: ctx.getInput("release"),
    });
  },
});

//GetSourceFilterList contains array of object

//GetSourceFilterDefaultSettings contains object

//CreateSourceFilter contains object

pkg.createNonEventSchema({
  name: "Remove Source Filter",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sourceName",
      name: "Source Name",
      type: types.string(),
    });
    t.dataInput({
      id: "filterName",
      name: "Filter Name",
      type: types.int(),
    });

  },
  async run({ ctx }) {
    ws.call("RemoveSourceFilter", {
      sourceName: ctx.getInput("sourceName"),
      filterName: ctx.getInput("filterName"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Set Source Filter Name",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sourceName",
      name: "Source Name",
      type: types.string(),
    });
    t.dataInput({
      id: "filterName",
      name: "Filter Name",
      type: types.string(),
    });
    t.dataInput({
      id: "newFilterName",
      name: "New Filter Name",
      type: types.string(),
    });

  },
  async run({ ctx }) {
    ws.call("SetSourceFilterName", {
      sourceName: ctx.getInput("sourceName"),
      filterName: ctx.getInput("filterName"),
      newFilterName: ctx.getInput("newFilterName"),
    });
  },
});

//GetSourceFilter contains object

pkg.createNonEventSchema({
  name: "Set Source Filter Name",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sourceName",
      name: "Source Name",
      type: types.string(),
    });
    t.dataInput({
      id: "filterName",
      name: "Filter Name",
      type: types.string(),
    });
    t.dataInput({
      id: "filterIndex",
      name: "Filter Index",
      type: types.int(),
    });

  },
  async run({ ctx }) {
    ws.call("SetSourceFilterIndex", {
      sourceName: ctx.getInput("sourceName"),
      filterName: ctx.getInput("filterName"),
      filterIndex: ctx.getInput("filterIndex"),
    });
  },
});

//SetSourceFilterSettings contains object

pkg.createNonEventSchema({
  name: "Set Source Filter Enabled",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sourceName",
      name: "Source Name",
      type: types.string(),
    });
    t.dataInput({
      id: "filterName",
      name: "Filter Name",
      type: types.string(),
    });
    t.dataInput({
      id: "filterEnabled",
      name: "Filter Enabled",
      type: types.int(),
    });

  },
  async run({ ctx }) {
    ws.call("SetSourceFilterEnabled", {
      sourceName: ctx.getInput("sourceName"),
      filterName: ctx.getInput("filterName"),
      filterEnabled: ctx.getInput("filterEnabled"),
    });
  },
});

//GetSceneItemList contains array of object

//GetGroupSceneItemList contains array of object

pkg.createNonEventSchema({
  name: "Get Scene Item Id",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "sourceName",
      name: "Source Name",
      type: types.string(),
    });
    t.dataInput({
      id: "searchOffset",
      name: "Search Offset",
      type: types.int(),
    });
    t.dataOutput({
      id: "sceneItemId",
      name: "Scene Item Id",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetSceneItemId", {
      sceneName: ctx.getInput("sceneName"),
      sourceName: ctx.getInput("sourceName"),
      searchOffset: ctx.getInput("searchOffset"),
    });
    ctx.setOutput("sceneItemId", data.sceneItemId);
  },
});

pkg.createNonEventSchema({
  name: "Get Scene Item Id",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "sourceName",
      name: "Source Name",
      type: types.string(),
    });
    t.dataInput({
      id: "sceneItemEnabled",
      name: "Search Offset",
      type: types.bool(),
    });
    t.dataOutput({
      id: "sceneItemId",
      name: "Scene Item Id",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("CreateSceneItem", {
      sceneName: ctx.getInput("sceneName"),
      sourceName: ctx.getInput("sourceName"),
      sceneItemEnabled: ctx.getInput("sceneItemEnabled"),
    });
    ctx.setOutput("sceneItemId", data.sceneItemId);
  },
});

pkg.createNonEventSchema({
  name: "Set Input Volume",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "sceneItemId",
      name: "Scene Item Id",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    ws.call("RemoveSceneItem", {
      sceneName: ctx.getInput("sceneName"),
      sceneItemId: ctx.getInput("sceneItemId"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Duplicate Scene Item",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "sceneItemId",
      name: "Scene Item Id",
      type: types.int(),
    });
    t.dataInput({
      id: "destinationSceneName",
      name: "Destination Scene Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "sceneItemId",
      name: "Scene Item Id",
      type: types.int(),
    })
  },
  async run({ ctx }) {
    const data = await ws.call("DuplicateSceneItem", {
      sceneName: ctx.getInput("sceneName"),
      sceneItemId: ctx.getInput("sceneItemId"),
      destinationSceneName: ctx.getInput("destinationSceneName"),
    });
    ctx.setOutput("sceneItemId", data.sceneItemId);
  },
});

//GetSceneItemTransform contains object

//SetSceneItemTransform contains object

pkg.createNonEventSchema({
  name: "Get Scene Item Enabled",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "sceneItemId",
      name: "Scene Item Id",
      type: types.int(),
    });
    t.dataOutput({
      id: "sceneItemEnabled",
      name: "Scene Item Enabled",
      type: types.bool(),
    })
  },
  async run({ ctx }) {
    const data = await ws.call("GetSceneItemEnabled", {
      sceneName: ctx.getInput("sceneName"),
      sceneItemId: ctx.getInput("sceneItemId"),
    });
    ctx.setOutput("sceneItemEnabled", data.sceneItemEnabled);
  },
});

pkg.createNonEventSchema({
  name: "Get Scene Item Enabled",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "sceneItemId",
      name: "Scene Item Id",
      type: types.int(),
    });
    t.dataInput({
      id: "sceneItemEnabled",
      name: "Scene Item Enabled",
      type: types.bool(),
    })
  },
  async run({ ctx }) {
    ws.call("SetSceneItemEnabled", {
      sceneName: ctx.getInput("sceneName"),
      sceneItemId: ctx.getInput("sceneItemId"),
      sceneItemEnabled: ctx.getInput("sceneItemEnabled"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Get Scene Item Id",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "sceneItemId",
      name: "Scene Item Id",
      type: types.int(),
    });
    t.dataOutput({
      id: "sceneItemLocked",
      name: "Scene Item Locked",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetSceneItemLocked", {
      sceneName: ctx.getInput("sceneName"),
      sceneItemId: ctx.getInput("sceneItemId"),
    });
    ctx.setOutput("sceneItemLocked", data.sceneItemLocked);
  },
});

pkg.createNonEventSchema({
  name: "Set Scene Item Locked",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "sceneItemId",
      name: "Scene Item Id",
      type: types.int(),
    });
    t.dataInput({
      id: "sceneItemLocked",
      name: "Scene Item Locked",
      type: types.bool(),
    })
  },
  async run({ ctx }) {
    ws.call("SetSceneItemLocked", {
      sceneName: ctx.getInput("sceneName"),
      sceneItemId: ctx.getInput("sceneItemId"),
      sceneItemLocked: ctx.getInput("sceneItemLocked"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Get Scene Item Index",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
    t.dataInput({
      id: "sceneItemId",
      name: "Scene Item Id",
      type: types.int(),
    });
    t.dataOutput({
      id: "sceneItemIndex",
      name: "Scene Item Index",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call("GetSceneItemIndex", {
      sceneName: ctx.getInput("sceneName"),
      sceneItemId: ctx.getInput("sceneItemId"),
    });
    ctx.setOutput("sceneItemIndex", data.sceneItemIndex);
  },
});


//set scene item index is next




//EVENTS BELOW ______________________________________________

pkg.createEventSchema({
  event: "ConnectionOpened",
  name: "Connection Opened",
  generateIO(t) {
    t.execOutput({
      id: "exec",
      name: "",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});

ws.on("ConnectionOpened", () =>
  pkg.emitEvent({ name: "ConnectionOpened", data: undefined })
);

pkg.createEventSchema({
  event: "CurrentProgramSceneChanged",
  name: "Current Program Scene Changed",
  generateIO(t) {
    t.execOutput({
      id: "exec",
      name: "",
    });
    t.dataOutput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("sceneName", data.sceneName);
    ctx.exec("exec");
  },
});

ws.on("CurrentProgramSceneChanged", (data) => {
  pkg.emitEvent({ name: "CurrentProgramSceneChanged", data });
});
