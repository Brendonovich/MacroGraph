import { createEnum } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { Pkg } from ".";
import { Ctx } from "./ctx";

const Sliders = createEnum("Sliders", (e) => [
  e.variant("A"),
  e.variant("B"),
  e.variant("C"),
  e.variant("D"),
]);

const MicType = createEnum("Mic Type", (e) => [
  e.variant("Dynamic"),
  e.variant("Condenser"),
  e.variant("Jack"),
]);

const Presets = createEnum("Presets", (e) => [
  e.variant("Preset1"),
  e.variant("Preset2"),
  e.variant("Preset3"),
  e.variant("Preset4"),
  e.variant("Preset5"),
  e.variant("Preset6"),
]);

export function register(pkg: Pkg, { mixerID, state }: Ctx) {
  function getSocket() {
    const s = state();

    if (s.type !== "connected") throw new Error("GoXLR is not connected");
    else return s.ws;
  }

  pkg.registerType(Sliders);
  pkg.registerType(MicType);
  pkg.registerType(Presets);

  pkg.createNonEventSchema({
    name: "Mute Slider",
    variant: "Exec",
    createIO: ({ io }) => {
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

  pkg.createNonEventSchema({
    name: "Set Microphone Type",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        name: "Mic Type",
        id: "micType",
        type: t.enum(MicType),
      }),
    run({ ctx, io }) {
      const type = ctx.getInput(io);

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

  pkg.createNonEventSchema({
    name: "Set FX State",
    variant: "Exec",
    createIO: ({ io }) =>
      io.dataInput({
        name: "State",
        id: "state",
        type: t.bool(),
      }),
    run({ ctx, io }) {
      getSocket().send(
        JSON.stringify({
          id: 0,
          data: {
            Command: [
              mixerID(),
              {
                SetFXEnabled: ctx.getInput(io),
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
    createIO: ({ io }) =>
      io.dataInput({
        name: "Preset",
        id: "preset",
        type: t.enum(Presets),
      }),
    run({ ctx, io }) {
      const preset = ctx.getInput(io);

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
}
