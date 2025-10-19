import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

function createServerEnv() {
	return createEnv({
		server: {
			VERCEL_URL: z
				.string()
				.transform((d) => (d ? `https://${d}` : "http://localhost:4321")),
			VERCEL_BRANCH_URL: z
				.string()
				.transform((d) => (d ? `https://${d}` : "http://localhost:4321")),
			AUTH_REDIRECT_PROXY_URL: z.string(),
			AUTH_SECRET: z.string(),
			TWITCH_CLIENT_ID: z.string().optional(),
			TWITCH_CLIENT_SECRET: z.string().optional(),
			DISCORD_CLIENT_ID: z.string().optional(),
			DISCORD_CLIENT_SECRET: z.string().optional(),
			SPOTIFY_CLIENT_ID: z.string().optional(),
			SPOTIFY_CLIENT_SECRET: z.string().optional(),
			GOOGLE_CLIENT_ID: z.string().optional(),
			GOOGLE_CLIENT_SECRET: z.string().optional(),
			STREAMLABS_CLIENT_ID: z.string().optional(),
			STREAMLABS_CLIENT_SECRET: z.string().optional(),
			PATREON_CLIENT_ID: z.string().optional(),
			PATREON_CLIENT_SECRET: z.string().optional(),
			GITHUB_CLIENT_ID: z.string().optional(),
			GITHUB_CLIENT_SECRET: z.string().optional(),
			DATABASE_URL: z.string(),
			// RESEND_API_KEY: z.string(),
		},
		runtimeEnv: (() => {
			const base = {
				VERCEL_URL: "http://localhost:4321",
				VERCEL_BRANCH_URL: "http://localhost:4321",
				AUTH_REDIRECT_PROXY_URL: "http://localhost:4321",
				...process.env,
			};

			if (
				process.env.VERCEL_ENV === "production" &&
				process.env.VERCEL_PROJECT_PRODUCTION_URL
			) {
				base.VERCEL_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL;
			}

			return base;
		})(),
		skipValidation: process.env.NODE_ENV === "development",
	});
}

let _cached: ReturnType<typeof createServerEnv> | undefined;
export const serverEnv = () => {
	if (!_cached) _cached = createServerEnv();

	return _cached;
};
