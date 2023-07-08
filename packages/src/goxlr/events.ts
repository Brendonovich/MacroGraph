import { t } from "@macrograph/core";
import pkg from "./pkg";

pkg.createEventSchema({
  name: "Level Change",
  event: "levelsChange",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      name: "Channel",
      id: "channel",
      type: t.string(),
    });
    io.dataOutput({
      name: "Value",
      id: "value",
      type: t.int(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("channel", data.path[4]);
    ctx.setOutput("value", Math.round(data.value * 0.392));
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Button State",
  event: "buttonDown",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      name: "Button Name",
      id: "buttonName",
      type: t.string(),
    });
    io.dataOutput({
      name: "State",
      id: "state",
      type: t.bool(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("buttonName", data.path[3]);
    ctx.setOutput("state", data.value);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Mute State",
  event: "faderStatus",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      name: "Channel",
      id: "channel",
      type: t.string(),
    });
    io.dataOutput({
      name: "State",
      id: "state",
      type: t.bool(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("channel", data.path[3]);
    ctx.setOutput("state", data.value === "MutedToX");
    ctx.exec("exec");
  },
});
