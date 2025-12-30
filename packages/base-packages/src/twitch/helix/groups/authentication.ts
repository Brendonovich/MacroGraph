import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const AppAccessTokenRequest = S.Struct({
	client_id: S.String,
	client_secret: S.String,
	grant_type: S.Literal("client_credentials"),
	scope: S.optional(S.String),
});

export const UserAccessTokenRequest = S.Struct({
	client_id: S.String,
	client_secret: S.String,
	code: S.String,
	grant_type: S.Literal("authorization_code"),
	redirect_uri: S.String,
});

export const DeviceAccessTokenRequest = S.Struct({
	client_id: S.String,
	device_code: S.String,
	grant_type: S.Literal("urn:ietf:params:oauth:grant-type:device_code"),
	scope: S.optional(S.String),
});

export const RefreshTokenRequest = S.Struct({
	client_id: S.String,
	client_secret: S.String,
	grant_type: S.Literal("refresh_token"),
	refresh_token: S.String,
});

export const RevokeTokenRequest = S.Struct({
	client_id: S.String,
	token: S.String,
});

export const DeviceCodeRequest = S.Struct({
	client_id: S.String,
	scope: S.optional(S.String),
});

export const AccessCredentials = S.Struct({
	access_token: S.String,
	refresh_token: S.optional(S.String),
	expires_in: S.Int,
	scope: S.Array(S.String),
});

export const DeviceVerificationCredentials = S.Struct({
	device_code: S.String,
	expires_in: S.Int,
	interval: S.Int,
	user_code: S.String,
	verification_uri: S.String,
});

export const ValidateTokenResponse = S.Struct({
	client_id: S.String,
	login: S.String,
	scopes: S.Array(S.String),
	user_id: S.String,
	expires_in: S.optional(S.Int),
});

export const GetAuthorizationUrlParams = S.Struct({
	response_type: S.Literal("code", "token"),
	client_id: S.String,
	redirect_uri: S.String,
	scope: S.String,
	state: S.optional(S.String),
	force_verify: S.optional(S.Literal("true", "false")),
});

export const AuthenticationGroup = HttpApiGroup.make("authentication")
	.add(
		HttpApiEndpoint.get(
			"getAuthorizationUrl",
			"/oauth2/authorize",
		).setUrlParams(GetAuthorizationUrlParams),
	)
	.add(
		HttpApiEndpoint.post("getAccessToken", "/oauth2/token")
			.setPayload(
				S.Union(
					AppAccessTokenRequest,
					UserAccessTokenRequest,
					DeviceAccessTokenRequest,
					RefreshTokenRequest,
				),
			)
			.addSuccess(AccessCredentials),
	)
	.add(
		HttpApiEndpoint.get("validateToken", "/oauth2/validate").addSuccess(
			ValidateTokenResponse,
		),
	)
	.add(
		HttpApiEndpoint.post("revokeToken", "/oauth2/revoke").setPayload(
			RevokeTokenRequest,
		),
	)
	.add(
		HttpApiEndpoint.post("requestDeviceCode", "/device")
			.setPayload(DeviceCodeRequest)
			.addSuccess(DeviceVerificationCredentials),
	);
