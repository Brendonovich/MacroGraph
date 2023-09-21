import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_MACROGRAPH_API_URL: z
      .string()
      .default("https://macrograph-git-astro-brendonovich.vercel.app"),
  },
  runtimeEnv: import.meta.env,
});
