import { Core } from "@macrograph/core";

import { Auth } from "./auth";
import { createChat } from "./chat";
import { createEventSub } from "./eventsub";
import { createHelix } from "./helix";

const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export function createCtx(core: Core, onEvent: any) {
  const auth = new Auth(CLIENT_ID, core);
  const helix = createHelix(auth, core);

  return {
    core,
    auth,
    helix,
    chat: createChat(auth, onEvent),
    eventSub: createEventSub(auth, helix, onEvent),
  };
}

export type Ctx = ReturnType<typeof createCtx>;
