import { Maybe, Option, core, t } from "@macrograph/core";
import { io, Socket } from "socket.io-client";
import {
  createEffect,
  createRoot,
  createSignal,
  on,
  onCleanup,
} from "solid-js";

const pkg = core.createPackage({
  name: "Streamlabs",
});

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
    Maybe(localStorage.getItem("streamlabsToken"))
  );

  createEffect(
    on(
      () => token(),
      (token) => {
        const socket = io(`https://sockets.streamlabs.com?token=${token}`, {
          transports: ["websocket"],
        });

        setState({
          type: "connecting",
          socket,
        });

        socket.connect();

        socket.on("event", (eventData: any) => {
          if (!eventData.for && eventData.type === "donation") {
            pkg.emitEvent({ name: "SLDonation", data: eventData.message[0] });
          }
        });

        socket.on("connected", () => {
          setState({ type: "connected", socket });
        });

        onCleanup(() => socket.close());
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
  event: "SLDonation",
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
      type: t.string(),
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
      id: "fromUserId",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("name", data.name);
    ctx.setOutput("amount", data.amount);
    ctx.setOutput("message", data.message);
    ctx.setOutput("currency", data.currency);
    ctx.setOutput("from", data.from);
    ctx.setOutput("fromUserId", data.from_user_id);
    ctx.exec("exec");
  },
});
