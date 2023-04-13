import OBS, { EventTypes } from "obs-websocket-js";

import { core } from "../models";

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
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataOutput({
      id: "obsWebSocketVersion",
      name: "OBS WS Version",
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataOutput({
      id: "rpcVersion",
      name: "RPC Version",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "platform",
      name: "Platform",
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataOutput({
      id: "platformDescription",
      name: "Platform Description",
      type: {
        variant: "primitive",
        value: "string",
      },
    });
  },
  async run({ ctx }) {
    const data = await ws.call( "GetVersion" );
    ctx.setOutput("obsVersion", data.obsVersion);
    ctx.setOutput("obsWebSocketVersion", data.obsWebSocketVersion);
    ctx.setOutput("rpcVersion", data.rpcVersion);
    ctx.setOutput("platform", data.platform);
    ctx.setOutput("platformDescription", data.platformDescription);
  },
});

pkg.createSchema({
  name: "Get OBS Stats",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "cpuUsage",
      name: "CPU Usage",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "memoryUsage",
      name: "Memory Usage",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "availableDiskSpace",
      name: "Available Disk Space",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "activeFps",
      name: "Active FPS",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "averageFrameRenderTime",
      name: "Avg Frame Render Time",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "renderSkippedFrames",
      name: "Render Skipped Frames",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "renderTotalFrames",
      name: "Render Total Frames",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "outputSkippedFrames",
      name: "Output Skipped Frames",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "outputTotalFrames",
      name: "Output Total Frames",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "webSocketSessionIncomingMessages",
      name: "WS Session Incoming Messages",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "webSocketSessionOutgoingMessages",
      name: "WS Session Outgoing Messaes",
      type: {
        variant: "primitive",
        value: "int",
      },
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

// Missing GetHotkeyList requires Array on response

//missing availableRequests & supportedImageForamts Array<string>
pkg.createSchema({
  name: "Trigger Hotkey By Name",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "hotkeyName",
      name: "Hotkey Name",
      type: {
        variant: "primitive",
        value: "string",
      },
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

//Missing GetSceneCollectionList as it has array in response

pkg.createSchema({
  name: "Set Current Scene Collection",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "sceneCollectionName",
      name: "Scene Collection Name",
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
    });
  },
  run({ ctx }) {
    ws.call("CreateSceneCollection", { sceneCollectionName: ctx.getInput("sceneCollectionName")});
  }
});

// Missing GetProfileList as it has array in response

pkg.createSchema({
  name: "Set Current Profile",
  variant: "Exec",
  generateIO(t) {
    t.dataInput({
      id: "profileName",
      name: "Profile Name",
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataInput({
      id: "parameterName",
      name: "Parameter Name",
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataOutput({
      id: "parameterValue",
      name: "Parameter Value",
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataOutput({
      id: "defaultParameterValue",
      name: "default Parameter Value",
      type: {
        variant: "primitive",
        value: "string",
      },
    });
  },
  run({ ctx }) {
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
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataInput({
      id: "parameterName",
      name: "Parameter Name",
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataInput({
      id: "parameterValue",
      name: "Parameter Value",
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "fpsDenominator",
      name: "FPS Denominator",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "baseWidth",
      name: "Base Width",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "baseHeight",
      name: "Base Height",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "outputWidth",
      name: "Output Width",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataOutput({
      id: "outputHeight",
      name: "Output Height",
      type: {
        variant: "primitive",
        value: "int",
      },
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
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataInput({
      id: "fpsDenominator",
      name: "FPS Denominator",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataInput({
      id: "baseWidth",
      name: "Base Width",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataInput({
      id: "baseHeight",
      name: "Base Height",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataInput({
      id: "outputWidth",
      name: "Output Width",
      type: {
        variant: "primitive",
        value: "int",
      },
    }),
    t.dataInput({
      id: "outputHeight",
      name: "Output Height",
      type: {
        variant: "primitive",
        value: "int",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
    });
  },
  run({ ctx }) {
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
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataOutput({
      id: "videoActive",
      name: "Video Active",
      type: {
        variant: "primitive",
        value: "bool",
      },
    }),
    t.dataOutput({
      id: "videoShowing",
      name: "Video Showing",
      type: {
        variant: "primitive",
        value: "bool",
      },
    });
  },
  run({ ctx }) {
    const data = await ws.call( "GetSourceActive", { sourceName: ctx.getInput("sourceName")} );
    ctx.setOutput("videoActive", data.videoActive);
    ctx.setOutput("videoShowing", data.videoShowing);
  }
});

//Missing GetSourceScreenshot as it has Base64-Encoded Screenshot data

//Missing SaveSourceScreenshot as it has Base64-Encoded Screenshot data

//Missing GetSceneList as it contains array

//Missing GetGroupList as it contains array

pkg.createSchema({
  name: "Get Currenct Program Scene",
  variant: "Exec",
  generateIO(t) {
    t.dataOutput({
      id: "currentProgramSceneName",
      name: "Current Program Scene Name",
      type: {
        variant: "primitive",
        value: "string",
      },
    });
  },
  run({ ctx }) {
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
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
    });
  },
  run({ ctx }) {
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
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataInput({
      id: "newSceneName",
      name: "New Scene Name",
      type: {
        variant: "primitive",
        value: "string",
      },
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
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataOutput({
      id: "transitionName",
      name: "Transition Name",
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataOutput({
      id: "transitionDuration",
      name: "Transition Duration",
      type: {
        variant: "primitive",
        value: "int",
      },
    });
  },
  run({ ctx }) {
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
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataInput({
      id: "transitionName",
      name: "Transition Name",
      type: {
        variant: "primitive",
        value: "string",
      },
    }),
    t.dataInput({
      id: "transitionDuration",
      name: "Transition Duration",
      type: {
        variant: "primitive",
        value: "int",
      },
    });
  },
  run({ ctx }) {
    ws.call( "SetSceneSceneTransitionOverride", { sceneName: ctx.getInput("sceneName"), transitionName: ctx.getInput("transitionName"), transitionDuration: ctx.getInput("transitionDuration")} );
  }
});