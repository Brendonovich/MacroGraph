import { StaticAuthProvider } from "@twurple/auth";
import { createEffect, createMemo, createSignal } from "solid-js";
import { map } from "../../utils";

const clientId = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export const TWITCH_ACCCESS_TOKEN = "TwitchAccessToken";

const [accessToken, setAccessToken] = createSignal(
  localStorage.getItem(TWITCH_ACCCESS_TOKEN)
);

createEffect(() => {
  const token = accessToken();

  if (!token) localStorage.removeItem(TWITCH_ACCCESS_TOKEN);
  else localStorage.setItem(TWITCH_ACCCESS_TOKEN, token);
});

const authProvider = createMemo(
  () => map(accessToken(), (token) => new StaticAuthProvider(clientId, token)),
  null
);

export { accessToken, setAccessToken, authProvider };
