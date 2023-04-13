import OBS, { EventTypes } from "obs-websocket-js";

import { core } from "../models";
import { types } from "../types";

const pkg = core.createPackage<keyof EventTypes>({
  name: "OBS Websocket",
});

const ws = new OBS();

ws.connect();

pkg.createSchema({
  name: "Set Current Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "scene",
      name: "Scene",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("SetCurrentProgramScene", { sceneName: ctx.getInput("scene") });
  },
});

pkg.createSchema({
  name: "Set Preview Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "scene",
      name: "Scene",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("SetCurrentPreviewScene", { sceneName: ctx.getInput("scene") });
  },
});

//missing availableRequests & supportedImageForamts Array<string>

pkg.createSchema({
  name: "Get OBS Version",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "obsVersion",
      name: "OBS Version",
      type: types.string(),
    }),
    t.dataOutput({
      id: "obsWebSocketVersion",
      name: "OBS WS Version",
      type: types.string(),
    }),
    t.dataOutput({
      id: "rpcVersion",
      name: "RPC Version",
      type: types.int(),
    }),
    t.dataOutput({
      id: "platform",
      name: "Platform",
      type: types.string(),
    }),
    t.dataOutput({
      id: "supportedImageFormats",
      name: "Supported Image Formats",
      type: types.list(types.string()),
    }),
    t.dataOutput({
      id: "availableRequests",
      name: "Available Requests",
      type: types.list(types.string()),
    }),
    t.dataOutput({
      id: "platformDescription",
      name: "Platform Description",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetVersion" );
    ctx.setOutput("obsVersion", data.obsVersion);
    ctx.setOutput("obsWebSocketVersion", data.obsWebSocketVersion);
    ctx.setOutput("rpcVersion", data.rpcVersion);
    ctx.setOutput("platform", data.platform);
    ctx.setOutput("platformDescription", data.platformDescription);
    ctx.setOutput("availableRequests", data.availableRequests);
    ctx.setOutput("supportedImageFormats", data.supportedImageFormats);
  },
});

pkg.createSchema({
  name: "Get OBS Stats",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "cpuUsage",
      name: "CPU Usage",
      type: types.int(),
    }),
    t.dataOutput({
      id: "memoryUsage",
      name: "Memory Usage",
      type: types.int(),
    }),
    t.dataOutput({
      id: "availableDiskSpace",
      name: "Available Disk Space",
      type: types.int(),
    }),
    t.dataOutput({
      id: "activeFps",
      name: "Active FPS",
      type: types.int(),
    }),
    t.dataOutput({
      id: "averageFrameRenderTime",
      name: "Avg Frame Render Time",
      type: types.int(),
    }),
    t.dataOutput({
      id: "renderSkippedFrames",
      name: "Render Skipped Frames",
      type: types.int(),
    }),
    t.dataOutput({
      id: "renderTotalFrames",
      name: "Render Total Frames",
      type: types.int(),
    }),
    t.dataOutput({
      id: "outputSkippedFrames",
      name: "Output Skipped Frames",
      type: types.int(),
    }),
    t.dataOutput({
      id: "outputTotalFrames",
      name: "Output Total Frames",
      type: types.int(),
    }),
    t.dataOutput({
      id: "webSocketSessionIncomingMessages",
      name: "WS Session Incoming Messages",
      type: types.int(),
    }),
    t.dataOutput({
      id: "webSocketSessionOutgoingMessages",
      name: "WS Session Outgoing Messaes",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetStats" );
    ctx.setOutput("cpuUsage", data.cpuUsage);
    ctx.setOutput("memoryUsage", data.memoryUsage);
    ctx.setOutput("availableDiskSpace", data.availableDiskSpace);
    ctx.setOutput("activeFps", data.activeFps);
    ctx.setOutput("averageFrameRenderTime", data.averageFrameRenderTime);
    ctx.setOutput("renderSkippedFrames", data.renderSkippedFrames);
    ctx.setOutput("renderTotalFrames", data.renderTotalFrames);
    ctx.setOutput("outputSkippedFrames", data.outputSkippedFrames);
    ctx.setOutput("outputTotalFrames", data.outputTotalFrames);
    ctx.setOutput("webSocketSessionIncomingMessages", data.webSocketSessionIncomingMessages);
    ctx.setOutput("webSocketSessionOutgoingMessages", data.webSocketSessionOutgoingMessages);
  },
});

