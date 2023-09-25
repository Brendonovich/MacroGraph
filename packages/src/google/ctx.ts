import { Core } from "@macrograph/core";

export function createCtx(core: Core) {
  return { core };
}

export type Ctx = ReturnType<typeof createCtx>;
