import { Core, None, OAuthToken, Option } from "@macrograph/core";
import { createResource, createSignal } from "solid-js";
import { z } from "zod";

import { createEndpoint } from "../httpEndpoint";

export function createCtx(core: Core) {
  const [authToken, setAuthToken] = createSignal<Option<OAuthToken>>(None);

  const client = createEndpoint({
    path: "https://api.spotify.com/v1",
    fetch: async (url, opts) => {
      return await fetch(url, {
        ...opts,
        headers: {
          Authorization: `Bearer ${authToken().unwrap().access_token}`,
          ...opts?.headers,
        },
      });
    },
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

  return { core, authToken, setAuthToken, user };
}

export type Ctx = ReturnType<typeof createCtx>;
