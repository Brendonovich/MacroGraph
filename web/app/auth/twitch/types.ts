import { z } from "zod";

export const STATE = z.object({
  port: z.number(),
  redirect_uri: z.string(),
});

export const TOKEN = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  token_type: z.string(),
  scope: z.array(z.string()),
});

export const PARAMS = z.object({
  code: z.string(),
  state: z
    .string()
    .transform((s) => STATE.parse(JSON.parse(decodeURIComponent(s)))),
});
