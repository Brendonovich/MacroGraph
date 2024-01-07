import { z } from "zod";

export const STATE = z
  .union([
    z.object({
      port: z.number(),
      env: z.literal("desktop"),
    }),
    z.object({
      env: z.literal("web"),
      targetOrigin: z.string(),
    }),
  ])
  .and(
    z.object({
      redirect_uri: z.string(),
    })
  );
