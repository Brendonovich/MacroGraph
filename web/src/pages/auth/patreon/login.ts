import type { APIRoute } from "astro";
import * as jose from "jose";

import { env } from "~/env/server";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const state = await new jose.SignJWT({
    ...(JSON.parse(
      Buffer.from(ctx.url.searchParams.get("state")!, "base64").toString()
    ) as any),
    redirect_uri: `${env.VERCEL_URL}/auth/patreon/callback`,
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(env.AUTH_SECRET));

  const params = new URLSearchParams({
    client_id: env.PATREON_CLIENT_ID,
    redirect_uri: `${env.AUTH_REDIRECT_PROXY_URL}/auth/proxy`,
    response_type: "code",
    state,
  });

  return ctx.redirect(
    new URL(`https://www.patreon.com/oauth2/authorize?${params}`).toString()
  );
};
