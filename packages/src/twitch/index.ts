import { Package } from "@macrograph/core";

import { createCtx } from "./ctx";
import * as helix from "./helix";
import * as eventsub from "./eventsub";
import * as chat from "./chat";
import { createEffect, createSignal } from "solid-js";

export function pkg() {
  const [latestEvent, setLatestEvent] = createSignal<any>();

  const ctx = createCtx(setLatestEvent);

  const pkg = new Package({
    name: "Twitch",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  createEffect(() => {
    const event = latestEvent();
    if (!event) return;

    pkg.emitEvent(event);
  });

  helix.register(pkg, ctx.helix);
  eventsub.register(pkg);
  chat.register(pkg, ctx);

  return pkg;
}
