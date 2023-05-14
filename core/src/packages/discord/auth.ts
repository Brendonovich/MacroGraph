import { createSignal } from "solid-js";

const DISCORD_BOT_TOKEN = "discordBotToken";

const [botToken, set] = createSignal<string | null>(
  localStorage.getItem(DISCORD_BOT_TOKEN)
);

const setBotToken = (token: string | null) => {
  set(token);

  if (token === null) localStorage.removeItem(DISCORD_BOT_TOKEN);
  else localStorage.setItem(DISCORD_BOT_TOKEN, token);
};

export { botToken, setBotToken };
