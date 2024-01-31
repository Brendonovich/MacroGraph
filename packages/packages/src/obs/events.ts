import {
  createEnum,
  createStruct,
  Package,
  PropertyDef,
  SchemaProperties,
  CreateEventSchema,
} from "@macrograph/runtime";
import { InferEnum, t } from "@macrograph/typesystem";
import { Maybe } from "@macrograph/option";
import { JSON, jsToJSON } from "@macrograph/json";
import { EventTypes } from "obs-websocket-js";
import { onCleanup } from "solid-js";
import { EventEmitter } from "eventemitter3";
import { createEventBus } from "@solid-primitives/event-bus";

import { defaultProperties } from "./resource";

export const BoundsType = createEnum("Bounds Type", (e) => [
  e.variant("OBS_BOUNDS_MAX_ONLY"),
  e.variant("OBS_BOUNDS_NONE"),
  e.variant("OBS_BOUNDS_SCALE_INNER"),
  e.variant("OBS_BOUNDS_SCALE_OUTER"),
  e.variant("OBS_BOUNDS_SCALE_TO_HEIGHT"),
  e.variant("OBS_BOUNDS_SCALE_TO_WIDTH"),
  e.variant("OBS_BOUNDS_STRETCH"),
]);

export const Alignment = createEnum("Alignment", (e) => [
  e.variant("Center"),
  e.variant("Bottom Center"),
  e.variant("Bottom Left"),
  e.variant("Bottom Right"),
  e.variant("Center Left"),
  e.variant("Center Right"),
  e.variant("Top Center"),
  e.variant("Top Left"),
  e.variant("Top Right"),
]);

export const SceneItemTransform = createStruct("Scene Item Transform", (s) => ({
  alignment: s.field("Alignment", t.enum(Alignment)),
  boundsAlignment: s.field("Bounds Alignment", t.enum(Alignment)),
  boundsHeight: s.field("Bounds Height", t.float()),
  boundsType: s.field("Bounds Type", t.enum(BoundsType)),
  boundsWidth: s.field("Bounds Width", t.float()),
  cropBottom: s.field("Crop Bottom", t.float()),
  cropLeft: s.field("Crop Left", t.float()),
  cropRight: s.field("Crop Right", t.float()),
  cropTop: s.field("Crop Top", t.float()),
  positionX: s.field("Position X", t.float()),
  positionY: s.field("Position Y", t.float()),
  rotation: s.field("Rotation", t.float()),
  scaleX: s.field("Scale X", t.float()),
  scaleY: s.field("Scale Y", t.float()),
  sourceWidth: s.field("Source Width", t.float()),
  sourceHeight: s.field("Source Height", t.float()),
  width: s.field("Width", t.float()),
  height: s.field("Height", t.float()),
}));

export const Scenes = createStruct("Scenes", (s) => ({
  sceneName: s.field("Scene name", t.string()),
  sceneIndex: s.field("Scene Index", t.int()),
}));

export const AudioTracks = createStruct("Audio Tracks", (s) => ({
  "1": s.field("1", t.bool()),
  "2": s.field("2", t.bool()),
  "3": s.field("3", t.bool()),
  "4": s.field("4", t.bool()),
  "5": s.field("5", t.bool()),
  "6": s.field("6", t.bool()),
}));

export const MonitorType = createEnum("Monitor Type", (e) => [
  e.variant("None"),
  e.variant("Monitor Only"),
  e.variant("Monitor and Output"),
]);

export const InputVolumeMeter = createStruct("Input Volume Meter", (s) => ({
  inputName: s.field("Input Name", t.string()),
  inputLevelsMul: s.field("Input Levels (mul)", t.list(t.list(t.float()))),
}));

export function alignmentConversion(alignment: string | number) {
  switch (alignment) {
    case "Center":
      return 0;
    case "Bottom Center":
      return 8;
    case "Bottom Left":
      return 9;
    case "Bottom Right":
      return 10;
    case "Center Left":
      return 1;
    case "Center Right":
      return 2;
    case "Top Center":
      return 4;
    case "Top Left":
      return 5;
    case "Top Right":
      return 6;
    case 0:
      return Alignment.variant("Center");
    case 8:
      return Alignment.variant("Bottom Center");
    case 9:
      return Alignment.variant("Bottom Left");
    case 10:
      return Alignment.variant("Bottom Right");
    case 2:
      return Alignment.variant("Center Right");
    case 1:
      return Alignment.variant("Center Left");
    case 4:
      return Alignment.variant("Top Center");
    case 5:
      return Alignment.variant("Top Left");
    case 6:
      return Alignment.variant("Top Right");
  }
}

