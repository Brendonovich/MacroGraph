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

const pkg = core.createPackage({
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

              switch (parsed.data.type) {
                case "donation":
                  pkg.emitEvent({
                    name: "donation",
                    data: parsed.data.message[0]!,
                  });
                  break;
                case "superchat":
                  pkg.emitEvent({
                    name: "superchat",
                    data: parsed.data.message[0]!,
                  });
                  break;
                case "subscription":
                  pkg.emitEvent({
                    name: "membership",
                    data: parsed.data.message[0]!,
                  });
                  break;
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
});

export { setToken, token, state };

pkg.createEventSchema({
  name: "Youtube Membership",
  event: "membership",
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
      months: io.dataOutput({
        name: "Months",
        id: "months",
        type: t.float(),
      }),
      message: io.dataOutput({
        name: "Message",
        id: "message",
        type: t.string(),
      }),
      membershipLevelName: io.dataOutput({
        name: "Membership Level Name",
        id: "membershipLevelName",
        type: t.string(),
      }),
    };
  },
  run({ ctx, data, io }) {
    ctx.setOutput(io.name, data.name);
    ctx.setOutput(io.months, data.months);
    ctx.setOutput(io.message, data.message);
    ctx.setOutput(io.membershipLevelName, data.membershipLevelName);
    ctx.exec(io.exec);
  },
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

pkg.createEventSchema({
  name: "Youtube Superchat",
  event: "superchat",
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
      currency: io.dataOutput({
        name: "Currency",
        id: "currency",
        type: t.string(),
      }),
      displayString: io.dataOutput({
        name: "Display String",
        id: "displayString",
        type: t.string(),
      }),
      amount: io.dataOutput({
        name: "Amount",
        id: "amount",
        type: t.string(),
      }),
      comment: io.dataOutput({
        name: "Comment",
        id: "comment",
        type: t.string(),
      }),
    };
  },
  run({ ctx, data, io }) {
    ctx.setOutput(io.name, data.name);
    ctx.setOutput(io.currency, data.currency);
    ctx.setOutput(io.displayString, data.displayString);
    ctx.setOutput(io.amount, data.amount);
    ctx.setOutput(io.comment, data.comment);
    ctx.exec(io.exec);
  },
});
