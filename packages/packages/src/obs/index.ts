import { EventTypes } from "obs-websocket-js";
import { Package, ResourceType as ResourceType } from "@macrograph/runtime";

import * as events from "./events";
import * as requests from "./requests";

import { createCtx, Ctx } from "./ctx";

type Pkg = Package<EventTypes, Ctx>;

export const OBSInstance = new ResourceType({
  name: "OBS Instance",
  sources: (pkg: Pkg) =>
    [...pkg.ctx!.instances].map(([ip, instance]) => ({
      id: ip,
      display: ip,
      value: instance,
    })),
});

export function pkg(): Pkg {
  const ctx = createCtx((data) => pkg.emitEvent(data));

  const pkg = new Package<EventTypes, Ctx>({
    name: "OBS Websocket",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  events.register(pkg);
  requests.register(pkg, ctx);

  pkg.registerResourceType(OBSInstance);

  return pkg;
}
