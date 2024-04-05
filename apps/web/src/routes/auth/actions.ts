"use server";

import * as jose from "jose";

import { env } from "~/env/server";
import { AuthProvider, AuthProviderConfig, AuthProviders } from "./providers";
import { OAUTH_STATE, CALLBACK_SEARCH_PARAMS, TOKEN } from "./[provider]/types";
import { z } from "zod";

type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K>
  : never;

export async function getOAuthLoginURL(
  provider: AuthProvider,
  statePayload: DistributiveOmit<z.infer<typeof OAUTH_STATE>, "redirect_uri">
) {
  const providerConfig = AuthProviders[provider];

  const state = await new jose.SignJWT(
    OAUTH_STATE.parse({
      ...statePayload,
      redirect_uri: `${env.VERCEL_URL}/auth/${provider}/callback`,
    })
  )
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(env.AUTH_SECRET));

  const params = new URLSearchParams({
    ...providerConfig.authorize?.searchParams,
    client_id: providerConfig.clientId,
    redirect_uri: `${env.AUTH_REDIRECT_PROXY_URL}/auth/proxy`,
    response_type: "code",
    scope: (providerConfig.scopes || []).join(" "),
    state,
  });

  return `${providerConfig.authorize.url}?${params}`;
}

export async function loginURLForProvider(provider: AuthProvider) {
  const providerConfig = AuthProviders[provider];
  if (!providerConfig) throw new Error(`Unknown provider ${provider}`);

  return await getOAuthLoginURL(provider, {
    env: "credentials",
    targetOrigin: env.VERCEL_URL,
  });
}

export async function exchangeOAuthToken(
  providerConfig: AuthProviderConfig,
  { code }: z.infer<typeof CALLBACK_SEARCH_PARAMS>
) {
  const res = await fetch(providerConfig.token.url, {
    method: "POST",
    body: new URLSearchParams({
      ...providerConfig.token?.searchParams,
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${env.AUTH_REDIRECT_PROXY_URL}/auth/proxy`,
    }),
    headers: providerConfig.token?.headers,
  });

  return TOKEN.parse(await res.json());
}

export async function validateCallbackSearchParams(
  searchParams: URLSearchParams
) {
  return CALLBACK_SEARCH_PARAMS.parse({
    code: searchParams.get("code"),
    state: (
      await jose.jwtVerify(
        searchParams.get("state")!,
        new TextEncoder().encode(env.AUTH_SECRET)
      )
    ).payload,
  });
}
export async function performOAuthExchange(
  provider: string,
  searchParams: string
) {
  const providerConfig = AuthProviders[provider];
  if (!providerConfig) throw new Error("unknown-provider");

  const token = await exchangeOAuthToken(
    providerConfig,
    await validateCallbackSearchParams(new URLSearchParams(searchParams))
  );

  const user = await providerConfig.getUserData?.(token.access_token);
  if (!user) throw new Error("no-user-data");

  return { user, token };
}
