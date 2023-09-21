import { EventTypes } from "obs-websocket-js";
import { Package } from "@macrograph/core";

import * as events from "./events";
import * as requests from "./requests";
import { createCtx, Ctx } from "./ctx";

export function pkg(): Package<EventTypes, Ctx> {
  const ctx = createCtx();

  const pkg = new Package<EventTypes, Ctx>({
    name: "OBS Websocket",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  events.register(pkg, ctx);
  requests.register(pkg, ctx);

  return pkg;
}
