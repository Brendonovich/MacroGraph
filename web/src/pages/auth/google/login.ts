import type { APIRoute } from "astro";
import * as jose from "jose";

import { env } from "~/env/server";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const state = await new jose.SignJWT({
    ...JSON.parse(
      Buffer.from(ctx.url.searchParams.get("state")!, "base64").toString()
    ),
    redirect_uri: `${env.VERCEL_URL}/auth/google/callback`,
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(env.AUTH_SECRET));

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.AUTH_REDIRECT_PROXY_URL}/auth/proxy`,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return ctx.redirect(
    new URL(`https://accounts.google.com/o/oauth2/v2/auth?${params}`).toString()
  );
};

const SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "email",
  "profile",
  "openid",
];
