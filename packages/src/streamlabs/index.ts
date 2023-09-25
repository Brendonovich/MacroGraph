import {
  Core,
  Maybe,
  None,
  OAuthToken,
  OnEvent,
  Option,
  Package,
  t,
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
import { EVENT, Event } from "./events";

const TOKEN_LOCALSTORAGE = "streamlabsToken";
const USER_TOKEN_LOCALSTORAGE = "streamlabsUserToken";

export function pkg(core: Core) {
  const [latestEvent, setLatestEvent] = createSignal<any | null>(null);

  const pkg = new Package<Event>({
    name: "Streamlabs",
    ctx: createCtx(core, setLatestEvent),
    SettingsUI: () => import("./Settings"),
  });

  createEffect(() => {
    const event = latestEvent();

    if (!event) return;

    pkg.emitEvent(event);
  });

  pkg.createEventSchema({
    name: "Streamlabs Donation",
    event: "donation",
    generateIO(io) {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        name: io.dataOutput({
          name: "Name",
          id: "name",
          type: t.string(),
        }),
        amount: io.dataOutput({
          name: "Amount",
          id: "amount",
          type: t.float(),
        }),
        message: io.dataOutput({
          name: "Message",
          id: "message",
          type: t.string(),
        }),
        currency: io.dataOutput({
          name: "Currency",
          id: "currency",
          type: t.string(),
        }),
        from: io.dataOutput({
          name: "From",
          id: "from",
          type: t.string(),
        }),
        fromId: io.dataOutput({
          name: "From User Id",
          id: "fromId",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.name, data.name);
      ctx.setOutput(io.amount, data.amount);
      ctx.setOutput(io.message, data.message);
      ctx.setOutput(io.currency, data.currency);
      ctx.setOutput(io.from, data.from);
      ctx.setOutput(io.fromId, data.fromId);

      ctx.exec(io.exec);
    },
  });

  return pkg;
}

export type Ctx = ReturnType<typeof createCtx>;

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

  const [authToken, setAuthToken] = createSignal<Option<OAuthToken>>(
    Maybe(localStorage.getItem(TOKEN_LOCALSTORAGE)).map(JSON.parse)
  );

  const client = createEndpoint({
    path: "https://streamlabs.com/api/v2.0",
    fetch: async (url, opts) => {
      return await core.fetch(url, {
        ...opts,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${authToken().unwrap().access_token}`,
          ...opts?.headers,
        },
      });
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
      setToken: (token: Option<string>) => {
        setToken(token);

        if (token.isNone()) localStorage.removeItem(TOKEN_LOCALSTORAGE);
        else
          token.peek((token) =>
            localStorage.setItem(TOKEN_LOCALSTORAGE, token)
          );
      },
      authToken,
      setAuthToken: (token: Option<OAuthToken>) => {
        setAuthToken(token);
        if (token.isNone()) localStorage.removeItem(USER_TOKEN_LOCALSTORAGE);
        else
          token.peek((token) =>
            localStorage.setItem(USER_TOKEN_LOCALSTORAGE, JSON.stringify(token))
          );
      },
    },
  };
}
