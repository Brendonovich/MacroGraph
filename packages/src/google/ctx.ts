import { Core, None, OAuthToken, Option } from "@macrograph/core";
import { createResource, createSignal } from "solid-js";
import { z } from "zod";
import { createEndpoint } from "../httpEndpoint";

export function createCtx(core: Core) {
  const [authToken, setAuthToken] = createSignal<Option<OAuthToken>>(None);

  const client = createEndpoint({
    path: "https://www.googleapis.com",
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

  return { core, authToken, setAuthToken, user };
}

export type Ctx = ReturnType<typeof createCtx>;
