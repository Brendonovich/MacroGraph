import { action, cache, redirect } from "@solidjs/router";
import { and, eq } from "drizzle-orm";
import { getRequestEvent } from "solid-js/web";
import { getCookie, getHeader, appendResponseHeader } from "vinxi/server";
import { User, verifyRequestOrigin } from "lucia";

import { db } from "~/drizzle";
import { oauthCredentials, users } from "~/drizzle/schema";
import { lucia } from "./lucia";
import { loginURLForProvider, performOAuthExchange } from "./app/auth/actions";
import { AuthProvider } from "./app/auth/providers";

function loginRedirect() {
  const url = new URL(getRequestEvent()!.request.url);
  const next = encodeURIComponent(`${url.pathname}?${url.search}`);
  return redirect(`/login`);
}

export const getAuthState = cache(async () => {
  "use server";

  const requestEvent = getRequestEvent()!;
  const event = requestEvent.nativeEvent;

  if (requestEvent.request.method !== "GET") {
    const originHeader = getHeader("Origin") ?? null;
    // NOTE: You may need to use `X-Forwarded-Host` instead
    const hostHeader = getHeader("Host") ?? null;
    if (
      !originHeader ||
      !hostHeader ||
      !verifyRequestOrigin(originHeader, [hostHeader])
    ) {
      throw event.node.res.writeHead(403).end();
    }
  }

  let data: Awaited<ReturnType<typeof lucia.validateSession>>;

  // header auth
  const authHeader = getHeader("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const [, sessionId] = authHeader.split("Bearer ");

    data = await lucia.validateSession(sessionId);
  }
  // cookie auth
  else {
    const sessionId = getCookie(event, lucia.sessionCookieName) ?? null;
    if (!sessionId) throw loginRedirect();

    data = await lucia.validateSession(sessionId);

    if (data.session && data.session.fresh)
      appendResponseHeader(
        "Set-Cookie",
        lucia.createSessionCookie(data.session.id).serialize()
      );
    if (!data.session)
      appendResponseHeader(
        "Set-Cookie",
        lucia.createBlankSessionCookie().serialize()
      );
  }

  if (data.user) return data;
}, "getAuthState");

export async function ensureAuthenticated() {
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

  await new Promise((res) => setTimeout(res, 1000));

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

export const addCredential = action(async (provider: AuthProvider) => {
  const w = window.open(await loginURLForProvider(provider));
  if (!w) throw { error: "window-open-failed" };

  const searchParams = await new Promise<string>((res, rej) => {
    const onBeforeUnload = () => rej();

    w.addEventListener("beforeunload", onBeforeUnload);

    window.addEventListener("message", (e) => {
      if (e.source !== w) return;

      w.removeEventListener("beforeunload", onBeforeUnload);

      res(e.data);
    });
  });

  async function inner(provider: string, searchParams: string) {
    "use server";

    const [{ user }, oauth] = await Promise.all([
      ensureAuthenticated(),
      performOAuthExchange(provider, searchParams),
    ]);

    if (!user) throw { code: "forbidden" };

    await db.insert(oauthCredentials).values({
      providerId: provider,
      providerUserId: oauth.user.id,
      userId: user.id,
      token: oauth.token,
      displayName: oauth.user.displayName,
      tokenCreatedAt: new Date(),
    });

    return oauth;
  }

  return await inner(provider, searchParams);
});

export const removeCredential = action(
  async (provider: string, providerUserId: string) => {
    "use server";
    const { user } = await ensureAuthenticated();

    await db
      .delete(oauthCredentials)
      .where(
        and(
          eq(oauthCredentials.providerId, provider),
          eq(oauthCredentials.providerUserId, providerUserId),
          eq(oauthCredentials.userId, user.id)
        )
      );
  }
);

export const getCredentials = cache(async () => {
  "use server";

  const { user } = await ensureAuthenticated();

  const c = await db.query.oauthCredentials.findMany({
    where: eq(oauthCredentials.userId, user.id),
  });

  return c;
}, "credentials");
