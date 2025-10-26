import type { APIHandler } from "@solidjs/start/server";
import * as Jose from "jose";
import { serverEnv } from "~/env/server";

import { OAUTH_STATE } from "./[provider]/types";

export const GET: APIHandler = async (event) => {
	const { searchParams } = new URL(event.request.url);

	const { payload } = await Jose.jwtVerify(
		searchParams.get("state")!,
		new TextEncoder().encode(serverEnv().AUTH_SECRET),
	);

	const state = OAUTH_STATE.parse(payload);

	return Response.redirect(new URL(`${state.redirect_uri}?${searchParams}`));
};
