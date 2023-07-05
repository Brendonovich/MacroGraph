import { InferEnum, core, t } from "@macrograph/core";
import { List } from "@macrograph/core/src/types/t";

export const ws = new WebSocket("ws://localhost:14564/api/websocket");

const pkg = core.createPackage<any>({ name: "GoXLR" });

let mixerID: string | undefined;

ws.addEventListener("message", (data: any) => {
  const status = JSON.parse(data.data).data.Status;
  if (status) {
    mixerID = Object.keys(status.mixers)[0];
    console.log(mixerID);
    return;
  }
  const patch: Array<any> = JSON.parse(data.data).data.Patch;
  patch.forEach((expanded) => {
    const path: string = expanded.path;
    const pathParts = path.substring(1).split("/");
    if (pathParts[2] === "levels") {
      pkg.emitEvent({
        name: "levelsChange",
        data: { path: pathParts, value: expanded.value },
      });
    }
    if (pathParts[2] === "button_down") {
      pkg.emitEvent({
        name: "buttonDown",
        data: { path: pathParts, value: expanded.value },
      });
    }
    if (pathParts[2] === "fader_status") {
      pkg.emitEvent({
        name: "faderStatus",
        data: { path: pathParts, value: expanded.value },
      });
    }
  });
});

ws.addEventListener("open", (data) => {
  ws.send(
    JSON.stringify({
      id: 0,
      data: "GetStatus",
    })
  );
});

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

const Sliders = pkg.createEnum("Sliders", (e) => [
  e.variant("A"),
  e.variant("B"),
  e.variant("C"),
  e.variant("D"),
]);

pkg.createNonEventSchema({
  name: "Mute Slider",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "Slider",
      id: "Slider",
      type: t.enum(Sliders),
    });
    io.dataInput({
      name: "Mute State",
      id: "muteState",
      type: t.bool(),
    });
  },
  run({ ctx }) {
    const slider = ctx.getInput<InferEnum<typeof Sliders>>("Sliders");
    ws.send(
      JSON.stringify({
        id: 0,
        data: {
          Command: [
            mixerID,
            {
              SetFaderMuteState: [
                slider.variant,
                ctx.getInput("muteState") ? "MutedToX" : "Unmuted",
              ],
            },
          ],
        },
      })
    );
  },
});

const MicType = pkg.createEnum("Mic Type", (e) => [
  e.variant("Dynamic"),
  e.variant("Condenser"),
  e.variant("Jack"),
]);

pkg.createNonEventSchema({
  name: "Set Microphone Type",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "Mic Type",
      id: "micType",
      type: t.enum(MicType),
    });
  },
  run({ ctx }) {
    const type = ctx.getInput<InferEnum<typeof MicType>>("micType");

    ws.send(
      JSON.stringify({
        id: 0,
        data: {
          Command: [
            mixerID,
            {
              SetMicrophoneType: type.variant,
            },
          ],
        },
      })
    );
  },
});

const Presets = pkg.createEnum("Presets", (e) => [
  e.variant("Preset1"),
  e.variant("Preset2"),
  e.variant("Preset3"),
  e.variant("Preset4"),
  e.variant("Preset5"),
  e.variant("Preset6"),
]);

pkg.createNonEventSchema({
  name: "Set FX State",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "State",
      id: "state",
      type: t.bool(),
    });
  },
  run({ ctx }) {
    ws.send(
      JSON.stringify({
        id: 0,
        data: {
          Command: [
            mixerID,
            {
              SetFXEnabled: ctx.getInput("state"),
            },
          ],
        },
      })
    );
  },
});

pkg.createNonEventSchema({
  name: "Set FX Preset",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "Preset",
      id: "preset",
      type: t.enum(Presets),
    });
  },
  run({ ctx }) {
    const preset = ctx.getInput<InferEnum<typeof Presets>>("preset");

    ws.send(
      JSON.stringify({
        id: 0,
        data: {
          Command: [
            mixerID,
            {
              SetActiveEffectPreset: preset.variant,
            },
          ],
        },
      })
    );
  },
});
