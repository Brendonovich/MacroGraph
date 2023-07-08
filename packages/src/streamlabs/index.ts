import { Maybe, Option, core, t } from "@macrograph/core";
import { io, Socket } from "socket.io-client";
import {
  createEffect,
  createRoot,
  createSignal,
  on,
  onCleanup,
} from "solid-js";
import { EVENT, Event } from "./events";

const pkg = core.createPackage<Event>({
  name: "Streamlabs",
});

const STREAMLABS_TOKEN = "streamlabsToken";

const { setToken, token, state } = createRoot(() => {
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
        token
          .map((token) => {
            const socket = io(`https://sockets.streamlabs.com?token=${token}`, {
              transports: ["websocket"],
              autoConnect: false,
            });

            socket.on("event", (eventData) => {
              const parsed = EVENT.parse(eventData);

              if (parsed.type === "donation") {
                pkg.emitEvent({
                  name: "donation",
                  data: parsed.message[0]!,
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
          })
          .unwrapOrElse(() => setState({ type: "disconnected" }));
      }
    )
  );

  return {
    token,
    state,
    setToken,
  };
});

export { setToken, token, state };

pkg.createEventSchema({
  name: "Streamlabs Donation",
  event: "donation",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      name: "Name",
      id: "name",
      type: t.string(),
    });
    io.dataOutput({
      name: "Amount",
      id: "amount",
      type: t.float(),
    });
    io.dataOutput({
      name: "Message",
      id: "message",
      type: t.string(),
    });
    io.dataOutput({
      name: "Currency",
      id: "currency",
      type: t.string(),
    });
    io.dataOutput({
      name: "From",
      id: "from",
      type: t.string(),
    });
    io.dataOutput({
      name: "From User Id",
      id: "fromId",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("name", data.name);
    ctx.setOutput("amount", data.amount);
    ctx.setOutput("message", data.message);
    ctx.setOutput("currency", data.currency);
    ctx.setOutput("from", data.from);
    ctx.setOutput("fromId", data.fromId);

    ctx.exec("exec");
  },
});
