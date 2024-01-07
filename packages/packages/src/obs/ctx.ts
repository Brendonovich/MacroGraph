import { createWs } from "./ws";

export function createCtx() {
  const ws = createWs();

  return ws;
}

export type Ctx = ReturnType<typeof createCtx>;
