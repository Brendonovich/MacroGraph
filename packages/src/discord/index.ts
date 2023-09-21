import { Core, OnEvent, Package } from "@macrograph/core";
import { createEffect, createSignal } from "solid-js";

import { createAuth } from "./auth";
import * as gateway from "./gateway";
import * as api from "./api";

function createCtx(core: Core, onEvent: OnEvent) {
  const auth = createAuth();

  return {
    auth,
    gateway: gateway.create(auth, onEvent),
    ...api.create(auth, core),
  };
}

export type Ctx = ReturnType<typeof createCtx>;

export function pkg(core: Core) {
  const [latestEvent, setLatestEvent] = createSignal<any>();

  const ctx = createCtx(core, setLatestEvent);

  const pkg = new Package<any>({
    name: "Discord",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  createEffect(() => {
    const event = latestEvent();
    if (!event) return;

    pkg.emitEvent(event);
  });

  gateway.register(pkg);
  api.register(pkg, ctx, core);

  return pkg;
}
