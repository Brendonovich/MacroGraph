import {
  AccessToken,
  AccessTokenMaybeWithUserId,
  AccessTokenWithUserId,
  AuthProvider,
  RefreshingAuthProvider,
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
    public token: AccessToken
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
    if(!user && this.token.expiresIn){
      console.log(this.token.refreshToken);
      if(this.token.obtainmentTimestamp + (this.token.expiresIn * 1000) < Date.now()) {
        const res = await fetch("https://macrograph.brendonovich.dev/auth/twitch", {
          method: "POST",
          headers: { "Content-Type": "application/json", 'Accept': 'application/json' },
          body: JSON.stringify({"refreshToken": this.token.refreshToken}),
        });
        console.log(res);
    
        const data = await res.json();
        console.log(this.token.accessToken);
        this.token.accessToken = data.access_token;
        this.token.expiresIn = data.expires_in;
        this.token.refreshToken = data.refresh_token;
        this.token.scope = data.scope;
        console.log(this.token.accessToken);
      }

      const res = await fetch("https://api.twitch.tv/helix/users", {
        method: "GET",
        headers: {'Authorization': `Bearer ${this.token.accessToken}`}
      })
      
      console.log(res);
      let userID: UserIdResolvable = res[0].id
      console.log(userID);
      
      return {
        ...this.token,
        obtainmentTimestamp: Date.now(),
        userId: extractUserId(userID)
      };
    }


    return {
      ...this.token,
      obtainmentTimestamp: Date.now(),
      userId: user ? extractUserId(user) : undefined,
    };
  }

  async refreshAccessTokenForUser(
    userId: UserIdResolvable
  ): Promise<AccessTokenWithUserId> {
    console.log("running");
    const refreshToken = this.token.refreshToken;
    if (refreshToken === null) throw new Error("Refresh token is null!");

    const res = await fetch("https://macrograph.brendonovich.dev/auth/twitch", {
      method: "POST",
      headers: { 'content-type': "application/json" },
      body: JSON.stringify({
        refreshToken
      }),
    });

    const data = await res.json();

    (this as any)._accessToken = data.access_token;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      scope: data.scope ?? [],
      expiresIn: data.expires_in ?? null,
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
  obtainmentTimestamp: z.optional(z.number()),
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
