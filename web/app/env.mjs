import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    TWITCH_CLIENT_ID: z.string(),
    TWITCH_CLIENT_SECRET: z.string(),
    TWITCH_REDIRECT_URL: z.string(),
  },
  client: {},
  runtimeEnv: {
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
    TWITCH_REDIRECT_URL:
      process.env.TWITCH_REDIRECT_URL ?? "http://localhost:3000",
  },
});
