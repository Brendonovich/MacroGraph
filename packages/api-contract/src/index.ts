import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const OAUTH_TOKEN = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  token_type: z.string(),
});

export const CREDENTIAL = z.object({
  provider: z.string(),
  id: z.string(),
  displayName: z.string().nullable(),
  token: OAUTH_TOKEN,
});

export type Credential = z.infer<typeof CREDENTIAL>;

export const contract = c.router({
  getCredentials: {
    method: "GET",
    path: "/credentials",
    responses: {
      200: z.array(CREDENTIAL),
    },
    summary: "Gets all credentials linked to an account",
  },
  getUser: {
    method: "GET",
    path: "/user",
    responses: {
      200: z.object({ id: z.string(), email: z.string() }).nullable(),
    },
    summary: "Gets the currently logged in user, if there is one",
  },
});
