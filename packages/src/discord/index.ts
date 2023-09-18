import { createPackage } from "@macrograph/core";

import { createAuth } from "./auth";
import * as gateway from "./gateway";
import * as api from "./api";

function createCtx() {
  const auth = createAuth();

  return {
    auth,
    gateway: gateway.create(auth),
    api: api.create(auth),
  };
}

export type Ctx = ReturnType<typeof createCtx>;

export default function () {
  const pkg = createPackage<any>({ name: "Discord" });

  const ctx = createCtx();

  return { pkg, ctx };
}
