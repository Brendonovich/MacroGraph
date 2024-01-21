import { Core, Package } from "@macrograph/runtime";

import * as helix from "./helix";
import * as eventsub from "./eventsub";
import * as chat from "./chat";

import { Ctx, createCtx } from "./ctx";
import { TwitchAccount, TwitchChat } from "./resource";

export type Pkg = Package<any, Ctx>;

export function pkg(core: Core) {
  const ctx = createCtx(core, (e) => pkg.emitEvent(e));

  const pkg = new Package({
    name: "Twitch Events",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  helix.register(pkg, ctx.helixClient);
  eventsub.register(pkg);
  chat.register(pkg, ctx);

  pkg.registerResourceType(TwitchAccount);
  pkg.registerResourceType(TwitchChat);

  return pkg;
}
