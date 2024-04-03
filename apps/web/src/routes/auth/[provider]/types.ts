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

export const TOKEN = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  token_type: z.string(),
});

export const PARAMS = z.object({
  code: z.string(),
  state: STATE,
});

export const REFRESHED_TOKEN = z.object({
  access_token: z.string(),
  expires_in: z.number(),
});
