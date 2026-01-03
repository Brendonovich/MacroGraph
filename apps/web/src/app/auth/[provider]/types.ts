import { z } from "zod";

export const OAUTH_STATE = z
	.union([
		z.object({ env: z.literal("desktop"), port: z.number() }),
		z.object({ env: z.literal("web"), targetOrigin: z.string() }),
		z.object({ env: z.literal("credentials"), targetOrigin: z.string() }),
	])
	.and(z.object({ redirect_uri: z.string() }));

export const CALLBACK_SEARCH_PARAMS = z.object({
	code: z.string(),
	state: OAUTH_STATE,
});

export const REFRESHED_TOKEN = z.object({
	access_token: z.string(),
	expires_in: z.number(),
});
