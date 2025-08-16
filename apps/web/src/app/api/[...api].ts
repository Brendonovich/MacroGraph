import {
	Cookies,
	HttpApiBuilder,
	HttpApiError,
	HttpApp,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node/index";
import {
	Api,
	Authentication,
	type CREDENTIAL,
	CurrentSession,
	DeviceFlowError,
	ServerRegistrationError,
} from "@macrograph/web-domain";
// import type { APIHandler } from "@solidjs/start/server";
import type { InferSelectModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import { Config, Effect, Layer, Option } from "effect";
import * as S from "effect/Schema";
import * as Jose from "jose";
import { verifyRequestOrigin } from "lucia";

import { db } from "~/drizzle";
import {
	deviceCodeSessions,
	oauthCredentials,
	oauthSessions,
	serverRegistrations,
	serverRegistrationSessions,
	users,
} from "~/drizzle/schema";
import { lucia } from "~/lucia";
import {
	posthogCapture,
	posthogIdentify,
	posthogShutdown,
} from "~/posthog/server";
import { refreshToken } from "../auth/actions";
import { AuthProviders } from "../auth/providers";

const IS_LOGGED_IN = "isLoggedIn";

type SessionType = "web" | "oauth";

const getCurrentSession = Effect.gen(function* () {
	const req = yield* HttpServerRequest.HttpServerRequest;

	const headers = yield* HttpServerRequest.schemaHeaders(
		S.Struct({
			authorization: S.OptionFromUndefinedOr(S.String),
			"client-id": S.OptionFromUndefinedOr(S.String),
		}),
	);
	const sessionCookie = yield* HttpServerRequest.schemaCookies(
		S.Struct({
			[lucia.sessionCookieName]: S.OptionFromUndefinedOr(S.String),
		}),
	).pipe(Effect.map((v) => v[lucia.sessionCookieName]));

	let sessionId: string;
	let type: SessionType = "web";

	if (Option.isSome(headers.authorization)) {
		const value = headers.authorization.value;
		const BEARER = "Bearer ";
		if (!value.startsWith(BEARER)) return yield* new HttpApiError.BadRequest();

		sessionId = value.slice(BEARER.length);

		if (Option.isSome(headers["client-id"])) type = "oauth";
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

	let userId;

	if (type === "web") {
		const sessionData = yield* Effect.tryPromise({
			try: () => lucia.validateSession(sessionId),
			catch: () => new HttpApiError.InternalServerError(),
		});

		if (sessionData.user === null) return Option.none();

		if (Option.isSome(sessionCookie))
			yield* HttpApp.appendPreResponseHandler(
				Effect.fn(function* (_, res) {
					if (res.cookies.pipe(Cookies.get(IS_LOGGED_IN), Option.isNone))
						return res;

					if (sessionData.session.fresh)
						res = yield* res.pipe(
							HttpServerResponse.setCookie(
								lucia.sessionCookieName,
								lucia.createSessionCookie(sessionData.session.id).serialize(),
							),
							Effect.orDie,
						);

					return res;
				}),
			);

		userId = sessionData.user.id;

		posthogIdentify(userId, { email: sessionData.user.email });
	} else {
		const sessionData = yield* Effect.tryPromise({
			try: () =>
				db.query.oauthSessions.findFirst({
					where: eq(oauthSessions.accessToken, sessionId),
				}),
			catch: () => new HttpApiError.InternalServerError(),
		});

		if (!sessionData) return Option.none();

		userId = sessionData.userId;
	}

	return Option.some({ userId });
}).pipe(Effect.catchTag("ParseError", () => new HttpApiError.BadRequest()));

const AuthenticationLive = Layer.sync(Authentication, () =>
	Effect.gen(function* () {
		const session = yield* getCurrentSession;
		console.log({ session });
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
							columns: { id: true, email: true },
						}),
					catch: () => new HttpApiError.InternalServerError(),
				});

				return user ?? null;
			}),
		)
		.handle(
			"getUserJwt",
			Effect.fn(function* () {
				const session = yield* CurrentSession;

				const privateKey = yield* Config.string("JWT_PRIVATE_KEY").pipe(
					Effect.tap(Effect.log),
					Effect.andThen((v) =>
						Effect.promise(() =>
							Jose.importPKCS8(v.replaceAll("\\n", "\n"), "RS256"),
						),
					),
					Effect.orDie,
				);

				const jwt = yield* Effect.promise(() =>
					new Jose.SignJWT({ type: "user", userId: session.userId })
						.setProtectedHeader({ alg: "RS256" })
						.setIssuedAt()
						.sign(privateKey),
				);

				return { jwt };
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
				if (!providerConfig) return yield* new HttpApiError.BadRequest();

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
		)
		.handle(
			"createDeviceCodeFlow",
			Effect.fn(function* () {
				const userCode = yield* generateUserDeviceCode;
				const deviceCode = crypto.randomUUID().replaceAll("-", "");

				const expiresIn = 60 * 15;

				yield* Effect.promise(() =>
					db.insert(deviceCodeSessions).values({ userCode, deviceCode }),
				);

				const verificationUri = `${serverEnv.VERCEL_URL}/login/device`;

				return {
					user_code: userCode,
					device_code: deviceCode,
					expires_in: expiresIn,
					verification_uri: verificationUri,
					verification_uri_complete: `${verificationUri}?userCode=${encodeURIComponent(
						userCode,
					)}`,
				};
			}),
		)
		.handle(
			"performAccessTokenGrant",
			Effect.fn(function* ({ urlParams }) {
				const deviceSession = yield* Effect.tryPromise({
					try: () =>
						db.query.deviceCodeSessions.findFirst({
							where: eq(deviceCodeSessions.deviceCode, urlParams.device_code),
						}),
					catch: () => new HttpApiError.InternalServerError(),
				}).pipe(
					Effect.flatMap(Option.fromNullable),
					Effect.catchTag(
						"NoSuchElementException",
						() => new DeviceFlowError({ code: "incorrect_device_code" }),
					),
					Effect.flatMap((v) => {
						if (+v.createdAt < Date.now() - 1000 * 60 * 10)
							return new DeviceFlowError({ code: "expired_token" });

						if (v.userId === null)
							return new DeviceFlowError({ code: "authorization_pending" });

						return Effect.succeed({ ...v, userId: v.userId });
					}),
				);

				const accessToken = crypto.randomUUID().replaceAll("-", "");
				const refreshToken = crypto.randomUUID().replaceAll("-", "");

				yield* Effect.tryPromise({
					try: () =>
						db.transaction(async (db) => {
							await db
								.delete(deviceCodeSessions)
								.where(
									eq(deviceCodeSessions.deviceCode, deviceSession.deviceCode),
								);
							await db.insert(oauthSessions).values({
								accessToken,
								refreshToken,
								expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
								userId: deviceSession.userId,
							});
						}),
					catch: () => new HttpApiError.InternalServerError(),
				});

				return {
					access_token: accessToken,
					refresh_token: refreshToken,
					token_type: "Bearer",
				};
			}),
		)
		.handle(
			"startServerRegistration",
			Effect.fn(function* () {
				const id = crypto.randomUUID().replaceAll("-", "");
				const userCode = yield* generateUserDeviceCode;

				yield* Effect.tryPromise({
					try: () =>
						db.insert(serverRegistrationSessions).values({ id, userCode }),
					catch: () => new HttpApiError.InternalServerError(),
				});

				return { id, userCode };
			}),
		)
		.handle(
			"performServerRegistration",
			Effect.fn(function* ({ payload: { id } }) {
				const session = yield* Effect.tryPromise({
					try: () =>
						db.query.serverRegistrationSessions.findFirst({
							where: eq(serverRegistrationSessions.id, id),
						}),
					catch: () => new HttpApiError.InternalServerError(),
				});
				if (!session)
					return yield* new ServerRegistrationError({ code: "incorrect_id" });

				if (session.userId === null)
					return yield* new ServerRegistrationError({
						code: "authorization_pending",
					});

				const { userId } = session;

				yield* Effect.tryPromise({
					try: () =>
						db.transaction((db) =>
							Promise.all([
								db
									.delete(serverRegistrationSessions)
									.where(eq(serverRegistrationSessions.id, id)),
								db.insert(serverRegistrations).values({
									registrationId: session.id,
									ownerId: userId,
								}),
							]),
						),
					catch: () => new HttpApiError.InternalServerError(),
				});

				const privateKey = yield* Config.string("JWT_PRIVATE_KEY").pipe(
					Effect.andThen((v) =>
						Effect.promise(() =>
							Jose.importPKCS8(v.replaceAll("\\n", "\n"), "RS256"),
						),
					),
					Effect.orDie,
				);

				const jwt = yield* Effect.promise(() =>
					new Jose.SignJWT({
						type: "server-registration",
						registrationId: session.id,
						ownerId: userId,
					})
						.setProtectedHeader({ alg: "RS256" })
						.setIssuedAt()
						.sign(privateKey),
				);

				return { token: jwt };
			}),
		),
);

const ApiLive = HttpApiBuilder.api(Api).pipe(
	Layer.provide(ApiLiveGroup),
	Layer.provide(AuthenticationLive),
);

import { NodeSdk } from "@effect/opentelemetry";

const { handler } = HttpApiBuilder.toWebHandler(
	Layer.mergeAll(
		ApiLive,
		NodeHttpServer.layerContext,
		NodeSdk.layer(() => ({
			resource: { serviceName: "mg-web" },
			// Export span data to the console
			spanProcessor: [
				// new BatchSpanProcessor(new OTLPTraceExporter()),
				// new BatchSpanProcessor(new ConsoleSpanExporter()),
			],
		})),
	),
);

const createHandler = () => (event: any) => handler(event.request);

export const GET = createHandler();
export const POST = createHandler();
export const PUT = createHandler();
export const DELETE = createHandler();
export const PATCH = createHandler();
export const OPTIONS = createHandler();

import * as crypto from "node:crypto";
import { serverEnv } from "~/env/server";

const generateUserDeviceCode = Effect.gen(function* () {
	const SEGMENT_LENGTH = 4;
	const LENGTH = 8;

	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const charsetLength = charset.length;
	const bytesNeeded = Math.ceil((LENGTH * Math.log2(charsetLength)) / 8);

	const randomBytes = yield* Effect.promise(
		() =>
			new Promise<Buffer>((res) =>
				crypto.randomFill(Buffer.alloc(bytesNeeded), (_, buf) => {
					res(buf);
				}),
			),
	);

	let rawCode = "";
	for (let i = 0; i < LENGTH; i++) {
		const byte = randomBytes[Math.floor((i * bytesNeeded) / LENGTH)];
		const index = byte % charsetLength;
		rawCode += charset[index];
	}

	// Format the code with hyphens for readability
	if (SEGMENT_LENGTH > 0 && LENGTH > SEGMENT_LENGTH) {
		let formattedCode = "";
		for (let i = 0; i < rawCode.length; i++) {
			if (i > 0 && i % SEGMENT_LENGTH === 0) {
				formattedCode += "-";
			}
			formattedCode += rawCode[i];
		}
		return formattedCode;
	}

	return rawCode;
});
