import {
  Core,
  OAUTH_TOKEN,
  OAuthToken,
  makePersisted,
} from "@macrograph/runtime";
import { Maybe, None } from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";
import { createMemo, createSignal } from "solid-js";
import { z } from "zod";

import { Helix } from "./helix";

const USER_DATA = z.object({
  id: z.string(),
  login: z.string(),
  display_name: z.string(),
});

const LOCALSTORAGE = z.record(
  z.string(),
  OAUTH_TOKEN.and(
    z.object({
      // eventsub: z.boolean().default(false),
    })
  )
);

const TOKENS_LOCALSTORAGE = "twitchTokens";

export interface Account {
  token: OAuthToken;
  data: z.infer<typeof USER_DATA>;
  refreshTimer: ReturnType<typeof setTimeout>;
}

export function createAuth(clientId: string, core: Core, helixClient: Helix) {
  const accounts = new ReactiveMap<string, Account>();

  Maybe(localStorage.getItem(TOKENS_LOCALSTORAGE))
    .map((s) => LOCALSTORAGE.parse(JSON.parse(s)))
    .map((tokens) => {
      Object.values(tokens).forEach((token: any) => addToken(token));
    });

  function persistTokens() {
    const tokens = [...accounts.values()].reduce(
      (acc, account) => ({
        [account.data.id]: {
          ...account.token,
          // eventsub: account.eventsub,
        },
        ...acc,
      }),
      {} as z.infer<typeof LOCALSTORAGE>
    );

    localStorage.setItem(TOKENS_LOCALSTORAGE, JSON.stringify(tokens));
  }

  async function addToken(token: OAuthToken) {
    const data = await helixClient.call("GET /users", { token } as any, {});

    accounts.set(data.id, {
      token,
      data,
      // eventsub: false,
      // chat: false,
      refreshTimer: setTimeout(
        () => refresh(data.id),
        (token.issued_at + token.expires_in) * 1000 - Date.now()
      ),
    });

    persistTokens();
  }

  async function refresh(id: string) {
    const account = Maybe(accounts.get(id)).unwrap();

    const token: OAuthToken = (await core.oauth.refresh(
      "twitch",
      account.token.refresh_token
    )) as any;

    await addToken(token);
  }

  return {
    accounts,
    clientId,
    addToken,
    refresh,
    logOut(id: string) {
      accounts.delete(id);

      persistTokens();
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;

export function createUserInstance(key: string, auth: Auth) {
  const [id, setId] = makePersisted<string>(createSignal(None), key);

  const account = createMemo(() => id().map((id) => auth.accounts.get(id)));

  return {
    account,
    setId,
  };
}
