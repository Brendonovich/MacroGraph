import { Core, Package } from "@macrograph/core";
import { createEffect, createSignal } from "solid-js";

import * as helix from "./helix";
import * as eventsub from "./eventsub";
import * as chat from "./chat";
import { createCtx } from "./ctx";

export function pkg(core: Core) {
  const [latestEvent, setLatestEvent] = createSignal<any>();

  const ctx = createCtx(core, setLatestEvent);

  const pkg = new Package({
    name: "Twitch Events",
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
