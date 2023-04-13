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
