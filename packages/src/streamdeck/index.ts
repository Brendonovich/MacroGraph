import { Package } from "@macrograph/core";
import { createEffect, createSignal } from "solid-js";

import { createCtx, WsProvider } from "./ctx";

export function pkg(ws: WsProvider) {
  const [latestEvent, setLatestEvent] = createSignal<any | null>(null);

  const ctx = createCtx(ws, setLatestEvent);

  const pkg = new Package({
    name: "Stream Deck WebSocket",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  createEffect(() => {
    const event = latestEvent();

    if (!event) return;

    pkg.emitEvent(event);
  });

  return pkg;
}