// Missing BroadcastCustomEvent requires OBject request

// Missing CallVendorRequest requires Object request and response

pkg.createSchema({
  name: "Get Profile Parameter",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "hotkeys",
      name: "Hotkeys",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetHotkeyList");
    ctx.setOutput("hotkeys", data.hotkeys);
  }
});

pkg.createSchema({
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

pkg.createSchema({
  name: "Get Scene Collection List",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "currentSceneCollectionName",
      name: "Scene Collection Name",
      type: types.string(),
    }),
    t.dataOutput({
      id: "sceneCollections",
      name: "Scene Collections",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetSceneCollectionList" );
    ctx.setOutput("currentSceneCollectionName", data.currentSceneCollectionName);
    ctx.setOutput("sceneCollections", data.sceneCollections);
  }
});

pkg.createSchema({
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
    ws.call("SetCurrentSceneCollection", { sceneCollectionName: ctx.getInput("sceneCollectionName") });
  },
});

pkg.createSchema({
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
    ws.call("CreateSceneCollection", { sceneCollectionName: ctx.getInput("sceneCollectionName")});
  }
});

pkg.createSchema({
  name: "Get Profile list",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "currentProfileName",
      name: "Profile Name",
      type: types.string(),
    }),
    t.dataOutput({
      id: "profiles",
      name: "Profiles",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetProfileList" );
    ctx.setOutput("currentProfileName", data.currentProfileName);
    ctx.setOutput("profiles", data.profiles);
  }
});
pkg.createSchema({
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
    ws.call("SetCurrentProfile", { profileName: ctx.getInput("profileName")});
  }
});

pkg.createSchema({
  name: "Create profile",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "profileName",
      name: "Profile Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("CreateProfile", { profileName: ctx.getInput("profileName")});
  }
});

pkg.createSchema({
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
    ws.call("RemoveProfile", { profileName: ctx.getInput("profileName")});
  }
});

pkg.createSchema({
  name: "Get Profile Parameter",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "parameterCategory",
      name: "Parameter catagory",
      type: types.string(),
    }),
    t.dataInput({
      id: "parameterName",
      name: "Parameter Name",
      type: types.string(),
    }),
    t.dataOutput({
      id: "parameterValue",
      name: "Parameter Value",
      type: types.string(),
    }),
    t.dataOutput({
      id: "defaultParameterValue",
      name: "default Parameter Value",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetProfileParameter", { parameterCategory: ctx.getInput("parameterCategory"), parameterName: ctx.getInput("parameterName")} );
    ctx.setOutput("parameterValue", data.parameterValue);
    ctx.setOutput("defaultParameterValue", data.defaultParameterValue);
  }
});

pkg.createSchema({
  name: "Set Profile Parameter",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "parameterCategory",
      name: "Parameter Catagory",
      type: types.string(),
    }),
    t.dataInput({
      id: "parameterName",
      name: "Parameter Name",
      type: types.string(),
    }),
    t.dataInput({
      id: "parameterValue",
      name: "Parameter Value",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call("SetProfileParameter", { parameterCategory: ctx.getInput("parameterCategory"), parameterName: ctx.getInput("parameterName"), parameterValue: ctx.getInput("parameterValue") });
  }
});

pkg.createSchema({
  name: "Get Video Settings",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "fpsNumerator",
      name: "FPS Numerator",
      type: types.int(),
    }),
    t.dataOutput({
      id: "fpsDenominator",
      name: "FPS Denominator",
      type: types.int(),
    }),
    t.dataOutput({
      id: "baseWidth",
      name: "Base Width",
      type: types.int(),
    }),
    t.dataOutput({
      id: "baseHeight",
      name: "Base Height",
      type: types.int(),
    }),
    t.dataOutput({
      id: "outputWidth",
      name: "Output Width",
      type: types.int(),
    }),
    t.dataOutput({
      id: "outputHeight",
      name: "Output Height",
      type: types.int(),
  });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetVideoSettings" );
    ctx.setOutput("fpsNumerator", data.fpsNumerator);
    ctx.setOutput("fpsDenominator", data.fpsDenominator);
    ctx.setOutput("baseWidth", data.baseWidth);
    ctx.setOutput("baseHeight", data.baseHeight);
    ctx.setOutput("outputWidth", data.outputWidth);
    ctx.setOutput("outputHeight", data.outputHeight);
  },
});

