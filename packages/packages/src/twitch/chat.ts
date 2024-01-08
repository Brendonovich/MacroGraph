import { onCleanup, createResource } from "solid-js";
import tmi from "tmi.js";
import { Package, OnEvent, PropertyDef } from "@macrograph/runtime";
import { jsToJSON, JSON } from "@macrograph/json";
import { t, None, Maybe } from "@macrograph/typesystem";

import { Ctx } from "./ctx";
import { Auth, createUserInstance } from "./auth";
import { ReactiveMap } from "@solid-primitives/map";

export const CHAT_READ_USER_ID = "chatReadUserId";
export const CHAT_WRITE_USER_ID = "chatWriteUserId";

export function createChat(auth: Auth, onEvent: OnEvent) {
  const readUser = createUserInstance(CHAT_READ_USER_ID, auth);
  const writeUser = createUserInstance(CHAT_WRITE_USER_ID, auth);

  const [client] = createResource(
    () => readUser.account().zip(writeUser.account()),
    (accs) =>
      accs.map(([readAcc, writeAcc]) => {
        const client: tmi.Client = tmi.Client({
          options: {
            skipUpdatingEmotesets: true,
          },
          channels: [writeAcc.data.display_name],
          identity: {
            username: readAcc.data.display_name,
            password: readAcc.token.access_token,
          },
        });

        client.connect();

        client.on("connected", () => {});

        client.on("disconnected", () => console.log("disconnected"));

        client.on("emoteonly", (channel, enabled) => {
          onEvent({ name: "emoteonly", data: { channel, enabled } });
        });

        client.on("subscribers", (channel, enabled) => {
          onEvent({ name: "subonlymode", data: { channel, enabled } });
        });

        client.on("slowmode", (channel, enabled, length) => {
          onEvent({
            name: "slowmode",
            data: { channel, enabled, length },
          });
        });

        client.on(
          "messagedeleted",
          (channel, username, deletedmessage, userstate) => {
            onEvent({
              name: "messagedeleted",
              data: { channel, username, deletedmessage, userstate },
            });
          }
        );

        client.on("followersonly", (channel, enabled, length) => {
          onEvent({
            name: "followersonly",
            data: { channel, enabled, length },
          });
        });

        client.on("message", (_, tags, message, self) => {
          const data = { message, tags, self };
          if (
            tags["message-type"] === "action" ||
            tags["message-type"] === "chat"
          ) {
            onEvent({ name: "chatMessage", data });
          }
        });

        onCleanup(() => {
          client.disconnect();
        });

        return client;
      }),
    { initialValue: None }
  );

  return {
    client,
    readUser,
    writeUser,
  };
}

export type Chat = ReturnType<typeof createChat>;

