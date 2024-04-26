import { CREDENTIAL, contract } from "@macrograph/api-contract";
import { initServer, createHonoEndpoints } from "ts-rest-hono";
import { Hono } from "hono";
import type { APIHandler } from "@solidjs/start/server";
import {
  ensureAuthedOrRedirect,
  ensureAuthedOrThrow,
  getCredentials,
  getUser,
} from "~/api";
import { AuthProviders } from "../auth/providers";
import { refreshToken as refreshToken } from "../auth/actions";
import { db } from "~/drizzle";
import { and, eq } from "drizzle-orm";
import { oauthCredentials } from "~/drizzle/schema";
import { z } from "zod";

const s = initServer();

function marshalCredential(
  c: Awaited<ReturnType<typeof getCredentials>>[number],
): z.infer<typeof CREDENTIAL> {
  return {
    provider: c.providerId,
    id: c.providerUserId,
    displayName: c.displayName,
    token: { ...c.token, issuedAt: +c.issuedAt },
  };
}

const router = s.router(contract, {
  getCredentials: async () => {
    const c = await getCredentials();

    return {
      status: 200,
      body: c.map(marshalCredential),
    };
  },
  refreshCredential: async ({ params }) => {
    const providerConfig = AuthProviders[params.providerId];
    if (!providerConfig)
      throw new Error(`Provider ${params.providerId} not found`);

    const { user } = await ensureAuthedOrThrow();

    const where = and(
      eq(oauthCredentials.providerId, params.providerId),
      eq(oauthCredentials.userId, user.id),
      eq(oauthCredentials.providerUserId, params.providerUserId),
    );

    const credential = await db.transaction(async (db) => {
      const credential = await db.query.oauthCredentials.findFirst({
        where,
      });

      // 404
      if (!credential) throw new Error("credential not found");
      // assume provider doesn't require refresh
      if (
        !credential.token.refresh_token ||
        // only allow refresh of tokens >5min old
        +credential.issuedAt + credential.token.expires_in * 1000 >
          Date.now() - 5 * 60 * 1000
      )
        return credential;

      const token = await refreshToken(
        providerConfig,
        credential.token.refresh_token,
      );

      // token refresh not necessary/possible
      if (!token) return credential;

      const issuedAt = new Date();
      await db.update(oauthCredentials).set({ token, issuedAt }).where(where);

      return {
        ...credential,
        issuedAt,
        token,
      };
    });

    return { status: 200, body: marshalCredential(credential) };
  },
  getUser: async () => ({ status: 200, body: await getUser() }),
});

const app = new Hono().basePath("/api");

createHonoEndpoints(contract, router, app);

const createHandler = (): APIHandler => async (event) =>
  app.fetch(event.request, {
    h3Event: event.nativeEvent,
  });

export const GET = createHandler();
export const POST = createHandler();
export const PUT = createHandler();
export const DELETE = createHandler();
export const PATCH = createHandler();
export const OPTIONS = createHandler();
