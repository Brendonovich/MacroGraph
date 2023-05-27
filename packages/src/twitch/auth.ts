import { AccessTokenWithUserId, AuthProvider } from "@twurple/auth";
import { Maybe, None, Some } from "@macrograph/core";
import { extractUserId, UserIdResolvable } from "@twurple/api";
import { z } from "zod";
import { createMutable } from "solid-js/store";

const clientId = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export const TWITCH_ACCCESS_TOKEN = "TwitchAccessToken";

export interface AccessTokenWithUsernameAndId extends AccessTokenWithUserId {
  userName: string;
}

class MacroGraphAuthProvider implements AuthProvider {
  tokens: Record<string, AccessTokenWithUsernameAndId>;

  constructor(public clientId: string) {
    this.tokens = Maybe(localStorage.getItem(TWITCH_ACCCESS_TOKEN))
      .andThen((j) => {
        const data = SCHEMA.safeParse(JSON.parse(j));
        if (data.success) return Some(data.data);
        return None;
      })
      .unwrapOr({});

    return createMutable(this);
  }

  getCurrentScopesForUser(userId: UserIdResolvable) {
    const id = extractUserId(userId);
    return this.tokens[id]?.scope ?? [];
  }

  logOut(userID: UserIdResolvable) {
    const id = extractUserId(userID);
    delete this.tokens[id];
    localStorage.setItem(TWITCH_ACCCESS_TOKEN, JSON.stringify(this.tokens));
    return this.tokens;
  }

  async getAccessTokenForUser(
    userId: UserIdResolvable,
    _?: string[] | undefined
  ) {
    const id = extractUserId(userId);
    return {
      ...Maybe(this.tokens[id]).expect("getAccessTokenForUser missing token"),
      obtainmentTimestamp: Date.now(),
      userId: id,
      userName: this.tokens[id]?.userName,
    };
  }

  async addUser(token: AccessTokenWithUsernameAndId) {
    const res = await fetch("https://api.twitch.tv/helix/users", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Client-Id": clientId,
      },
    });
    const resData = await res.json();
    const userId = resData.data[0].id;
    const userName = resData.data[0].display_name;
    const preSome = { ...token, userId, userName };
    this.tokens[userId] = preSome;
    localStorage.setItem(TWITCH_ACCCESS_TOKEN, JSON.stringify(this.tokens));
    return userId;
  }

  async getAnyAccessToken(
    userId?: UserIdResolvable
  ): Promise<AccessTokenWithUsernameAndId> {
    return {
      ...Maybe(
        this.tokens[
          Maybe(userId)
            .map(extractUserId)
            .expect("User Id not provided on any access token")
        ]
      ).expect("getAnyAccessToken missing token"),
    };
  }

  async refreshAccessTokenForUser(
    user: UserIdResolvable
  ): Promise<AccessTokenWithUsernameAndId> {
    const userId = extractUserId(user);

    const { userName, refreshToken } = Maybe(this.tokens[userId]).expect(
      "refreshAccessTokenForUser missing token"
    );

    Maybe(refreshToken).expect("Refresh token is null!");

    const res = await fetch("https://macrograph.brendonovich.dev/auth/twitch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    const data = await res.json();
    const returnData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      scope: data.scope ?? [],
      expiresIn: data.expires_in ?? null,
      obtainmentTimestamp: Date.now(),
      userId,
      userName,
    };
    this.tokens[userId] = returnData;
    localStorage.setItem(TWITCH_ACCCESS_TOKEN, JSON.stringify(this.tokens));
    return returnData;
  }
}

const SCHEMA = z.record(
  z.string(),
  z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    scope: z.array(z.string()),
    expiresIn: z.number(),
    obtainmentTimestamp: z.number(),
    userId: z.string(),
    userName: z.string(),
  })
);

export const auth = new MacroGraphAuthProvider(clientId);
