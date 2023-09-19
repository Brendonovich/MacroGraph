import { Core, Package } from "@macrograph/core";

import { createAuth } from "./auth";
import * as gateway from "./gateway";
import * as api from "./api";

function createCtx(core: Core) {
  const auth = createAuth();

  return {
    auth,
    gateway: gateway.create(auth),
    api: api.create(auth, core),
  };
}

export type Ctx = ReturnType<typeof createCtx>;

export default function (core: Core) {
  const ctx = createCtx(core);

  const pkg = new Package<any>({ name: "Discord", ctx });

  return pkg;
}
