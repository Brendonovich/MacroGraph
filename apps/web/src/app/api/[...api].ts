import {
  Cookies,
  HttpApiBuilder,
  HttpApiError,
  HttpApp,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node/index";
import { InferSelectModel } from "drizzle-orm";
import { Effect, Layer, Option } from "effect";
import * as S from "effect/Schema";
import { verifyRequestOrigin } from "lucia";
import {
  CurrentSession,
  Authentication,
  Api,
  CREDENTIAL,
} from "@macrograph/web-api";
import type { APIHandler } from "@solidjs/start/server";
import { and, eq } from "drizzle-orm";

import { db } from "~/drizzle";
import { oauthCredentials, users } from "~/drizzle/schema";
import { lucia } from "~/lucia";
import { AuthProviders } from "../auth/providers";
import { refreshToken } from "../auth/actions";
import {
  posthogCapture,
  posthogIdentify,
  posthogShutdown,
} from "~/posthog/server";

const IS_LOGGED_IN = "isLoggedIn";

const getCurrentSession = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest;

  const headers = yield* HttpServerRequest.schemaHeaders(
    S.Struct({ authorization: S.OptionFromUndefinedOr(S.String) }),
  );
  const sessionCookie = yield* HttpServerRequest.schemaCookies(
    S.Struct({
      [lucia.sessionCookieName]: S.OptionFromUndefinedOr(S.String),
    }),
  ).pipe(Effect.map((v) => v[lucia.sessionCookieName]));

  let sessionId: string;

  if (Option.isSome(headers.authorization)) {
    const value = headers.authorization.value;
    const BEARER = "Bearer ";
    if (!value.startsWith(BEARER)) return yield* new HttpApiError.BadRequest();

    sessionId = value.slice(BEARER.length);
  } else if (Option.isSome(sessionCookie)) {
    if (req.method !== "GET") {
      const { origin, host } = yield* HttpServerRequest.schemaHeaders(
        S.Struct({ origin: S.String, host: S.String }),
      ).pipe(
        Effect.catchTag("ParseError", () => new HttpApiError.BadRequest()),
      );

      if (!verifyRequestOrigin(origin, [host]))
        return yield* new HttpApiError.BadRequest();
    }

    sessionId = sessionCookie.value;
  } else return Option.none();

  const data = yield* Effect.tryPromise({
    try: () => lucia.validateSession(sessionId),
    catch: () => new HttpApiError.InternalServerError(),
  });

  if (data.user === null) return Option.none();

  if (Option.isSome(sessionCookie))
    yield* HttpApp.appendPreResponseHandler(
      Effect.fn(function* (_, res) {
        if (res.cookies.pipe(Cookies.get(IS_LOGGED_IN), Option.isNone))
          return res;

        if (data.session.fresh)
          res = yield* res.pipe(
            HttpServerResponse.setCookie(
              lucia.sessionCookieName,
              lucia.createSessionCookie(data.session.id).serialize(),
            ),
            Effect.orDie,
          );

        return res;
      }),
    );

  posthogIdentify(data.user.id, { email: data.user.email });

  return Option.some({
    id: data.session.id,
    userId: data.user.email,
  });
}).pipe(Effect.catchTag("ParseError", () => new HttpApiError.BadRequest()));

const AuthenticationLive = Layer.sync(Authentication, () =>
  Effect.gen(function* () {
    const session = yield* getCurrentSession;
    return yield* session.pipe(
      Effect.catchTag(
        "NoSuchElementException",
        () => new HttpApiError.Forbidden(),
      ),
    );
  }),
);

function marshalCredential(
  c: InferSelectModel<typeof oauthCredentials>,
): (typeof CREDENTIAL)["Encoded"] {
  return {
    provider: c.providerId,
    id: c.providerUserId,
    displayName: c.displayName,
    token: { ...c.token, issuedAt: +c.issuedAt },
  };
}

const ApiLiveGroup = HttpApiBuilder.group(Api, "api", (handlers) =>
  handlers
    .handle(
      "getUser",
      Effect.fn(function* () {
        const session = yield* getCurrentSession;

        if (Option.isNone(session)) return null;

        const user = yield* Effect.tryPromise({
          try: () =>
            db.query.users.findFirst({
              where: eq(users.id, session.value.userId),
              columns: {
                id: true,
                email: true,
              },
            }),
          catch: () => new HttpApiError.InternalServerError(),
        });

        return user ?? null;
      }),
    )
    .handle(
      "getCredentials",
      Effect.fn(function* () {
        const session = yield* CurrentSession;

        return yield* Effect.tryPromise({
          try: () =>
            db.query.oauthCredentials.findMany({
              where: eq(oauthCredentials.userId, session.userId),
            }),
          catch: () => new HttpApiError.InternalServerError(),
        }).pipe(Effect.map((c) => c.map(marshalCredential)));
      }),
    )
    .handle(
      "refreshCredential",
      Effect.fn(function* ({ path }) {
        const providerConfig = AuthProviders[path.providerId];
        if (!providerConfig) yield* new HttpApiError.BadRequest();

        const session = yield* CurrentSession;

        const where = and(
          eq(oauthCredentials.providerId, path.providerId),
          eq(oauthCredentials.userId, session.userId),
          eq(oauthCredentials.providerUserId, path.providerUserId),
        );

        const credential = yield* Effect.tryPromise({
          try: () =>
            db.transaction(async (db) => {
              const credential = await db.query.oauthCredentials.findFirst({
                where,
              });

              // 404
              if (!credential) throw new Error("credential not found");
              // assume provider doesn't require refresh
              if (!credential.token.refresh_token) return credential;

              const token = await refreshToken(
                providerConfig,
                credential.token.refresh_token,
              );

              // token refresh not necessary/possible
              if (!token) return credential;

              const issuedAt = new Date();
              await db
                .update(oauthCredentials)
                .set({ token, issuedAt })
                .where(where);

              return {
                ...credential,
                issuedAt,
                token,
              };
            }),
          catch: () => new HttpApiError.InternalServerError(),
        });

        posthogCapture({
          distinctId: session.userId,
          event: "credential refreshed",
          properties: {
            providerId: credential.providerId,
            providerUserId: credential.providerUserId,
          },
        });

        yield* Effect.promise(() => posthogShutdown());

        return marshalCredential(credential);
      }),
    ),
);

const ApiLive = HttpApiBuilder.api(Api)
  .pipe(Layer.provide(ApiLiveGroup))
  .pipe(Layer.provide(AuthenticationLive));

const { handler } = HttpApiBuilder.toWebHandler(
  Layer.mergeAll(ApiLive, NodeHttpServer.layerContext),
);

const createHandler = (): APIHandler => (event) => handler(event.request);

export const GET = createHandler();
export const POST = createHandler();
export const PUT = createHandler();
export const DELETE = createHandler();
export const PATCH = createHandler();
export const OPTIONS = createHandler();
