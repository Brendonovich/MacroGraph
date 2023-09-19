import { Auth } from "./auth";
import { createChat } from "./chat";
import { createEventSub } from "./eventsub";
import { createHelix } from "./helix";

const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export function createCtx(onEvent: any) {
  const auth = new Auth(CLIENT_ID);
  const helix = createHelix(auth);

  return {
    auth,
    helix,
    chat: createChat(auth, onEvent),
    eventSub: createEventSub(auth, helix, onEvent),
  };
}

export type Ctx = ReturnType<typeof createCtx>;
