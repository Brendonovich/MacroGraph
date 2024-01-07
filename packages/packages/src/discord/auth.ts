import { createSignal } from "solid-js";
import { OAuthToken, makePersisted } from "@macrograph/runtime";
import { None, Option } from "@macrograph/typesystem";

const BOT_TOKEN_LOCALSTORAGE = "discordBotToken";
const USER_TOKEN_LOCALSTORAGE = "discordToken";

export function createAuth() {
  const [botToken, setBotToken] = makePersisted(
    createSignal<Option<string>>(None),
    BOT_TOKEN_LOCALSTORAGE
  );

  const [authToken, setAuthToken] = makePersisted(
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
