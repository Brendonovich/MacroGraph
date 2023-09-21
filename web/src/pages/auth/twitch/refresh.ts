import type { APIRoute } from "astro";
import { env } from "~/env/server";

import { TOKEN } from "~/schemas/twitch";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: body.refreshToken,
    }),
  });

  const json = await res.json();

  const token = TOKEN.parse(json);

  return new Response(JSON.stringify(token), {
    headers: { "Content-Type": "application/json" },
  });
};
