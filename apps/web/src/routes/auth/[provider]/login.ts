import { APIEvent } from "@solidjs/start/server";
import * as jose from "jose";

import { env } from "~/env/server";
import { AuthProviders } from "../providers";

export const GET = async (event: APIEvent) => {
  const { provider } = event.params as { provider: string };

  const providerConfig = AuthProviders[provider];
  if (!providerConfig) throw new Error(`Unknown provider ${provider}`);

  const url = new URL(event.request.url);

  const state = await new jose.SignJWT({
    ...(JSON.parse(
      Buffer.from(url.searchParams.get("state")!, "base64").toString()
    ) as any),
    redirect_uri: `${env.VERCEL_URL}/auth/${provider}/callback`,
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(env.AUTH_SECRET));

  const params = new URLSearchParams({
    ...providerConfig.authorize?.searchParams,
    client_id: providerConfig.clientId,
    redirect_uri: `${env.AUTH_REDIRECT_PROXY_URL}/auth/proxy`,
    response_type: "code",
    scope: (providerConfig.scopes || []).join(" "),
    state,
  });

  return Response.redirect(`${providerConfig.authorize.url}?${params}`);
};
