import { APIHandler } from "@solidjs/start/server";
import * as jose from "jose";
import { renderToString } from "solid-js/web";
import { z } from "zod";

import { env } from "~/env/server";
import { PARAMS as SEARCH_PARAMS, TOKEN } from "~/schemas/twitch";
import { AuthProviders } from "../providers";
import responderScript from "../responderScript.js?raw";

export const GET: APIHandler = async ({ params, request }) => {
  const { provider } = params as { provider: string };

  const providerConfig = AuthProviders[provider];
  if (!providerConfig) throw new Error(`Unknown provider ${provider}`);

  const { searchParams } = new URL(request.url);

  const { state, code } = SEARCH_PARAMS.parse({
    code: searchParams.get("code"),
    state: (
      await jose.jwtVerify(
        searchParams.get("state")!,
        new TextEncoder().encode(env.AUTH_SECRET)
      )
    ).payload,
  });

  const res = await fetch(`${providerConfig.token.url}`, {
    method: "POST",
    body: new URLSearchParams({
      ...providerConfig.token?.searchParams,
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${env.AUTH_REDIRECT_PROXY_URL}/auth/proxy`,
    }),
    headers: providerConfig.token?.headers,
  });

  const token = TOKEN.parse(await res.json());

  if (state.env === "desktop") {
    return Response.redirect(
      `http://localhost:${state.port}?token=${Buffer.from(
        JSON.stringify(token)
      ).toString("base64")}`
    );
  }

  const { targetOrigin } = state;

  return new Response(
    renderToString(() => <ResponderScript {...{ token, targetOrigin }} />),
    { headers: { "Content-Type": "text/html" } }
  );
};

function ResponderScript(props: {
  token: z.infer<typeof TOKEN>;
  targetOrigin: string;
}) {
  return (
    <script
      data-token={JSON.stringify(props.token)}
      data-target-origin={props.targetOrigin}
    >
      {responderScript}
    </script>
  );
}
