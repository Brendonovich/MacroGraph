import { createSignal } from "solid-js";
import { Maybe, None, OAuthToken, Option } from "@macrograph/core";

const DISCORD_BOT_TOKEN = "discordBotToken";

export function createAuth() {
  const [botToken, setBotToken] = createSignal<Option<string>>(
    Maybe(localStorage.getItem(DISCORD_BOT_TOKEN))
  );

  const [authToken, setAuthToken] = createSignal<Option<OAuthToken>>(None);

  return {
    authToken,
    setAuthToken,
    botToken,
    setBotToken: (token: Option<string>) => {
      setBotToken(token);

      if (token.isNone()) localStorage.removeItem(DISCORD_BOT_TOKEN);
      else
        token.peek((token) => localStorage.setItem(DISCORD_BOT_TOKEN, token));
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;
