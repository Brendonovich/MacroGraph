import { createSignal, createRoot } from "solid-js";

const DISCORD_BOT_TOKEN = "discordBotToken";

const { botToken, setBotToken } = createRoot(() => {
  const [botToken, setBotToken] = createSignal<string | null>(
    localStorage.getItem(DISCORD_BOT_TOKEN)
  );

  return {
    botToken,
    setBotToken: (token: string | null) => {
      setBotToken(token);

      if (token === null) localStorage.removeItem(DISCORD_BOT_TOKEN);
      else localStorage.setItem(DISCORD_BOT_TOKEN, token);
    },
  };
});

export { botToken, setBotToken };
