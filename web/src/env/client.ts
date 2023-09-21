import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_VERCEL_URL: z
      .string()
      .optional()
      .transform((d) => {
        if (!d) return "http://localhost:4321";
        else return `https://${d}`;
      }),
  },
  runtimeEnv: import.meta.env,
});
