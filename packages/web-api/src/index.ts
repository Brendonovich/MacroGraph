import {
	HttpApi,
	HttpApiEndpoint,
	HttpApiError,
	HttpApiGroup,
	HttpApiMiddleware,
	HttpApiSchema,
} from "@effect/platform";
import { Context } from "effect";
import * as S from "effect/Schema";

export class CurrentSession extends Context.Tag("CurrentSession")<
	CurrentSession,
	{ userId: string }
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

export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
	"Authentication",
	{
		provides: CurrentSession,
		failure: S.Union(
			HttpApiError.Forbidden,
			HttpApiError.BadRequest,
			HttpApiError.InternalServerError,
		),
	},
) {}

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

export class Api extends HttpApi.make("api")
	.add(
		HttpApiGroup.make("api", { topLevel: true })
			.add(
				HttpApiEndpoint.get("getUser", "/user")
					.addSuccess(
						S.NullOr(
							S.Struct({
								id: S.String,
								email: S.String,
							}),
						),
					)
					.addError(HttpApiError.InternalServerError)
					.addError(HttpApiError.BadRequest),
			)
			.add(
				HttpApiEndpoint.get("getUserJwt", "/user/jwt")
					.middleware(Authentication)
					.addSuccess(S.Struct({ jwt: S.String }))
					// .addError(HttpApiError.InternalServerError)
					.addError(HttpApiError.BadRequest),
			)
			.add(
				HttpApiEndpoint.post(
					"refreshCredential",
					"/credentials/:providerId/:providerUserId/refresh",
				)
					.middleware(Authentication)
					.setPath(
						S.Struct({
							providerId: S.String,
							providerUserId: S.String,
						}),
					)
					.addSuccess(CREDENTIAL),
			)
			.add(
				HttpApiEndpoint.get("getCredentials", "/credentials")
					.middleware(Authentication)
					.addSuccess(S.Array(CREDENTIAL)),
			)
			.add(
				HttpApiEndpoint.post(
					"createDeviceCodeFlow",
					"/login/device/code",
				).addSuccess(
					S.Struct({
						device_code: S.String,
						user_code: S.String,
						verification_uri: S.String,
						expires_in: S.Int,
						verification_uri_complete: S.String,
					}),
				),
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
							access_token: S.String,
							refresh_token: S.String,
							token_type: S.Literal("Bearer"),
						}).pipe(HttpApiSchema.withEncoding({ kind: "Json" })),
					)
					.addError(DeviceFlowError)
					.addError(HttpApiError.InternalServerError),
			),
	)
	.prefix("/api") {}
