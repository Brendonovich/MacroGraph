import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export const env = createEnv({
  server: {
    VERCEL_URL: z
      .string()
      .optional()
      .transform((d) => {
        if (!d) return "http://localhost:4321";
        else return `https://${d}`;
      }),
    AUTH_REDIRECT_PROXY_URL: z.string().default("http://localhost:4321"),
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
  },
  runtimeEnv: process.env,
});
