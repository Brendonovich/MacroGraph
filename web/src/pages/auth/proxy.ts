import type { APIRoute } from "astro";
import { STATE } from "~/schemas";

export const prerender = false;

export const GET: APIRoute = (ctx) => {
  const { searchParams } = ctx.url;

  const state = STATE.parse(
    JSON.parse(Buffer.from(searchParams.get("state")!, "base64").toString())
  );

  return ctx.redirect(
    new URL(`${state.redirect_uri}?${searchParams}`).toString()
  );
};
