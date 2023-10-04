import { Core } from "@macrograph/core";

import { createAuth } from "./auth";
import { createChat } from "./chat";
import { createEventSub } from "./eventsub";
import { createHelix } from "./helix";

const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export function createCtx(core: Core, onEvent: any) {
  const auth = createAuth(CLIENT_ID, core);
  const helix = createHelix(core, auth);

  return {
    core,
    auth,
    helix,
    chat: createChat(auth, onEvent),
    eventSub: createEventSub(auth, helix, onEvent),
  };
}

export type Ctx = ReturnType<typeof createCtx>;
