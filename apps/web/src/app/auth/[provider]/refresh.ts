import { json } from "@solidjs/router";
import type { APIHandler } from "@solidjs/start/server";
import { z } from "zod";

import { CORS_HEADERS } from "~/auth";
import { refreshToken } from "../actions";
import { AuthProviders } from "../providers";

export const prerender = false;

const BODY = z.object({ refreshToken: z.string() });

export const POST: APIHandler = async ({ request, params }) => {
	const { provider } = params as { provider: string };

	const providerConfig = AuthProviders[provider];
	if (!providerConfig) throw new Error(`Unknown provider ${provider}`);

	const body = BODY.parse(await request.json());

	return json(await refreshToken(providerConfig, body.refreshToken), {
		headers: CORS_HEADERS,
	});
};

export const OPTIONS: APIHandler = async () =>
	new Response(undefined, {
		headers: CORS_HEADERS,
	});
