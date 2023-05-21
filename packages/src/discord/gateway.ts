import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  createRoot,
} from "solid-js";
import { z } from "zod";
import { types, Maybe } from "@macrograph/core";
import { botToken } from "./auth";
import pkg from "./pkg";
import { GUILD_MEMBER_SCHEMA } from "./schemas";

const { ws, connect, disconnect } = createRoot(() => {
  const [ws, setWs] = createSignal<WebSocket | null>(null);
  const [enabled, setEnabled] = createSignal(true);

  const createGateway = (token: string) => {
    setEnabled(true);

    const ws = new WebSocket("wss://gateway.discord.gg/?v=6&encoding=json");
    let state: "AwaitingHello" | "AwaitingHeartbeatAck" | "Connected" =
      "AwaitingHello";

    let seq: any;

    let res: () => void;
    const promise = new Promise<void>((r) => {
      res = r;
    });

    ws.addEventListener("message", ({ data }) => {
      let payload = JSON.parse(data);

      const { t, op, d, s } = payload as any;
      seq = s;

      switch (op) {
        // OPCODE 10 GIVES the HEARTBEAT INTERVAL, SO YOU CAN KEEP THE CONNECTION ALIVE
        case 10:
          if (state !== "AwaitingHello") return;

          const { heartbeat_interval } = d;
          ws.send(JSON.stringify({ op: 1, d: null }));

          setInterval(() => {
            ws.send(JSON.stringify({ op: 1, d: seq }));
          }, heartbeat_interval);

          state = "AwaitingHeartbeatAck";

          break;
        case 11:
          if (state !== "AwaitingHeartbeatAck") return;

          ws.send(
            JSON.stringify({
              op: 2,
              d: {
                token: token,
                intents: (1 << 9) + (1 << 15),
                properties: {
                  os: "linux",
                  browser: "Macrograph",
                  device: "Macrograph",
                },
              },
            })
          );

          state = "Connected";
          setWs(ws);
          res();
          break;
      }

      switch (t) {
        // IF MESSAGE IS CREATED, IT WILL LOG IN THE CONSOLE
        case "MESSAGE_CREATE":
          if (d.type !== 0) return;

          pkg.emitEvent({
            name: "discordMessage",
            data: d,
          });
      }
    });

    return promise;
  };

  const disconnect = () => {
    setWs(null);
    setEnabled(false);
  };

  const connect = () =>
    botToken().mapAsync((token) => {
      setEnabled(true);
      return createGateway(token);
    });

  createEffect(
    on(botToken, (token) => {
      token
        .andThen((token) => Maybe(enabled() ? createGateway(token) : null))
        .unwrapOrElse(async () => {
          setWs(null);
        });
    })
  );

  createEffect(() => {
    const w = ws();

    onCleanup(() => w?.close());
  });

  return { ws, connect, disconnect };
});

export { ws, connect, disconnect };

pkg.createEventSchema({
  name: "Discord Message",
  event: "discordMessage",
  generateIO: (t) => {
    t.execOutput({
      id: "exec",
    });
    t.dataOutput({
      id: "message",
      name: "Message",
      type: types.string(),
    });
    t.dataOutput({
      id: "channelId",
      name: "Channel ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "username",
      name: "Username",
      type: types.string(),
    });
    t.dataOutput({
      id: "userId",
      name: "User ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "nickname",
      name: "Nickname",
      type: types.option(types.string()),
    });
    t.dataOutput({
      id: "guildId",
      name: "Guild ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "roles",
      name: "Roles",
      type: types.list(types.string()),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("message", data.content);
    ctx.setOutput("channelId", data.channel_id);
    ctx.setOutput("username", data.author.username);
    ctx.setOutput("userId", data.author.id);
    ctx.setOutput(
      "nickname",
      Maybe(data.member as z.infer<typeof GUILD_MEMBER_SCHEMA>).andThen((v) =>
        Maybe(v.nick)
      )
    );
    ctx.setOutput("guildId", Maybe(data.guild_id as string | null));
    ctx.setOutput("roles", data.member.roles);

    ctx.exec("exec");
  },
});
