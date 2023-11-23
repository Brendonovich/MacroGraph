import { t } from "@macrograph/core";
import { Pkg } from ".";
import { Ctx } from "./ctx";
import { createMemo } from "solid-js";

export function register(pkg: Pkg, { state }: Ctx) {
  const ws = createMemo(() => {
    const ws = state();
    if (ws.type !== "connected") throw new Error("WebSocket not connected!");
    return ws.ws;
  });

  pkg.createNonEventSchema({
    name: "SpeakerBot Speak",
    variant: "Exec",
    generateIO({ io }) {
      return {
        voice: io.dataInput({
          id: "voice",
          name: "Voice",
          type: t.string(),
        }),
        message: io.dataInput({
          id: "message",
          name: "Message",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ws().send(
        JSON.stringify({
          voice: ctx.getInput(io.voice),
          message: ctx.getInput(io.message),
          id: "Macrograph",
          request: "Speak",
        })
      );
    },
  });

  pkg.createNonEventSchema({
    name: "SpeakerBot Stop Current",
    variant: "Exec",
    generateIO({ io }) {},
    run({ ctx, io }) {
      ws().send(
        JSON.stringify({
          id: "Macrograph",
          request: "Stop",
        })
      );
    },
  });

  pkg.createNonEventSchema({
    name: "SpeakerBot Toggle TTS",
    variant: "Exec",
    generateIO({ io }) {
      return {
        state: io.dataInput({
          id: "state",
          name: "State",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      ws().send(
        JSON.stringify({
          id: "Macrograph",
          request: ctx.getInput(io.state) ? "Enable" : "Disable",
        })
      );
    },
  });

  pkg.createNonEventSchema({
    name: "SpeakerBot Events Toggle",
    variant: "Exec",
    generateIO({ io }) {
      return {
        state: io.dataInput({
          id: "state",
          name: "State",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      ws().send(
        JSON.stringify({
          id: "Macrograph",
          request: "Events",
          state: ctx.getInput(io.state) ? "on" : "off",
        })
      );
    },
  });

  pkg.createNonEventSchema({
    name: "SpeakerBot Queue Toggle",
    variant: "Exec",
    generateIO({ io }) {
      return {
        state: io.dataInput({
          id: "state",
          name: "Queue Paused",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      ws().send(
        JSON.stringify({
          id: "Macrograph",
          request: ctx.getInput(io.state) ? "Pause" : "Resume",
        })
      );
    },
  });

  pkg.createNonEventSchema({
    name: "SpeakerBot Queue Clear",
    variant: "Exec",
    generateIO({ io }) {},
    run({ ctx, io }) {
      ws().send(
        JSON.stringify({
          id: "Macrograph",
          request: "Clear",
        })
      );
    },
  });
}
