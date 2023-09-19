import { type APIRoute } from "astro";
import { TOKEN } from "./schemas";

export const prerender = false;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// export const GET: APIRoute = async ({ request, redirect }) => {
//   const { searchParams } = new URL(request.url);
//   const params = PARAMS.parse({
//     code: searchParams.get("code"),
//     state: searchParams.get("state"),
//   });

//   const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
//     method: "POST",
//     body: new URLSearchParams({
//       client_id: import.meta.env.TWITCH_CLIENT_ID,
//       client_secret: import.meta.env.TWITCH_CLIENT_SECRET,
//       code: params.code,
//       grant_type: "authorization_code",
//       redirect_uri: params.state.redirect_uri,
//     }),
//   });

//   const json = await res.json();

//   const token = TOKEN.parse(json);

//   return redirect(
//     `http://localhost:${params.state.port}?token=${encodeURIComponent(
//       JSON.stringify(token)
//     )}`
//   );
// };

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: import.meta.env.TWITCH_CLIENT_ID,
      client_secret: import.meta.env.TWITCH_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: body.refreshToken,
    }),
  });

  const json = await res.json();

  const token = TOKEN.parse(json);

  return new Response(JSON.stringify(token), {
    headers: {
      "Content-Type": "application/json",
      ...CORS,
    },
  });
};

export const OPTIONS: APIRoute = () =>
  new Response(undefined, {
    headers: CORS,
  });