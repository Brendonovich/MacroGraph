import { Core, Maybe, OAuthToken, Option, Some } from "@macrograph/core";
import { createEffect, createResource, createSignal } from "solid-js";
import { Octokit } from "octokit";

import { createCallbackAuth } from "./auth";

export const TOKEN_LOCALSTORAGE = "githubToken";

export function createCtx(core: Core) {
  const [authToken, setAuthToken] = createSignal<Option<OAuthToken>>(
    Maybe(localStorage.getItem(TOKEN_LOCALSTORAGE)).map(JSON.parse)
  );

  createEffect(() => {
    const token = authToken();
    if (token.isNone()) localStorage.removeItem(TOKEN_LOCALSTORAGE);
    else
      token.peek((token) =>
        localStorage.setItem(TOKEN_LOCALSTORAGE, JSON.stringify(token))
      );
  });

  let refreshPromise: Promise<any> | null = null;

  const client = new Octokit({
    authStrategy: createCallbackAuth,
    auth: {
      refresh: async () => {
        if (!refreshPromise)
          refreshPromise = (async () => {
            const newToken = await core.oauth.refresh(
              "github",
              authToken().unwrap().refresh_token
            );
            setAuthToken(Some(newToken as OAuthToken));
          })();

        await refreshPromise;
      },
      callback: () => {
        return authToken().unwrap().access_token;
      },
    },
  });

  const [user] = createResource(
    () => authToken().toNullable(),
    async () => {
      const resp = await client.rest.users.getAuthenticated();

      return resp.data;
    }
  );

  return {
    core,
    authToken,
    user,
    setAuthToken,
  };
}

export type Ctx = ReturnType<typeof createCtx>;
