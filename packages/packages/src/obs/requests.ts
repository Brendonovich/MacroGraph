import { createEnum, createStruct, Package } from "@macrograph/runtime";
import { InferEnum, Maybe, t } from "@macrograph/typesystem";
import { JSON, jsonToJS, jsToJSON } from "@macrograph/json";
import { EventTypes } from "obs-websocket-js";
import { createLazyMemo } from "@solid-primitives/memo";
import { ReactiveMap } from "@solid-primitives/map";

import { BoundsType, SceneItemTransform, alignmentConversion } from "./events";
import { Ctx } from "./ctx";

//missing availableRequests & supportedImageForamts Array<string>

export const SceneItem = createStruct("Scene Item", (s) => ({
  sceneItemId: s.field("ID", t.int()),
  inputKind: s.field("Input Kind", t.option(t.string())),
  isGroup: s.field("Is Group", t.bool()),
  sceneItemBlendMode: s.field("Blend Mode", t.string()),
  sceneItemEnabled: s.field("Enabled", t.bool()),
  sceneItemIndex: s.field("Index", t.int()),
  sceneItemLocked: s.field("Locked", t.bool()),
  sceneItemTransform: s.field("Transform", t.struct(SceneItemTransform)),
  sourceName: s.field("Source Name", t.string()),
  sourceType: s.field("Source Type", t.string()),
}));

export const Filter = createStruct("Filter", (s) => ({
  filterEnabled: s.field("Enabled", t.bool()),
  filterIndex: s.field("Index", t.int()),
  filterKind: s.field("Kind", t.string()),
  filterName: s.field("Name", t.string()),
  filterSettings: s.field("Settings", t.enum(JSON)),
}));

export const Transition = createStruct("Transition", (s) => ({
  transitionConfigurable: s.field("Configurable", t.bool()),
  transitionFixed: s.field("Fixed", t.bool()),
  transitionKind: s.field("Kind", t.string()),
  transitionName: s.field("Name", t.string()),
}));

export const PropertyItem = createStruct("Property Item", (s) => ({
  itemEnabled: s.field("Enabled", t.bool()),
  itemName: s.field("Name", t.string()),
  itemValue: s.field("Value", t.string()),
}));

export const MonitorType = createEnum("Monitor Type", (e) => [
  e.variant("MonitorOnly"),
  e.variant("MonitorAndOutput"),
  e.variant("None"),
]);

export const Scene = createStruct("Scenes", (s) => ({
  sceneName: s.field("Name", t.string()),
  sceneIndex: s.field("Index", t.int()),
}));

export const InputInfo = createStruct("Input Info", (s) => ({
  inputName: s.field("Input name", t.string()),
  inputKind: s.field("Input Kind", t.string()),
  unversionedInputKind: s.field("Unversioned Input Kind", t.string()),
}));

interface SceneItemTransformInterface {
  alignment: number;
  boundsAlignment: number;
  boundsHeight: number;
  boundsType: string;
  boundsWidth: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  cropTop: number;
  positionX: number;
  positionY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
}

