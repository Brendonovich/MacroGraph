import { Maybe, None, Some } from "@macrograph/core";
import { z } from "zod";
import { ReactiveMap } from "@solid-primitives/map";
import { chat, helix } from ".";

const clientId = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export const TWITCH_ACCCESS_TOKEN = "TwitchAccessToken";

export interface User {
  userName: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  scope: string[];
  expiresIn: number;
  obtainmentTimestamp: number;
}

const tokenHasExpired = (token: User) =>
  Date.now() < token.obtainmentTimestamp + token.expiresIn * 1000;

export interface UserIdResolvableType {
  /**
   * The ID of the user.
   */
  id: string;
}

export type UserIdResolvable = string | number | UserIdResolvableType;

class MacroGraphAuthProvider {
  tokens: ReactiveMap<string, User>;

  constructor(public clientId: string) {
    this.tokens = Maybe(localStorage.getItem(TWITCH_ACCCESS_TOKEN))
      .andThen((j) => {
        const data = SCHEMA.safeParse(JSON.parse(j));
        if (data.success)
          return Some(new ReactiveMap(Object.entries(data.data)));
        return None;
      })
      .unwrapOr(new ReactiveMap());

    this.tokens.forEach((token) => {
      if (tokenHasExpired(token)) this.refreshTimer(token);
    });
  }

  logOut(userID: UserIdResolvable) {
    const id = extractUserId(userID);
    this.tokens.delete(id);
    this.saveTokens();
  }

  async getAccessTokenForUser(
    userId: UserIdResolvable,
    _?: string[] | undefined
  ) {
    const id = extractUserId(userId);
    return {
      ...Maybe(this.tokens.get(id)).expect(
        "getAccessTokenForUser missing token"
      ),
      obtainmentTimestamp: Date.now(),
      userId: id,
    };
  }

  async addUser(token: User) {
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

    this.tokens.set(userId, { ...token, userId, userName });
    this.saveTokens();

    return userId;
  }

  async getAnyAccessToken(userId?: UserIdResolvable): Promise<User> {
    return {
      ...Maybe(
        this.tokens.get(
          Maybe(userId)
            .map(extractUserId)
            .expect("User Id not provided on any access token")
        )
      ).expect("getAnyAccessToken missing token"),
    };
  }

  async refreshAccessTokenForUser(
    user: string,
    force?: boolean
  ): Promise<User> {
    const userId = user;

    const token = Maybe(this.tokens.get(userId)).expect(
      "refreshAccessTokenForUser missing token"
    );

    if (!force && tokenHasExpired(token)) return token;

    Maybe(token.refreshToken).expect("Refresh token is null!");

    const res = await fetch("https://macrograph.brendonovich.dev/auth/twitch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
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
      userName: token.userName,
    };

    this.tokens.set(userId, returnData);
    this.saveTokens();
    this.refreshTimer(token);

    return returnData;
  }

  async refreshTimer(token: User) {
    setTimeout(() => {
      this.refreshAccessTokenForUser(token.userId, true);
      if (chat.writeUserId().unwrap() === token.userId)
        chat.setWriteUserId(Some(chat.writeUserId().unwrap()));
      if (helix.userId().unwrap() === token.userId)
        helix.setUserId(Some(helix.userId().unwrap()));
    }, token.obtainmentTimestamp + token.expiresIn * 1000 - Date.now() - 60000);
  }

  saveTokens() {
    localStorage.setItem(
      TWITCH_ACCCESS_TOKEN,
      JSON.stringify(
        [...this.tokens.entries()].reduce(
          (acc, [key, value]) => ({ ...acc, [key]: value }),
          {}
        )
      )
    );
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

export function extractUserId(user: UserIdResolvable): string {
  if (typeof user === "string") {
    return user;
  } else if (typeof user === "number") {
    return user.toString(10);
  } else {
    return user.id;
  }
}

export const auth = new MacroGraphAuthProvider(clientId);
