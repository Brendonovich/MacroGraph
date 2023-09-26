import {
  Core,
  Maybe,
  OAuthToken,
  Option,
  RefreshedOAuthToken,
  Some,
} from "@macrograph/core";
import { createEffect, createResource, createSignal } from "solid-js";
import { z } from "zod";

import { createEndpoint } from "../httpEndpoint";

export const TOKEN_LOCALSTORAGE = "spotifyToken";

export function createCtx(core: Core) {
  const [authToken, setAuthToken] = createSignal<Option<OAuthToken>>(
    Maybe(localStorage.getItem(TOKEN_LOCALSTORAGE)).map(JSON.parse)
  );

  const client = createEndpoint({
    path: "https://api.spotify.com/v1",
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
        const prevToken = authToken().unwrap();
        const token: RefreshedOAuthToken = (await core.oauth.refresh(
          "spotify",
          prevToken.refresh_token
        )) as any;

        setAuthToken(Some({ ...prevToken, ...token }));

        resp = await run();
      }

      return await resp.json();
    },
  });

  createEffect(() => {
    const token = authToken();
    if (token.isNone()) localStorage.removeItem(TOKEN_LOCALSTORAGE);
    else
      token.peek((token) =>
        localStorage.setItem(TOKEN_LOCALSTORAGE, JSON.stringify(token))
      );
  });

  const api = {
    me: client.extend("/me"),
  };

  const USER = z.object({
    display_name: z.string().nullable(),
    external_urls: z.object({ spotify: z.string() }),
    followers: z.object({ href: z.string().nullable(), total: z.number() }),
    href: z.string(),
    id: z.string(),
    images: z.array(
      z.object({
        url: z.string(),
        height: z.number().nullable(),
        width: z.number().nullable(),
      })
    ),
    type: z.string(),
    uri: z.string(),
  });

  const USER_PRIVATE = USER.and(
    z.object({
      product: z.string(),
      explicit_content: z.object({
        filter_enabled: z.boolean(),
        filter_locked: z.boolean(),
      }),
      email: z.string(),
      country: z.string(),
    })
  );

  const [user] = createResource(
    () => authToken().toNullable(),
    async () => {
      const resp = await api.me.get(USER_PRIVATE);

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
