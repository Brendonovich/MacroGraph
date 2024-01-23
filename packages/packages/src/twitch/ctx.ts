import { Core, OAUTH_TOKEN, OnEvent } from "@macrograph/runtime";
import { makePersisted } from "@solid-primitives/storage";
import { createStore } from "solid-js/store";
import { z } from "zod";
import { createResource } from "solid-js";

import { createAuth } from "./auth";
import { createChat } from "./chat";
import { createHelix } from "./helix";
import { createEventSub } from "./eventSub";

export const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

const PERSISTED_SCHEMA = z.record(
  z.string(),
  OAUTH_TOKEN.and(
    // auto connect on setup
    z.object({
      eventsub: z.boolean().optional(),
      chat: z.boolean().optional(),
    })
  )
);

export type Persisted = z.infer<typeof PERSISTED_SCHEMA>;
export type PersistedStore = ReturnType<typeof createStore<Persisted>>;

export function createCtx(core: Core, onEvent: OnEvent) {
  const persisted = makePersisted(
    createStore<z.infer<typeof PERSISTED_SCHEMA>>({}),
    { name: "twitchTokens" }
  );

  const helixClient = createHelix(core);
  const auth = createAuth(CLIENT_ID, core, helixClient, persisted);
  const eventSub = createEventSub(onEvent, helixClient);
  const chat = createChat();

  const setup = createResource(async () => {
    await Promise.allSettled(Object.values(persisted[0]).map(auth.addToken));

    Object.entries(persisted[0]).forEach(([id, data]) => {
      const account = auth.accounts.get(id);
      if (!account) return;

      if (data.chat) chat.connectClient(account);
      if (data.eventsub) eventSub.connectSocket(account);
    });
  });

  return {
    core,
    auth,
    helixClient,
    chat,
    eventSub,
    persisted,
    setup,
  };
}

export type Ctx = Awaited<ReturnType<typeof createCtx>>;
