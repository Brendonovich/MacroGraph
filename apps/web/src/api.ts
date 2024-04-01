import { action, cache, redirect } from "@solidjs/router";
import { and, eq } from "drizzle-orm";
import { getRequestEvent } from "solid-js/web";
import { getCookie, getHeader, appendResponseHeader } from "vinxi/server";
import { verifyRequestOrigin } from "lucia";

import { db } from "~/drizzle";
import { oauthCredentials, users } from "~/drizzle/schema";
import { lucia } from "./lucia";
import {
  loginURLForProvider,
  performOAuthExchange,
} from "./routes/auth/actions";

function loginRedirect() {
  const url = new URL(getRequestEvent()!.request.url);
  const next = encodeURIComponent(`${url.pathname}?${url.search}`);
  return redirect(`/login`);
}

export async function ensureAuthenticated() {
  "use server";

  const requestEvent = getRequestEvent()!;
  const event = requestEvent.nativeEvent;

  if (requestEvent.request.method !== "GET") {
    const originHeader = getHeader(event, "Origin") ?? null;
    // NOTE: You may need to use `X-Forwarded-Host` instead
    const hostHeader = getHeader(event, "Host") ?? null;
    if (
      !originHeader ||
      !hostHeader ||
      !verifyRequestOrigin(originHeader, [hostHeader])
    ) {
      throw event.node.res.writeHead(403).end();
    }
  }

  const sessionId = getCookie(event, lucia.sessionCookieName) ?? null;
  if (!sessionId) throw loginRedirect();

  const { session, user } = await lucia.validateSession(sessionId);

  if (session && session.fresh) {
    appendResponseHeader(
      event,
      "Set-Cookie",
      lucia.createSessionCookie(session.id).serialize()
    );
  }
  if (!session) {
    appendResponseHeader(
      event,
      "Set-Cookie",
      lucia.createBlankSessionCookie().serialize()
    );
  }

  if (user && session) return { user, session };
  else throw loginRedirect();
}

export const getUser = cache(async () => {
  "use server";

  const { user } = await ensureAuthenticated();

  const res = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: {
      id: true,
      email: true,
    },
  });

  return res;
}, "user");

async function addConnection(provider: string, searchParams: string) {
  "use server";

  const [{ user }, oauth] = await Promise.all([
    ensureAuthenticated(),
    performOAuthExchange(provider, searchParams),
  ]);

  await db.insert(oauthCredentials).values({
    providerId: provider,
    providerUserId: oauth.user.id,
    userId: user.id,
    token: oauth.token,
    displayName: oauth.user.displayName,
  });
}

export const addCredentialAction = action(async (provider: string) => {
  const w = window.open(await loginURLForProvider(provider));
  if (!w) return { error: "window-open-failed" } as const;

  const searchParams = await new Promise<string>((res, rej) => {
    const onBeforeUnload = () => rej();

    w.addEventListener("beforeunload", onBeforeUnload);

    window.addEventListener("message", (e) => {
      if (e.source !== w) return;

      w.removeEventListener("beforeunload", onBeforeUnload);

      res(e.data);
    });
  });

  await addConnection(provider, searchParams);
});

export const removeCredentialAction = action(
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
