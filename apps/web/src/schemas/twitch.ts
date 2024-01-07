import { z } from "zod";
import { STATE } from ".";

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
