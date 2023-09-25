import type { APIRoute } from "astro";
import { CORS_HEADERS } from "~/auth";
import { env } from "~/env/server";

import { TOKEN } from "~/schemas/twitch";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: body.refreshToken,
    }),
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
