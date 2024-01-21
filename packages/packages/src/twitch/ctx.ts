import { Core, OnEvent } from "@macrograph/runtime";

import { createAuth } from "./auth";
import { createChat } from "./chat";
import { createHelix } from "./helix";
import { createEventSub } from "./eventsub";

export const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export function createCtx(core: Core, onEvent: OnEvent) {
  const helixClient = createHelix(core);
  const auth = createAuth(CLIENT_ID, core, helixClient);

  return {
    core,
    auth,
    helixClient,
    chat: createChat(auth, onEvent),
    eventSub: createEventSub(onEvent, helixClient, auth),
  };
}

export type Ctx = ReturnType<typeof createCtx>;
