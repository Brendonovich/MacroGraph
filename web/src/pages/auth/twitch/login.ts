import type { APIRoute } from "astro";
import * as jose from "jose";

import { env } from "~/env/server";
import { SCOPES } from "~/schemas";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const state = await new jose.SignJWT({
    ...JSON.parse(
      Buffer.from(ctx.url.searchParams.get("state")!, "base64").toString()
    ),
    redirect_uri: `${env.VERCEL_URL}/auth/twitch/callback`,
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(env.AUTH_SECRET));

  const params = new URLSearchParams({
    client_id: env.TWITCH_CLIENT_ID,
    redirect_uri: `${env.AUTH_REDIRECT_PROXY_URL}/auth/proxy`,
    response_type: "code",
    force_verify: "true",
    scope: SCOPES.join(" "),
    state,
  });

  return ctx.redirect(
    new URL(`https://id.twitch.tv/oauth2/authorize?${params}`).toString()
  );
};
