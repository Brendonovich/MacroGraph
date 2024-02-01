import type { APIHandler } from "@solidjs/start/server";
import * as jose from "jose";
import { renderToString } from "solid-js/web";
import { env } from "~/env/server";

import responderScript from "./responderScript.js?raw";
import { PARAMS } from "~/schemas/twitch";

export const GET: APIHandler = async (event) => {
  const { searchParams } = new URL(event.request.url);

  const {
    state: { targetOrigin },
  } = PARAMS.parse({
    code: searchParams.get("code"),
    state: (
      await jose.jwtVerify(
        searchParams.get("state")!,
        new TextEncoder().encode(env.AUTH_SECRET)
      )
    ).payload,
  });

  return new Response(
    renderToString(() => (
      <script data-target-origin={targetOrigin}>{responderScript}</script>
    )),
    { headers: { "Content-Type": "text/html" } }
  );
};
