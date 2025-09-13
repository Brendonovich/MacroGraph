import {
	Cookies,
	Headers,
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
	RawJWT,
	ServerAuth,
	ServerAuthJWT,
	ServerAuthMiddleware,
	ServerAuthToken,
	ServerRegistrationError,
} from "@macrograph/web-domain";
import type { InferSelectModel } from "drizzle-orm";
import * as Dz from "drizzle-orm";
import {
	Config,
	Effect,
	Layer,
	Option,
	ParseResult,
	Redacted,
	Schema,
} from "effect";
import * as S from "effect/Schema";
import * as Jose from "jose";
import { verifyRequestOrigin } from "lucia";

import { Database } from "./Database";
import * as Db from "~/drizzle/schema";
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
	const db = yield* Database;
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

	switch (type) {
		case "web": {
			const sessionData = yield* Effect.tryPromise({
				try: () => lucia.validateSession(sessionId),
				catch: () => new HttpApiError.InternalServerError(),
			});

			if (sessionData.user === null) return Option.none();

			if (Option.isSome(sessionCookie))
				yield* HttpApp.appendPreResponseHandler(
					Effect.fn(function* (_, _res) {
						let res = _res;

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

			return Option.some({ userId: sessionData.user.id });
		}
		case "oauth": {
			return yield* db
				.use((db) =>
					db.query.oauthSessions.findFirst({
						where: Dz.eq(Db.oauthSessions.accessToken, sessionId),
					}),
				)
				.pipe(
					Effect.map((s) =>
						Option.map(Option.fromNullable(s?.userId), (userId) => ({
							userId,
						})),
					),
				);
		}
	}
}).pipe(Effect.catchTag("ParseError", () => new HttpApiError.BadRequest()));

const AuthenticationLive = Layer.effect(
	Authentication,
	Effect.gen(function* () {
		const db = yield* Database;

		return getCurrentSession.pipe(
			Effect.catchTag(
				"DatabaseError",
				() => new HttpApiError.InternalServerError(),
			),
			Effect.flatMap(
				Effect.catchTag(
					"NoSuchElementException",
					() => new HttpApiError.Forbidden(),
				),
			),
			Effect.provideService(Database, db),
		);
	}),
);

class JwtKeys extends Effect.Service<JwtKeys>()("JwtKeys", {
	effect: Effect.gen(function* () {
		const privateKey = yield* Config.string("JWT_PRIVATE_KEY").pipe(
			Effect.andThen((v) =>
				Effect.promise(() =>
					Jose.importPKCS8(v.replaceAll("\\n", "\n"), "RS256"),
				),
			),
		);

		return { privateKey };
	}),
}) {}

const ServerAuthJWTFromRaw = RawJWT.pipe(
	Schema.transformOrFail(ServerAuthJWT, {
		strict: true,
		encode: Effect.fn(function* (data) {
			const keys = yield* JwtKeys;

			const jwt = yield* Effect.promise(() =>
				new Jose.SignJWT({
					type: "server-registration",
					oauthAppId: data.oauthAppId,
					ownerId: data.ownerId,
				})
					.setProtectedHeader({ alg: "RS256" })
					.setIssuedAt()
					.sign(keys.privateKey),
			);

			return RawJWT.make(jwt);
		}),
		decode: Effect.fn(function* (input, _, ast) {
			const keys = yield* JwtKeys;
			const a = yield* Effect.promise(() =>
				Jose.jwtVerify(input, keys.privateKey),
			);

			return yield* Schema.decodeUnknown(ServerAuthJWT)(a.payload).pipe(
				Effect.catchTag("ParseError", (e) =>
					Effect.fail(new ParseResult.Type(ast, input, e.message)),
				),
			);
		}),
	}),
);

const ServerAuthLive = Layer.effect(
	ServerAuthMiddleware,
	Effect.gen(function* () {
		const keys = yield* JwtKeys;

		return {
			bearer: (v: Redacted.Redacted<string>) =>
				Schema.decode(ServerAuthJWTFromRaw)(Redacted.value(v)).pipe(
					Effect.catchTag("ParseError", () => new HttpApiError.Unauthorized()),
					Effect.provide(JwtKeys.context(keys)),
				),
		};
	}),
);

function marshalCredential(
	c: InferSelectModel<typeof Db.oauthCredentials>,
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
			Effect.fn(
				function* () {
					const db = yield* Database;
					const session = yield* getCurrentSession;

					if (Option.isNone(session)) return Option.none();

					return yield* db
						.use((db) =>
							db.query.users.findFirst({
								where: Dz.eq(Db.users.id, session.value.userId),
								columns: { id: true, email: true },
							}),
						)
						.pipe(Effect.map(Option.fromNullable));
				},
				Effect.catchTag(
					"DatabaseError",
					() => new HttpApiError.InternalServerError(),
				),
			),
		)
		.handle(
			"getUserJwt",
			Effect.fn(function* () {
				const keys = yield* JwtKeys;
				const session = yield* CurrentSession;

				const jwt = yield* Effect.promise(() =>
					new Jose.SignJWT({ type: "user", userId: session.userId })
						.setProtectedHeader({ alg: "RS256" })
						.setIssuedAt()
						.sign(keys.privateKey),
				);

				return { jwt: RawJWT.make(jwt) };
			}),
		)
		.handle(
			"refreshCredential",
			Effect.fn(
				function* ({ path }) {
					const db = yield* Database;

					const providerConfig = AuthProviders[path.providerId];
					if (!providerConfig) return yield* new HttpApiError.BadRequest();

					const session = yield* CurrentSession;

					const where = Dz.and(
						Dz.eq(Db.oauthCredentials.providerId, path.providerId),
						Dz.eq(Db.oauthCredentials.userId, session.userId),
						Dz.eq(Db.oauthCredentials.providerUserId, path.providerUserId),
					);

					const credential = yield* db.use((db) =>
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
								.update(Db.oauthCredentials)
								.set({ token, issuedAt })
								.where(where);

							return {
								...credential,
								issuedAt,
								token,
							};
						}),
					);

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
				},
				Effect.catchTag(
					"DatabaseError",
					() => new HttpApiError.InternalServerError(),
				),
			),
		)
		.handle(
			"getCredentials",
			Effect.fn(
				function* () {
					const db = yield* Database;
					const session = yield* CurrentSession;

					return yield* db
						.use((db) =>
							db.query.oauthCredentials.findMany({
								where: Dz.eq(Db.oauthCredentials.userId, session.userId),
							}),
						)
						.pipe(Effect.map((c) => c.map(marshalCredential)));
				},
				Effect.catchTag(
					"DatabaseError",
					() => new HttpApiError.InternalServerError(),
				),
			),
		)
		.handle(
			"createDeviceCodeFlow",
			Effect.fn(
				function* () {
					const db = yield* Database;
					const serverAuth = yield* ServerAuth;

					const deviceCode = crypto.randomUUID().replaceAll("-", "");

					const userCode = yield* generateUserDeviceCode;

					const expiresIn = 60 * 15;

					yield* db.use((db) =>
						db
							.insert(Db.deviceCodeSessions)
							.values({ appId: serverAuth.oauthAppId, userCode, deviceCode }),
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
				},
				Effect.catchTag(
					"DatabaseError",
					() => new HttpApiError.InternalServerError(),
				),
			),
		)
		.handle(
			"performAccessTokenGrant",
			Effect.fn(
				function* ({ urlParams }) {
					const db = yield* Database;
					const deviceSession = yield* db
						.use((db) =>
							db.query.deviceCodeSessions.findFirst({
								where: Dz.eq(
									Db.deviceCodeSessions.deviceCode,
									urlParams.device_code,
								),
							}),
						)
						.pipe(
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

					yield* Effect.log(`Got device session '${deviceSession.deviceCode}'`);

					const accessToken = crypto.randomUUID().replaceAll("-", "");
					const refreshToken = crypto.randomUUID().replaceAll("-", "");

					yield* db.use((db) =>
						db.transaction(async (db) => {
							await db
								.delete(Db.deviceCodeSessions)
								.where(
									Dz.eq(
										Db.deviceCodeSessions.deviceCode,
										deviceSession.deviceCode,
									),
								);
							await db.insert(Db.oauthSessions).values({
								appId: deviceSession.appId,
								userId: deviceSession.userId,
								accessToken,
								refreshToken,
								expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
							});
						}),
					);

					yield* Effect.log("Access token grant performed");

					return {
						userId: deviceSession.userId,
						access_token: ServerAuthToken.make(accessToken),
						refresh_token: refreshToken,
						token_type: "Bearer" as const,
					};
				},
				Effect.catchTag(
					"DatabaseError",
					() => new HttpApiError.InternalServerError(),
				),
			),
		)
		.handle(
			"startServerRegistration",
			Effect.fn(
				function* () {
					const db = yield* Database;
					const id = crypto.randomUUID().replaceAll("-", "");
					const userCode = yield* generateUserDeviceCode;

					yield* db.use((db) =>
						db.insert(Db.serverRegistrationSessions).values({ id, userCode }),
					);

					const verificationUri = `${serverEnv.VERCEL_URL}/server-registration`;

					return {
						id,
						userCode,
						verification_uri: verificationUri,
						verification_uri_complete: `${verificationUri}?userCode=${encodeURIComponent(
							userCode,
						)}`,
					};
				},
				Effect.catchTag(
					"DatabaseError",
					() => new HttpApiError.InternalServerError(),
				),
			),
		)
		.handle(
			"performServerRegistration",
			Effect.fn(
				function* ({ payload: { id } }) {
					const db = yield* Database;
					const session = yield* db
						.use((db) =>
							db.query.serverRegistrationSessions.findFirst({
								where: Dz.eq(Db.serverRegistrationSessions.id, id),
							}),
						)
						.pipe(
							Effect.flatMap(Option.fromNullable),
							Effect.catchTag(
								"NoSuchElementException",
								() => new ServerRegistrationError({ code: "incorrect_id" }),
							),
						);

					if (session.userId === null)
						return yield* new ServerRegistrationError({
							code: "authorization_pending",
						});

					const { userId } = session;

					const oauthAppId = session.id;

					yield* db.use((db) =>
						db.transaction((db) =>
							Promise.all([
								db
									.delete(Db.serverRegistrationSessions)
									.where(Dz.eq(Db.serverRegistrationSessions.id, id)),
								db.insert(Db.oauthApps).values({
									type: "server",
									id: oauthAppId,
									ownerId: userId,
								}),
							]),
						),
					);

					const token = yield* Schema.encode(ServerAuthJWTFromRaw)(
						new ServerAuthJWT({
							type: "server-registration",
							oauthAppId: oauthAppId,
							ownerId: userId,
						}),
					).pipe(
						Effect.catchTag(
							"ParseError",
							() => new HttpApiError.InternalServerError(),
						),
						Effect.map(RawJWT.make),
					);

					return { token };
				},
				Effect.catchTag(
					"DatabaseError",
					() => new HttpApiError.InternalServerError(),
				),
			),
		)
		.handle(
			"getServerRegistration",
			Effect.fn(
				function* () {
					const db = yield* Database;
					const auth = yield* ServerAuth;

					const registration = yield* db.use((db) =>
						db.query.oauthApps.findFirst({
							where: Dz.and(
								Dz.eq(Db.oauthApps.id, auth.oauthAppId),
								Dz.eq(Db.oauthApps.type, "server"),
							),
						}),
					);

					if (!registration) return yield* new HttpApiError.NotFound();

					return { ownerId: registration.ownerId };
				},
				Effect.catchTag(
					"DatabaseError",
					() => new HttpApiError.InternalServerError(),
				),
			),
		),
);

const ApiDeps = Layer.mergeAll(JwtKeys.Default, Database.Default);

const ApiLive = HttpApiBuilder.api(Api).pipe(
	Layer.provide(ApiLiveGroup),
	Layer.provide(AuthenticationLive),
	Layer.provide(ServerAuthLive),
	Layer.provide(ApiDeps),
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
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";

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
