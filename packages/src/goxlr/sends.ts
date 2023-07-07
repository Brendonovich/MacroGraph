import pkg from "./pkg";
import { goxlr } from "./goxlr";
import { InferEnum, t } from "@macrograph/core";
import { mixerID } from "./goxlr";

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
    const slider = ctx.getInput<InferEnum<typeof Sliders>>("Slider");
    goxlr.send(
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

    goxlr.send(
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
    goxlr.send(
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

    goxlr.send(
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
