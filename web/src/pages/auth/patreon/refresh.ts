import type { APIRoute } from "astro";

import { CORS_HEADERS } from "~/auth";
import { env } from "~/env/server";
import { TOKEN } from "~/schemas/twitch";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const res = await fetch("https://www.patreon.com/api/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.PATREON_CLIENT_ID,
      client_secret: env.PATREON_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: body.refreshToken,
    }),
  });

  if (res.status !== 200) throw new Error(await res.text());

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
