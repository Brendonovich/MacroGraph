import { action, cache, redirect } from "@solidjs/router";
import { and, eq } from "drizzle-orm";
import { verifyRequestOrigin } from "lucia";
import { getRequestEvent } from "solid-js/web";
import {
  getHeader,
  getCookie,
  appendResponseHeader,
} from "@solidjs/start/http";

import { db } from "~/drizzle";
import { oauthCredentials, oauthApps, users } from "~/drizzle/schema";
import { loginURLForProvider, performOAuthExchange } from "./app/auth/actions";
import type { AuthProvider } from "./app/auth/providers";
import { lucia } from "./lucia";

function loginRedirect() {
  const url = new URL(getRequestEvent()!.request.url);
  const next = encodeURIComponent(`${url.pathname}?${url.search}`);
  return redirect(`/login?next=${next}`);
}

async function _getAuthState() {
  "use server";

  const requestEvent = getRequestEvent()!;
  const event = requestEvent.nativeEvent;

  let data: Awaited<ReturnType<typeof lucia.validateSession>>;

  // header auth
  const authHeader = getHeader("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const [, sessionId] = authHeader.split("Bearer ");

    data = await lucia.validateSession(sessionId);
  }
  // cookie auth
  else {
    if (requestEvent.request.method !== "GET") {
      const originHeader = getHeader("Origin") ?? null;
      // NOTE: You may need to use `X-Forwarded-Host` instead
      const hostHeader = getHeader("Host") ?? null;
      if (
        !originHeader ||
        !hostHeader ||
        !verifyRequestOrigin(originHeader, [hostHeader])
      ) {
        throw event.runtime!.node!.res!.writeHead(403).end();
      }
    }

    const sessionId = getCookie(lucia.sessionCookieName) ?? null;
    if (!sessionId) return;

    data = await lucia.validateSession(sessionId);

    if (data.session?.fresh)
      appendResponseHeader(
        "Set-Cookie",
        lucia.createSessionCookie(data.session.id).serialize(),
      );
    if (!data.session)
      appendResponseHeader(
        "Set-Cookie",
        lucia.createBlankSessionCookie().serialize(),
      );
  }

  if (data.user) return data;
}

export const getAuthState = cache(() => _getAuthState(), "getAuthState");

export async function ensureAuthedOrThrow() {
  const state = await _getAuthState();
  if (state) return state;

  throw { code: "forbidden" };
}

export async function ensureAuthedOrRedirect() {
  "use server";

  const state = await getAuthState();
  if (state) return state;

  throw loginRedirect();
}

export const getUser = cache(async () => {
  "use server";

  const state = await getAuthState();
  if (!state) return null;

  const { user } = state;

  const res = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: {
      id: true,
      email: true,
    },
  });

  return res ?? null;
}, "user");

export const PROVIDER_DISPLAY_NAMES: Record<AuthProvider, string> = {
  twitch: "Twitch",
  discord: "Discord",
  spotify: "Spotify",
  patreon: "Patreon",
  github: "GitHub",
};

export const WINDOW_OPEN_FAILED = "window-open-failed";

async function addCredentialInner(provider: string, searchParams: string) {
  "use server";

  const [{ user }, oauth] = await Promise.all([
    ensureAuthedOrRedirect(),
    performOAuthExchange(provider, searchParams),
  ]);

  if (!user) throw { code: "forbidden" };

  await db.insert(oauthCredentials).values({
    providerId: provider,
    providerUserId: oauth.user.id,
    userId: user.id,
    token: oauth.token,
    displayName: oauth.user.displayName,
    issuedAt: new Date(),
  });

  posthogCapture({
    distinctId: user.id,
    event: "credential connected",
    properties: {
      providerId: provider,
      providerUserId: oauth.user.id,
    },
  });
  await posthogShutdown();

  return oauth;
}

export const addCredential = action(async (provider: AuthProvider) => {
  const w = window.open(await loginURLForProvider(provider), "_blank");
  if (!w) {
    throw new Error(WINDOW_OPEN_FAILED);
  }

  const searchParams = await new Promise<string>((res) => {
    window.addEventListener("message", (e) => {
      if (e.source !== w) return;

      if (typeof e.data !== "string" || !e.data.startsWith("?")) return;

      res(e.data);
    });
  });

  return await addCredentialInner(provider, searchParams);
});

export const removeCredential = action(
  async (provider: string, providerUserId: string) => {
    "use server";
    const { user } = await ensureAuthedOrRedirect();

    await db
      .delete(oauthCredentials)
      .where(
        and(
          eq(oauthCredentials.providerId, provider),
          eq(oauthCredentials.providerUserId, providerUserId),
          eq(oauthCredentials.userId, user.id),
        ),
      );
  },
);

export const getCredentials = cache(async () => {
  "use server";

  const { user } = await ensureAuthedOrRedirect();

  const c = await db.query.oauthCredentials.findMany({
    where: eq(oauthCredentials.userId, user.id),
  });

  return c;
}, "credentials");

export const getServers = cache(async () => {
  "use server";

  const { user } = await ensureAuthedOrRedirect();

  const c = await db.query.oauthApps.findMany({
    where: eq(oauthApps.ownerId, user.id),
  });

  return c;
}, "servers");

import { createStorage } from "unstorage";
import cloudflareKVHTTPDriver from "unstorage/drivers/cloudflare-kv-http";
import { posthogCapture, posthogShutdown } from "./posthog/server";

const cloudflareKv = () => {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!;

  if (!apiToken) {
    console.error("CLOUDFLARE_API_TOKEN not set");
    return;
  }

  return createStorage({
    driver: cloudflareKVHTTPDriver({
      accountId: "3de2dd633194481d80f68f55257bdbaa",
      namespaceId: "37a5c183f5b942408acae571b12206f1",
      apiToken,
    }),
  });
};

export const savePlaygroundProject = action(async (project: string) => {
  "use server";

  const id = crypto.randomUUID();

  await cloudflareKv()!.setItem(id, project);

  return id;
});

export const fetchPlaygroundProject = cache(async (id: string) => {
  "use server";

  const item = await cloudflareKv()!.getItem(id);

  if (item) return JSON.stringify(item);

  return null;
}, "fetchPlaygroundProject");
