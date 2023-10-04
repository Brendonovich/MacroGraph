import {
  Core,
  Maybe,
  None,
  OAuthToken,
  OnEvent,
  Option,
  makePersisted,
} from "@macrograph/core";
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

  const [token, setToken] = makePersisted<string>(
    createSignal(None),
    TOKEN_LOCALSTORAGE
  );

  const [authToken, setAuthToken] = makePersisted<OAuthToken>(
    createSignal(None),
    USER_TOKEN_LOCALSTORAGE
  );

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
