import { Package, t, WsProvider } from "@macrograph/core";
import { createEffect, createSignal } from "solid-js";

import { createCtx, Events } from "./ctx";

export function pkg<TServer>(ws: WsProvider<TServer>) {
  const [latestEvent, setLatestEvent] = createSignal<any | null>(null);

  const ctx = createCtx(ws, setLatestEvent);

  const pkg = new Package<Events>({
    name: "Stream Deck WebSocket",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  createEffect(() => {
    const event = latestEvent();

    if (!event) return;

    pkg.emitEvent(event);
  });

  pkg.createEventSchema({
    event: "keyDown",
    name: "Stream Deck Key Down",
    generateIO(io) {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        id: io.dataOutput({
          id: "id",
          name: "Key ID",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.id, data.settings.id);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    event: "keyUp",
    name: "Stream Deck Key Up",
    generateIO(io) {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        id: io.dataOutput({
          id: "id",
          name: "Key ID",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.id, data.settings.id);
      ctx.exec(io.exec);
    },
  });

  return pkg;
}
