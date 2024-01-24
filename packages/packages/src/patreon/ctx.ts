import { Core, OAuthToken } from "@macrograph/runtime";
import { None, Option, Some, makePersistedOption } from "@macrograph/option";
import { createResource, createSignal } from "solid-js";
import { z } from "zod";

import { createEndpoint } from "../httpEndpoint";

export const TOKEN_LOCALSTORAGE = "patreonToken";

export function createCtx(core: Core) {
  const [authToken, setAuthToken] = makePersistedOption<OAuthToken>(
    createSignal(None),
    TOKEN_LOCALSTORAGE
  );

  let refreshPromise: null | Promise<void> = null;
  const client = createEndpoint({
    path: "https://www.patreon.com/api",
    fetch: async (url, opts) => {
      const run = () =>
        core.fetch(url, {
          ...opts,
          headers: {
            Authorization: `Bearer ${authToken().unwrap().access_token}`,
            ...opts?.headers,
          },
        });

      let resp = await run();

      if (resp.status !== 200) {
        if (!refreshPromise)
          refreshPromise = (async () => {
            const token: OAuthToken = (await core.oauth.refresh(
              "patreon",
              authToken().unwrap().refresh_token
            )) as any;
            setAuthToken(Some(token));
          })();
        await refreshPromise;

        resp = await run();
      }

      return await resp.json();
    },
  });

  const api = {
    oauth: (() => {
      const oauth = client.extend("/oauth2/api");

      return {
        currentUser: oauth.extend("/current_user"),
      };
    })(),
  };

  const [user] = createResource(
    () => authToken().toNullable(),
    async () => {
      const resp = await api.oauth.currentUser.get(
        z.object({
          data: z.object({
            attributes: z.object({
              email: z.string(),
              full_name: z.string(),
              thumb_url: z.string(),
            }),
          }),
        })
      );

      return resp;
    }
  );

  return {
    core,
    authToken,
    setAuthToken: (token: Option<OAuthToken>) => {
      setAuthToken(token);
      if (token.isNone()) localStorage.removeItem(TOKEN_LOCALSTORAGE);
      else
        token.peek((token) =>
          localStorage.setItem(TOKEN_LOCALSTORAGE, JSON.stringify(token))
        );
    },
    user,
  };
}

export type Ctx = ReturnType<typeof createCtx>;
