"use server";

import * as jose from "jose";

import { env } from "~/env/server";
import { AuthProviderConfig, AuthProviders } from "./providers";
import { PARAMS, TOKEN } from "~/schemas/twitch";

export async function loginURLForProvider(provider: string) {
  const providerConfig = AuthProviders[provider];
  if (!providerConfig) throw new Error(`Unknown provider ${provider}`);

  const state = await new jose.SignJWT({
    targetOrigin: env.VERCEL_URL,
    provider,
    intent: "login",
  })
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

async function exchangeOAuthToken(
  providerConfig: AuthProviderConfig,
  searchParamsString: string
) {
  const searchParams = new URLSearchParams(searchParamsString);

  const { code } = PARAMS.parse({
    code: searchParams.get("code"),
    state: (
      await jose.jwtVerify(
        searchParams.get("state")!,
        new TextEncoder().encode(env.AUTH_SECRET)
      )
    ).payload,
  });

  const res = await fetch(`${providerConfig.token.url}`, {
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

export async function performOAuthExchange(
  provider: string,
  searchParams: string
) {
  const providerConfig = AuthProviders[provider];
  if (!providerConfig) throw new Error("unknown-provider");

  const token = await exchangeOAuthToken(providerConfig, searchParams);

  const user = await providerConfig.getUserData?.(token.access_token);
  if (!user) throw new Error("no-user-data");

  return { user, token };
}
