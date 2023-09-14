//EVENTS BELOW ______________________________________________|

import { EnumVariants, InferEnum, Maybe, t } from "@macrograph/core";
import pkg from "./pkg";
import { obs } from "./ws";
import { JSON, jsToJSON } from "../json";
import { EnumValues } from "zod";

pkg.createEventSchema({
  event: "ExitStarted",
  name: "Exit Started",
  generateIO: (io) =>
    io.execOutput({
      id: "exec",
      name: "",
    }),
  run({ ctx, io }) {
    ctx.exec(io);
  },
});

obs.on("ExitStarted", () => {
  pkg.emitEvent({ name: "ExitStarted", data: undefined });
});

pkg.createEventSchema({
  event: "VendorEvent",
  name: "Vendor Event",
  generateIO: (io) => {
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

pkg.createEventSchema({
  event: "CurrentSceneCollectionChanging",
  name: "Current Scene Collection Changing",
  generateIO: (io) => {
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

obs.on("CurrentSceneCollectionChanging", (data) => {
  pkg.emitEvent({ name: "CurrentSceneCollectionChanging", data });
});

pkg.createEventSchema({
  event: "CurrentSceneCollectionChanged",
  name: "Current Scene Collection Changed",
  generateIO: (io) => {
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

obs.on("CurrentSceneCollectionChanged", (data) => {
  pkg.emitEvent({ name: "CurrentSceneCollectionChanged", data });
});

pkg.createEventSchema({
  event: "SceneCollectionListChanged",
  name: "Scene Collection List Changed",
  generateIO: (io) => {
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

obs.on("SceneCollectionListChanged", (data) => {
  pkg.emitEvent({ name: "SceneCollectionListChanged", data });
});

pkg.createEventSchema({
  event: "CurrentProfileChanging",
  name: "Current Profile Changing",
  generateIO: (io) => {
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

obs.on("CurrentProfileChanging", (data) => {
  pkg.emitEvent({ name: "CurrentProfileChanging", data });
});

pkg.createEventSchema({
  event: "CurrentProfileChanged",
  name: "Current Profile Changed",
  generateIO: (io) => {
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

obs.on("CurrentProfileChanged", (data) => {
  pkg.emitEvent({ name: "CurrentProfileChanged", data });
});

pkg.createEventSchema({
  event: "ProfileListChanged",
  name: "Profile List Changed",
  generateIO: (io) => {
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

obs.on("ProfileListChanged", (data) => {
  pkg.emitEvent({ name: "ProfileListChanged", data });
});

pkg.createEventSchema({
  event: "SceneCreated",
  name: "Scene Created",
  generateIO: (io) => {
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

obs.on("SceneCreated", (data) => {
  pkg.emitEvent({ name: "SceneCreated", data });
});

pkg.createEventSchema({
  event: "SceneRemoved",
  name: "Scene Removed",
  generateIO: (io) => {
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

obs.on("SceneRemoved", (data) => {
  pkg.emitEvent({ name: "SceneRemoved", data });
});

pkg.createEventSchema({
  event: "SceneNameChanged",
  name: "Scene Name Changed",
  generateIO: (io) => {
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

obs.on("SceneNameChanged", (data) => {
  pkg.emitEvent({ name: "SceneNameChanged", data });
});

pkg.createEventSchema({
  event: "CurrentProgramSceneChanged",
  name: "Current Program Scene Changed",
  generateIO: (io) => {
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

obs.on("CurrentProgramSceneChanged", (data) => {
  pkg.emitEvent({ name: "CurrentProgramSceneChanged", data });
});

pkg.createEventSchema({
  event: "CurrentPreviewSceneChanged",
  name: "Current Preview Scene Changed",
  generateIO: (io) => {
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

obs.on("CurrentPreviewSceneChanged", (data) => {
  pkg.emitEvent({ name: "CurrentPreviewSceneChanged", data });
});

const Scenes = pkg.createStruct("Scenes", (s) => ({
  sceneName: s.field("Scene name", t.string()),
  sceneIndex: s.field("Scene Index", t.int()),
}));

pkg.createEventSchema({
  event: "SceneListChanged",
  name: "Scene List Changed",
  generateIO: (io) => {
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

obs.on("SceneListChanged", (data) => {
  pkg.emitEvent({ name: "SceneListChanged", data });
});

pkg.createEventSchema({
  event: "InputCreated",
  name: "Input Created",
  generateIO: (io) => {
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

obs.on("InputCreated", (data) => {
  pkg.emitEvent({ name: "InputCreated", data });
});

pkg.createEventSchema({
  event: "InputRemoved",
  name: "Input Removed",
  generateIO: (io) => {
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

obs.on("InputRemoved", (data) => {
  pkg.emitEvent({ name: "InputRemoved", data });
});

pkg.createEventSchema({
  event: "InputNameChanged",
  name: "Input Name Changed",
  generateIO: (io) => {
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

obs.on("InputNameChanged", (data) => {
  pkg.emitEvent({ name: "InputNameChanged", data });
});

pkg.createEventSchema({
  event: "InputActiveStateChanged",
  name: "Input Active State Changed",
  generateIO: (io) => {
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

obs.on("InputActiveStateChanged", (data) => {
  pkg.emitEvent({ name: "InputActiveStateChanged", data });
});

pkg.createEventSchema({
  event: "InputShowStateChanged",
  name: "Input Show State Changed",
  generateIO: (io) => {
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

obs.on("InputShowStateChanged", (data) => {
  pkg.emitEvent({ name: "InputShowStateChanged", data });
});

pkg.createEventSchema({
  event: "InputMuteStateChanged",
  name: "Input Mute State Changed",
  generateIO: (io) => {
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

obs.on("InputMuteStateChanged", (data) => {
  pkg.emitEvent({ name: "InputMuteStateChanged", data });
});

pkg.createEventSchema({
  event: "InputVolumeChanged",
  name: "Input Volume Changed",
  generateIO: (io) => {
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

obs.on("InputVolumeChanged", (data) => {
  pkg.emitEvent({ name: "InputVolumeChanged", data });
});

pkg.createEventSchema({
  event: "InputAudioBalanceChanged",
  name: "Input Audio Balance Changed",
  generateIO: (io) => {
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

obs.on("InputAudioBalanceChanged", (data) => {
  pkg.emitEvent({ name: "InputAudioBalanceChanged", data });
});

pkg.createEventSchema({
  event: "InputAudioSyncOffsetChanged",
  name: "Input Audio Sync Offset Changed",
  generateIO: (io) => {
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

obs.on("InputAudioSyncOffsetChanged", (data) => {
  pkg.emitEvent({ name: "InputAudioSyncOffsetChanged", data });
});

const AudioTracks = pkg.createStruct("Audio Tracks", (s) => ({
  "1": s.field("1", t.bool()),
  "2": s.field("2", t.bool()),
  "3": s.field("3", t.bool()),
  "4": s.field("4", t.bool()),
  "5": s.field("5", t.bool()),
  "6": s.field("6", t.bool()),
}));

pkg.createEventSchema({
  event: "InputAudioTracksChanged",
  name: "Input Audio Tracks Changed",
  generateIO: (io) => {
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

obs.on("InputAudioTracksChanged", (data) => {
  pkg.emitEvent({ name: "InputAudioTracksChanged", data });
});

const monitorType = pkg.createEnum("Monitor Type", (e) => [
  e.variant("None"),
  e.variant("Monitor Only"),
  e.variant("Monitor and Output"),
]);

pkg.createEventSchema({
  event: "InputAudioMonitorTypeChanged",
  name: "Input Audio Monitor Type Changed",
  generateIO: (io) => {
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
        type: t.enum(monitorType),
      }),
    };
  },
  run({ ctx, data, io }) {
    ctx.setOutput(io.inputName, data.inputName);
    ctx.setOutput(
      io.monitorType,
      monitorType.variant(
        data.monitorType as InferEnum<typeof monitorType>["variant"]
      )
    );
    ctx.exec(io.exec);
  },
});

obs.on("InputAudioMonitorTypeChanged", (data) => {
  pkg.emitEvent({ name: "InputAudioMonitorTypeChanged", data });
});

const InputVolumeMeter = pkg.createStruct("Input Volume Meter", (s) => ({
  inputName: s.field("Input Name", t.string()),
  inputLevelsMul: s.field("Input Levels (mul)", t.list(t.list(t.float()))),
}));

pkg.createEventSchema({
  event: "InputVolumeMeters",
  name: "Input Volume Meters",
  generateIO: (io) => {
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

obs.on("InputVolumeMeters", (data) => {
  pkg.emitEvent({ name: "InputVolumeMeters", data });
});

pkg.createEventSchema({
  event: "CurrentSceneTransitionChanged",
  name: "Current Scene Transition Changed",
  generateIO: (io) => {
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

obs.on("CurrentSceneTransitionChanged", (data) => {
  pkg.emitEvent({ name: "CurrentSceneTransitionChanged", data });
});

pkg.createEventSchema({
  event: "CurrentSceneTransitionDurationChanged",
  name: "Current Scene Transition Duration Changed",
  generateIO: (io) => {
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

obs.on("CurrentSceneTransitionDurationChanged", (data) => {
  pkg.emitEvent({ name: "CurrentSceneTransitionDurationChanged", data });
});

pkg.createEventSchema({
  event: "SceneTransitionStarted",
  name: "Scene Transition Started",
  generateIO: (io) => {
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

obs.on("SceneTransitionStarted", (data) => {
  pkg.emitEvent({ name: "SceneTransitionStarted", data });
});

pkg.createEventSchema({
  event: "SceneTransitionEnded",
  name: "Scene Transition Ended",
  generateIO: (io) => {
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

obs.on("SceneTransitionEnded", (data) => {
  pkg.emitEvent({ name: "SceneTransitionEnded", data });
});

pkg.createEventSchema({
  event: "SceneTransitionVideoEnded",
  name: "Scene Transition Video Ended",
  generateIO: (io) => {
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

obs.on("SceneTransitionVideoEnded", (data) => {
  pkg.emitEvent({ name: "SceneTransitionVideoEnded", data });
});

//SourceFilterListReindexed has array of objects

//SourceFilterCreated has object

pkg.createEventSchema({
  event: "SourceFilterRemoved",
  name: "Source Filter Removed",
  generateIO: (io) => {
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

obs.on("SourceFilterRemoved", (data) => {
  pkg.emitEvent({ name: "SourceFilterRemoved", data });
});

pkg.createEventSchema({
  event: "SourceFilterNameChanged",
  name: "Source Filter Name Changed",
  generateIO: (io) => {
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

obs.on("SourceFilterNameChanged", (data) => {
  pkg.emitEvent({ name: "SourceFilterNameChanged", data });
});

pkg.createEventSchema({
  event: "SourceFilterEnableStateChanged",
  name: "Source Filter Enable State Changed",
  generateIO: (io) => {
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

obs.on("SourceFilterEnableStateChanged", (data) => {
  pkg.emitEvent({ name: "SourceFilterEnableStateChanged", data });
});

pkg.createEventSchema({
  event: "SceneItemCreated",
  name: "Scene Item Created",
  generateIO: (io) => {
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

obs.on("SceneItemCreated", (data) => {
  pkg.emitEvent({ name: "SceneItemCreated", data });
});

pkg.createEventSchema({
  event: "SceneItemRemoved",
  name: "Scene Item Removed",
  generateIO: (io) => {
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

obs.on("SceneItemRemoved", (data) => {
  pkg.emitEvent({ name: "SceneItemRemoved", data });
});

//Has Object array

// pkg.createEventSchema({
//   event: "SceneItemListReindexed",
//   name: "Scene Item List Reindexed",
//   generateIO(io) {
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

// obs.on("SceneItemListReindexed", (data) => {
//   pkg.emitEvent({ name: "SceneItemListReindexed", data });
// });

pkg.createEventSchema({
  event: "SceneItemEnableStateChanged",
  name: "Scene Item Enable State Changed",
  generateIO: (io) => {
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

obs.on("SceneItemEnableStateChanged", (data) => {
  pkg.emitEvent({ name: "SceneItemEnableStateChanged", data });
});

pkg.createEventSchema({
  event: "SceneItemLockStateChanged",
  name: "Scene Item Lock State Changed",
  generateIO: (io) => {
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

obs.on("SceneItemLockStateChanged", (data) => {
  pkg.emitEvent({ name: "SceneItemLockStateChanged", data });
});

pkg.createEventSchema({
  event: "SceneItemSelected",
  name: "Scene Item Selected",
  generateIO: (io) => {
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

obs.on("SceneItemSelected", (data) => {
  pkg.emitEvent({ name: "SceneItemSelected", data });
});

export const BoundsType = pkg.createEnum("Bounds Type", (e) => [
  e.variant("OBS_BOUNDS_MAX_ONLY"),
  e.variant("OBS_BOUNDS_NONE"),
  e.variant("OBS_BOUNDS_SCALE_INNER"),
  e.variant("OBS_BOUNDS_SCALE_OUTER"),
  e.variant("OBS_BOUNDS_SCALE_TO_HEIGHT"),
  e.variant("OBS_BOUNDS_SCALE_TO_WIDTH"),
  e.variant("OBS_BOUNDS_STRETCH"),
]);

export const Alignment = pkg.createEnum("Alignment", (e) => [
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

export const SceneItemTransform = pkg.createStruct(
  "Scene Item Transform",
  (s) => ({
    alignment: s.field("Alignment", t.enum(Alignment)),
    boundsAlignment: s.field("Bounds Alignment", t.enum(Alignment)),
    boundsHeight: s.field("Bounds Height", t.int()),
    boundsType: s.field("Bounds Type", t.enum(BoundsType)),
    boundsWidth: s.field("Bounds Width", t.int()),
    cropBottom: s.field("Crop Bottom", t.int()),
    cropLeft: s.field("Crop Left", t.int()),
    cropRight: s.field("Crop Right", t.int()),
    cropTop: s.field("Crop Top", t.int()),
    positionX: s.field("Position X", t.int()),
    positionY: s.field("Position Y", t.int()),
    rotation: s.field("Rotation", t.int()),
    scaleX: s.field("Scale X", t.int()),
    scaleY: s.field("Scale Y", t.int()),
    sourceWidth: s.field("Source Width", t.int()),
    sourceHeight: s.field("Source Height", t.int()),
    width: s.field("Width", t.int()),
    height: s.field("Height", t.int()),
  })
);

pkg.createEventSchema({
  event: "SceneItemTransformChanged",
  name: "Scene Item Transform Changed",
  generateIO: (io) => {
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

obs.on("SceneItemTransformChanged", (data) => {
  pkg.emitEvent({ name: "SceneItemTransformChanged", data });
});

pkg.createEventSchema({
  event: "StreamStateChanged",
  name: "Stream State Changed",
  generateIO: (io) => {
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

obs.on("StreamStateChanged", (data) => {
  pkg.emitEvent({ name: "StreamStateChanged", data });
});

pkg.createEventSchema({
  event: "RecordStateChanged",
  name: "Record State Changed",
  generateIO: (io) => {
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

obs.on("RecordStateChanged", (data) => {
  pkg.emitEvent({ name: "RecordStateChanged", data });
});

pkg.createEventSchema({
  event: "ReplayBufferStateChanged",
  name: "Replay Buffer State Changed",
  generateIO: (io) => {
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

obs.on("ReplayBufferStateChanged", (data) => {
  pkg.emitEvent({ name: "ReplayBufferStateChanged", data });
});

pkg.createEventSchema({
  event: "VirtualcamStateChanged",
  name: "Virtual Cam State Changed",
  generateIO: (io) => {
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

obs.on("VirtualcamStateChanged", (data) => {
  pkg.emitEvent({ name: "VirtualcamStateChanged", data });
});

pkg.createEventSchema({
  event: "ReplayBufferSaved",
  name: "Replay Buffer Saved",
  generateIO: (io) => {
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

obs.on("ReplayBufferSaved", (data) => {
  pkg.emitEvent({ name: "ReplayBufferSaved", data });
});

pkg.createEventSchema({
  event: "MediaInputPlaybackStarted",
  name: "Media Input Playback Started",
  generateIO: (io) => {
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

obs.on("MediaInputPlaybackStarted", (data) => {
  pkg.emitEvent({ name: "MediaInputPlaybackStarted", data });
});

pkg.createEventSchema({
  event: "MediaInputPlaybackEnded",
  name: "Media Input Playback Ended",
  generateIO: (io) => {
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

obs.on("MediaInputPlaybackEnded", (data) => {
  pkg.emitEvent({ name: "MediaInputPlaybackEnded", data });
});

pkg.createEventSchema({
  event: "MediaInputActionTriggered",
  name: "Media Input Action Triggered",
  generateIO: (io) => {
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

obs.on("MediaInputActionTriggered", (data) => {
  pkg.emitEvent({ name: "MediaInputActionTriggered", data });
});

pkg.createEventSchema({
  event: "StudioModeStateChanged",
  name: "Studio Mode State Changed",
  generateIO: (io) => {
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

obs.on("StudioModeStateChanged", (data) => {
  pkg.emitEvent({ name: "StudioModeStateChanged", data });
});

//Doesnt Exist Yet

// pkg.createEventSchema({
//   event: "ScreenshotSaved",
//   name: "Screenshot Saved",
//   generateIO(io) {
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

// obs.on("ScreenshotSaved", (data) => {
//   pkg.emitEvent({ name: "ScreenshotSaved", data });
// });

pkg.createEventSchema({
  event: "ConnectionOpened",
  name: "Connection Opened",
  generateIO: (io) =>
    io.execOutput({
      id: "exec",
      name: "",
    }),
  run({ ctx, io }) {
    ctx.exec(io);
  },
});

obs.on("ConnectionOpened", () =>
  pkg.emitEvent({ name: "ConnectionOpened", data: undefined })
);
