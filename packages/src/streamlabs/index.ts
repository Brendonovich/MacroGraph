import { Maybe, OnEvent, Option, Package, t } from "@macrograph/core";
import { io, Socket } from "socket.io-client";
import { createEffect, createSignal, on, onCleanup } from "solid-js";
import { EVENT, Event } from "./events";

const STREAMLABS_TOKEN = "streamlabsToken";

export function pkg() {
  const [latestEvent, setLatestEvent] = createSignal<any | null>(null);

  const pkg = new Package<Event>({
    name: "Streamlabs",
    ctx: createCtx(setLatestEvent),
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

export function createCtx(onEvent: OnEvent): {
  auth: ReturnType<typeof createAuth>;
} {
  return {
    auth: createAuth(onEvent),
  };
}

export function createAuth(onEvent: OnEvent) {
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
    Maybe(localStorage.getItem(STREAMLABS_TOKEN))
  );

  createEffect(
    on(
      () => token(),
      (token) =>
        token
          .map((token) => (localStorage.setItem(STREAMLABS_TOKEN, token), true))
          .unwrapOrElse(
            () => (localStorage.removeItem(STREAMLABS_TOKEN), false)
          )
    )
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
    token,
    state,
    setToken,
  };
}
