import { APIHandler } from "@solidjs/start/server";
import { z } from "zod";

import { CORS_HEADERS } from "~/auth";
import { AuthProviders } from "../providers";
import { TOKEN } from "./types";
import { json } from "@solidjs/router";

export const prerender = false;

const BODY = z.object({ refreshToken: z.string() });

export const POST: APIHandler = async ({ request, params }) => {
  const { provider } = params as { provider: string };

  const providerConfig = AuthProviders[provider];
  if (!providerConfig) throw new Error(`Unknown provider ${provider}`);

  if (providerConfig.refresh === false)
    throw new Error(`Provider ${provider} does not support token refreshing`);

  const body = BODY.parse(await request.json());

  const res = await fetch(providerConfig.token.url, {
    method: "POST",
    body: new URLSearchParams({
      ...providerConfig.token?.searchParams,
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      grant_type: "refresh_token",
      refresh_token: body.refreshToken,
    }),
    headers: providerConfig.token?.headers,
  });

  const token = TOKEN.parse(await res.json());

  return json(token, {
    headers: CORS_HEADERS,
  });
};

export const OPTIONS: APIHandler = async () =>
  new Response(undefined, {
    headers: CORS_HEADERS,
  });
