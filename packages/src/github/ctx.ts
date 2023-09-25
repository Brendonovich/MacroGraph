import { Core, Maybe, OAuthToken, Option } from "@macrograph/core";
import { createResource, createSignal } from "solid-js";
import { Octokit } from "octokit";

export const TOKEN_LOCALSTORAGE = "githubToken";

export function createCtx(core: Core) {
  const [authToken, setAuthToken] = createSignal<Option<OAuthToken>>(
    Maybe(localStorage.getItem(TOKEN_LOCALSTORAGE)).map(JSON.parse)
  );

  const [user] = createResource(
    () => authToken().toNullable(),
    async (token) => {
      const client = new Octokit({ auth: token.access_token });
      const resp = await client.request("GET /user");
      return resp.data;
    }
  );

  return {
    core,
    authToken,
    user,
    setAuthToken: (token: Option<OAuthToken>) => {
      setAuthToken(token);
      if (token.isNone()) localStorage.removeItem(TOKEN_LOCALSTORAGE);
      else
        token.peek((token) =>
          localStorage.setItem(TOKEN_LOCALSTORAGE, JSON.stringify(token))
        );
    },
  };
}

export type Ctx = ReturnType<typeof createCtx>;
