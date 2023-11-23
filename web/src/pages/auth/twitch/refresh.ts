import type { APIRoute } from "astro";
import { z } from "zod";

import { CORS_HEADERS } from "~/auth";
import { env } from "~/env/server";
import { TOKEN } from "~/schemas/twitch";

export const prerender = false;

const BODY = z.object({ refreshToken: z.string() });

export const POST: APIRoute = async ({ request }) => {
  const body = BODY.parse(await request.json());

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: body.refreshToken,
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
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
