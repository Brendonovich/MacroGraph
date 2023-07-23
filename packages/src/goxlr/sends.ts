import pkg from "./pkg";
import { InferEnum, t } from "@macrograph/core";
import { mixerID, state } from "./goxlr";

function getSocket() {
  const s = state();

  if (s.type !== "connected") throw new Error("GoXLR is not connected");
  else return s.ws;
}

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
    return {
      slider: io.dataInput({
        name: "Slider",
        id: "Slider",
        type: t.enum(Sliders),
      }),
      muteState: io.dataInput({
        name: "Mute State",
        id: "muteState",
        type: t.bool(),
      }),
    };
  },
  run({ ctx, io }) {
    const slider = ctx.getInput(io.slider);

    getSocket().send(
      JSON.stringify({
        id: 0,
        data: {
          Command: [
            mixerID(),
            {
              SetFaderMuteState: [
                slider.variant,
                ctx.getInput(io.muteState) ? "MutedToX" : "Unmuted",
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

    getSocket().send(
      JSON.stringify({
        id: 0,
        data: {
          Command: [
            mixerID(),
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
    getSocket().send(
      JSON.stringify({
        id: 0,
        data: {
          Command: [
            mixerID(),
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

    getSocket().send(
      JSON.stringify({
        id: 0,
        data: {
          Command: [
            mixerID(),
            {
              SetActiveEffectPreset: preset.variant,
            },
          ],
        },
      })
    );
  },
});
