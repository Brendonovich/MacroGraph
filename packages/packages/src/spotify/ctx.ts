import {
  Core,
  OAuthToken,
  RefreshedOAuthToken,
  makePersistedOption,
} from "@macrograph/runtime";
import { None, Some } from "@macrograph/typesystem";
import { createResource, createSignal } from "solid-js";
import { z } from "zod";

import { createEndpoint } from "../httpEndpoint";

export const TOKEN_LOCALSTORAGE = "spotifyToken";

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

export function createCtx(core: Core) {
  const [authToken, setAuthToken] = makePersistedOption<OAuthToken>(
    createSignal(None),
    TOKEN_LOCALSTORAGE
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

  const api = {
    me: client.extend("/me"),
  };

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
