import {
  createSignal,
  onCleanup,
  createResource,
  createEffect,
  on,
  createComputed,
} from "solid-js";
import tmi from "tmi.js";
import { t, None, Maybe, Package, OnEvent } from "@macrograph/core";
import { Auth } from "./auth";
import { Ctx } from "./ctx";

export const CHAT_READ_USER_ID = "chatReadUserId";
export const CHAT_WRITE_USER_ID = "chatWriteUserId";

export function createChat(auth: Auth, onEvent: OnEvent) {
  const [readUserId, setReadUserId] = createSignal(
    Maybe(localStorage.getItem(CHAT_READ_USER_ID))
  );
  const [writeUserId, setWriteUserId] = createSignal(
    Maybe(localStorage.getItem(CHAT_WRITE_USER_ID))
  );

  const [client] = createResource(
    () => readUserId().zip(writeUserId()).toNullable(),
    ([readUserId, writeUserId]) =>
      Maybe(auth.tokens.get(readUserId))
        .zip(Maybe(auth.tokens.get(writeUserId)))
        .map(([readToken, writeToken]) => {
          const client: tmi.Client = tmi.Client({
            options: {
              skipUpdatingEmotesets: true,
            },
            channels: [writeToken.userName],
            identity: {
              username: readToken.userName,
              password: readToken.accessToken,
            },
          });

          client.connect();

          client.on("connected", () => {
            console.log("connected");
          });

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

  createComputed(() => {
    (
      [
        [readUserId, setReadUserId],
        [writeUserId, setWriteUserId],
      ] as const
    ).forEach(([value, setValue]) => {
      value().map((id) => {
        !auth.tokens.has(id) && setValue(None);
      });
    });
  });

  createEffect(
    on(
      () =>
        [
          [CHAT_READ_USER_ID, readUserId()],
          [CHAT_WRITE_USER_ID, writeUserId()],
        ] as const,
      (value) => {
        value.forEach(([key, id]) => {
          id.map((userId) => {
            auth.refreshAccessTokenForUser(userId);
            localStorage.setItem(key, userId);
            return true;
          }).unwrapOrElse(() => (localStorage.removeItem(key), false));
        });
      }
    )
  );

  return {
    client,
    readUserId,
    writeUserId,
    setReadUserId,
    setWriteUserId,
  };
}

export type Chat = ReturnType<typeof createChat>;

export function register(
  pkg: Package,
  { chat: { client, writeUserId }, auth }: Ctx
) {
  pkg.createNonEventSchema({
    name: "Send Chat Message",
    variant: "Exec",
    generateIO: (io) => {
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
            auth.tokens.get(writeUserId().expect("Chat write user not chosen!"))
          ).expect("Write user token not found!").userName,
          ctx.getInput(io)
        );
    },
  });

  pkg.createEventSchema({
    name: "Slow Mode Toggled",
    event: "slowmode",
    generateIO: (io) => {
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
    generateIO: (io) => {
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
    generateIO: (io) => {
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
    generateIO: (io) => {
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
    generateIO: (io) => {
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

  pkg.createEventSchema({
    name: "Chat Message",
    event: "chatMessage",
    generateIO: (io) => {
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
    run({ ctx, data, io }) {
      if (data.self) return;
      ctx.setOutput(io.username, data.tags.username);
      ctx.setOutput(io.displayName, data.tags["display-name"]);
      ctx.setOutput(io.userId, data.tags["user-id"]);
      ctx.setOutput(io.message, data.message);
      ctx.setOutput(io.messageId, data.tags.id);
      ctx.setOutput(io.mod, data.tags.mod);
      ctx.setOutput(io.sub, data.tags.subscriber);
      ctx.setOutput(io.vip, data.tags.vip);
      ctx.setOutput(
        io.broadcaster,
        data.tags["room-id"] === data.tags["user-id"]
      );
      ctx.exec(io.exec);
    },
  });
}
