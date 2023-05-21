import { StaticAuthProvider } from "@twurple/auth";
import { createEffect, createMemo, createSignal, createRoot } from "solid-js";
import { Maybe, None } from "@macrograph/core";

const clientId = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export const TWITCH_ACCCESS_TOKEN = "TwitchAccessToken";

const { accessToken, setAccessToken, authProvider } = createRoot(() => {
  const [accessToken, setAccessToken] = createSignal(
    Maybe(localStorage.getItem(TWITCH_ACCCESS_TOKEN))
  );

  createEffect(() => {
    const token = accessToken();

    token
      .map((v) => (localStorage.setItem(TWITCH_ACCCESS_TOKEN, v), true))
      .unwrapOrElse(
        () => (localStorage.removeItem(TWITCH_ACCCESS_TOKEN), false)
      );
  });

  const authProvider = createMemo(
    () => accessToken().map((token) => new StaticAuthProvider(clientId, token)),
    None
  );

  return { accessToken, setAccessToken, authProvider };
});

export { accessToken, setAccessToken, authProvider };
