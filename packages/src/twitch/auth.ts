import {
  AccessTokenWithUserId,
  AuthProvider,
  StaticAuthProvider,
} from "@twurple/auth";
import { createEffect, createMemo, createSignal, createRoot } from "solid-js";
import { Maybe, None } from "@macrograph/core";
import { extractUserId, UserIdResolvable } from "@twurple/api";
import { z } from "zod";

const clientId = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export const TWITCH_ACCCESS_TOKEN = "TwitchAccessToken";

class MacroGraphAuthProvider
  extends StaticAuthProvider
  implements AuthProvider
{
  refreshToken: string;

  constructor(clientId: string, accessToken: string, refreshToken: string) {
    super(clientId, accessToken);
    this.refreshToken = refreshToken;
  }

  async refreshAccessTokenForUser(
    userId: UserIdResolvable
  ): Promise<AccessTokenWithUserId> {
    const res = await fetch("https://macrograph.brendonovich.dev/auth/twitch", {
      method: "POST",
      body: new URLSearchParams({
        refreshToken: this.refreshToken,
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
      accessToken().map(
        (token) =>
          new MacroGraphAuthProvider(
            clientId,
            token.accessToken,
            token.refreshToken
          )
      ),
    None
  );

  return { accessToken, setAccessToken, authProvider };
});

export { accessToken, setAccessToken, authProvider };
