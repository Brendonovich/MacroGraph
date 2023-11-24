import type { APIRoute } from "astro";
import * as jose from "jose";

import { env } from "~/env/server";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const state = await new jose.SignJWT({
    ...(JSON.parse(
      Buffer.from(ctx.url.searchParams.get("state")!, "base64").toString()
    ) as any),
    redirect_uri: `${env.VERCEL_URL}/auth/spotify/callback`,
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(env.AUTH_SECRET));

  const params = new URLSearchParams({
    client_id: env.SPOTIFY_CLIENT_ID,
    redirect_uri: `${env.AUTH_REDIRECT_PROXY_URL}/auth/proxy`,
    response_type: "code",
    scope: "user-read-private user-read-email",
    show_dialog: "true",
    state,
  });

  return ctx.redirect(
    new URL(`https://accounts.spotify.com/authorize?${params}`).toString()
  );
};
