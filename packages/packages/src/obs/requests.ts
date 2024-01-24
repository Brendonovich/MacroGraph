import {
  createEnum,
  CreateIOFn,
  CreateNonEventSchema,
  createStruct,
  DataInput,
  MergeFnProps,
  Package,
  PropertyDef,
  RunProps,
  SchemaProperties,
} from "@macrograph/runtime";
import { Maybe, Option, None, Some } from "@macrograph/option";
import { InferEnum, t } from "@macrograph/typesystem";
import { JSON, jsonToJS, jsToJSON } from "@macrograph/json";
import OBSWebSocket, { EventTypes } from "obs-websocket-js";
import { ReactiveMap } from "@solid-primitives/map";

import { BoundsType, SceneItemTransform, alignmentConversion } from "./events";
import { defaultProperties } from "./resource";
import { Accessor } from "solid-js";

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

export function register(pkg: Package<EventTypes>) {
  function createOBSExecSchema<
    TProperties extends Record<string, PropertyDef> = {},
    TIO = void
  >(
    s: Omit<
      CreateNonEventSchema<TProperties & typeof defaultProperties, TIO>,
      "type" | "createListener" | "run" | "createIO"
    > & {
      properties?: TProperties;
      run(
        props: RunProps<TProperties, TIO> & {
          obs: OBSWebSocket;
        }
      ): void | Promise<void>;
      createIO: MergeFnProps<
        CreateIOFn<TProperties, TIO>,
        { obs(): Option<OBSWebSocket> }
      >;
    }
  ) {
    pkg.createSchema({
      ...s,
      type: "exec",
      properties: { ...s.properties, ...defaultProperties } as any,
      createIO(props) {
        // const obs = createMemo(() =>
        const obs = props.ctx
          .getProperty(
            props.properties.instance as SchemaProperties<
              typeof defaultProperties
            >["instance"]
          )
          .andThen((instance) => {
            if (instance.state !== "connected") return None;
            return Some(instance.obs);
          });
        // );

        return s.createIO({
          ...props,
          obs() {
            return obs;
          },
        });
      },
      run(props) {
        const instance = props.ctx
          .getProperty(
            props.properties.instance as SchemaProperties<
              typeof defaultProperties
            >["instance"]
          )
          .expect("No OBS instance available!");

        if (instance.state !== "connected")
          throw new Error("OBS instance not connected!");

        return s.run({ ...props, obs: instance.obs });
      },
    });
  }

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

  createOBSExecSchema({
    name: "Get OBS Version",
    createIO: ({ io }) =>
      versionOutputs.map((data) => [data.id, io.dataOutput(data)] as const),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetVersion");
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

  createOBSExecSchema({
    name: "Get OBS Stats",
    createIO: ({ io }) =>
      statsOutputs.map(
        ([id, name]) =>
          [id, io.dataOutput({ id, name, type: t.int() })] as const
      ),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetStats");
      io.forEach(([id, output]) => ctx.setOutput(output, data[id]));
    },
  });

  // Missing BroadcastCustomEvent requires OBject request

  // Missing CallVendorRequest requires Object request and response

  createOBSExecSchema({
    name: "Get Hotkey list",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "hotkeys",
        name: "Hotkeys",
        type: t.list(t.string()),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetHotkeyList");
      ctx.setOutput(io, data.hotkeys);
    },
  });

  createOBSExecSchema({
    name: "Trigger Hotkey By Name",
    createIO: ({ io }) =>
      io.dataInput({
        id: "hotkeyName",
        name: "Hotkey Name",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("TriggerHotkeyByName", { hotkeyName: ctx.getInput(io) });
    },
  });

  createOBSExecSchema({
    name: "Trigger Hotkey By Key Sequence",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("TriggerHotkeyByKeySequence", {
        keyId: ctx.getInput(io.id),
        keyModifiers: jsonToJS(
          JSON.variant(["Map", { value: ctx.getInput(io.modifiers) }])
        ),
      });
    },
  });

  // Missing Sleep as it is batch specific

  // Missing GetPersistentData as it has any type in response

  // Missing SetPersistentData as it has any type in request

  createOBSExecSchema({
    name: "Get Scene Collection List",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSceneCollectionList");
      ctx.setOutput(
        io.currentSceneCollectionName,
        data.currentSceneCollectionName
      );
      ctx.setOutput(io.sceneCollections, data.sceneCollections);
    },
  });

  createOBSExecSchema({
    name: "Set Current Scene Collection",
    createIO: ({ io, obs }) =>
      io.dataInput({
        id: "sceneCollectionName",
        name: "Scene Collection Name",
        type: t.string(),
        fetchSuggestions: sceneCollectionListSuggestionFactory(obs),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("SetCurrentSceneCollection", {
        sceneCollectionName: ctx.getInput(io),
      });
    },
  });

  createOBSExecSchema({
    name: "Create Scene Collection",
    createIO: ({ io }) =>
      io.dataInput({
        id: "sceneCollectionName",
        name: "Scene Collection Name",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("CreateSceneCollection", {
        sceneCollectionName: ctx.getInput(io),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Profile list",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetProfileList");
      ctx.setOutput(io.currentProfileName, data.currentProfileName);
      ctx.setOutput(io.profiles, data.profiles);
    },
  });

  createOBSExecSchema({
    name: "Set Current Profile",
    createIO: ({ io }) =>
      io.dataInput({
        id: "profileName",
        name: "Profile Name",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("SetCurrentProfile", { profileName: ctx.getInput(io) });
    },
  });

  createOBSExecSchema({
    name: "Create Profile",
    createIO: ({ io }) =>
      io.dataInput({
        id: "profileName",
        name: "Profile Name",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("CreateProfile", { profileName: ctx.getInput(io) });
    },
  });

  createOBSExecSchema({
    name: "Remove Profile",
    createIO: ({ io }) =>
      io.dataInput({
        id: "profileName",
        name: "Profile Name",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("RemoveProfile", { profileName: ctx.getInput(io) });
    },
  });

  createOBSExecSchema({
    name: "Get Profile Parameter",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetProfileParameter", {
        parameterCategory: ctx.getInput(io.parameterCategory),
        parameterName: ctx.getInput(io.parameterName),
      });
      ctx.setOutput(io.parameterValue, data.parameterValue);
      ctx.setOutput(io.defaultParameterValue, data.defaultParameterValue);
    },
  });

  createOBSExecSchema({
    name: "Set Profile Parameter",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetProfileParameter", {
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

  createOBSExecSchema({
    name: "Get Video Settings",
    createIO: ({ io }) =>
      videoSettingOutputs.map(
        ([id, name]) =>
          [id, io.dataOutput({ id, name, type: t.int() })] as const
      ),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetVideoSettings");
      io.forEach(([id, output]) => ctx.setOutput(output, data[id]));
    },
  });

  createOBSExecSchema({
    name: "Set Video Settings",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetVideoSettings", {
        fpsNumerator: ctx.getInput(io.fpsNumerator),
        fpsDenominator: ctx.getInput(io.fpsDenominator),
        baseWidth: ctx.getInput(io.baseWidth),
        baseHeight: ctx.getInput(io.baseHeight),
        outputWidth: ctx.getInput(io.outputWidth),
        outputHeight: ctx.getInput(io.outputHeight),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Stream Service Settings",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetStreamServiceSettings");
      ctx.setOutput(io.streamServiceType, data.streamServiceType);
      ctx.setOutput(
        io.streamServiceSettings,
        Maybe(jsToJSON(data.streamServiceSettings)).unwrap()
      );
    },
  });

  createOBSExecSchema({
    name: "Set Stream Service Settings",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetStreamServiceSettings", {
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

  createOBSExecSchema({
    name: "Get Record Directory",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "recordDirectory",
        name: "Record Directory",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetRecordDirectory");
      ctx.setOutput(io, data.recordDirectory);
    },
  });

  createOBSExecSchema({
    name: "Get Source Active",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSourceActive", {
        sourceName: ctx.getInput(io.sourceName),
      });
      ctx.setOutput(io.videoActive, data.videoActive);
      ctx.setOutput(io.videoShowing, data.videoShowing);
    },
  });

  //Missing GetSourceScreenshot as it has Base64-Encoded Screenshot data

  //Missing SaveSourceScreenshot as it has Base64-Encoded Screenshot data

  createOBSExecSchema({
    name: "Get Group List",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "groups",
        name: "Groups",
        type: t.list(t.string()),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetGroupList");
      ctx.setOutput(io, data.groups);
    },
  });

  createOBSExecSchema({
    name: "Get Current Program Scene",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "currentProgramSceneName",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetCurrentProgramScene");
      ctx.setOutput(io, data.currentProgramSceneName);
    },
  });

  function sceneListSuggestionFactory(obs: Accessor<Option<OBSWebSocket>>) {
    return async () => {
      const o = await obs().mapAsync(async (obs) => {
        const resp = await obs.call("GetSceneList");
        return resp.scenes.map((scene) => scene.sceneName);
      });
      return o.unwrapOr([]);
    };
  }

  function sceneCollectionListSuggestionFactory(
    obs: Accessor<Option<OBSWebSocket>>
  ) {
    return async () => {
      const o = await obs().mapAsync(async (obs) => {
        const resp = await obs.call("GetSceneCollectionList", undefined);
        return resp.sceneCollections;
      });
      return o.unwrapOr([]);
    };
  }

  function inputListSuggestionFactory(obs: Accessor<Option<OBSWebSocket>>) {
    return async () => {
      const o = await obs().mapAsync(async (obs) => {
        const resp = await obs.call("GetInputList");
        return (resp.inputs as Array<{ inputName: string }>).map(
          (input) => input.inputName
        );
      });
      return o.unwrapOr([]);
    };
  }

  function sourceListSuggestionFactory(obs: Accessor<Option<OBSWebSocket>>) {
    return async () => {
      const o = await obs().mapAsync(async (obs) => {
        const [scenesRequest, inputsRequest] = await obs.callBatch([
          { requestType: "GetSceneList" },
          { requestType: "GetInputList", requestData: {} },
        ]);

        const scenes = (
          scenesRequest!.responseData as unknown as {
            scenes: Array<{ sceneName: string }>;
          }
        ).scenes.map((scene) => scene.sceneName);
        const inputs = (
          inputsRequest!.responseData as unknown as {
            inputs: Array<{ inputName: string }>;
          }
        ).inputs.map((input: { inputName: string }) => input.inputName);

        return [...scenes, ...inputs];
      });
      return o.unwrapOr([]);
    };
  }

  function sourceFilterSuggestionFactory(
    sourceName: DataInput<t.String>,
    obs: Accessor<Option<OBSWebSocket>>
  ) {
    return () =>
      Maybe(sourceName.defaultValue)
        .zip(obs())
        .mapAsync(async ([sourceName, obs]) => {
          const { filters } = await obs.call("GetSourceFilterList", {
            sourceName,
          });

          const bruh = (filters as Array<{ filterName: string }>).map(
            (f) => f.filterName
          );

          return bruh;
        })
        .then((o) => o.unwrapOr([]));
  }

  function sceneSourceListSuggestionFactory(
    sceneName: DataInput<t.String>,
    obs: Accessor<Option<OBSWebSocket>>
  ) {
    return () =>
      Maybe(sceneName.defaultValue)
        .zip(obs())
        .mapAsync(async ([sceneName, obs]) => {
          const { sceneItems } = await obs.call("GetSceneItemList", {
            sceneName,
          });

          const bruh = (sceneItems as Array<{ sourceName: string }>).map(
            (s) => s.sourceName
          );

          return bruh;
        })
        .then((o) => o.unwrapOr([]));
  }

  createOBSExecSchema({
    name: "Set Current Program Scene",
    createIO: ({ io, obs }) =>
      io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("SetCurrentProgramScene", {
        sceneName: ctx.getInput(io),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Current Preview Scene",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "currentPreviewSceneName",
        name: "Current Program Scene Name",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetCurrentPreviewScene");
      ctx.setOutput(io, data.currentPreviewSceneName);
    },
  });

  createOBSExecSchema({
    name: "Set Current Preview Scene",
    createIO: ({ io, obs }) =>
      io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("SetCurrentPreviewScene", {
        sceneName: ctx.getInput(io),
      });
    },
  });

  createOBSExecSchema({
    name: "Create Scene",
    createIO: ({ io }) =>
      io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("CreateScene", { sceneName: ctx.getInput(io) });
    },
  });

  createOBSExecSchema({
    name: "Remove Scene",
    createIO: ({ io, obs }) =>
      io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("RemoveScene", { sceneName: ctx.getInput(io) });
    },
  });

  createOBSExecSchema({
    name: "Set Scene Name",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
      }),
      newSceneName: io.dataInput({
        id: "newSceneName",
        name: "New Scene Name",
        type: t.string(),
      }),
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetSceneName", {
        sceneName: ctx.getInput(io.sceneName),
        newSceneName: ctx.getInput(io.newSceneName),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Scene Transition Override",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSceneSceneTransitionOverride", {
        sceneName: ctx.getInput(io.sceneName),
      });
      ctx.setOutput(io.transitionName, data.transitionName);
      ctx.setOutput(io.transitionDuration, data.transitionDuration);
    },
  });

  createOBSExecSchema({
    name: "Set Scene Transition Override",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetSceneSceneTransitionOverride", {
        sceneName: ctx.getInput(io.sceneName),
        transitionName: ctx.getInput(io.transitionName),
        transitionDuration: ctx.getInput(io.transitionDuration),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Input Kind List",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetInputKindList", {
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

  createOBSExecSchema({
    name: "Get Special Inputs",
    createIO: ({ io }) =>
      SpecialInputsOutputs.map(
        ([id, name]) =>
          [id, io.dataOutput({ id, name, type: t.string() })] as const
      ),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSpecialInputs");
      io.forEach(([id, output]) => ctx.setOutput(output, data[id]));
    },
  });

  function inputKindSuggestionFactory(obs: Accessor<Option<OBSWebSocket>>) {
    return async () => {
      const o = await obs().mapAsync(async (obs) => {
        const resp = await obs.call("GetInputKindList");
        return resp.inputKinds;
      });
      return o.unwrapOr([]);
    };
  }

  createOBSExecSchema({
    name: "Create Input",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
      }),
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
      }),
      inputKind: io.dataInput({
        id: "inputKind",
        name: "Input Kind",
        type: t.string(),
        fetchSuggestions: inputKindSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("CreateInput", {
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

  createOBSExecSchema({
    name: "Remove Input",
    createIO: ({ io, obs }) =>
      io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("RemoveInput", {
        inputName: ctx.getInput(io),
      });
    },
  });

  createOBSExecSchema({
    name: "Set Input Name",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
      newInputName: io.dataInput({
        id: "newInputName",
        name: "New Input Name",
        type: t.string(),
      }),
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetInputName", {
        inputName: ctx.getInput(io.inputName),
        newInputName: ctx.getInput(io.newInputName),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Input List",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call(
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

  createOBSExecSchema({
    name: "Get Scene List",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSceneList");

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

  createOBSExecSchema({
    name: "Get Input Default Settings",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetInputDefaultSettings", {
        inputKind: ctx.getInput(io.inputKind),
      });

      ctx.setOutput(
        io.defaultInputSettings,
        Maybe(jsToJSON(data.defaultInputSettings)).unwrap()
      );
    },
  });

  createOBSExecSchema({
    name: "Get Input Settings",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetInputSettings", {
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

  createOBSExecSchema({
    name: "Set Input Settings",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetInputSettings", {
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

  createOBSExecSchema({
    name: "Get Input Mute",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
      inputMuted: io.dataOutput({
        id: "inputMuted",
        name: "Input Muted",
        type: t.bool(),
      }),
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetInputMute", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.inputMuted, data.inputMuted);
    },
  });

  createOBSExecSchema({
    name: "Set Input Mute",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
      inputMuted: io.dataInput({
        id: "inputMuted",
        name: "Input Muted",
        type: t.bool(),
      }),
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetInputMute", {
        inputName: ctx.getInput(io.inputName),
        inputMuted: ctx.getInput(io.inputMuted),
      });
    },
  });

  createOBSExecSchema({
    name: "Toggle Input Mute",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
      inputMuted: io.dataOutput({
        id: "inputMuted",
        name: "Input Muted",
        type: t.bool(),
      }),
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("ToggleInputMute", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.inputMuted, data.inputMuted);
    },
  });

  createOBSExecSchema({
    name: "Get Input Volume",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetInputVolume", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.inputVolumeMul, data.inputVolumeMul);
      ctx.setOutput(io.inputVolumeDb, data.inputVolumeDb);
    },
  });

  createOBSExecSchema({
    name: "Set Input Volume (dB)",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
      inputVolumeDb: io.dataInput({
        id: "inputVolumeDb",
        name: "Input Volume (dB)",
        type: t.float(),
      }),
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetInputVolume", {
        inputName: ctx.getInput(io.inputName),
        inputVolumeDb: ctx.getInput(io.inputVolumeDb),
      });
    },
  });

  createOBSExecSchema({
    name: "Set Input Volume (mul)",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
      inputVolumeMul: io.dataInput({
        id: "inputVolumeMul",
        name: "Input Volume (mul)",
        type: t.float(),
      }),
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetInputVolume", {
        inputName: ctx.getInput(io.inputName),
        inputVolumeMul: ctx.getInput(io.inputVolumeMul),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Input Audio Balance",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetInputAudioBalance", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.inputAudioBalance, data.inputAudioBalance);
    },
  });

  createOBSExecSchema({
    name: "Set Input Audio Balance",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetInputAudioBalance", {
        inputName: ctx.getInput(io.inputName),
        inputAudioBalance: ctx.getInput(io.inputAudioBalance),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Input Audio Sync Offset",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetInputAudioSyncOffset", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.inputAudioSyncOffset, data.inputAudioSyncOffset);
    },
  });

  createOBSExecSchema({
    name: "Set Input Audio Sync Offset",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetInputAudioSyncOffset", {
        inputName: ctx.getInput(io.inputName),
        inputAudioSyncOffset: ctx.getInput(io.inputAudioSyncOffset),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Input Audio Monitor Type",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetInputAudioMonitorType", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.monitorType, data.monitorType);
    },
  });

  createOBSExecSchema({
    name: "Set Input Audio Monitor Type",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = ctx.getInput(io.monitorType);

      obs.call("SetInputAudioMonitorType", {
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

  createOBSExecSchema({
    name: "Get Input Audio Tracks",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetInputAudioTracks", {
        inputName: ctx.getInput(io.inputName),
      });

      ctx.setOutput(
        io.inputAudioTracks,
        Maybe(jsToJSON(data.inputAudioTracks)).unwrap()
      );
    },
  });

  createOBSExecSchema({
    name: "Set Input Audio Tracks",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetInputAudioTracks", {
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

  createOBSExecSchema({
    name: "Get input Properties List Property Items",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetInputPropertiesListPropertyItems", {
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

  createOBSExecSchema({
    name: "Press Input Properties Button",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("PressInputPropertiesButton", {
        inputName: ctx.getInput(io.inputName),
        propertyName: ctx.getInput(io.propertyName),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Transition Kind List",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "transitionKinds",
        name: "Transition Kinds",
        type: t.list(t.string()),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetTransitionKindList");
      ctx.setOutput(io, data.transitionKinds);
    },
  });

  createOBSExecSchema({
    name: "Get Scene Transition List",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSceneTransitionList");

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

  createOBSExecSchema({
    name: "Get Current Scene Transition",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetCurrentSceneTransition");

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

  createOBSExecSchema({
    name: "Set Current Scene Transition",
    createIO: ({ io }) =>
      io.dataInput({
        id: "transitionName",
        name: "Transition Name",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("SetCurrentSceneTransition", {
        transitionName: ctx.getInput(io),
      });
    },
  });

  createOBSExecSchema({
    name: "Set Current Scene Transition Duration",
    createIO: ({ io }) =>
      io.dataInput({
        id: "transitionDuration",
        name: "Transition Duration",
        type: t.int(),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("SetCurrentSceneTransitionDuration", {
        transitionDuration: ctx.getInput(io),
      });
    },
  });

  createOBSExecSchema({
    name: "Set Current Scene Transition Settings",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetCurrentSceneTransitionSettings", {
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

  createOBSExecSchema({
    name: "Get Current Scene Transition Cursor",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "transitionCursor",
        name: "Transition Cursor",
        type: t.int(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetCurrentSceneTransitionCursor");
      ctx.setOutput(io, data.transitionCursor);
    },
  });

  createOBSExecSchema({
    name: "Trigger Studio Mode Transition",
    createIO() {},
    async run({ obs }) {
      await obs.call("TriggerStudioModeTransition");
    },
  });

  createOBSExecSchema({
    name: "Set T Bar Position",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetTBarPosition", {
        position: ctx.getInput(io.position),
        release: ctx.getInput(io.release),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Source Filter List",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSourceFilterList", {
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

  createOBSExecSchema({
    name: "Get Source Filter Default Settings",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSourceFilterDefaultSettings", {
        filterKind: ctx.getInput(io.filterKind),
      });

      ctx.setOutput(
        io.defaultFilterSettings,
        Maybe(jsToJSON(data.defaultFilterSettings)).unwrap()
      );
    },
  });

  createOBSExecSchema({
    name: "Create Source Filter",
    createIO: ({ io, obs }) => ({
      sourceName: io.dataInput({
        id: "sourceName",
        name: "Source Name",
        type: t.string(),
        fetchSuggestions: sourceListSuggestionFactory(obs),
      }),
      filterName: io.dataInput({
        id: "filterName",
        name: "Filter Name",
        type: t.string(),
        // TODO: suggestion
        // fetchSuggestion: filterListSuggestionFactory(obs)
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("CreateSourceFilter", {
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

  createOBSExecSchema({
    name: "Remove Source Filter",
    createIO: ({ io, obs }) => {
      const sourceName = io.dataInput({
        id: "sourceName",
        name: "Source Name",
        type: t.string(),
        fetchSuggestions: sourceListSuggestionFactory(obs),
      });

      return {
        sourceName,
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
          fetchSuggestions: sourceFilterSuggestionFactory(sourceName, obs),
        }),
      };
    },
    async run({ ctx, io, obs }) {
      await obs.call("RemoveSourceFilter", {
        sourceName: ctx.getInput(io.sourceName),
        filterName: ctx.getInput(io.filterName),
      });
    },
  });

  createOBSExecSchema({
    name: "Set Source Filter Name",
    createIO: ({ io, obs }) => {
      const sourceName = io.dataInput({
        id: "sourceName",
        name: "Source Name",
        type: t.string(),
        fetchSuggestions: sourceListSuggestionFactory(obs),
      });

      return {
        sourceName,
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
          fetchSuggestions: sourceFilterSuggestionFactory(sourceName, obs),
        }),
        newFilterName: io.dataInput({
          id: "newFilterName",
          name: "New Filter Name",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io, obs }) {
      await obs.call("SetSourceFilterName", {
        sourceName: ctx.getInput(io.sourceName),
        filterName: ctx.getInput(io.filterName),
        newFilterName: ctx.getInput(io.newFilterName),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Source Filter",
    createIO: ({ io, obs }) => {
      const sourceName = io.dataInput({
        id: "sourceName",
        name: "Source Name",
        type: t.string(),
        fetchSuggestions: sourceListSuggestionFactory(obs),
      });

      return {
        sourceName,
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
          fetchSuggestions: sourceFilterSuggestionFactory(sourceName, obs),
        }),
        filter: io.dataOutput({
          id: "filter",
          name: "Filter",
          type: t.option(t.struct(Filter)),
        }),
      };
    },
    async run({ ctx, io, obs }) {
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

  createOBSExecSchema({
    name: "Set Source Filter Name",
    createIO: ({ io, obs }) => {
      const sourceName = io.dataInput({
        id: "sourceName",
        name: "Source Name",
        type: t.string(),
        fetchSuggestions: sourceListSuggestionFactory(obs),
      });

      return {
        sourceName,
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
          fetchSuggestions: sourceFilterSuggestionFactory(sourceName, obs),
        }),
        filterIndex: io.dataInput({
          id: "filterIndex",
          name: "Filter Index",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io, obs }) {
      await obs.call("SetSourceFilterIndex", {
        sourceName: ctx.getInput(io.sourceName),
        filterName: ctx.getInput(io.filterName),
        filterIndex: ctx.getInput(io.filterIndex),
      });
    },
  });

  createOBSExecSchema({
    name: "Set Source Filter Settings",
    createIO: ({ io, obs }) => {
      const sourceName = io.dataInput({
        id: "sourceName",
        name: "Source Name",
        type: t.string(),
        fetchSuggestions: sourceListSuggestionFactory(obs),
      });

      return {
        sourceName,
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
          fetchSuggestions: sourceFilterSuggestionFactory(sourceName, obs),
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
    async run({ ctx, io, obs }) {
      await obs.call("SetSourceFilterSettings", {
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

  createOBSExecSchema({
    name: "Set Source Filter Enabled",
    createIO: ({ io, obs }) => {
      const sourceName = io.dataInput({
        id: "sourceName",
        name: "Source Name",
        type: t.string(),
        fetchSuggestions: sourceListSuggestionFactory(obs),
      });

      return {
        sourceName,
        filterName: io.dataInput({
          id: "filterName",
          name: "Filter Name",
          type: t.string(),
          fetchSuggestions: sourceFilterSuggestionFactory(sourceName, obs),
        }),
        filterEnabled: io.dataInput({
          id: "filterEnabled",
          name: "Filter Enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io, obs }) {
      await obs.call("SetSourceFilterEnabled", {
        sourceName: ctx.getInput(io.sourceName),
        filterName: ctx.getInput(io.filterName),
        filterEnabled: ctx.getInput(io.filterEnabled),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Scene Item List",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
      }),
      sceneItems: io.dataOutput({
        id: "sceneItems",
        name: "Scene Items",
        type: t.list(t.struct(SceneItem)),
      }),
    }),
    async run({ ctx, io, obs }) {
      console.log(obs);
      const data = await obs.call("GetSceneItemList", {
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

  createOBSExecSchema({
    name: "Get Scene Item Id",
    createIO: ({ io, obs }) => {
      const sceneName = io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
      });

      return {
        sceneName,
        sourceName: io.dataInput({
          id: "sourceName",
          name: "Source Name",
          type: t.string(),
          fetchSuggestions: sceneSourceListSuggestionFactory(sceneName, obs),
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
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSceneItemId", {
        sceneName: ctx.getInput(io.sceneName),
        sourceName: ctx.getInput(io.sourceName),
        searchOffset: ctx.getInput(io.searchOffset),
      });
      ctx.setOutput(io.sceneItemId, data.sceneItemId);
    },
  });

  createOBSExecSchema({
    name: "Create Scene Item",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
      }),
      sourceName: io.dataInput({
        id: "sourceName",
        name: "Source Name",
        type: t.string(),
        fetchSuggestions: sourceListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("CreateSceneItem", {
        sceneName: ctx.getInput(io.sceneName),
        sourceName: ctx.getInput(io.sourceName),
        sceneItemEnabled: ctx.getInput(io.sceneItemEnabled),
      });
      ctx.setOutput(io.sceneItemId, data.sceneItemId);
    },
  });

  createOBSExecSchema({
    name: "Remove Scene Item",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
      }),
      sceneItemId: io.dataInput({
        id: "sceneItemId",
        name: "Scene Item Id",
        type: t.int(),
      }),
    }),
    async run({ ctx, io, obs }) {
      await obs.call("RemoveSceneItem", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
      });
    },
  });

  createOBSExecSchema({
    name: "Duplicate Scene Item",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
        fetchSuggestions: sceneListSuggestionFactory(obs),
      }),
      sceneItemIdOut: io.dataOutput({
        id: "sceneItemId",
        name: "Scene Item Id",
        type: t.int(),
      }),
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("DuplicateSceneItem", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemIdIn),
        destinationSceneName: ctx.getInput(io.destinationSceneName),
      });
      ctx.setOutput(io.sceneItemIdOut, data.sceneItemId);
    },
  });

  createOBSExecSchema({
    name: "Get Scene Item Transform",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSceneItemTransform", {
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

  createOBSExecSchema({
    name: "Set Scene Item Transform",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetSceneItemTransform", {
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

  createOBSExecSchema({
    name: "Get Scene Item Enabled",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSceneItemEnabled", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
      });
      ctx.setOutput(io.sceneItemEnabled, data.sceneItemEnabled);
    },
  });

  createOBSExecSchema({
    name: "Set Scene Item Enabled",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetSceneItemEnabled", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
        sceneItemEnabled: ctx.getInput(io.sceneItemEnabled),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Scene Item Locked",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSceneItemLocked", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
      });
      ctx.setOutput(io.sceneItemLocked, data.sceneItemLocked);
    },
  });

  createOBSExecSchema({
    name: "Set Scene Item Locked",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetSceneItemLocked", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
        sceneItemLocked: ctx.getInput(io.sceneItemLocked),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Scene Item Index",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSceneItemIndex", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
      });
      ctx.setOutput(io.sceneItemIndex, data.sceneItemIndex);
    },
  });

  createOBSExecSchema({
    name: "Set Scene Item Index",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetSceneItemIndex", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
        sceneItemIndex: ctx.getInput(io.sceneItemIndex),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Scene Item Blend Mode",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetSceneItemBlendMode", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
      });
      ctx.setOutput(io.sceneItemBlendMode, data.sceneItemBlendMode);
    },
  });

  createOBSExecSchema({
    name: "Set Scene Item Blend Mode",
    createIO: ({ io, obs }) => ({
      sceneName: io.dataInput({
        id: "sceneName",
        name: "Scene Name",
        type: t.string(),
        fetchSuggestions: sceneListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetSceneItemBlendMode", {
        sceneName: ctx.getInput(io.sceneName),
        sceneItemId: ctx.getInput(io.sceneItemId),
        sceneItemBlendMode: ctx.getInput(io.sceneItemBlendMode),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Virtual Cam Status",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputActive",
        name: "Ouput Active",
        type: t.bool(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetVirtualCamStatus");
      ctx.setOutput(io, data.outputActive);
    },
  });

  createOBSExecSchema({
    name: "Toggle Virtual Cam",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputActive",
        name: "Ouput Active",
        type: t.bool(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("ToggleVirtualCam");
      ctx.setOutput(io, data.outputActive);
    },
  });

  createOBSExecSchema({
    name: "Start Virtual Cam",
    createIO() {},
    async run({ obs }) {
      obs.call("StartVirtualCam");
    },
  });

  createOBSExecSchema({
    name: "Stop Virtual Cam",
    createIO() {},
    async run({ obs }) {
      obs.call("StopVirtualCam");
    },
  });

  createOBSExecSchema({
    name: "Get Replay Buffer Status",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputActive",
        name: "Ouput Active",
        type: t.bool(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetReplayBufferStatus");
      ctx.setOutput(io, data.outputActive);
    },
  });

  createOBSExecSchema({
    name: "Toggle Replay Buffer",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputActive",
        name: "Ouput Active",
        type: t.bool(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("ToggleReplayBuffer");
      ctx.setOutput(io, data.outputActive);
    },
  });

  createOBSExecSchema({
    name: "Start Replay Buffer",
    createIO() {},
    async run({ obs }) {
      obs.call("StartReplayBuffer");
    },
  });

  createOBSExecSchema({
    name: "Stop Replay Buffer",
    createIO() {},
    async run({ obs }) {
      obs.call("StopReplayBuffer");
    },
  });

  createOBSExecSchema({
    name: "Save Replay Buffer",
    createIO() {},
    async run({ obs }) {
      obs.call("SaveReplayBuffer");
    },
  });

  createOBSExecSchema({
    name: "Get Last Replay Buffer Replay",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "savedReplayPath",
        name: "Save Replay Path",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetLastReplayBufferReplay");
      ctx.setOutput(io, data.savedReplayPath);
    },
  });

  createOBSExecSchema({
    name: "Get Output List",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputs",
        name: "Outputs",
        type: t.list(t.enum(JSON)),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetOutputList" as any);
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

  // createOBSExecSchema({
  //   name: "Toggle Output",
  //   type: "exec",
  //   generateIO({io}) {
  //    io.dataInput({
  //       id: "outputName",
  //       name: "Output Name",
  //       type: types.string(),
  //     });
  //     OutputStatus.forEach((data) =>io.dataOutput(data));
  //   },
  //   async run({ ctx }) {
  //     const data = await obs.call("GetOutputStatus", {
  //       outputName: ctx.getInput("outputName")
  //     });
  //     OutputStatus.forEach(({ id }) => ctx.setOutput(id, data[id]));
  //   },
  // });

  // createOBSExecSchema({
  //   name: "Start Output",
  //   type: "exec",
  //   generateIO({io}) {
  //    io.dataInput({
  //       id: "outputName",
  //       name: "Output Name",
  //       type: types.string(),
  //     });
  //   },
  //   async run({ ctx }) {
  //     obs.call("StartOutput", {
  //       outputName: ctx.getInput("outputName"),
  //     });
  //   },
  // });

  // createOBSExecSchema({
  //   name: "Stop Output",
  //   type: "exec",
  //   generateIO({io}) {
  //    io.dataInput({
  //       id: "outputName",
  //       name: "Output Name",
  //       type: types.string(),
  //     });
  //   },
  //   async run({ ctx }) {
  //     obs.call("StopOutput", {
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

  createOBSExecSchema({
    name: "Toggle Output",
    createIO: ({ io }) =>
      StreamStatus.map((data) => [data.id, io.dataOutput(data)] as const),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetStreamStatus");
      io.forEach(([id, output]) => ctx.setOutput(output, data[id]));
    },
  });

  createOBSExecSchema({
    name: "Toggle Stream",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputActive",
        name: "Ouput Active",
        type: t.bool(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("ToggleStream");
      ctx.setOutput(io, data.outputActive);
    },
  });

  createOBSExecSchema({
    name: "Start Stream",
    createIO() {},
    async run({ obs }) {
      obs.call("StartStream");
    },
  });

  createOBSExecSchema({
    name: "Stop Stream",
    createIO() {},
    async run({ obs }) {
      obs.call("StopStream");
    },
  });

  createOBSExecSchema({
    name: "Send Stream Caption",
    createIO: ({ io }) =>
      io.dataInput({
        id: "captionText",
        name: "Caption Text",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("SendStreamCaption", {
        captionText: ctx.getInput(io),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Record Status",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetRecordStatus");
      ctx.setOutput(io.outputActive, data.outputActive);
      ctx.setOutput(io.outputPaused, (data as any).outputPaused);
      ctx.setOutput(io.outputTimecode, data.outputTimecode);
      ctx.setOutput(io.outputDuration, data.outputDuration);
      ctx.setOutput(io.outputBytes, data.outputBytes);
    },
  });

  createOBSExecSchema({
    name: "Toggle Record",
    createIO() {},
    async run({ obs }) {
      obs.call("ToggleRecord");
    },
  });

  createOBSExecSchema({
    name: "Start Record",
    createIO() {},
    async run({ obs }) {
      await obs.call("StartRecord");
    },
  });

  createOBSExecSchema({
    name: "Stop Record",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "outputPath",
        name: "Output Path",
        type: t.string(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("StopRecord");
      ctx.setOutput(io, (data as any).outputPath);
    },
  });

  createOBSExecSchema({
    name: "Toggle Record Paused",
    createIO() {},
    async run({ obs }) {
      await obs.call("ToggleRecordPause");
    },
  });

  createOBSExecSchema({
    name: "Pause Record",
    createIO() {},
    async run({ obs }) {
      await obs.call("PauseRecord");
    },
  });

  createOBSExecSchema({
    name: "Resume Record",
    createIO() {},
    async run({ obs }) {
      await obs.call("ResumeRecord");
    },
  });

  createOBSExecSchema({
    name: "Get Media Input Status",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
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
    }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetMediaInputStatus", {
        inputName: ctx.getInput(io.inputName),
      });
      ctx.setOutput(io.mediaState, data.mediaState);
      ctx.setOutput(io.mediaDuration, data.mediaDuration);
      ctx.setOutput(io.mediaCursor, data.mediaCursor);
    },
  });

  createOBSExecSchema({
    name: "Set Media Input Cursor",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
      mediaCursor: io.dataInput({
        id: "mediaCursor",
        name: "Media Cursor",
        type: t.int(),
      }),
    }),
    async run({ ctx, io, obs }) {
      await obs.call("SetMediaInputCursor", {
        inputName: ctx.getInput(io.inputName),
        mediaCursor: ctx.getInput(io.mediaCursor),
      });
    },
  });

  createOBSExecSchema({
    name: "Offset Media Input Cursor",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
      mediaCursorOffset: io.dataInput({
        id: "mediaCursorOffset",
        name: "Media Cursor Offset",
        type: t.int(),
      }),
    }),
    async run({ ctx, io, obs }) {
      await obs.call("OffsetMediaInputCursor", {
        inputName: ctx.getInput(io.inputName),
        mediaCursorOffset: ctx.getInput(io.mediaCursorOffset),
      });
    },
  });

  createOBSExecSchema({
    name: "Trigger Media Input Action",
    createIO: ({ io, obs }) => ({
      inputName: io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
      mediaAction: io.dataInput({
        id: "mediaAction",
        name: "Media Action",
        type: t.string(),
      }),
    }),
    async run({ ctx, io, obs }) {
      await obs.call("TriggerMediaInputAction", {
        inputName: ctx.getInput(io.inputName),
        mediaAction: ctx.getInput(io.mediaAction),
      });
    },
  });

  createOBSExecSchema({
    name: "Get Studio Mode Enabled",
    createIO: ({ io }) =>
      io.dataOutput({
        id: "studioModeEnabled",
        name: "Studio Mode Enabled",
        type: t.bool(),
      }),
    async run({ ctx, io, obs }) {
      const data = await obs.call("GetStudioModeEnabled");
      ctx.setOutput(io, data.studioModeEnabled);
    },
  });

  createOBSExecSchema({
    name: "Set Studio Mode Enabled",
    createIO: ({ io }) =>
      io.dataInput({
        id: "studioModeEnabled",
        name: "Studio Mode Enabled",
        type: t.bool(),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("SetStudioModeEnabled", {
        studioModeEnabled: ctx.getInput(io),
      });
    },
  });

  createOBSExecSchema({
    name: "Open Input Properties Dialogue",
    createIO: ({ io, obs }) =>
      io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("OpenInputPropertiesDialog", {
        inputName: ctx.getInput(io),
      });
    },
  });

  createOBSExecSchema({
    name: "Open Input Filters Dialogue",
    createIO: ({ io, obs }) =>
      io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("OpenInputFiltersDialog", {
        inputName: ctx.getInput(io),
      });
    },
  });

  createOBSExecSchema({
    name: "Open Input Interact Dialogue",
    createIO: ({ io, obs }) =>
      io.dataInput({
        id: "inputName",
        name: "Input Name",
        type: t.string(),
        fetchSuggestions: inputListSuggestionFactory(obs),
      }),
    async run({ ctx, io, obs }) {
      await obs.call("OpenInputInteractDialog", {
        inputName: ctx.getInput(io),
      });
    },
  });

  //GetMonitorList has array of objects

  // createOBSExecSchema({
  //   name: "Open Video Mix Projector",
  //   type: "exec",
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
  //     obs.call("OpenVideoMixProjector", {
  //       videoMixType: ctx.getInput("videoMixType"),
  //       monitorIndex: ctx.getInput("monitorIndex"),
  //       projectorGeometry: ctx.getInput("projectorGeometry"),
  //     });
  //   },
  // });

  // createOBSExecSchema({
  //   name: "Open Source Projector",
  //   type: "exec",
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
  //     obs.call("OpenSourceProjector", {
  //       sourceName: ctx.getInput("sourceName"),
  //       monitorIndex: ctx.getInput("monitorIndex"),
  //       projectorGeometry: ctx.getInput("projectorGeometry"),
  //     });
  //   },
  // });
}
