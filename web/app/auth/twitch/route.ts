import { NextRequest, NextResponse } from "next/server";
import { env } from "~/env.mjs";
import { PARAMS, TOKEN } from "./types";

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const params = PARAMS.parse({
    code: searchParams.get("code"),
    state: searchParams.get("state"),
  });

  const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      code: params.code,
      grant_type: "authorization_code",
      redirect_uri: params.state.redirect_uri,
    }),
    cache: "no-store",
  });

  const json = await res.json();

  const token = TOKEN.parse(json);

  return NextResponse.redirect(
    `http://localhost:${params.state.port}?token=${encodeURIComponent(
      JSON.stringify(token)
    )}`,
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
};

export const POST = async (req: NextRequest) => {
  const body = await req.json();

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

  return NextResponse.json(token, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
};

export const OPTIONS = () =>
  NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
