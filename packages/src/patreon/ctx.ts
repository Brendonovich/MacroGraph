import { Core, None, OAuthToken, Option } from "@macrograph/core";
import { createResource, createSignal } from "solid-js";
import { z } from "zod";

import { createEndpoint } from "../httpEndpoint";

export function createCtx(core: Core) {
  const [authToken, setAuthToken] = createSignal<Option<OAuthToken>>(None);

  const client = createEndpoint({
    path: "https://www.patreon.com/api",
    fetch: async (url, opts) => {
      return await core.fetch(url, {
        ...opts,
        headers: {
          Authorization: `Bearer ${authToken().unwrap().access_token}`,
          ...opts?.headers,
        },
      });
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

  return { core, authToken, setAuthToken, user };
}

export type Ctx = ReturnType<typeof createCtx>;
