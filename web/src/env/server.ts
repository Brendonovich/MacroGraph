import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    VERCEL_URL: z.string().default("http://localhost:4321"),
    AUTH_REDIRECT_PROXY_URL: z.string().default("http://localhost:4321"),
    AUTH_SECRET: z.string(),
    TWITCH_CLIENT_ID: z.string(),
    TWITCH_CLIENT_SECRET: z.string(),
  },
  runtimeEnv: import.meta.env,
});
