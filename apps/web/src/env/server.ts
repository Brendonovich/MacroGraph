import { createEnv } from "@t3-oss/env-core";
import "dotenv/config";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
    VERCEL_URL: z
      .string()
      .transform((d) => (d ? `https://${d}` : "http://localhost:4321")),
    VERCEL_BRANCH_URL: z
      .string()
      .transform((d) => (d ? `https://${d}` : "http://localhost:4321")),
    AUTH_REDIRECT_PROXY_URL: z.string(),
    AUTH_SECRET: z.string(),
    TWITCH_CLIENT_ID: z.string(),
    TWITCH_CLIENT_SECRET: z.string(),
    DISCORD_CLIENT_ID: z.string(),
    DISCORD_CLIENT_SECRET: z.string(),
    SPOTIFY_CLIENT_ID: z.string(),
    SPOTIFY_CLIENT_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    STREAMLABS_CLIENT_ID: z.string(),
    STREAMLABS_CLIENT_SECRET: z.string(),
    PATREON_CLIENT_ID: z.string(),
    PATREON_CLIENT_SECRET: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    DATABASE_URL: z.string(),
    RESEND_API_KEY: z.string(),
  },
  runtimeEnv: {
    VERCEL_URL: "http://localhost:4321",
    AUTH_REDIRECT_PROXY_URL: "http://localhost:4321",
    ...process.env,
  },
  skipValidation: process.env.NODE_ENV === "development",
});
