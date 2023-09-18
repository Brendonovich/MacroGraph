import { t } from "@macrograph/core";
import { pkg } from "./pkg";

pkg.createEventSchema({
  name: "Level Change",
  event: "levelsChange",
  generateIO: (io) => {
    return {
      exec: io.execOutput({
        id: "exec",
      }),
      channel: io.dataOutput({
        name: "Channel",
        id: "channel",
        type: t.string(),
      }),
      value: io.dataOutput({
        name: "Value",
        id: "value",
        type: t.int(),
      }),
    };
  },
  run({ ctx, data, io }) {
    ctx.setOutput(io.channel, data.channel);
    ctx.setOutput(io.value, data.value);
    ctx.exec(io.exec);
  },
});

pkg.createEventSchema({
  name: "Button State",
  event: "buttonDown",
  generateIO: (io) => {
    return {
      exec: io.execOutput({
        id: "exec",
      }),
      buttonName: io.dataOutput({
        name: "Button Name",
        id: "buttonName",
        type: t.string(),
      }),
      state: io.dataOutput({
        name: "State",
        id: "state",
        type: t.bool(),
      }),
    };
  },
  run({ ctx, data, io }) {
    ctx.setOutput(io.buttonName, data.buttonName);
    ctx.setOutput(io.state, data.state);
    ctx.exec(io.exec);
  },
});

pkg.createEventSchema({
  name: "Channel Mute State",
  event: "faderStatus",
  generateIO: (io) => {
    return {
      exec: io.execOutput({
        id: "exec",
      }),
      channel: io.dataOutput({
        name: "Channel",
        id: "channel",
        type: t.string(),
      }),
      state: io.dataOutput({
        name: "State",
        id: "state",
        type: t.bool(),
      }),
    };
  },
  run({ ctx, data, io }) {
    ctx.setOutput(io.channel, data.channel);
    ctx.setOutput(io.state, data.state);
    ctx.exec(io.exec);
  },
});