pkg.createSchema({
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
    ws.call("SetVideoSettings", { fpsNumerator: ctx.getInput("fpsNumerator"), fpsDenominator: ctx.getInput("fpsDenominator"), baseWidth: ctx.getInput("baseWidth"),baseHeight: ctx.getInput("baseHeight"), outputWidth: ctx.getInput("outputWidth"), outputHeight: ctx.getInput("outputHeight") });
  }
});

//Missing GetStreamServiceSettings as it contains Object

//Missing SetStreamingServiceSettings as it contains object

pkg.createSchema({
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
    const data = await ws.call( "GetRecordDirectory" );
    ctx.setOutput("recordDirectory", data.recordDirectory);
  }
});

pkg.createSchema({
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
    const data = await ws.call( "GetSourceActive", { sourceName: ctx.getInput("sourceName")} );
    ctx.setOutput("videoActive", data.videoActive);
    ctx.setOutput("videoShowing", data.videoShowing);
  }
});

//Missing GetSourceScreenshot as it has Base64-Encoded Screenshot data

//Missing SaveSourceScreenshot as it has Base64-Encoded Screenshot data

//Missing GetSceneList as it contains array of object

pkg.createSchema({
  name: "Get Group List",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "groups",
      name: "Record Directory",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetGroupList" );
    ctx.setOutput("groups", data.groups);
  }
});

pkg.createSchema({
  name: "Get Currenct Program Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "currentProgramSceneName",
      name: "Current Program Scene Name",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetCurrentProgramScene" );
    ctx.setOutput("currentProgramSceneName", data.currentProgramSceneName);
  }
});

pkg.createSchema({
  name: "Set Currenct Program Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call( "SetCurrentProgramScene", { sceneName: ctx.getInput("sceneName")} );
  }
});

pkg.createSchema({
  name: "Get Currenct Preview Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "currentPreviewSceneName",
      name: "Current Program Scene Name",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetCurrentPreviewScene" );
    ctx.setOutput("currentPreviewSceneName", data.currentPreviewSceneName);
  }
});

pkg.createSchema({
  name: "Set Currenct Preview Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call( "SetCurrentPreviewScene", { sceneName: ctx.getInput("sceneName")} );
  }
});

pkg.createSchema({
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
    ws.call( "CreateScene", { sceneName: ctx.getInput("sceneName")} );
  }
});

pkg.createSchema({
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
    ws.call( "RemoveScene", { sceneName: ctx.getInput("sceneName")} );
  }
});

pkg.createSchema({
  name: "Set Scene Name",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    }),
    t.dataInput({
      id: "newSceneName",
      name: "New Scene Name",
      type: types.string(),
    });
  },
  run({ ctx }) {
    ws.call( "SetSceneName", { sceneName: ctx.getInput("sceneName"), newSceneName: ctx.getInput("newSceneName")} );
  }
});

pkg.createSchema({
  name: "Set Scene Transition Override",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    }),
    t.dataOutput({
      id: "transitionName",
      name: "Transition Name",
      type: types.string(),
    }),
    t.dataOutput({
      id: "transitionDuration",
      name: "Transition Duration",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetSceneSceneTransitionOverride", { sceneName: ctx.getInput("sceneName")} );
    ctx.setOutput("transitionName", data.transitionName);
    ctx.setOutput("transitionDuration", data.transitionDuration);
  }
});

pkg.createSchema({
  name: "Set Scene Transition Override",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneName",
      name: "Scene Name",
      type: types.string(),
    }),
    t.dataInput({
      id: "transitionName",
      name: "Transition Name",
      type: types.string(),
    }),
    t.dataInput({
      id: "transitionDuration",
      name: "Transition Duration",
      type: types.int(),
    });
  },
  run({ ctx }) {
    ws.call( "SetSceneSceneTransitionOverride", { sceneName: ctx.getInput("sceneName"), transitionName: ctx.getInput("transitionName"), transitionDuration: ctx.getInput("transitionDuration")} );
  }
});

