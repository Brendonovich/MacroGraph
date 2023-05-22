import {
  AccessToken,
  AccessTokenMaybeWithUserId,
  AccessTokenWithUserId,
  AuthProvider,
} from "@twurple/auth";
import { createEffect, createMemo, createSignal, createRoot } from "solid-js";
import { Maybe, None } from "@macrograph/core";
import { extractUserId, UserIdResolvable } from "@twurple/api";
import { z } from "zod";

const clientId = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export const TWITCH_ACCCESS_TOKEN = "TwitchAccessToken";

class MacroGraphAuthProvider implements AuthProvider {
  constructor(
    public clientId: string,
    public token: Omit<AccessToken, "obtainmentTimestamp">
  ) {}

  getCurrentScopesForUser(_: UserIdResolvable) {
    return this.token.scope;
  }

  async getAccessTokenForUser(
    user: UserIdResolvable,
    _?: string[] | undefined
  ) {
    return {
      ...this.token,
      obtainmentTimestamp: Date.now(),
      userId: extractUserId(user),
    };
  }

  async getAnyAccessToken(
    user?: UserIdResolvable | undefined
  ): Promise<AccessTokenMaybeWithUserId> {
    return {
      ...this.token,
      obtainmentTimestamp: Date.now(),
      userId: user ? extractUserId(user) : undefined,
    };
  }

  async refreshAccessTokenForUser(
    userId: UserIdResolvable
  ): Promise<AccessTokenWithUserId> {
    const refreshToken = this.token.refreshToken;
    if (refreshToken === null) throw new Error("Refresh token is null!");

    const res = await fetch("https://macrograph.brendonovich.dev/auth/twitch", {
      method: "POST",
      body: new URLSearchParams({
        refreshToken,
      }),
    });

    const data = await res.json();

    (this as any)._accessToken = data.access_token;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      scope: data.scope ?? [],
      expiresIn: 5 ?? null,
      obtainmentTimestamp: Date.now(),
      userId: extractUserId(userId),
    };
  }
}

const SCHEMA = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  scope: z.array(z.string()),
  expiresIn: z.number(),
});

const { accessToken, setAccessToken, authProvider } = createRoot(() => {
  const [accessToken, setAccessToken] = createSignal(
    Maybe(localStorage.getItem(TWITCH_ACCCESS_TOKEN)).map((j) =>
      SCHEMA.parse(JSON.parse(j))
    )
  );

  createEffect(() => {
    const token = accessToken();

    token
      .map(
        (v) => (
          localStorage.setItem(TWITCH_ACCCESS_TOKEN, JSON.stringify(v)), true
        )
      )
      .unwrapOrElse(
        () => (localStorage.removeItem(TWITCH_ACCCESS_TOKEN), false)
      );
  });

  const authProvider = createMemo(
    () =>
      accessToken().map((token) => new MacroGraphAuthProvider(clientId, token)),
    None
  );

  return { accessToken, setAccessToken, authProvider };
});

export { accessToken, setAccessToken, authProvider };
