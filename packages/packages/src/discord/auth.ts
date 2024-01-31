import { createSignal } from "solid-js";
import { OAuthToken } from "@macrograph/runtime";
import { None, Option, makePersistedOption } from "@macrograph/option";

const BOT_TOKEN_LOCALSTORAGE = "discordBotToken";
const USER_TOKEN_LOCALSTORAGE = "discordToken";

export function createAuth() {
  const [botToken, setBotToken] = makePersistedOption(
    createSignal<Option<string>>(None),
    BOT_TOKEN_LOCALSTORAGE
  );

  const [authToken, setAuthToken] = makePersistedOption(
    createSignal<Option<OAuthToken>>(None),
    USER_TOKEN_LOCALSTORAGE
  );

  return {
    authToken,
    setAuthToken,
    botToken,
    setBotToken,
  };
}

export type Auth = ReturnType<typeof createAuth>;