export function register(pkg: Package<EventTypes>) {
  pkg.registerType(BoundsType);
  pkg.registerType(Alignment);
  pkg.registerType(SceneItemTransform);
  pkg.registerType(Scenes);
  pkg.registerType(AudioTracks);
  pkg.registerType(MonitorType);
  pkg.registerType(InputVolumeMeter);

  type MapValueToArgsArray<T extends Record<string, unknown>> = {
    [K in keyof T]: T[K] extends void ? [] : [T[K]];
  };
  type OBSFire<
    T extends EventEmitter.EventNames<MapValueToArgsArray<EventTypes>>
  > = Parameters<
    EventEmitter.EventListener<MapValueToArgsArray<EventTypes>, T>
  >;

  function createOBSEventSchema<
    TEvent extends keyof EventTypes,
    TProperties extends Record<string, PropertyDef> = {},
    TIO = void
  >(
    s: Omit<
      CreateEventSchema<
        TProperties & typeof defaultProperties,
        TIO,
        OBSFire<TEvent>[0]
      >,
      "type" | "createListener"
    > & {
      properties?: TProperties;
      event: TEvent;
    }
  ) {
    pkg.createSchema({
      ...s,
      type: "event",
      properties: { ...s.properties, ...defaultProperties } as any,
      createListener({ ctx, properties }) {
        const instance = ctx
          .getProperty(
            properties.instance as SchemaProperties<
              typeof defaultProperties
            >["instance"]
          )
          .expect("No OBS instance available!");

        if (instance.state !== "connected")
          throw new Error("OBS instance not connected!");

        const { obs } = instance;

        const bus = createEventBus<OBSFire<TEvent>[0]>();

        const fn = (...d: OBSFire<TEvent>) => bus.emit(d[0]);
        obs.on(s.event, fn);
        onCleanup(() => obs.off(s.event, fn));

        return bus;
      },
    });
  }

  createOBSEventSchema({
    name: "Exit Started",
    event: "ExitStarted",
    createIO: ({ io }) =>
      io.execOutput({
        id: "exec",
        name: "",
      }),
    run({ ctx, io }) {
      ctx.exec(io);
    },
  });

  createOBSEventSchema({
    event: "VendorEvent",
    name: "Vendor Event",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        vendorName: io.dataOutput({
          id: "vendorName",
          name: "Vendor Name",
          type: t.string(),
        }),
        eventType: io.dataOutput({
          id: "eventType",
          name: "Event Type",
          type: t.string(),
        }),
        eventData: io.dataOutput({
          id: "eventData",
          name: "Event Data",
          type: t.enum(JSON),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.vendorName, data.vendorName);
      ctx.setOutput(io.eventType, data.eventType);
      ctx.setOutput(io.eventData, Maybe(jsToJSON(data.eventData)).unwrap());
      ctx.exec(io.exec);
    },
  });

  //CustomEvent has object

  createOBSEventSchema({
    event: "CurrentSceneCollectionChanging",
    name: "Current Scene Collection Changing",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneCollectionName: io.dataOutput({
          id: "sceneCollectionName",
          name: "Scene Collection Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneCollectionName, data.sceneCollectionName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "CurrentSceneCollectionChanged",
    name: "Current Scene Collection Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneCollectionName: io.dataOutput({
          id: "sceneCollectionName",
          name: "Scene Collection Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneCollectionName, data.sceneCollectionName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneCollectionListChanged",
    name: "Scene Collection List Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneCollections: io.dataOutput({
          id: "sceneCollections",
          name: "Scene Collections",
          type: t.list(t.string()),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneCollections, data.sceneCollections);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "CurrentProfileChanging",
    name: "Current Profile Changing",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        profileName: io.dataOutput({
          id: "profileName",
          name: "Profile Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.profileName, data.profileName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "CurrentProfileChanged",
    name: "Current Profile Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        profileName: io.dataOutput({
          id: "profileName",
          name: "Profile Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.profileName, data.profileName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "ProfileListChanged",
    name: "Profile List Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        profiles: io.dataOutput({
          id: "profiles",
          name: "Profiles",
          type: t.list(t.string()),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.profiles, data.profiles);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneCreated",
    name: "Scene Created",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneName: io.dataOutput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        isGroup: io.dataOutput({
          id: "isGroup",
          name: "Is Group",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneName, data.sceneName);
      ctx.setOutput(io.isGroup, data.isGroup);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneRemoved",
    name: "Scene Removed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneName: io.dataOutput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
        isGroup: io.dataOutput({
          id: "isGroup",
          name: "Is Group",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneName, data.sceneName);
      ctx.setOutput(io.isGroup, data.isGroup);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneNameChanged",
    name: "Scene Name Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        oldSceneName: io.dataOutput({
          id: "oldSceneName",
          name: "Old Scene Name",
          type: t.string(),
        }),
        sceneName: io.dataOutput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.oldSceneName, data.oldSceneName);
      ctx.setOutput(io.sceneName, data.sceneName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "CurrentProgramSceneChanged",
    name: "Current Program Scene Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneName: io.dataOutput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneName, data.sceneName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "CurrentPreviewSceneChanged",
    name: "Current Preview Scene Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneName: io.dataOutput({
          id: "sceneName",
          name: "Scene Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneName, data.sceneName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneListChanged",
    name: "Scene List Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        scenes: io.dataOutput({
          id: "scenes",
          name: "Scenes",
          type: t.list(t.struct(Scenes)),
        }),
      };
    },
    run({ ctx, data, io }) {
      const scenes = data.scenes.map((data) =>
        Scenes.create({
          sceneName: data.sceneName as string,
          sceneIndex: data.sceneIndex as number,
        })
      );
      ctx.setOutput(io.scenes, scenes);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputCreated",
    name: "Input Created",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputKind: io.dataOutput({
          id: "inputKind",
          name: "Input Kind",
          type: t.string(),
        }),
        unversionedInputKind: io.dataOutput({
          id: "unversionedInputKind",
          name: "Unversioned Input Kind",
          type: t.string(),
        }),
        inputSettings: io.dataOutput({
          id: "inputSettings",
          name: "inputSettings",
          type: t.enum(JSON),
        }),
        defaultInputSettings: io.dataOutput({
          id: "defaultInputSettings",
          name: "Default Input Settings",
          type: t.enum(JSON),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.setOutput(io.inputKind, data.inputKind);
      ctx.setOutput(io.unversionedInputKind, data.unversionedInputKind);
      ctx.setOutput(
        io.inputSettings,
        Maybe(jsToJSON(data.inputSettings)).unwrap()
      );
      ctx.setOutput(
        io.defaultInputSettings,
        Maybe(jsToJSON(data.defaultInputSettings)).unwrap()
      );
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputRemoved",
    name: "Input Removed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputNameChanged",
    name: "Input Name Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        oldInputName: io.dataOutput({
          id: "oldInputName",
          name: "Old Input Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.setOutput(io.oldInputName, data.oldInputName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputActiveStateChanged",
    name: "Input Active State Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        videoActive: io.dataOutput({
          id: "videoActive",
          name: "Video Active",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.setOutput(io.videoActive, data.videoActive);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputShowStateChanged",
    name: "Input Show State Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        videoShowing: io.dataOutput({
          id: "videoShowing",
          name: "Video Showing",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.setOutput(io.videoShowing, data.videoShowing);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputMuteStateChanged",
    name: "Input Mute State Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputMuted: io.dataOutput({
          id: "inputMuted",
          name: "Video Muted",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.setOutput(io.inputMuted, data.inputMuted);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputVolumeChanged",
    name: "Input Volume Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputVolumeMul: io.dataOutput({
          id: "inputVolumeMul",
          name: "Video Volume Mul",
          type: t.int(),
        }),
        inputVolumeDb: io.dataOutput({
          id: "inputVolumeDb",
          name: "Video Volume Db",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.setOutput(io.inputVolumeMul, data.inputVolumeMul);
      ctx.setOutput(io.inputVolumeDb, data.inputVolumeDb);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputAudioBalanceChanged",
    name: "Input Audio Balance Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputAudioBalance: io.dataOutput({
          id: "inputAudioBalance",
          name: "Video Audio Balance",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.setOutput(io.inputAudioBalance, data.inputAudioBalance);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputAudioSyncOffsetChanged",
    name: "Input Audio Sync Offset Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputAudioSyncOffset: io.dataOutput({
          id: "inputAudioSyncOffset",
          name: "input Audio Sync Offseet",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.setOutput(io.inputAudioSyncOffset, data.inputAudioSyncOffset);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputAudioTracksChanged",
    name: "Input Audio Tracks Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        inputAudioTracks: io.dataOutput({
          id: "inputAudioTracks",
          name: "Input Audio Tracks",
          type: t.struct(AudioTracks),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      const audioTracks = AudioTracks.create({
        "1": data.inputAudioTracks["1"] as boolean,
        "2": data.inputAudioTracks["2"] as boolean,
        "3": data.inputAudioTracks["3"] as boolean,
        "4": data.inputAudioTracks["4"] as boolean,
        "5": data.inputAudioTracks["5"] as boolean,
        "6": data.inputAudioTracks["6"] as boolean,
      });
      ctx.setOutput(io.inputAudioTracks, audioTracks);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputAudioMonitorTypeChanged",
    name: "Input Audio Monitor Type Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        monitorType: io.dataOutput({
          id: "monitorType",
          name: "Monitor Type",
          type: t.enum(MonitorType),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.setOutput(
        io.monitorType,
        MonitorType.variant(
          data.monitorType as InferEnum<typeof MonitorType>["variant"]
        )
      );
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "InputVolumeMeters",
    name: "Input Volume Meters",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputs: io.dataOutput({
          id: "inputs",
          name: "Inputs",
          type: t.list(t.struct(InputVolumeMeter)),
        }),
      };
    },
    run({ ctx, data, io }) {
      const volumeMeters = data.inputs.map((data) =>
        InputVolumeMeter.create({
          inputName: data.inputName as string,
          inputLevelsMul: data.inputLevelsMul as number[][],
        })
      );
      ctx.setOutput(io.inputs, volumeMeters);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "CurrentSceneTransitionChanged",
    name: "Current Scene Transition Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        transitionName: io.dataOutput({
          id: "transitionName",
          name: "Transition Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.transitionName, data.transitionName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "CurrentSceneTransitionDurationChanged",
    name: "Current Scene Transition Duration Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        transitionDuration: io.dataOutput({
          id: "transitionDuration",
          name: "Transition Duration",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.transitionDuration, data.transitionDuration);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneTransitionStarted",
    name: "Scene Transition Started",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        transitionName: io.dataOutput({
          id: "transitionName",
          name: "Transition Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.transitionName, data.transitionName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneTransitionEnded",
    name: "Scene Transition Ended",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        transitionName: io.dataOutput({
          id: "transitionName",
          name: "Transition Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.transitionName, data.transitionName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneTransitionVideoEnded",
    name: "Scene Transition Video Ended",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        transitionName: io.dataOutput({
          id: "transitionName",
          name: "Transition Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.transitionName, data.transitionName);
      ctx.exec(io.exec);
    },
  });

  //SourceFilterListReindexed has array of objects

  //SourceFilterCreated has object

  createOBSEventSchema({
    event: "SourceFilterRemoved",
    name: "Source Filter Removed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sourceName: io.dataOutput({
          id: "sourceName",
          name: "Source name",
          type: t.string(),
        }),
        filterName: io.dataOutput({
          id: "filterName",
          name: "Filter name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sourceName, data.sourceName);
      ctx.setOutput(io.filterName, data.filterName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SourceFilterNameChanged",
    name: "Source Filter Name Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sourceName: io.dataOutput({
          id: "sourceName",
          name: "Source name",
          type: t.string(),
        }),
        oldFilterName: io.dataOutput({
          id: "oldFilterName",
          name: "Old Filter name",
          type: t.string(),
        }),
        filterName: io.dataOutput({
          id: "filterName",
          name: "Filter name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sourceName, data.sourceName);
      ctx.setOutput(io.oldFilterName, data.oldFilterName);
      ctx.setOutput(io.filterName, data.filterName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SourceFilterEnableStateChanged",
    name: "Source Filter Enable State Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sourceName: io.dataOutput({
          id: "sourceName",
          name: "Source name",
          type: t.string(),
        }),
        filterName: io.dataOutput({
          id: "filterName",
          name: "Filter name",
          type: t.string(),
        }),
        filterEnabled: io.dataOutput({
          id: "filterEnabled",
          name: "Filter Enabled",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sourceName, data.sourceName);
      ctx.setOutput(io.filterEnabled, data.filterEnabled);
      ctx.setOutput(io.filterName, data.filterName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneItemCreated",
    name: "Scene Item Created",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneName: io.dataOutput({
          id: "sceneName",
          name: "Scene name",
          type: t.string(),
        }),
        sourceName: io.dataOutput({
          id: "sourceName",
          name: "Source name",
          type: t.string(),
        }),
        sceneItemId: io.dataOutput({
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
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneName, data.sceneName);
      ctx.setOutput(io.sourceName, data.sourceName);
      ctx.setOutput(io.sceneItemId, data.sceneItemId);
      ctx.setOutput(io.sceneItemIndex, data.sceneItemIndex);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneItemRemoved",
    name: "Scene Item Removed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneName: io.dataOutput({
          id: "sceneName",
          name: "Scene name",
          type: t.string(),
        }),
        sourceName: io.dataOutput({
          id: "sourceName",
          name: "Source name",
          type: t.string(),
        }),
        sceneItemId: io.dataOutput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneName, data.sceneName);
      ctx.setOutput(io.sourceName, data.sourceName);
      ctx.setOutput(io.sceneItemId, data.sceneItemId);
      ctx.exec(io.exec);
    },
  });

  //Has Object array

  // createOBSEventSchema({
  //   event: "SceneItemListReindexed",
  //   name: "Scene Item List Reindexed",
  //   generateIO({io}) {
  //    io.execOutput({
  //       id: "exec",
  //       name: "",
  //     });
  //    io.dataOutput({
  //       id: "sceneName",
  //       name: "Scene name",
  //       type: types.string(),
  //     });
  //    io.dataOutput({
  //       id: "sceneItems",
  //       name: "Source Items",
  //       type: types.list(types.object()),
  //     });
  //   },
  //   run({ ctx, data }) {
  //     ctx.setOutput("sceneName", data.sceneName);
  //     ctx.setOutput("sceneItems", data.sceneItems);
  //     ctx.exec("exec");
  //   },
  // });

  //
  createOBSEventSchema({
    event: "SceneItemEnableStateChanged",
    name: "Scene Item Enable State Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneName: io.dataOutput({
          id: "sceneName",
          name: "Scene name",
          type: t.string(),
        }),
        sceneItemId: io.dataOutput({
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
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneName, data.sceneName);
      ctx.setOutput(io.sceneItemId, data.sceneItemId);
      ctx.setOutput(io.sceneItemEnabled, data.sceneItemEnabled);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneItemLockStateChanged",
    name: "Scene Item Lock State Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneName: io.dataOutput({
          id: "sceneName",
          name: "Scene name",
          type: t.string(),
        }),
        sceneItemId: io.dataOutput({
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
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneName, data.sceneName);
      ctx.setOutput(io.sceneItemId, data.sceneItemId);
      ctx.setOutput(io.sceneItemLocked, data.sceneItemLocked);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneItemSelected",
    name: "Scene Item Selected",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneName: io.dataOutput({
          id: "sceneName",
          name: "Scene name",
          type: t.string(),
        }),
        sceneItemId: io.dataOutput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneName, data.sceneName);
      ctx.setOutput(io.sceneItemId, data.sceneItemId);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "SceneItemTransformChanged",
    name: "Scene Item Transform Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        sceneName: io.dataOutput({
          id: "sceneName",
          name: "Scene name",
          type: t.string(),
        }),
        sceneItemId: io.dataOutput({
          id: "sceneItemId",
          name: "Scene Item Id",
          type: t.int(),
        }),
        sceneItemTransform: io.dataOutput({
          id: "sceneItemTransform",
          name: "Scene Item Transform",
          type: t.struct(SceneItemTransform),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.sceneName, data.sceneName);
      ctx.setOutput(io.sceneItemId, data.sceneItemId);

      const transform = SceneItemTransform.create({
        alignment: alignmentConversion(
          data.sceneItemTransform.alignment as number
        ),
        boundsAlignment: alignmentConversion(
          data.sceneItemTransform.boundsAlignment as number
        ),
        boundsHeight: data.sceneItemTransform.boundsHeight as number,
        boundsType: BoundsType.variant(
          data.sceneItemTransform.boundsType as InferEnum<
            typeof BoundsType
          >["variant"]
        ),
        boundsWidth: data.sceneItemTransform.boundsWidth as number,
        cropBottom: data.sceneItemTransform.cropBottom as number,
        cropLeft: data.sceneItemTransform.cropLeft as number,
        cropRight: data.sceneItemTransform.cropRight as number,
        cropTop: data.sceneItemTransform.cropTop as number,
        positionX: data.sceneItemTransform.positionX as number,
        positionY: data.sceneItemTransform.positionY as number,
        rotation: data.sceneItemTransform.rotation as number,
        scaleX: data.sceneItemTransform.scaleX as number,
        scaleY: data.sceneItemTransform.scaleY as number,
        sourceWidth: data.sceneItemTransform.sourceWidth as number,
        sourceHeight: data.sceneItemTransform.sourceHeight as number,
        width: data.sceneItemTransform.width as number,
        height: data.sceneItemTransform.height as number,
      });
      ctx.setOutput(io.sceneItemTransform, transform);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "StreamStateChanged",
    name: "Stream State Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        outputActive: io.dataOutput({
          id: "outputActive",
          name: "Output Active",
          type: t.bool(),
        }),
        outputState: io.dataOutput({
          id: "outputState",
          name: "Output State",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.outputActive, data.outputActive);
      ctx.setOutput(io.outputState, data.outputState);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "RecordStateChanged",
    name: "Record State Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        outputActive: io.dataOutput({
          id: "outputActive",
          name: "Output Active",
          type: t.bool(),
        }),
        outputState: io.dataOutput({
          id: "outputState",
          name: "Output State",
          type: t.string(),
        }),
        outputPath: io.dataOutput({
          id: "outputPath",
          name: "Output Path",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.outputActive, data.outputActive);
      ctx.setOutput(io.outputState, data.outputState);
      ctx.setOutput(io.outputPath, (data as any).outputPath);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "ReplayBufferStateChanged",
    name: "Replay Buffer State Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        outputActive: io.dataOutput({
          id: "outputActive",
          name: "Output Active",
          type: t.bool(),
        }),
        outputState: io.dataOutput({
          id: "outputState",
          name: "Output State",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.outputActive, data.outputActive);
      ctx.setOutput(io.outputState, data.outputState);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "VirtualcamStateChanged",
    name: "Virtual Cam State Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        outputActive: io.dataOutput({
          id: "outputActive",
          name: "Output Active",
          type: t.bool(),
        }),
        outputState: io.dataOutput({
          id: "outputState",
          name: "Output State",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.outputActive, data.outputActive);
      ctx.setOutput(io.outputState, data.outputState);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "ReplayBufferSaved",
    name: "Replay Buffer Saved",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        savedReplayPath: io.dataOutput({
          id: "savedReplayPath",
          name: "Saved Replay Path",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.savedReplayPath, data.savedReplayPath);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "MediaInputPlaybackStarted",
    name: "Media Input Playback Started",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "MediaInputPlaybackEnded",
    name: "Media Input Playback Ended",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "MediaInputActionTriggered",
    name: "Media Input Action Triggered",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inputName: io.dataOutput({
          id: "inputName",
          name: "Input Name",
          type: t.string(),
        }),
        mediaAction: io.dataOutput({
          id: "mediaAction",
          name: "Media Action",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.inputName, data.inputName);
      ctx.setOutput(io.mediaAction, data.mediaAction);
      ctx.exec(io.exec);
    },
  });

  createOBSEventSchema({
    event: "StudioModeStateChanged",
    name: "Studio Mode State Changed",
    createIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        studioModeEnabled: io.dataOutput({
          id: "studioModeEnabled",
          name: "Studio Mode Enabled",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.studioModeEnabled, data.studioModeEnabled);
      ctx.exec(io.exec);
    },
  });

  //Doesnt Exist Yet

  // createOBSEventSchema({
  //   event: "ScreenshotSaved",
  //   name: "Screenshot Saved",
  //   generateIO({io}) {
  //    io.execOutput({
  //       id: "exec",
  //       name: "",
  //     });
  //    io.dataOutput({
  //       id: "savedScreenshotPath",
  //       name: "Saved Screenshot Path",
  //       type: types.bool(),
  //     });
  //   },
  //   run({ ctx, data }) {
  //     ctx.setOutput("savedScreenshotPath", data.savedScreenshotPath);
  //     ctx.exec("exec");
  //   },
  // });

  //
  createOBSEventSchema({
    event: "ConnectionOpened",
    name: "Connection Opened",
    createIO: ({ io }) =>
      io.execOutput({
        id: "exec",
        name: "",
      }),
    run({ ctx, io }) {
      ctx.exec(io);
    },
  });
}
