import { createSignal, createRoot } from "solid-js";
import { Maybe, Option } from "@macrograph/core";

const DISCORD_BOT_TOKEN = "discordBotToken";

const { botToken, setBotToken } = createRoot(() => {
  const [botToken, setBotToken] = createSignal<Option<string>>(
    Maybe(localStorage.getItem(DISCORD_BOT_TOKEN))
  );

  return {
    botToken,
    setBotToken: (token: string | null) => {
      setBotToken(Maybe(token));

      if (token === null) localStorage.removeItem(DISCORD_BOT_TOKEN);
      else localStorage.setItem(DISCORD_BOT_TOKEN, token);
    },
  };
});

export { botToken, setBotToken };
