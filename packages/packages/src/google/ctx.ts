import { Core, OAuthToken, RefreshedOAuthToken } from "@macrograph/runtime";
import { None, Some, makePersistedOption } from "@macrograph/option";
import { createResource, createSignal } from "solid-js";
import { z } from "zod";

import { createEndpoint } from "../httpEndpoint";

export const TOKEN_LOCALSTORAGE = "googleToken";

export function createCtx(core: Core) {
  const [authToken, setAuthToken] = makePersistedOption<OAuthToken>(
    createSignal(None),
    TOKEN_LOCALSTORAGE
  );

  const client = createEndpoint({
    path: "https://www.googleapis.com",
    fetch: async (url, opts) => {
      const run = () =>
        fetch(url, {
          ...opts,
          headers: {
            Authorization: `Bearer ${authToken().unwrap().access_token}`,
            ...opts?.headers,
          },
        });

      let resp = await run();

      if (resp.status !== 200) {
        const refreshToken = authToken().unwrap().refresh_token;

        const newToken: RefreshedOAuthToken = (await core.oauth.refresh(
          "google",
          refreshToken
        )) as any;

        setAuthToken(Some({ ...newToken, refresh_token: refreshToken }));

        resp = await run();
      }

      return await resp.json();
    },
  });

  const api = {
    oauth: (() => {
      const oauth = client.extend("/oauth2/v3");

      return {
        userinfo: oauth.extend("/userinfo"),
      };
    })(),
  };

  const [user] = createResource(
    () => authToken().toNullable(),
    async () => {
      const resp = await api.oauth.userinfo.get(
        z.object({
          sub: z.string(),
          name: z.string(),
          given_name: z.string(),
          picture: z.string(),
          email: z.string(),
          email_verified: z.boolean(),
          locale: z.string(),
        })
      );

      return resp;
    }
  );

  return {
    core,
    authToken,
    setAuthToken,
    user,
  };
}

export type Ctx = ReturnType<typeof createCtx>;
