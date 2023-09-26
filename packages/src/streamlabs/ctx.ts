import { Core, Maybe, OAuthToken, OnEvent, Option } from "@macrograph/core";
import { io, Socket } from "socket.io-client";
import {
  createEffect,
  createResource,
  createSignal,
  on,
  onCleanup,
} from "solid-js";
import { z } from "zod";
import { createEndpoint } from "../httpEndpoint";
import { EVENT } from "./events";

export type Ctx = ReturnType<typeof createCtx>;

const TOKEN_LOCALSTORAGE = "streamlabsToken";
const USER_TOKEN_LOCALSTORAGE = "streamlabsUserToken";

export function createCtx(core: Core, onEvent: OnEvent) {
  const [state, setState] = createSignal<
    | {
        type: "disconnected";
      }
    | { type: "connecting" }
    | {
        type: "connected";
        socket: Socket;
      }
  >({ type: "disconnected" });

  const [token, setToken] = createSignal<Option<string>>(
    Maybe(localStorage.getItem(TOKEN_LOCALSTORAGE))
  );

  createEffect(() => {
    const _token = token();
    if (_token.isNone()) localStorage.removeItem(TOKEN_LOCALSTORAGE);
    else
      _token.peek((token) => localStorage.setItem(TOKEN_LOCALSTORAGE, token));
  });

  const [authToken, setAuthToken] = createSignal<Option<OAuthToken>>(
    Maybe(localStorage.getItem(USER_TOKEN_LOCALSTORAGE)).map(JSON.parse)
  );

  createEffect(() => {
    const token = authToken();
    if (token.isNone()) localStorage.removeItem(USER_TOKEN_LOCALSTORAGE);
    else
      token.peek((token) =>
        localStorage.setItem(USER_TOKEN_LOCALSTORAGE, JSON.stringify(token))
      );
  });

  const client = createEndpoint({
    path: "https://streamlabs.com/api/v2.0",
    fetch: async (url, opts) => {
      const resp = await core.fetch(url, {
        ...opts,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${authToken().unwrap().access_token}`,
          ...opts?.headers,
        },
      });

      const json = await resp.json();

      if (resp.status !== 200) throw new Error(json);

      return json;
    },
  });

  const api = {
    user: client.extend("/user"),
  };

  const [user] = createResource(
    () => authToken().toNullable(),
    async () => {
      const resp = await api.user.get(
        z.object({
          streamlabs: z.object({
            display_name: z.string(),
          }),
        })
      );

      return resp;
    }
  );

  createEffect(
    on(
      () => token(),
      (token) => {
        token.mapOrElse(
          () => {
            setState({ type: "disconnected" });
          },
          (token) => {
            const socket = io(`https://sockets.streamlabs.com?token=${token}`, {
              transports: ["websocket"],
              autoConnect: false,
            });

            socket.on("event", (eventData) => {
              const parsed = EVENT.safeParse(eventData);

              if (!parsed.success) return;

              if (parsed.data.type === "donation") {
                onEvent({
                  name: "donation",
                  data: parsed.data.message[0]!,
                });
              }
            });

            socket.on("connect", () => {
              setState({ type: "connected", socket });
            });

            setState({
              type: "connecting",
              socket,
            });

            socket.connect();

            onCleanup(() => {
              socket.close();
              setState({ type: "disconnected" });
            });
          }
        );
      }
    )
  );

  return {
    core,
    auth: {
      user,
      state,
      token,
      setToken,
      authToken,
      setAuthToken,
    },
  };
}
