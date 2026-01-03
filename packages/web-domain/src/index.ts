import {
	HttpApi,
	HttpApiEndpoint,
	HttpApiError,
	HttpApiGroup,
	HttpApiMiddleware,
	HttpApiSchema,
} from "@effect/platform";
import { Context, Data, Schema } from "effect";
import * as S from "effect/Schema";

export type AuthData = { userId: string } & (
	| { source: "session"; type: "web" | "desktop" }
	| { source: "userAccessToken" }
	| { source: "serverJwt"; jwt: ServerAuthJWT }
);

export class Authentication extends Context.Tag("Authentication")<
	Authentication,
	AuthData
>() {}

export const OAUTH_TOKEN = S.Struct({
	access_token: S.String,
	expires_in: S.Number,
	refresh_token: S.optional(S.String),
	token_type: S.String,
});

export const CREDENTIAL = S.Struct({
	provider: S.String,
	id: S.String,
	displayName: S.NullOr(S.String),
	token: S.extend(OAUTH_TOKEN, S.Struct({ issuedAt: S.Number })),
});

export class DeviceFlowError extends S.TaggedError<DeviceFlowError>()(
	"DeviceFlowError",
	{
		code: S.Literal(
			"authorization_pending",
			"expired_token",
			"incorrect_device_code",
			"access_denied",
		),
	},
	HttpApiSchema.annotations({ status: 400 }),
) {}

export class ServerRegistrationError extends S.TaggedError<ServerRegistrationError>()(
	"ServerRegistrationError",
	{ code: S.Literal("authorization_pending", "incorrect_id", "access_denied") },
	HttpApiSchema.annotations({ status: 400 }),
) {}

export const RawJWT = Schema.String.pipe(Schema.brand("RawJWT"));
export type RawJWT = Schema.Schema.Type<typeof RawJWT>;

export const ServerRegistration = Schema.Struct({
	ownerId: Schema.String,
	// email: Schema.String,
	// jwt: RawJWT
});
export type ServerRegistration = Schema.Schema.Type<typeof ServerRegistration>;

export class ServerAuthJWT extends Schema.Class<ServerAuthJWT>("ServerAuthJWT")(
	{ oauthAppId: Schema.String, ownerId: Schema.String },
) {}

export class AuthenticationMiddleware extends HttpApiMiddleware.Tag<AuthenticationMiddleware>()(
	"AuthenticationMiddleware",
	{
		provides: Authentication,
		failure: S.Union(
			HttpApiError.Forbidden,
			HttpApiError.BadRequest,
			HttpApiError.InternalServerError,
			HttpApiError.Unauthorized,
		),
	},
) {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
	cause: unknown;
}> {}

export class Api extends HttpApi.make("api")
	.add(
		HttpApiGroup.make("api", { topLevel: true })
			.add(
				HttpApiEndpoint.get("getUser", "/user")
					.addSuccess(
						S.OptionFromNullOr(S.Struct({ id: S.String, email: S.String })),
					)
					.addError(HttpApiError.InternalServerError)
					.addError(HttpApiError.BadRequest),
			)
			.add(
				HttpApiEndpoint.post(
					"refreshCredential",
					"/credentials/:providerId/:providerUserId/refresh",
				)
					.middleware(AuthenticationMiddleware)
					.setPath(S.Struct({ providerId: S.String, providerUserId: S.String }))
					.addSuccess(CREDENTIAL),
			)
			.add(
				HttpApiEndpoint.get("getCredentials", "/credentials")
					.middleware(AuthenticationMiddleware)
					.addSuccess(S.Array(CREDENTIAL)),
			)
			.add(
				HttpApiEndpoint.post("createDeviceCodeFlow", "/login/device/code")
					.addSuccess(
						S.Struct({
							device_code: S.String,
							user_code: S.String,
							verification_uri: S.String,
							expires_in: S.Int,
							verification_uri_complete: S.String,
						}),
					)
					.middleware(AuthenticationMiddleware),
			)
			.add(
				HttpApiEndpoint.post(
					"performAccessTokenGrant",
					"/login/oauth/access_token",
				)
					.setUrlParams(
						S.Struct({
							device_code: S.String,
							grant_type: S.Literal(
								"urn:ietf:params:oauth:grant-type:device_code",
							),
						}),
					)
					.addSuccess(
						S.Struct({
							userId: S.String,
							access_token: S.String,
							refresh_token: S.String,
							token_type: S.Literal("Bearer"),
						}).pipe(HttpApiSchema.withEncoding({ kind: "Json" })),
					)
					.addError(DeviceFlowError)
					.addError(HttpApiError.InternalServerError),
			)
			.add(
				HttpApiEndpoint.post(
					"startServerRegistration",
					"/server/registration/start",
				)
					.addSuccess(
						S.Struct({
							id: S.String,
							userCode: S.String,
							verification_uri: S.String,
							verification_uri_complete: S.String,
						}),
					)
					.addError(HttpApiError.InternalServerError),
			)
			.add(
				HttpApiEndpoint.post(
					"performServerRegistration",
					"/server/registration",
				)
					.setPayload(S.Struct({ id: S.String }))
					.addSuccess(S.Struct({ token: RawJWT }))
					.addError(ServerRegistrationError)
					.addError(HttpApiError.InternalServerError),
			)
			.add(
				HttpApiEndpoint.get("getServerRegistration", "/server/registration")
					.addSuccess(Schema.Struct({ ownerId: Schema.String }))
					.addError(HttpApiError.InternalServerError)
					.addError(HttpApiError.NotFound)
					.middleware(AuthenticationMiddleware),
			),
	)
	.prefix("/api") {}