export function register(pkg: Package<EventTypes>, { instances }: Ctx) {
  const obs = createLazyMemo(() => {
    for (const instance of instances.values()) {
      if (instance.state === "connected") return instance.obs;
    }

    throw new Error("No OBS connected!");
  });

  const versionOutputs = [
    {
      id: "obsVersion",
      name: "OBS Version",
      type: t.string(),
    },
    {
      id: "obsWebSocketVersion",
      name: "OBS WS Version",
      type: t.string(),
    },
    {
      id: "rpcVersion",
      name: "RPC Version",
      type: t.int(),
    },
    {
      id: "platform",
      name: "Platform",
      type: t.string(),
    },
    {
      id: "supportedImageFormats",
      name: "Supported Image Formats",
      type: t.list(t.string()),
    },
    {
      id: "availableRequests",
      name: "Available Requests",
      type: t.list(t.string()),
    },
    {
      id: "platformDescription",
      name: "Platform Description",
      type: t.string(),
    },
  ] as const;

  pkg.createNonEventSchema({
    name: "Get OBS Version",
    variant: "Exec",
    createIO: ({ io }) =>
      versionOutputs.map((data) => [data.id, io.dataOutput(data)] as const),
    async run({ ctx, io }) {
      const data = await obs().call("GetVersion");
      io.forEach(([id, output]) => ctx.setOutput(output, data[id]));
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
    createIO: ({ io }) =>
      statsOutputs.map(
        ([id, name]) =>
          [id, io.dataOutput({ id, name, type: t.int() })] as const
      ),
    async run({ ctx, io }) {
      const data = await obs().call("GetStats");
      io.forEach(([id, output]) => ctx.setOutput(output, data[id]));
    },
  });

  // Missing BroadcastCustomEvent requires OBject request

  // Missing CallVendorRequest requires Object request and response

  pkg.createNonEventSchema({
    name: "Get Hotkey list",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "hotkeys",
        name: "Hotkeys",
        type: t.list(t.string()),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetHotkeyList");
      ctx.setOutput(io, data.hotkeys);
    },
  });

  pkg.createNonEventSchema({
    name: "Trigger Hotkey By Name",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "hotkeyName",
        name: "Hotkey Name",
        type: t.string(),
      }),
    run({ ctx, io }) {
      obs().call("TriggerHotkeyByName", { hotkeyName: ctx.getInput(io) });
    },
  });

  pkg.createNonEventSchema({
    name: "Trigger Hotkey By Key Sequence",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        id: io.dataInput({
          id: "keyId",
          name: "Key ID",
          type: t.string(),
        }),
        modifiers: io.dataInput({
          id: "keyModifiers",
          name: "Key Modifiers",
          type: t.map(t.enum(JSON)),
        }),
      };
    },
    run({ ctx, io }) {
      return obs().call("TriggerHotkeyByKeySequence", {
        keyId: ctx.getInput(io.id),
        keyModifiers: jsonToJS(
          JSON.variant([
            "Map",
            {
              value: ctx.getInput(io.modifiers),
            },
          ])
        ),
      });
    },
  });

  // Missing Sleep as it is batch specific

  // Missing GetPersistentData as it has any type in response

  // Missing SetPersistentData as it has any type in request

  pkg.createNonEventSchema({
    name: "Get Scene Collection List",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        currentSceneCollectionName: io.dataOutput({
          id: "currentSceneCollectionName",
          name: "Scene Collection Name",
          type: t.string(),
        }),
        sceneCollections: io.dataOutput({
          id: "sceneCollections",
          name: "Scene Collections",
          type: t.list(t.string()),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSceneCollectionList");
      ctx.setOutput(
        io.currentSceneCollectionName,
        data.currentSceneCollectionName
      );
      ctx.setOutput(io.sceneCollections, data.sceneCollections);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Current Scene Collection",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "sceneCollectionName",
        name: "Scene Collection Name",
        type: t.string(),
      }),
    run({ ctx, io }) {
      obs().call("SetCurrentSceneCollection", {
        sceneCollectionName: ctx.getInput(io),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Create Scene Collection",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "sceneCollectionName",
        name: "Scene Collection Name",
        type: t.string(),
      }),
    run({ ctx, io }) {
      obs().call("CreateSceneCollection", {
        sceneCollectionName: ctx.getInput(io),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Profile list",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        currentProfileName: io.dataOutput({
          id: "currentProfileName",
          name: "Profile Name",
          type: t.string(),
        }),
        profiles: io.dataOutput({
          id: "profiles",
          name: "Profiles",
          type: t.list(t.string()),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetProfileList");
      ctx.setOutput(io.currentProfileName, data.currentProfileName);
      ctx.setOutput(io.profiles, data.profiles);
    },
  });
  pkg.createNonEventSchema({
    name: "Set Current Profile",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "profileName",
        name: "Profile Name",
        type: t.string(),
      }),
    run({ ctx, io }) {
      obs().call("SetCurrentProfile", { profileName: ctx.getInput(io) });
    },
  });

  pkg.createNonEventSchema({
    name: "Create Profile",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "profileName",
        name: "Profile Name",
        type: t.string(),
      }),
    run({ ctx, io }) {
      obs().call("CreateProfile", { profileName: ctx.getInput(io) });
    },
  });

  pkg.createNonEventSchema({
    name: "Remove Profile",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "profileName",
        name: "Profile Name",
        type: t.string(),
      }),
    run({ ctx, io }) {
      obs().call("RemoveProfile", { profileName: ctx.getInput(io) });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Profile Parameter",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        parameterCategory: io.dataInput({
          id: "parameterCategory",
          name: "Catagory",
          type: t.string(),
        }),
        parameterName: io.dataInput({
          id: "parameterName",
          name: "Name",
          type: t.string(),
        }),
        parameterValue: io.dataOutput({
          id: "parameterValue",
          name: "Value",
          type: t.string(),
        }),
        defaultParameterValue: io.dataOutput({
          id: "defaultParameterValue",
          name: "Default Value",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetProfileParameter", {
        parameterCategory: ctx.getInput(io.parameterCategory),
        parameterName: ctx.getInput(io.parameterName),
      });
      ctx.setOutput(io.parameterValue, data.parameterValue);
      ctx.setOutput(io.defaultParameterValue, data.defaultParameterValue);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Profile Parameter",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        parameterCategory: io.dataInput({
          id: "parameterCategory",
          name: "Catagory",
          type: t.string(),
        }),
        parameterName: io.dataInput({
          id: "parameterName",
          name: "Name",
          type: t.string(),
        }),
        parameterValue: io.dataInput({
          id: "parameterValue",
          name: "Value",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      obs().call("SetProfileParameter", {
        parameterCategory: ctx.getInput(io.parameterCategory),
        parameterName: ctx.getInput(io.parameterName),
        parameterValue: ctx.getInput(io.parameterValue),
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
    createIO: ({ io }) =>
      videoSettingOutputs.map(
        ([id, name]) =>
          [id, io.dataOutput({ id, name, type: t.int() })] as const
      ),
    async run({ ctx, io }) {
      const data = await obs().call("GetVideoSettings");
      io.forEach(([id, output]) => ctx.setOutput(output, data[id]));
    },
  });

  pkg.createNonEventSchema({
    name: "Set Video Settings",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        fpsNumerator: io.dataInput({
          id: "fpsNumerator",
          name: "FPS Numberator",
          type: t.int(),
        }),
        fpsDenominator: io.dataInput({
          id: "fpsDenominator",
          name: "FPS Denominator",
          type: t.int(),
        }),
        baseWidth: io.dataInput({
          id: "baseWidth",
          name: "Base Width",
          type: t.int(),
        }),
        baseHeight: io.dataInput({
          id: "baseHeight",
          name: "Base Height",
          type: t.int(),
        }),
        outputWidth: io.dataInput({
          id: "outputWidth",
          name: "Output Width",
          type: t.int(),
        }),
        outputHeight: io.dataInput({
          id: "outputHeight",
          name: "Output Height",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      obs().call("SetVideoSettings", {
        fpsNumerator: ctx.getInput(io.fpsNumerator),
        fpsDenominator: ctx.getInput(io.fpsDenominator),
        baseWidth: ctx.getInput(io.baseWidth),
        baseHeight: ctx.getInput(io.baseHeight),
        outputWidth: ctx.getInput(io.outputWidth),
        outputHeight: ctx.getInput(io.outputHeight),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Stream Service Settings",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        streamServiceType: io.dataOutput({
          id: "streamServiceType",
          name: "Stream Service Type",
          type: t.string(),
        }),
        streamServiceSettings: io.dataOutput({
          id: "streamServiceSettings",
          name: "Stream Service Settings",
          type: t.enum(JSON),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetStreamServiceSettings");
      ctx.setOutput(io.streamServiceType, data.streamServiceType);
      ctx.setOutput(
        io.streamServiceSettings,
        Maybe(jsToJSON(data.streamServiceSettings)).unwrap()
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Set Stream Service Settings",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        streamServiceType: io.dataInput({
          id: "streamServiceType",
          name: "Stream Service Type",
          type: t.string(),
        }),
        streamServiceSettings: io.dataInput({
          id: "streamServiceSettings",
          name: "Stream Service Settings",
          type: t.map(t.enum(JSON)),
        }),
      };
    },
    run({ ctx, io }) {
      obs().call("SetStreamServiceSettings", {
        streamServiceType: ctx.getInput(io.streamServiceType),
        streamServiceSettings: jsonToJS({
          variant: "Map",
          data: {
            value: ctx.getInput(io.streamServiceSettings),
          },
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Record Directory",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "recordDirectory",
        name: "Record Directory",
        type: t.string(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetRecordDirectory");
      ctx.setOutput(io, data.recordDirectory);
    },
  });

  pkg.createNonEventSchema({
    name: "Get Source Active",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
        }),
        videoActive: io.dataOutput({
          id: "videoActive",
          name: "Video Active",
          type: t.bool(),
        }),
        videoShowing: io.dataOutput({
          id: "videoShowing",
          name: "Video Showing",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSourceActive", {
        sourceName: ctx.getInput(io.sourceName),
      });
      ctx.setOutput(io.videoActive, data.videoActive);
      ctx.setOutput(io.videoShowing, data.videoShowing);
    },
  });

  //Missing GetSourceScreenshot as it has Base64-Encoded Screenshot data

  //Missing SaveSourceScreenshot as it has Base64-Encoded Screenshot data

  pkg.createNonEventSchema({
    name: "Get Group List",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "groups",
        name: "Groups",
        type: t.list(t.string()),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetGroupList");
      ctx.setOutput(io, data.groups);
    },
  });

  pkg.createNonEventSchema({
    name: "Get Current Program Scene",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "currentProgramSceneName",
        type: t.string(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetCurrentProgramScene");
      ctx.setOutput(io, data.currentProgramSceneName);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Current Program Scene",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
      }),
    run({ ctx, io }) {
      obs().call("SetCurrentProgramScene", {
        sceneName: ctx.getInput(io),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Current Preview Scene",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "currentPreviewSceneName",
        name: "Current Program Scene Name",
        type: t.string(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetCurrentPreviewScene");
      ctx.setOutput(io, data.currentPreviewSceneName);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Current Preview Scene",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
      }),
    run({ ctx, io }) {
      obs().call("SetCurrentPreviewScene", {
        sceneName: ctx.getInput(io),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Create Scene",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
      }),
    run({ ctx, io }) {
      obs().call("CreateScene", { sceneName: ctx.getInput(io) });
    },
  });

  pkg.createNonEventSchema({
    name: "Remove Scene",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
      }),
    run({ ctx, io }) {
      obs().call("RemoveScene", { sceneName: ctx.getInput(io) });
    },
  });

  pkg.createNonEventSchema({
    name: "Set Scene Name",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        newSceneName: io.dataInput({
          id: "newSceneName",
          name: "New Scene Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      obs().call("SetSceneName", {
        sceneName: ctx.getInput(io.sceneName),
        newSceneName: ctx.getInput(io.newSceneName),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Scene Transition Override",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        transitionName: io.dataOutput({
          id: "transitionName",
          name: "Transition Name",
          type: t.string(),
        }),
        transitionDuration: io.dataOutput({
          id: "transitionDuration",
          name: "Transition Duration",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSceneSceneTransitionOverride", {
        sceneName: ctx.getInput(io.sceneName),
      });
      ctx.setOutput(io.transitionName, data.transitionName);
      ctx.setOutput(io.transitionDuration, data.transitionDuration);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Scene Transition Override",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        transitionName: io.dataInput({
          id: "transitionName",
          name: "Transition Name",
          type: t.string(),
        }),
        transitionDuration: io.dataInput({
          id: "transitionDuration",
          name: "Transition Duration",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      obs().call("SetSceneSceneTransitionOverride", {
        sceneName: ctx.getInput(io.sceneName),
        transitionName: ctx.getInput(io.transitionName),
        transitionDuration: ctx.getInput(io.transitionDuration),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Input Kind List",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        unversioned: io.dataInput({
          id: "unversioned",
          name: "Unversioned",
          type: t.bool(),
        }),
        inputKinds: io.dataOutput({
          id: "inputKinds",
          name: "Input Kinds",
          type: t.list(t.string()),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetInputKindList", {
        unversioned: ctx.getInput(io.unversioned),
      });
      ctx.setOutput(io.inputKinds, data.inputKinds);
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
    createIO: ({ io }) =>
      SpecialInputsOutputs.map(
        ([id, name]) =>
          [id, io.dataOutput({ id, name, type: t.string() })] as const
      ),
    async run({ ctx, io }) {
      const data = await obs().call("GetSpecialInputs");
      io.forEach(([id, output]) => ctx.setOutput(output, data[id]));
    },
  });

  pkg.createNonEventSchema({
    name: "Create Input",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputKind: io.dataInput({
          id: "inputKind",
          name: "Input kind",
          type: t.string(),
        }),
        inputSettings: io.dataInput({
          id: "inputSettings",
          name: "Input Settings",
          type: t.map(t.enum(JSON)),
        }),
        sceneItemEnabled: io.dataInput({
          id: "sceneItemEnabled",
          name: "Scene Item Enabled",
          type: t.bool(),
        }),
        sceneItemId: io.dataOutput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("CreateInput", {
        inputKind: ctx.getInput(io.inputKind),
        sceneName: ctx.getInput(io.sceneName),
        inputName: ctx.getInput(io.inputName),
        sceneItemEnabled: ctx.getInput(io.sceneItemEnabled),
        inputSettings: jsonToJS({
          variant: "Map",
          data: {
            value: ctx.getInput(io.inputSettings),
          },
        }),
      });
      ctx.setOutput(io.sceneItemId, data.sceneItemId);
    },
  });

  pkg.createNonEventSchema({
    name: "Remove Input",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
      }),
    run({ ctx, io }) {
      obs().call("RemoveInput", {
        inputName: ctx.getInput(io),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Set Input Name",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        newInputName: io.dataInput({
          id: "newInputName",
          name: "New Input Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      obs().call("SetInputName", {
        inputName: ctx.getInput(io.inputName),
        newInputName: ctx.getInput(io.newInputName),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Input List",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputKind: io.dataInput({
          id: "inputKind",
          name: "Input Kind",
          type: t.string(),
        }),
        inputs: io.dataOutput({
          id: "inputs",
          name: "Inputs",
          type: t.list(t.struct(InputInfo)),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call(
        "GetInputList",
        ctx.getInput(io.inputKind)
          ? {
              inputKind: ctx.getInput(io.inputKind),
            }
          : {}
      );

      const inputs = data.inputs.map((input) =>
        InputInfo.create({
          inputKind: input.inputKind as string,
          inputName: input.inputName as string,
          unversionedInputKind: input.unversionedInputKind as string,
        })
      );

      ctx.setOutput(io.inputs, inputs);
    },
  });

  pkg.createNonEventSchema({
    name: "Get Scene List",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        currentProgramSceneName: io.dataOutput({
          id: "currentProgramSceneName",
          name: "Program Scene Name",
          type: t.string(),
        }),
        currentPreviewSceneName: io.dataOutput({
          id: "currentPreviewSceneName",
          name: "Preview Scene Name",
          type: t.string(),
        }),
        inputs: io.dataOutput({
          id: "inputs",
          name: "Inputs",
          type: t.list(t.struct(Scene)),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSceneList");

      const scene = data.scenes.map((input) =>
        Scene.create({
          sceneIndex: input.sceneIndex as number,
          sceneName: input.sceneName as string,
        })
      );

      ctx.setOutput(io.currentProgramSceneName, data.currentProgramSceneName);
      ctx.setOutput(io.currentPreviewSceneName, data.currentPreviewSceneName);
      ctx.setOutput(io.inputs, scene);
    },
  });

  pkg.createNonEventSchema({
    name: "Get Input Default Settings",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputKind: io.dataInput({
          id: "inputKind",
          name: "Input Kind",
          type: t.string(),
        }),
        defaultInputSettings: io.dataOutput({
          id: "defaultInputSettings",
          name: "Default Input Settings",
          type: t.enum(JSON),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetInputDefaultSettings", {
        inputKind: ctx.getInput(io.inputKind),
      });

      ctx.setOutput(
        io.defaultInputSettings,
        Maybe(jsToJSON(data.defaultInputSettings)).unwrap()
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Get Input Settings",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputSettings: io.dataOutput({
          id: "inputSettings",
          name: "Input Settings",
          type: t.map(t.enum(JSON)),
        }),
        inputKind: io.dataOutput({
          id: "inputKind",
          name: "Input Kind",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetInputSettings", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(
        io.inputSettings,
        new ReactiveMap(
          Object.entries(data.inputSettings).map(([key, value]) => [
            key,
            jsToJSON(value)!,
          ])
        )
      );
      ctx.setOutput(io.inputKind, data.inputKind);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Input Settings",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputSettings: io.dataInput({
          id: "inputSettings",
          name: "Input Settings",
          type: t.map(t.enum(JSON)),
        }),
        overlay: io.dataInput({
          id: "overlay",
          name: "Overlay",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      obs().call("SetInputSettings", {
        inputName: ctx.getInput(io.inputName),
        inputSettings: jsonToJS({
          variant: "Map",
          data: {
            value: ctx.getInput(io.inputSettings),
          },
        }),
        overlay: ctx.getInput(io.overlay),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Input Mute",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputMuted: io.dataOutput({
          id: "inputMuted",
          name: "Input Muted",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetInputMute", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.inputMuted, data.inputMuted);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Input Mute",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputMuted: io.dataInput({
          id: "inputMuted",
          name: "Input Muted",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetInputMute", {
        inputName: ctx.getInput(io.inputName),
        inputMuted: ctx.getInput(io.inputMuted),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Toggle Input Mute",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputMuted: io.dataOutput({
          id: "inputMuted",
          name: "Input Muted",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("ToggleInputMute", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.inputMuted, data.inputMuted);
    },
  });

  pkg.createNonEventSchema({
    name: "Get Input Volume",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputVolumeMul: io.dataOutput({
          id: "inputVolumeMul",
          name: "Input Volume Mul",
          type: t.int(),
        }),
        inputVolumeDb: io.dataOutput({
          id: "inputVolumeDb",
          name: "Input Volume Db",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetInputVolume", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.inputVolumeMul, data.inputVolumeMul);
      ctx.setOutput(io.inputVolumeDb, data.inputVolumeDb);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Input Volume (dB)",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputVolumeDb: io.dataInput({
          id: "inputVolumeDb",
          name: "Input Volume (dB)",
          type: t.float(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetInputVolume", {
        inputName: ctx.getInput(io.inputName),
        inputVolumeDb: ctx.getInput(io.inputVolumeDb),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Set Input Volume (mul)",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputVolumeMul: io.dataInput({
          id: "inputVolumeMul",
          name: "Input Volume (mul)",
          type: t.float(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetInputVolume", {
        inputName: ctx.getInput(io.inputName),
        inputVolumeMul: ctx.getInput(io.inputVolumeMul),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Input Audio Balance",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputAudioBalance: io.dataOutput({
          id: "inputAudioBalance",
          name: "Input Audio Balance",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetInputAudioBalance", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.inputAudioBalance, data.inputAudioBalance);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Input Audio Balance",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputAudioBalance: io.dataInput({
          id: "inputAudioBalance",
          name: "Input Audio Balance",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetInputAudioBalance", {
        inputName: ctx.getInput(io.inputName),
        inputAudioBalance: ctx.getInput(io.inputAudioBalance),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Input Audio Sync Offset",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputAudioSyncOffset: io.dataOutput({
          id: "inputAudioSyncOffset",
          name: "Input Audio Sync Offset",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetInputAudioSyncOffset", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.inputAudioSyncOffset, data.inputAudioSyncOffset);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Input Audio Sync Offset",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputAudioSyncOffset: io.dataInput({
          id: "inputAudioSyncOffset",
          name: "Input Audio Sync Offset",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetInputAudioSyncOffset", {
        inputName: ctx.getInput(io.inputName),
        inputAudioSyncOffset: ctx.getInput(io.inputAudioSyncOffset),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Input Audio Monitor Type",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        monitorType: io.dataOutput({
          id: "monitorType",
          name: "Monitor Type",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetInputAudioMonitorType", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.monitorType, data.monitorType);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Input Audio Monitor Type",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        monitorType: io.dataInput({
          id: "monitorType",
          name: "Monitor Type",
          type: t.enum(MonitorType),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = ctx.getInput(io.monitorType);

      obs().call("SetInputAudioMonitorType", {
        inputName: ctx.getInput(io.inputName),
        monitorType:
          data.variant === "MonitorOnly"
            ? "OBS_MONITORING_TYPE_MONITOR_ONLY"
            : data.variant === "MonitorAndOutput"
            ? "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT"
            : "OBS_MONITORING_TYPE_NONE",
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Input Audio Tracks",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputAudioTracks: io.dataOutput({
          id: "inputAudioTracks",
          name: "Input Audio Tracks",
          type: t.enum(JSON),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetInputAudioTracks", {
        inputName: ctx.getInput(io.inputName),
      });

      ctx.setOutput(
        io.inputAudioTracks,
        Maybe(jsToJSON(data.inputAudioTracks)).unwrap()
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Set Input Audio Tracks",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputAudioTracks: io.dataInput({
          id: "inputAudioTracks",
          name: "Input Audio Tracks",
          type: t.map(t.enum(JSON)),
        }),
      };
    },
    run({ ctx, io }) {
      obs().call("SetInputAudioTracks", {
        inputName: ctx.getInput(io.inputName),
        inputAudioTracks: jsonToJS({
          variant: "Map",
          data: {
            value: ctx.getInput(io.inputAudioTracks),
          },
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get input Properties List Property Items",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        propertyName: io.dataInput({
          id: "propertyName",
          name: "Property Name",
          type: t.string(),
        }),
        propertyItems: io.dataOutput({
          id: "propertyItems",
          name: "Property Items",
          type: t.list(t.struct(PropertyItem)),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetInputPropertiesListPropertyItems", {
        inputName: ctx.getInput(io.inputName),
        propertyName: ctx.getInput(io.propertyName),
      });

      const propertyItems = data.propertyItems.map((data) =>
        PropertyItem.create({
          itemEnabled: data.itemEnabled as boolean,
          itemName: data.itemName as string,
          itemValue: data.itemValue as string,
        })
      );

      ctx.setOutput(io.propertyItems, propertyItems);
    },
  });

  pkg.createNonEventSchema({
    name: "Press Input Properties Button",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        propertyName: io.dataInput({
          id: "propertyName",
          name: "Property Name",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("PressInputPropertiesButton", {
        inputName: ctx.getInput(io.inputName),
        propertyName: ctx.getInput(io.propertyName),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Transition Kind List",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "transitionKinds",
        name: "Transition Kinds",
        type: t.list(t.string()),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetTransitionKindList");
      ctx.setOutput(io, data.transitionKinds);
    },
  });

  pkg.createNonEventSchema({
    name: "Get Scene Transition List",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        currentSceneTransitionName: io.dataOutput({
          id: "currentSceneTransitionName",
          name: "Current Scene Transition Name",
          type: t.string(),
        }),
        currentSceneTransitionKind: io.dataOutput({
          id: "currentSceneTransitionKind",
          name: "Current Scene Transition Kind",
          type: t.string(),
        }),
        transitions: io.dataOutput({
          id: "transitions",
          name: "Transitions",
          type: t.list(t.struct(Transition)),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSceneTransitionList");

      ctx.setOutput(
        io.currentSceneTransitionName,
        data.currentSceneTransitionName
      );
      ctx.setOutput(
        io.currentSceneTransitionKind,
        data.currentSceneTransitionKind
      );
      ctx.setOutput(
        io.transitions,
        data.transitions.map((data) =>
          Transition.create({
            transitionConfigurable: data.transitionConfigurable as boolean,
            transitionFixed: data.transitionFixed as boolean,
            transitionKind: data.transitionKind as string,
            transitionName: data.transitionName as string,
          })
        )
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Get Current Scene Transition",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        transitionName: io.dataOutput({
          id: "transitionName",
          name: "Transition Name",
          type: t.string(),
        }),
        transitionKind: io.dataOutput({
          id: "transitionKind",
          name: "Transition Kind",
          type: t.string(),
        }),
        transitionFixed: io.dataOutput({
          id: "transitionFixed",
          name: "Transition Fixed",
          type: t.bool(),
        }),
        transitionDuration: io.dataOutput({
          id: "transitionDuration",
          name: "Transition Duration",
          type: t.option(t.int()),
        }),
        transitionConfigurable: io.dataOutput({
          id: "transitionConfigurable",
          name: "Transition Configurable",
          type: t.bool(),
        }),
        transitionSettings: io.dataOutput({
          id: "transitionSettings",
          name: "Transition Settings",
          type: t.option(t.enum(JSON)),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetCurrentSceneTransition");

      ctx.setOutput(io.transitionName, data.transitionName);
      ctx.setOutput(io.transitionKind, data.transitionKind);
      ctx.setOutput(io.transitionFixed, data.transitionFixed);
      ctx.setOutput(io.transitionDuration, Maybe(data.transitionDuration));
      ctx.setOutput(io.transitionConfigurable, data.transitionConfigurable);
      ctx.setOutput(
        io.transitionSettings,
        Maybe(jsToJSON(data.transitionSettings))
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Set Current Scene Transition",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "transitionName",
        name: "Transition Name",
        type: t.string(),
      }),
    async run({ ctx, io }) {
      obs().call("SetCurrentSceneTransition", {
        transitionName: ctx.getInput(io),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Set Current Scene Transition Duration",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "transitionDuration",
        name: "Transition Duration",
        type: t.int(),
      }),
    async run({ ctx, io }) {
      obs().call("SetCurrentSceneTransitionDuration", {
        transitionDuration: ctx.getInput(io),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Set Current Scene Transition Settings",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        transitionSettings: io.dataInput({
          id: "transitionSettings",
          name: "Transition Settings",
          type: t.map(t.enum(JSON)),
        }),
        overlay: io.dataInput({
          id: "overlay",
          name: "Overlay",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetCurrentSceneTransitionSettings", {
        transitionSettings: jsonToJS({
          variant: "Map",
          data: {
            value: ctx.getInput(io.transitionSettings),
          },
        }),
        overlay: ctx.getInput(io.overlay),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Current Scene Transition Cursor",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "transitionCursor",
        name: "Transition Cursor",
        type: t.int(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetCurrentSceneTransitionCursor");
      ctx.setOutput(io, data.transitionCursor);
    },
  });

  pkg.createNonEventSchema({
    name: "Trigger Studio Mode Transition",
    variant: "Exec",
    createIO() {},
    async run() {
      await obs().call("TriggerStudioModeTransition");
    },
  });

  pkg.createNonEventSchema({
    name: "Set T Bar Position",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        position: io.dataInput({
          id: "position",
          name: "Position",
          type: t.int(),
        }),
        release: io.dataInput({
          id: "release",
          name: "Release",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetTBarPosition", {
        position: ctx.getInput(io.position),
        release: ctx.getInput(io.release),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Source Filter List",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
        }),
        filters: io.dataOutput({
          id: "filters",
          name: "Filters",
          type: t.list(t.struct(Filter)),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSourceFilterList", {
        sourceName: ctx.getInput(io.sourceName),
      });

      const filter = data.filters.map((data) =>
        Filter.create({
          filterEnabled: data.filterEnabled as boolean,
          filterIndex: data.filterIndex as number,
          filterKind: data.filterKind as string,
          filterName: data.filterName as string,
          filterSettings: jsToJSON(data.filterSettings),
        })
      );

      ctx.setOutput(io.filters, filter);
    },
  });

  pkg.createNonEventSchema({
    name: "Get Source Filter Default Settings",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        filterKind: io.dataInput({
          id: "filterKind",
          name: "Filter Kind",
          type: t.string(),
        }),
        defaultFilterSettings: io.dataOutput({
          id: "defaultFilterSettings",
          name: "Default Filter Settings",
          type: t.enum(JSON),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSourceFilterDefaultSettings", {
        filterKind: ctx.getInput(io.filterKind),
      });

      ctx.setOutput(
        io.defaultFilterSettings,
        Maybe(jsToJSON(data.defaultFilterSettings)).unwrap()
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Create Source Filter",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
        }),
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
        }),
        filterKind: io.dataInput({
          id: "filterKind",
          name: "Filter Kind",
          type: t.string(),
        }),
        filterSettings: io.dataInput({
          id: "filterSettings",
          name: "Filter Settings",
          type: t.map(t.enum(JSON)),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("CreateSourceFilter", {
        sourceName: ctx.getInput(io.sourceName),
        filterName: ctx.getInput(io.filterName),
        filterKind: ctx.getInput(io.filterKind),
        filterSettings: ctx.getInput(io.filterSettings)
          ? jsonToJS({
              variant: "Map",
              data: {
                value: ctx.getInput(io.filterSettings),
              },
            })
          : {},
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Remove Source Filter",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
        }),
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("RemoveSourceFilter", {
        sourceName: ctx.getInput(io.sourceName),
        filterName: ctx.getInput(io.filterName),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Set Source Filter Name",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
        }),
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
        }),
        newFilterName: io.dataInput({
          id: "newFilterName",
          name: "New Filter Name",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetSourceFilterName", {
        sourceName: ctx.getInput(io.sourceName),
        filterName: ctx.getInput(io.filterName),
        newFilterName: ctx.getInput(io.newFilterName),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Source Filter",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
        }),
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
        }),
        filter: io.dataOutput({
          id: "filter",
          name: "Filter",
          type: t.option(t.struct(Filter)),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs
        .call("GetSourceFilter", {
          sourceName: ctx.getInput(io.sourceName),
          filterName: ctx.getInput(io.filterName),
        })
        .catch(() => null);

      ctx.setOutput(
        io.filter,
        Maybe(data).map((data) =>
          Filter.create({
            filterEnabled: data.filterEnabled,
            filterIndex: data.filterIndex,
            filterKind: data.filterKind,
            filterName: ctx.getInput(io.filterName),
            filterSettings: jsToJSON(data.filterSettings),
          })
        )
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Set Source Filter Name",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
        }),
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
        }),
        filterIndex: io.dataInput({
          id: "filterIndex",
          name: "Filter Index",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetSourceFilterIndex", {
        sourceName: ctx.getInput(io.sourceName),
        filterName: ctx.getInput(io.filterName),
        filterIndex: ctx.getInput(io.filterIndex),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Set Source Filter Settings",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
        }),
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
        }),
        filterSettings: io.dataInput({
          id: "filterSettings",
          name: "Filter Settings",
          type: t.map(t.enum(JSON)),
        }),
        overlay: io.dataInput({
          id: "overlay",
          name: "Overlay",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      obs().call("SetSourceFilterSettings", {
        sourceName: ctx.getInput(io.sourceName),
        filterName: ctx.getInput(io.filterName),
        filterSettings: jsonToJS({
          variant: "Map",
          data: {
            value: ctx.getInput(io.filterSettings),
          },
        }),
        overlay: ctx.getInput(io.overlay),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Set Source Filter Enabled",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
        }),
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
        }),
        filterEnabled: io.dataInput({
          id: "filterEnabled",
          name: "Filter Enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetSourceFilterEnabled", {
        sourceName: ctx.getInput(io.sourceName),
        filterName: ctx.getInput(io.filterName),
        filterEnabled: ctx.getInput(io.filterEnabled),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Scene Item List",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItems: io.dataOutput({
          id: "sceneItems",
          name: "Scene Items",
          type: t.list(t.struct(SceneItem)),
        }),
      };
    },
    async run({ ctx, io }) {
      console.log(obs);
      const data = await obs().call("GetSceneItemList", {
        sceneName: ctx.getInput(io.sceneName),
      });

      console.log(data);
      const sceneItems = data.sceneItems.map((data) => {
        const sceneItemTransformObj: SceneItemTransformInterface =
          data.sceneItemTransform as any;

        return SceneItem.create({
          inputKind: Maybe(data.inputKind as string),
          isGroup: data.isGroup as boolean,
          sceneItemBlendMode: data.sceneItemBlendMode as string,
          sceneItemEnabled: data.sceneItemEnabled as boolean,
          sceneItemId: data.sceneItemId as number,
          sceneItemIndex: data.sceneItemIndex as number,
          sceneItemLocked: data.sceneItemLocked as boolean,
          sceneItemTransform: SceneItemTransform.create({
            alignment: alignmentConversion(
              sceneItemTransformObj.alignment as number
            ),
            boundsAlignment: alignmentConversion(
              sceneItemTransformObj.boundsAlignment as number
            ),
            boundsHeight: sceneItemTransformObj.boundsHeight as number,
            boundsType: BoundsType.variant(
              sceneItemTransformObj.boundsType as InferEnum<
                typeof BoundsType
              >["variant"]
            ),
            boundsWidth: sceneItemTransformObj.boundsWidth,
            cropBottom: sceneItemTransformObj.cropBottom,
            cropLeft: sceneItemTransformObj.cropLeft,
            cropRight: sceneItemTransformObj.cropRight,
            cropTop: sceneItemTransformObj.cropTop,
            positionX: sceneItemTransformObj.positionX,
            positionY: sceneItemTransformObj.positionY,
            rotation: sceneItemTransformObj.rotation,
            scaleX: sceneItemTransformObj.scaleX,
            scaleY: sceneItemTransformObj.scaleY,
            sourceWidth: sceneItemTransformObj.sourceWidth,
            sourceHeight: sceneItemTransformObj.sourceHeight,
            width: sceneItemTransformObj.width,
            height: sceneItemTransformObj.height,
          }),
          sourceName: data.sourceName as string,
          sourceType: data.sourceType as string,
        });
      });

      ctx.setOutput(io.sceneItems, sceneItems);
    },
  });

  //GetGroupSceneItemList - groups are dumb dont use

  pkg.createNonEventSchema({
    name: "Get Scene Item Id",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
        }),
        searchOffset: io.dataInput({
          id: "searchOffset",
          name: "Search Offset",
          type: t.int(),
        }),
        sceneItemId: io.dataOutput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSceneItemId", {
        sceneName: ctx.getInput(io.sceneName),
        sourceName: ctx.getInput(io.sourceName),
        searchOffset: ctx.getInput(io.searchOffset),
      });
      ctx.setOutput(io.sceneItemId, data.sceneItemId);
    },
  });

  pkg.createNonEventSchema({
    name: "Create Scene Item",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
        }),
        sceneItemEnabled: io.dataInput({
          id: "sceneItemEnabled",
          name: "Search Offset",
          type: t.bool(),
        }),
        sceneItemId: io.dataOutput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("CreateSceneItem", {
        sceneName: ctx.getInput(io.sceneName),
        sourceName: ctx.getInput(io.sourceName),
        sceneItemEnabled: ctx.getInput(io.sceneItemEnabled),
      });
      ctx.setOutput(io.sceneItemId, data.sceneItemId);
    },
  });

  pkg.createNonEventSchema({
    name: "Remove Scene Item",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemId: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("RemoveSceneItem", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Duplicate Scene Item",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemIdIn: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
        destinationSceneName: io.dataInput({
          id: "destinationSceneName",
          name: "Destination Scene Name",
          type: t.string(),
        }),
        sceneItemIdOut: io.dataOutput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("DuplicateSceneItem", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemIdIn),
        destinationSceneName: ctx.getInput(io.destinationSceneName),
      });
      ctx.setOutput(io.sceneItemIdOut, data.sceneItemId);
    },
  });

  pkg.createNonEventSchema({
    name: "Get Scene Item Transform",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemId: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item ID",
          type: t.int(),
        }),
        sceneItemTransform: io.dataOutput({
          id: "sceneItemTransform",
          name: "Scene Item Transform",
          type: t.struct(SceneItemTransform),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSceneItemTransform", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
      });

      const sceneItemTransformObj: SceneItemTransformInterface =
        data.sceneItemTransform as any;

      const transform = SceneItemTransform.create({
        alignment: alignmentConversion(
          sceneItemTransformObj.alignment as number
        ),
        boundsAlignment: alignmentConversion(
          sceneItemTransformObj.boundsAlignment as number
        ),
        boundsHeight: sceneItemTransformObj.boundsHeight as number,
        boundsType: BoundsType.variant(
          sceneItemTransformObj.boundsType as InferEnum<
            typeof BoundsType
          >["variant"]
        ),
        boundsWidth: sceneItemTransformObj.boundsWidth,
        cropBottom: sceneItemTransformObj.cropBottom,
        cropLeft: sceneItemTransformObj.cropLeft,
        cropRight: sceneItemTransformObj.cropRight,
        cropTop: sceneItemTransformObj.cropTop,
        positionX: sceneItemTransformObj.positionX,
        positionY: sceneItemTransformObj.positionY,
        rotation: sceneItemTransformObj.rotation,
        scaleX: sceneItemTransformObj.scaleX,
        scaleY: sceneItemTransformObj.scaleY,
        sourceWidth: sceneItemTransformObj.sourceWidth,
        sourceHeight: sceneItemTransformObj.sourceHeight,
        width: sceneItemTransformObj.width,
        height: sceneItemTransformObj.height,
      });

      ctx.setOutput(io.sceneItemTransform, transform);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Scene Item Transform",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemId: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item ID",
          type: t.int(),
        }),
        sceneItemTransform: io.dataInput({
          id: "sceneItemTransform",
          name: "Scene Item Transform",
          type: t.map(t.enum(JSON)),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetSceneItemTransform", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
        sceneItemTransform: jsonToJS({
          variant: "Map",
          data: {
            value: ctx.getInput(io.sceneItemTransform),
          },
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Scene Item Enabled",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemId: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
        sceneItemEnabled: io.dataOutput({
          id: "sceneItemEnabled",
          name: "Scene Item Enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSceneItemEnabled", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
      });
      ctx.setOutput(io.sceneItemEnabled, data.sceneItemEnabled);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Scene Item Enabled",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemId: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
        sceneItemEnabled: io.dataInput({
          id: "sceneItemEnabled",
          name: "Scene Item Enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      await obs().call("SetSceneItemEnabled", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
        sceneItemEnabled: ctx.getInput(io.sceneItemEnabled),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Scene Item Locked",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemId: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
        sceneItemLocked: io.dataOutput({
          id: "sceneItemLocked",
          name: "Scene Item Locked",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSceneItemLocked", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
      });
      ctx.setOutput(io.sceneItemLocked, data.sceneItemLocked);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Scene Item Locked",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemId: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
        sceneItemLocked: io.dataInput({
          id: "sceneItemLocked",
          name: "Scene Item Locked",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetSceneItemLocked", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
        sceneItemLocked: ctx.getInput(io.sceneItemLocked),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Scene Item Index",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemId: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
        sceneItemIndex: io.dataOutput({
          id: "sceneItemIndex",
          name: "Scene Item Index",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSceneItemIndex", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
      });
      ctx.setOutput(io.sceneItemIndex, data.sceneItemIndex);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Scene Item Index",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemId: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
        sceneItemIndex: io.dataInput({
          id: "sceneItemIndex",
          name: "Scene Item Index",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetSceneItemIndex", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
        sceneItemIndex: ctx.getInput(io.sceneItemIndex),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Scene Item Blend Mode",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemId: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
        sceneItemBlendMode: io.dataOutput({
          id: "sceneItemBlendMode",
          name: "Scene Item Blend Mode",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetSceneItemBlendMode", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
      });
      ctx.setOutput(io.sceneItemBlendMode, data.sceneItemBlendMode);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Scene Item Blend Mode",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        sceneName: io.dataInput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        sceneItemId: io.dataInput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
        sceneItemBlendMode: io.dataInput({
          id: "sceneItemBlendMode",
          name: "Scene Item Blend Mode",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetSceneItemBlendMode", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
        sceneItemBlendMode: ctx.getInput(io.sceneItemBlendMode),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Virtual Cam Status",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputActive",
        name: "Ouput Active",
        type: t.bool(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetVirtualCamStatus");
      ctx.setOutput(io, data.outputActive);
    },
  });

  pkg.createNonEventSchema({
    name: "Toggle Virtual Cam",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputActive",
        name: "Ouput Active",
        type: t.bool(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("ToggleVirtualCam");
      ctx.setOutput(io, data.outputActive);
    },
  });

  pkg.createNonEventSchema({
    name: "Start Virtual Cam",
    variant: "Exec",
    createIO() {},
    async run() {
      obs().call("StartVirtualCam");
    },
  });

  pkg.createNonEventSchema({
    name: "Stop Virtual Cam",
    variant: "Exec",
    createIO() {},
    async run() {
      obs().call("StopVirtualCam");
    },
  });

  pkg.createNonEventSchema({
    name: "Get Replay Buffer Status",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputActive",
        name: "Ouput Active",
        type: t.bool(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetReplayBufferStatus");
      ctx.setOutput(io, data.outputActive);
    },
  });

  pkg.createNonEventSchema({
    name: "Toggle Replay Buffer",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputActive",
        name: "Ouput Active",
        type: t.bool(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("ToggleReplayBuffer");
      ctx.setOutput(io, data.outputActive);
    },
  });

  pkg.createNonEventSchema({
    name: "Start Replay Buffer",
    variant: "Exec",
    createIO() {},
    async run() {
      obs().call("StartReplayBuffer");
    },
  });

  pkg.createNonEventSchema({
    name: "Stop Replay Buffer",
    variant: "Exec",
    createIO() {},
    async run() {
      obs().call("StopReplayBuffer");
    },
  });

  pkg.createNonEventSchema({
    name: "Save Replay Buffer",
    variant: "Exec",
    createIO() {},
    async run() {
      obs().call("SaveReplayBuffer");
    },
  });

  pkg.createNonEventSchema({
    name: "Get Last Replay Buffer Replay",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "savedReplayPath",
        name: "Save Replay Path",
        type: t.string(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetLastReplayBufferReplay");
      ctx.setOutput(io, data.savedReplayPath);
    },
  });

  pkg.createNonEventSchema({
    name: "Get Output List",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputs",
        name: "Outputs",
        type: t.list(t.enum(JSON)),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetOutputList" as any);
      ctx.setOutput(io, data.outputs);
    },
  });

  //GetOUtputList has array of objects

  // const OutputStatus = [
  //   {
  //     id: "outputActive",
  //     name: "Output Active",
  //     type: t.bool(),
  //   },
  //   {
  //     id: "outputReconnecting",
  //     name: "Output Reconnecting",
  //     type: t.bool(),
  //   },
  //   {
  //     id: "outputTimecode",
  //     name: "Output Timecode",
  //     type: t.string(),
  //   },
  //   {
  //     id: "outputDuration",
  //     name: "Output Duration",
  //     type: t.int(),
  //   },
  //   {
  //     id: "outputCongestion",
  //     name: "Output Congestion",
  //     type: t.int(),
  //   },
  //   {
  //     id: "outputBytes",
  //     name: "Output Bytes",
  //     type: t.int(),
  //   },
  //   {
  //     id: "outputSkippedFrames",
  //     name: "Output Skipped Frames",
  //     type: t.int(),
  //   },
  //   {
  //     id: "outputTotalFrames",
  //     name: "Output Total Frames",
  //     type: t.int(),
  //   },
  // ] as const;

  // pkg.createNonEventSchema({
  //   name: "Toggle Output",
  //   variant: "Exec",
  //   generateIO({io}) {
  //    io.dataInput({
  //       id: "outputName",
  //       name: "Output Name",
  //       type: types.string(),
  //     });
  //     OutputStatus.forEach((data) =>io.dataOutput(data));
  //   },
  //   async run({ ctx }) {
  //     const data = await obs().call("GetOutputStatus", {
  //       outputName: ctx.getInput("outputName")
  //     });
  //     OutputStatus.forEach(({ id }) => ctx.setOutput(id, data[id]));
  //   },
  // });

  // pkg.createNonEventSchema({
  //   name: "Start Output",
  //   variant: "Exec",
  //   generateIO({io}) {
  //    io.dataInput({
  //       id: "outputName",
  //       name: "Output Name",
  //       type: types.string(),
  //     });
  //   },
  //   async run({ ctx }) {
  //     obs().call("StartOutput", {
  //       outputName: ctx.getInput("outputName"),
  //     });
  //   },
  // });

  // pkg.createNonEventSchema({
  //   name: "Stop Output",
  //   variant: "Exec",
  //   generateIO({io}) {
  //    io.dataInput({
  //       id: "outputName",
  //       name: "Output Name",
  //       type: types.string(),
  //     });
  //   },
  //   async run({ ctx }) {
  //     obs().call("StopOutput", {
  //       outputName: ctx.getInput("outputName"),
  //     });
  //   },
  // });

  //GetOutputSettings has object

  //SetOutputSettings has object

  const StreamStatus = [
    {
      id: "outputActive",
      name: "Output Active",
      type: t.bool(),
    },
    {
      id: "outputReconnecting",
      name: "Output Reconnecting",
      type: t.bool(),
    },
    {
      id: "outputTimecode",
      name: "Output Timecode",
      type: t.string(),
    },
    {
      id: "outputDuration",
      name: "Output Duration",
      type: t.int(),
    },
    // {
    //   id: "outputCongestion",
    //   name: "Output Congestion",
    //   type: types.int(),
    // },
    {
      id: "outputBytes",
      name: "Output Bytes",
      type: t.int(),
    },
    {
      id: "outputSkippedFrames",
      name: "Output Skipped Frames",
      type: t.int(),
    },
    {
      id: "outputTotalFrames",
      name: "Output Total Frames",
      type: t.int(),
    },
  ] as const;

  pkg.createNonEventSchema({
    name: "Toggle Output",
    variant: "Exec",
    createIO: ({ io }) =>
      StreamStatus.map((data) => [data.id, io.dataOutput(data)] as const),
    async run({ ctx, io }) {
      const data = await obs().call("GetStreamStatus");
      io.forEach(([id, output]) => ctx.setOutput(output, data[id]));
    },
  });

  pkg.createNonEventSchema({
    name: "Toggle Stream",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputActive",
        name: "Ouput Active",
        type: t.bool(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("ToggleStream");
      ctx.setOutput(io, data.outputActive);
    },
  });

  pkg.createNonEventSchema({
    name: "Start Stream",
    variant: "Exec",
    createIO() {},
    async run() {
      obs().call("StartStream");
    },
  });

  pkg.createNonEventSchema({
    name: "Stop Stream",
    variant: "Exec",
    createIO() {},
    async run() {
      obs().call("StopStream");
    },
  });

  pkg.createNonEventSchema({
    name: "Send Stream Caption",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "captionText",
        name: "Caption Text",
        type: t.string(),
      }),
    async run({ ctx, io }) {
      obs().call("SendStreamCaption", {
        captionText: ctx.getInput(io),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Record Status",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        outputActive: io.dataOutput({
          id: "outputActive",
          name: "Output Active",
          type: t.bool(),
        }),
        outputPaused: io.dataOutput({
          id: "outputPaused",
          name: "Output Paused",
          type: t.bool(),
        }),
        outputTimecode: io.dataOutput({
          id: "outputTimecode",
          name: "Output Timecode",
          type: t.string(),
        }),
        outputDuration: io.dataOutput({
          id: "outputDuration",
          name: "Output Duration",
          type: t.int(),
        }),
        outputBytes: io.dataOutput({
          id: "outputBytes",
          name: "Output Bytes",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetRecordStatus");
      ctx.setOutput(io.outputActive, data.outputActive);
      ctx.setOutput(io.outputPaused, (data as any).outputPaused);
      ctx.setOutput(io.outputTimecode, data.outputTimecode);
      ctx.setOutput(io.outputDuration, data.outputDuration);
      ctx.setOutput(io.outputBytes, data.outputBytes);
    },
  });

  pkg.createNonEventSchema({
    name: "Toggle Record",
    variant: "Exec",
    createIO() {},
    async run() {
      obs().call("ToggleRecord");
    },
  });

  pkg.createNonEventSchema({
    name: "Start Record",
    variant: "Exec",
    createIO() {},
    async run() {
      await obs().call("StartRecord");
    },
  });

  pkg.createNonEventSchema({
    name: "Stop Record",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputPath",
        name: "Output Path",
        type: t.string(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("StopRecord");
      ctx.setOutput(io, (data as any).outputPath);
    },
  });

  pkg.createNonEventSchema({
    name: "Toggle Record Paused",
    variant: "Exec",
    createIO() {},
    async run() {
      await obs().call("ToggleRecordPause");
    },
  });

  pkg.createNonEventSchema({
    name: "Pause Record",
    variant: "Exec",
    createIO() {},
    async run() {
      await obs().call("PauseRecord");
    },
  });

  pkg.createNonEventSchema({
    name: "Resume Record",
    variant: "Exec",
    createIO() {},
    async run() {
      await obs().call("ResumeRecord");
    },
  });

  pkg.createNonEventSchema({
    name: "Get Media Input Status",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        mediaState: io.dataOutput({
          id: "mediaState	",
          name: "Media State",
          type: t.string(),
        }),
        mediaDuration: io.dataOutput({
          id: "mediaDuration",
          name: "Media Duration",
          type: t.int(),
        }),
        mediaCursor: io.dataOutput({
          id: "mediaCursor",
          name: "Media Cursor",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await obs().call("GetMediaInputStatus", {
        inputName: ctx.getInput(io.inputName),
      });
      console.log(data);
      ctx.setOutput(io.mediaState, data.mediaState);
      ctx.setOutput(io.mediaDuration, data.mediaDuration);
      ctx.setOutput(io.mediaCursor, data.mediaCursor);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Media Input Cursor",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        mediaCursor: io.dataInput({
          id: "mediaCursor",
          name: "Media Cursor",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("SetMediaInputCursor", {
        inputName: ctx.getInput(io.inputName),
        mediaCursor: ctx.getInput(io.mediaCursor),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Offset Media Input Cursor",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        mediaCursorOffset: io.dataInput({
          id: "mediaCursorOffset",
          name: "Media Cursor Offset",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("OffsetMediaInputCursor", {
        inputName: ctx.getInput(io.inputName),
        mediaCursorOffset: ctx.getInput(io.mediaCursorOffset),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Trigger Media Input Action",
    variant: "Exec",
    createIO: ({ io }) => {
      return {
        inputName: io.dataInput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        mediaAction: io.dataInput({
          id: "mediaAction",
          name: "Media Action",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      obs().call("TriggerMediaInputAction", {
        inputName: ctx.getInput(io.inputName),
        mediaAction: ctx.getInput(io.mediaAction),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Studio Mode Enabled",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "studioModeEnabled",
        name: "Studio Mode Enabled",
        type: t.bool(),
      }),
    async run({ ctx, io }) {
      const data = await obs().call("GetStudioModeEnabled");
      ctx.setOutput(io, data.studioModeEnabled);
    },
  });

  pkg.createNonEventSchema({
    name: "Set Studio Mode Enabled",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "studioModeEnabled",
        name: "Studio Mode Enabled",
        type: t.bool(),
      }),
    async run({ ctx, io }) {
      obs().call("SetStudioModeEnabled", {
        studioModeEnabled: ctx.getInput(io),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Open Input Properties Dialogue",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
      }),
    async run({ ctx, io }) {
      obs().call("OpenInputPropertiesDialog", {
        inputName: ctx.getInput(io),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Open Input Filters Dialogue",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
      }),
    async run({ ctx, io }) {
      obs().call("OpenInputFiltersDialog", {
        inputName: ctx.getInput(io),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Open Input Interact Dialogue",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
      }),
    async run({ ctx, io }) {
      obs().call("OpenInputInteractDialog", {
        inputName: ctx.getInput(io),
      });
    },
  });

  //GetMonitorList has array of objects

  // pkg.createNonEventSchema({
  //   name: "Open Video Mix Projector",
  //   variant: "Exec",
  //   generateIO({io}) {
  //    io.dataInput({
  //       id: "videoMixType",
  //       name: "Video Mix Type",
  //       type: types.string(),
  //     });
  //    io.dataInput({
  //       id: "monitorIndex",
  //       name: "Monitor Index",
  //       type: types.int(),
  //     });
  //    io.dataInput({
  //       id: "projectorGeometry",
  //       name: "Projector Geometry",
  //       type: types.string(),
  //     });
  //   },
  //   async run({ ctx }) {
  //     obs().call("OpenVideoMixProjector", {
  //       videoMixType: ctx.getInput("videoMixType"),
  //       monitorIndex: ctx.getInput("monitorIndex"),
  //       projectorGeometry: ctx.getInput("projectorGeometry"),
  //     });
  //   },
  // });

  // pkg.createNonEventSchema({
  //   name: "Open Source Projector",
  //   variant: "Exec",
  //   generateIO({io}) {
  //    io.dataInput({
  //       id: "sourceName",
  //       name: "Source Name",
  //       type: types.string(),
  //     });
  //    io.dataInput({
  //       id: "monitorIndex",
  //       name: "Monitor Index",
  //       type: types.int(),
  //     });
  //    io.dataInput({
  //       id: "projectorGeometry",
  //       name: "Projector Geometry",
  //       type: types.string(),
  //     });
  //   },
  //   async run({ ctx }) {
  //     obs().call("OpenSourceProjector", {
  //       sourceName: ctx.getInput("sourceName"),
  //       monitorIndex: ctx.getInput("monitorIndex"),
  //       projectorGeometry: ctx.getInput("projectorGeometry"),
  //     });
  //   },
  // });
}
