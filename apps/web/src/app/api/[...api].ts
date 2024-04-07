import { contract } from "@macrograph/api-contract";
import { initServer, createHonoEndpoints } from "ts-rest-hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { APIHandler } from "@solidjs/start/server";
import { getCredentials, getUser } from "~/api";
import { appendResponseHeaders } from "vinxi/http";

const s = initServer();

const router = s.router(contract, {
  getCredentials: async () => {
    const c = await getCredentials();

    return {
      status: 200,
      body: c.map((cred) => ({
        provider: cred.providerId,
        id: cred.providerUserId,
        token: cred.token,
        displayName: cred.displayName,
      })),
    };
  },
  getUser: async () => ({ status: 200, body: await getUser() }),
});

const app = new Hono().basePath("/api");

createHonoEndpoints(contract, router, app);

const createHandler = (): APIHandler => async (event) => {
  appendResponseHeaders({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });

  return await app.fetch(event.request, {
    h3Event: event.nativeEvent,
  });
};

export const GET = createHandler();
export const POST = createHandler();
export const PUT = createHandler();
export const DELETE = createHandler();
export const PATCH = createHandler();
export const OPTIONS = createHandler();