export function register(pkg: Package, { chat: { client, writeUser }, auth }: Ctx) {
  pkg.createNonEventSchema({
    name: "Send Chat Message",
    variant: "Exec",
    generateIO: ({ io }) => {
      return io.dataInput({
        id: "message",
        name: "Message",
        type: t.string(),
      });
    },
    async run({ ctx, io }) {
      await client()
        .expect("No Twitch Chat client available!")
        .say(
          Maybe(
            writeUser.account().expect("Chat write user not chosen!")
          ).expect("Write user token not found!").data.display_name,
          ctx.getInput(io)
        );
    },
  });

  pkg.createEventSchema({
    name: "Slow Mode Toggled",
    event: "slowmode",
    generateIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        enabled: io.dataOutput({
          id: "enabled",
          name: "Enabled",
          type: t.bool(),
        }),
        length: io.dataOutput({
          id: "length",
          name: "Duration",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.enabled, data.enabled);
      ctx.setOutput(io.length, data.length);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Emote Only Mode Toggled",
    event: "emoteonly",
    generateIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        enabled: io.dataOutput({
          id: "enabled",
          name: "Enabled",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.enabled, data.enabled);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Subscriber Only Mode Toggled",
    event: "subonlymode",
    generateIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        enabled: io.dataOutput({
          id: "enabled",
          name: "Enabled",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.enabled, data.enabled);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Follower Only Mode Toggled",
    event: "followersonly",
    generateIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        enabled: io.dataOutput({
          id: "enabled",
          name: "Enabled",
          type: t.bool(),
        }),
        length: io.dataOutput({
          id: "length",
          name: "Duration",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.enabled, data.enabled);
      ctx.setOutput(io.length, data.length);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Messaged Deleted",
    event: "messagedeleted",
    generateIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        username: io.dataOutput({
          id: "username",
          name: "Username",
          type: t.string(),
        }),
        deletedMessage: io.dataOutput({
          id: "deletedMessage",
          name: "Deleted Message",
          type: t.string(),
        }),
        messageId: io.dataOutput({
          id: "messageId",
          name: "Messasge ID",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.username, data.username);
      ctx.setOutput(io.deletedMessage, data.deletedmessage);
      ctx.setOutput(io.messageId, data.userstate["target-msg-id"]);
      ctx.exec(io.exec);
    },
  });

  const accountProperty = {
    name: "Account",
    source: ({}) => [...auth.accounts.values()].map((v) => ({
      id: v.data.id,
      display: v.data.display_name
    }))
  } satisfies PropertyDef;

  pkg.createEventSchema({
    name: "Chat Message",
    event: "chatMessage",
    properties: {
      account: accountProperty
    },
    generateIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        username: io.dataOutput({
          id: "username",
          name: "Username",
          type: t.string(),
        }),
        displayName: io.dataOutput({
          id: "displayName",
          name: "Display Name",
          type: t.string(),
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "User ID",
          type: t.string(),
        }),
        message: io.dataOutput({
          id: "message",
          name: "Message",
          type: t.string(),
        }),
        messageId: io.dataOutput({
          id: "messageId",
          name: "Message ID",
          type: t.string(),
        }),
        color: io.dataOutput({
          id: "color",
          name: "User Color",
          type: t.string(),
        }),
        emotes: io.dataOutput({
          id: "emotes",
          name: "Emotes",
          type: t.map(t.enum(JSON)),
        }),
        broadcaster: io.dataOutput({
          id: "broadcaster",
          name: "Broadcaster",
          type: t.bool(),
        }),
        mod: io.dataOutput({
          id: "mod",
          name: "Moderator",
          type: t.bool(),
        }),
        sub: io.dataOutput({
          id: "sub",
          name: "Subscriber",
          type: t.bool(),
        }),
        vip: io.dataOutput({
          id: "vip",
          name: "VIP",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io, properties }) {
      if (data.self) return;
      console.log(data);
      if (ctx.getProperty(properties.account) !== data.tags["room-id"]) return;
      ctx.setOutput(io.username, data.tags.username);
      ctx.setOutput(io.displayName, data.tags["display-name"]);
      ctx.setOutput(io.userId, data.tags["user-id"]);
      ctx.setOutput(io.message, data.message);
      ctx.setOutput(io.messageId, data.tags.id);
      ctx.setOutput(io.mod, data.tags.mod);
      ctx.setOutput(io.sub, data.tags.subscriber);
      ctx.setOutput(io.vip, data.tags.vip ?? false);
      ctx.setOutput(io.color, data.tags.color);
      ctx.setOutput(
        io.broadcaster,
        data.tags["room-id"] === data.tags["user-id"]
      );
      if (data.tags.emotes) {
        ctx.setOutput(
          io.emotes,
          new ReactiveMap(
            Object.entries(data.tags.emotes).map(([key, value]) => [
              key,
              jsToJSON(value)!,
            ])
          )
        );
      } else {
        ctx.setOutput(io.emotes, new ReactiveMap());
      }

      ctx.exec(io.exec);
    },
  });
}
