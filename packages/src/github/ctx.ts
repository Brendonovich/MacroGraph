import { Core, None, OAuthToken, Option } from "@macrograph/core";
import { createResource, createSignal } from "solid-js";
import { Octokit } from "octokit";

export function createCtx(core: Core) {
  const [authToken, setAuthToken] = createSignal<Option<OAuthToken>>(None);

  const [user] = createResource(
    () => authToken().toNullable(),
    async (token) => {
      const client = new Octokit({ auth: token.access_token });
      const resp = await client.request("GET /user");
      return resp.data;
    }
  );

  return { core, authToken, user, setAuthToken };
}

export type Ctx = ReturnType<typeof createCtx>;
