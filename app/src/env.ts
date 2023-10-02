import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_MACROGRAPH_API_URL: z
      .string()
      .default("https://macrograph.brendonovich.dev"),
  },
  runtimeEnv: import.meta.env,
});
