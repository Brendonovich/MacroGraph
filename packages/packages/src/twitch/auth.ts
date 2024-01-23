import { Core, OAuthToken } from "@macrograph/runtime";
import { Maybe, None, makePersistedOption } from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";
import { createMemo, createSignal } from "solid-js";
import { z } from "zod";

import { Helix } from "./helix";
import { PersistedStore } from "./ctx";

const USER_DATA = z.object({
  id: z.string(),
  login: z.string(),
  display_name: z.string(),
});

export interface Account {
  token: OAuthToken;
  data: z.infer<typeof USER_DATA>;
  refreshTimer: ReturnType<typeof setTimeout>;
}

export function createAuth(
  clientId: string,
  core: Core,
  helixClient: Helix,
  [, setPersisted]: PersistedStore
) {
  const accounts = new ReactiveMap<string, Account>();

  async function addToken(token: OAuthToken) {
    const { data } = await helixClient.call("GET /users", { token } as any, {});
    const userData = USER_DATA.parse(data[0]);

    accounts.set(userData.id, {
      token,
      data: userData,
      refreshTimer: setTimeout(
        () => refresh(userData.id),
        (token.issued_at + token.expires_in) * 1000 - Date.now()
      ),
    });

    setPersisted(userData.id, token);
  }

  async function refresh(id: string) {
    const account = Maybe(accounts.get(id)).unwrap();

    const token: OAuthToken = (await core.oauth.refresh(
      "twitch",
      account.token.refresh_token
    )) as any;

    await addToken(token);

    setPersisted(id, token);
  }

  return {
    accounts,
    clientId,
    addToken,
    refresh,
    logOut(id: string) {
      accounts.delete(id);

      setPersisted(id, undefined!);
    },
  };
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;

export function createUserInstance(key: string, auth: Auth) {
  const [id, setId] = makePersistedOption<string>(createSignal(None), key);

  const account = createMemo(() => id().map((id) => auth.accounts.get(id)));

  return {
    account,
    setId,
  };
}
