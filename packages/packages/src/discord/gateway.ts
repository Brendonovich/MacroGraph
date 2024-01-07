import { createEffect, createSignal, on, onCleanup } from "solid-js";
import { OnEvent, Package } from "@macrograph/runtime";
import { Maybe, None, Option, Some, t } from "@macrograph/typesystem";
import { z } from "zod";

import { GUILD_MEMBER_SCHEMA } from "./schemas";
import { Auth } from "./auth";

export function create({ botToken }: Auth, onEvent: OnEvent) {
  const [ws, setWs] = createSignal<Option<WebSocket>>(None);
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
          setWs(Some(ws));
          res();
          break;
      }

      switch (t) {
        // IF MESSAGE IS CREATED, IT WILL LOG IN THE CONSOLE
        case "MESSAGE_CREATE":
          if (d.type !== 0) return;

          onEvent({
            name: "discordMessage",
            data: d,
          });
      }
    });

    return promise;
  };

  const disconnect = () => {
    setWs(None);
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
          setWs(None);
        });
    })
  );

  createEffect(() => {
    const w = ws();

    onCleanup(() => w.peek((w) => w.close()));
  });

  return { ws, connect, disconnect };
}

export function register(pkg: Package) {
  pkg.createEventSchema({
    name: "Discord Message",
    event: "discordMessage",
    generateIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        message: io.dataOutput({
          id: "message",
          name: "Message",
          type: t.string(),
        }),
        channelId: io.dataOutput({
          id: "channelId",
          name: "Channel ID",
          type: t.string(),
        }),
        username: io.dataOutput({
          id: "username",
          name: "Username",
          type: t.string(),
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "User ID",
          type: t.string(),
        }),
        nickname: io.dataOutput({
          id: "nickname",
          name: "Nickname",
          type: t.option(t.string()),
        }),
        guildId: io.dataOutput({
          id: "guildId",
          name: "Guild ID",
          type: t.option(t.string()),
        }),
        roles: io.dataOutput({
          id: "roles",
          name: "Roles",
          type: t.list(t.string()),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.message, data.content);
      ctx.setOutput(io.channelId, data.channel_id);
      ctx.setOutput(io.username, data.author.username);
      ctx.setOutput(io.userId, data.author.id);
      ctx.setOutput(
        io.nickname,
        Maybe(data.member as z.infer<typeof GUILD_MEMBER_SCHEMA>).andThen((v) =>
          Maybe(v.nick)
        )
      );
      ctx.setOutput(io.guildId, Maybe(data.guild_id as string | null));
      ctx.setOutput(io.roles, data.member.roles);

      ctx.exec(io.exec);
    },
  });
}
