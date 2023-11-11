import { Core, Package } from "@macrograph/core";

import * as helix from "./helix";
import * as eventsub from "./eventsub";
import * as chat from "./chat";
import { createCtx } from "./ctx";

export function pkg(core: Core) {
  const ctx = createCtx(core, (e) => pkg.emitEvent(e));

  const pkg = new Package({
    name: "Twitch Events",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  helix.register(pkg, ctx.helix);
  eventsub.register(pkg);
  chat.register(pkg, ctx);

  return pkg;
}
