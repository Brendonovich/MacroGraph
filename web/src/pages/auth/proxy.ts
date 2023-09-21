import type { APIRoute } from "astro";
import * as jose from "jose";
import { env } from "~/env/server";

import { STATE } from "~/schemas";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const { searchParams } = ctx.url;

  const { payload } = await jose.jwtVerify(
    searchParams.get("state")!,
    new TextEncoder().encode(env.AUTH_SECRET)
  );

  const state = STATE.parse(payload);

  return ctx.redirect(
    new URL(`${state.redirect_uri}?${searchParams}`).toString()
  );
};
