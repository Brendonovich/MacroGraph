import { createSignal } from "solid-js";
import { Maybe, OAuthToken, Option } from "@macrograph/core";

const BOT_TOKEN_LOCALSTORAGE = "discordBotToken";
const USER_TOKEN_LOCALSTORAGE = "discordToken";

export function createAuth() {
  const [botToken, setBotToken] = createSignal<Option<string>>(
    Maybe(localStorage.getItem(BOT_TOKEN_LOCALSTORAGE))
  );

  const [authToken, setAuthToken] = createSignal<Option<OAuthToken>>(
    Maybe(localStorage.getItem(USER_TOKEN_LOCALSTORAGE)).map(JSON.parse)
  );

  return {
    authToken,
    setAuthToken: (token: Option<OAuthToken>) => {
      setAuthToken(token);
      if (token.isNone()) localStorage.removeItem(USER_TOKEN_LOCALSTORAGE);
      else
        token.peek((token) =>
          localStorage.setItem(USER_TOKEN_LOCALSTORAGE, JSON.stringify(token))
        );
    },
    botToken,
    setBotToken: (token: Option<string>) => {
      setBotToken(token);

      if (token.isNone()) localStorage.removeItem(BOT_TOKEN_LOCALSTORAGE);
      else
        token.peek((token) =>
          localStorage.setItem(BOT_TOKEN_LOCALSTORAGE, token)
        );
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;
