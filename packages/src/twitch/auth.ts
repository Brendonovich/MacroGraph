import {
  AccessToken,
  AccessTokenMaybeWithUserId,
  AccessTokenWithUserId,
  AuthProvider,
  RefreshingAuthProvider,
} from "@twurple/auth";
import { createEffect, createMemo, createSignal, createRoot } from "solid-js";
import { Maybe, None, Option, Some } from "@macrograph/core";
import { extractUserId, UserIdResolvable } from "@twurple/api";
import { z } from "zod";
import { createMutable } from "solid-js/store";

const clientId = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export const TWITCH_ACCCESS_TOKEN = "TwitchAccessToken";

class MacroGraphAuthProvider implements AuthProvider {
  token: Option<AccessTokenWithUserId>;
  constructor(public clientId: string) {
    this.token = Maybe(localStorage.getItem(TWITCH_ACCCESS_TOKEN)).map((j) =>
      SCHEMA.parse(JSON.parse(j))
    );
    return createMutable(this);
  }

  getCurrentScopesForUser(_: UserIdResolvable) {
    return this.token.map((t) => t.scope).unwrapOr([]);
  }

  logOut() {
    localStorage.removeItem(TWITCH_ACCCESS_TOKEN);
    this.token = None;
  }

  async getAccessTokenForUser(
    user: UserIdResolvable,
    _?: string[] | undefined
  ) {
    return {
      ...this.token.expect("getAccessTokenForUser missing token"),
      obtainmentTimestamp: Date.now(),
      userId: extractUserId(user),
    };
  }

  async addUser(token: AccessTokenWithUserId) {
    const res = await fetch("https://api.twitch.tv/helix/users", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Client-Id": clientId,
      },
    });

    const userId = (await res.json()).data[0].id;
    const preSome = { ...token, userId };
    this.token = Some(preSome);
    localStorage.setItem(TWITCH_ACCCESS_TOKEN, JSON.stringify(preSome));
  }

  async getAnyAccessToken(): Promise<AccessTokenWithUserId> {
    return {
      ...this.token.expect("getAnyAccessToken missing token"),
    };
  }

  async refreshAccessTokenForUser(
    userId: UserIdResolvable
  ): Promise<AccessTokenWithUserId> {
    console.log("running");
    const { refreshToken } = this.token.expect(
      "refreshAccessTokenForUser missing token"
    );
    if (refreshToken === null) throw new Error("Refresh token is null!");

    const res = await fetch("https://macrograph.brendonovich.dev/auth/twitch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    const data = await res.json();

    let returnData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      scope: data.scope ?? [],
      expiresIn: data.expires_in ?? null,
      obtainmentTimestamp: Date.now(),
      userId: userId.toString(),
    };
    localStorage.setItem(TWITCH_ACCCESS_TOKEN, JSON.stringify(returnData));
    return returnData;
  }
}

const SCHEMA = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  scope: z.array(z.string()),
  expiresIn: z.number(),
  obtainmentTimestamp: z.number(),
  userId: z.string(),
});

export const authProvider = new MacroGraphAuthProvider(clientId);
