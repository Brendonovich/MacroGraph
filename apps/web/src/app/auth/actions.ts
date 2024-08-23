"use server";

import * as jose from "jose";

import { OAUTH_TOKEN } from "@macrograph/api-contract";
import { getRequestHost, getRequestProtocol } from "vinxi/http";
import type { z } from "zod";
import { serverEnv } from "~/env/server";
import { CALLBACK_SEARCH_PARAMS, OAUTH_STATE } from "./[provider]/types";
import {
	type AuthProvider,
	type AuthProviderConfig,
	AuthProviders,
} from "./providers";

type DistributiveOmit<T, K extends keyof any> = T extends any
	? Omit<T, K>
	: never;

export async function getOAuthLoginURL(
	provider: AuthProvider,
	callbackOrigin: string,
	statePayload: DistributiveOmit<z.infer<typeof OAUTH_STATE>, "redirect_uri">,
) {
	const providerConfig = AuthProviders[provider];

	const state = await new jose.SignJWT(
		OAUTH_STATE.parse({
			...statePayload,
			redirect_uri: `${getRedirectOrigin(
				callbackOrigin,
			)}/auth/${provider}/callback`,
		}),
	)
		.setProtectedHeader({ alg: "HS256" })
		.sign(new TextEncoder().encode(serverEnv.AUTH_SECRET));

	const params = new URLSearchParams({
		...providerConfig.authorize?.searchParams,
		client_id: providerConfig.clientId,
		redirect_uri: `${serverEnv.AUTH_REDIRECT_PROXY_URL}/auth/proxy`,
		response_type: "code",
		scope: (providerConfig.scopes || []).join(" "),
		state,
	});

	return `${providerConfig.authorize.url}?${params}`;
}

const VALID_REDIRECT_ORIGINS = [
	"https://macrograph.brendonovich.dev",
	"https://www.macrograph.app",
	"http://localhost:4321",
	serverEnv.AUTH_REDIRECT_PROXY_URL,
	serverEnv.VERCEL_URL,
	serverEnv.VERCEL_BRANCH_URL,
];

export function getRedirectOrigin(desired: string) {
	return VALID_REDIRECT_ORIGINS.includes(desired)
		? desired
		: serverEnv.VERCEL_URL;
}

export async function loginURLForProvider(provider: AuthProvider) {
	const providerConfig = AuthProviders[provider];
	if (!providerConfig) throw new Error(`Unknown provider ${provider}`);

	const requestOrigin = `${getRequestProtocol()}://${getRequestHost()}`;

	const targetOrigin = getRedirectOrigin(requestOrigin);

	return await getOAuthLoginURL(provider, targetOrigin, {
		env: "credentials",
		targetOrigin,
	});
}

export async function exchangeOAuthToken(
	providerConfig: AuthProviderConfig,
	{ code }: z.infer<typeof CALLBACK_SEARCH_PARAMS>,
) {
	const res = await fetch(providerConfig.token.url, {
		method: "POST",
		body: new URLSearchParams({
			...providerConfig.token?.searchParams,
			client_id: providerConfig.clientId,
			client_secret: providerConfig.clientSecret,
			code,
			grant_type: "authorization_code",
			redirect_uri: `${serverEnv.AUTH_REDIRECT_PROXY_URL}/auth/proxy`,
		}),
		headers: providerConfig.token?.headers,
	});

	return OAUTH_TOKEN.parse(await res.json());
}

export async function validateCallbackSearchParams(
	searchParams: URLSearchParams,
) {
	console.trace(searchParams);
	return CALLBACK_SEARCH_PARAMS.parse({
		code: searchParams.get("code"),
		state: (
			await jose.jwtVerify(
				searchParams.get("state")!,
				new TextEncoder().encode(serverEnv.AUTH_SECRET),
			)
		).payload,
	});
}
export async function performOAuthExchange(
	provider: string,
	searchParams: string,
) {
	const providerConfig = AuthProviders[provider];
	if (!providerConfig) throw new Error("unknown-provider");

	const token = await exchangeOAuthToken(
		providerConfig,
		await validateCallbackSearchParams(new URLSearchParams(searchParams)),
	);

	const user = await providerConfig.getUserData?.(token.access_token);
	if (!user) throw new Error("no-user-data");

	return { user, token };
}

export async function refreshToken(
	providerConfig: AuthProviderConfig,
	refreshToken: string,
) {
	"use server";

	if (providerConfig.refresh === false) return null;

	const res = await fetch(providerConfig.token.url, {
		method: "POST",
		body: new URLSearchParams({
			...providerConfig.token?.searchParams,
			client_id: providerConfig.clientId,
			client_secret: providerConfig.clientSecret,
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		}),
		headers: providerConfig.token?.headers,
	});

	return OAUTH_TOKEN.parse(await res.json());
}
