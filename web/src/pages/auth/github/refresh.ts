import type { APIRoute } from "astro";
import { CORS_HEADERS } from "~/auth";
import { env } from "~/env/server";

import { TOKEN } from "~/schemas/twitch";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: body.refreshToken,
    }),
    headers: {
      Accept: "application/json",
    },
  });

  const json = await res.json();

  const token = TOKEN.parse(json);

  return new Response(JSON.stringify(token), {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
};

export const OPTIONS: APIRoute = () =>
  new Response(undefined, {
    headers: CORS_HEADERS,
  });
