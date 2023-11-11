import { Core, OnEvent, Package } from "@macrograph/core";

import { createAuth } from "./auth";
import * as gateway from "./gateway";
import * as api from "./api";

function createCtx(core: Core, onEvent: OnEvent) {
  const auth = createAuth();

  return {
    auth,
    core,
    gateway: gateway.create(auth, onEvent),
    ...api.create(auth, core),
  };
}

export type Ctx = ReturnType<typeof createCtx>;

export function pkg(core: Core) {
  const ctx = createCtx(core, (e) => pkg.emitEvent(e));

  const pkg = new Package<any>({
    name: "Discord",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  gateway.register(pkg);
  api.register(pkg, ctx, core);

  return pkg;
}
