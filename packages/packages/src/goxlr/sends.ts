import { createEnum } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import type { Pkg } from ".";
import type { Ctx } from "./ctx";

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

const Inputs = createEnum("Inputs", (e) => [
  e.variant("Microphone"),
  e.variant("Chat"),
  e.variant("Music"),
  e.variant("Game"),
  e.variant("Console"),
  e.variant("LineIn"),
  e.variant("System"),
  e.variant("Samples"),
]);

const Outputs = createEnum("Outputs", (e) => [
  e.variant("Headphones"),
  e.variant("BroadcastMix"),
  e.variant("LineOut"),
  e.variant("ChatMic"),
  e.variant("Sampler"),
]);

export function register(pkg: Pkg, { mixerID, state }: Ctx) {
  function getSocket() {
    const s = state();

    if (s.type !== "connected") throw new Error("GoXLR is not connected");
    return s.ws;
  }

  pkg.registerType(Sliders);
  pkg.registerType(MicType);
  pkg.registerType(Presets);
  pkg.registerType(Inputs);
  pkg.registerType(Outputs);

  pkg.createSchema({
    name: "Mute Slider",
    type: "exec",
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

  pkg.createSchema({
    name: "Set Microphone Type",
    type: "exec",
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
            Command: [mixerID(), { SetMicrophoneType: type.variant }],
          },
        })
      );
    },
  });

  pkg.createSchema({
    name: "Set Reverb Amount",
    type: "exec",
    createIO: ({ io }) =>
      io.dataInput({
        name: "Amount (%)",
        id: "amount",
        type: t.int(),
      }),
    run({ ctx, io }) {
      getSocket().send(
        JSON.stringify({
          id: 0,
          data: {
            Command: [mixerID(), { SetReverbAmount: ctx.getInput(io) }],
          },
        })
      );
    },
  });

  pkg.createSchema({
    name: "Set Echo Amount",
    type: "exec",
    createIO: ({ io }) =>
      io.dataInput({
        name: "Amount (%)",
        id: "amount",
        type: t.int(),
      }),
    run({ ctx, io }) {
      getSocket().send(
        JSON.stringify({
          id: 0,
          data: {
            Command: [mixerID(), { SetEchoAmount: ctx.getInput(io) }],
          },
        })
      );
    },
  });

  pkg.createSchema({
    name: "Set Pitch Amount",
    type: "exec",
    createIO: ({ io }) =>
      io.dataInput({
        name: "Amount (%)",
        id: "amount",
        type: t.int(),
      }),
    run({ ctx, io }) {
      getSocket().send(
        JSON.stringify({
          id: 0,
          data: {
            Command: [mixerID(), { SetPitchAmount: ctx.getInput(io) }],
          },
        })
      );
    },
  });

  pkg.createSchema({
    name: "Set Gender Amount",
    type: "exec",
    createIO: ({ io }) =>
      io.dataInput({
        name: "(%)",
        id: "amount",
        type: t.int(),
      }),
    run({ ctx, io }) {
      getSocket().send(
        JSON.stringify({
          id: 0,
          data: {
            Command: [
              mixerID(),
              {
                SetGenderAmount: ctx.getInput(io),
              },
            ],
          },
        })
      );
    },
  });

  pkg.createSchema({
    name: "Set FX State",
    type: "exec",
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

  pkg.createSchema({
    name: "Set FX Preset",
    type: "exec",
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
            Command: [mixerID(), { SetActiveEffectPreset: preset.variant }],
          },
        })
      );
    },
  });

  pkg.createSchema({
    name: "Set Route State",
    type: "exec",
    createIO: ({ io }) => {
      return {
        input: io.dataInput({
          name: "Input",
          id: "input",
          type: t.enum(Inputs),
        }),
        output: io.dataInput({
          name: "Output",
          id: "output",
          type: t.enum(Outputs),
        }),
        state: io.dataInput({
          name: "State",
          id: "state",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      getSocket().send(
        JSON.stringify({
          id: 0,
          data: {
            Command: [
              mixerID(),
              {
                SetRouter: [
                  ctx.getInput(io.input).variant,
                  ctx.getInput(io.output).variant,
                  ctx.getInput(io.state),
                ],
              },
            ],
          },
        })
      );
    },
  });
}
