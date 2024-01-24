import { Core, OAuthToken } from "@macrograph/runtime";
import { None, Some, makePersistedOption } from "@macrograph/option";
import { createResource, createSignal } from "solid-js";
import { Octokit } from "octokit";

import { createCallbackAuth } from "./auth";

export const TOKEN_LOCALSTORAGE = "githubToken";

export function createCtx(core: Core) {
  const [authToken, setAuthToken] = makePersistedOption<OAuthToken>(
    createSignal(None),
    TOKEN_LOCALSTORAGE
  );

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
