import { EventTypes } from "obs-websocket-js";
import { Package } from "@macrograph/runtime";

import * as events from "./events";
import * as requests from "./requests";
import { createCtx, Ctx } from "./ctx";

export function pkg(): Package<EventTypes, Ctx> {
  const ctx = createCtx((data) => pkg.emitEvent(data));

  const pkg = new Package<EventTypes, Ctx>({
    name: "OBS Websocket",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  events.register(pkg);
  requests.register(pkg, ctx);

  return pkg;
}
