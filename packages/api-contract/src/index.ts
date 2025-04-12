import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const OAUTH_TOKEN = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  token_type: z.string(),
});

export const CREDENTIAL = z.object({
  provider: z.string(),
  id: z.string(),
  displayName: z.string().nullable(),
  token: OAUTH_TOKEN.and(z.object({ issuedAt: z.number() })),
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
  refreshCredential: {
    method: "POST",
    path: "/credentials/:providerId/:providerUserId/refresh",
    pathParams: z.object({
      providerId: z.string(),
      providerUserId: z.string(),
    }),
    responses: {
      200: CREDENTIAL,
    },
    body: null,
    summary: "Refreshes a credential if it hasn't been recently refreshed",
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
