import {
  createRoot,
  createSignal,
  onCleanup,
  createResource,
  createEffect,
  on,
  createComputed,
} from "solid-js";
import tmi from "tmi.js";
import pkg from "./pkg";
import { t, None, Maybe } from "@macrograph/core";
import { auth } from "./auth";

export const CHAT_READ_USER_ID = "chatReadUserId";
export const CHAT_WRITE_USER_ID = "chatWriteUserId";

const { client, readUserId, writeUserId, setReadUserId, setWriteUserId } =
  createRoot(() => {
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
            const client = tmi.Client({
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

            client.on("emoteonly", (channel, enabled) =>
              pkg.emitEvent({ name: "emoteonly", data: { channel, enabled } })
            );

            client.on("subscribers", (channel, enabled) =>
              pkg.emitEvent({ name: "subonlymode", data: { channel, enabled } })
            );

            client.on("slowmode", (channel, enabled, length) =>
              pkg.emitEvent({
                name: "slowmode",
                data: { channel, enabled, length },
              })
            );

            client.on(
              "messagedeleted",
              (channel, username, deletedmessage, userstate) =>
                pkg.emitEvent({
                  name: "messagedeleted",
                  data: { channel, username, deletedmessage, userstate },
                })
            );

            client.on("followersonly", (channel, enabled, length) =>
              pkg.emitEvent({
                name: "followersonly",
                data: { channel, enabled, length },
              })
            );

            client.on("message", (_, tags, message, self) => {
              const data = { message, tags, self };
              if (
                tags["message-type"] === "action" ||
                tags["message-type"] === "chat"
              )
                pkg.emitEvent({ name: "chatMessage", data });
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
  });

export { client, readUserId, writeUserId, setReadUserId, setWriteUserId };

pkg.createNonEventSchema({
  name: "Send Chat Message",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "message",
      name: "Message",
      type: t.string(),
    });
  },
  run({ ctx }) {
    client()
      .expect("No Twitch Chat client available!")
      .say(
        Maybe(
          auth.tokens.get(writeUserId().expect("Chat write user not chosen!"))
        ).expect("Write user token not found!").userName,
        ctx.getInput("message")
      );
  },
});

pkg.createEventSchema({
  name: "Slow Mode Toggled",
  event: "slowmode",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "enabled",
      name: "Enabled",
      type: t.bool(),
    });
    io.dataOutput({
      id: "length",
      name: "Duration",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("enabled", data.enabled);
    ctx.setOutput("length", data.length);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Emote Only Mode Toggled",
  event: "emoteonly",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "enabled",
      name: "Enabled",
      type: t.bool(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("enabled", data.enabled);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Subscriber Only Mode Toggled",
  event: "subonlymode",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "enabled",
      name: "Enabled",
      type: t.bool(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("enabled", data.enabled);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Follower Only Mode Toggled",
  event: "followersonly",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "enabled",
      name: "Enabled",
      type: t.bool(),
    });
    io.dataOutput({
      id: "length",
      name: "Duration",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("enabled", data.enabled);
    ctx.setOutput("length", data.length);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Messaged Deleted",
  event: "messagedeleted",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "username",
      name: "Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "deletedMessage",
      name: "Deleted Message",
      type: t.string(),
    });
    io.dataOutput({
      id: "messageId",
      name: "Messasge ID",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("username", data.username);
    ctx.setOutput("deletedMessage", data.deletedmessage);
    ctx.setOutput("messageId", data.userstate["target-msg-id"]);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Chat Message",
  event: "chatMessage",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "username",
      name: "Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "displayName",
      name: "Display Name",
      type: t.string(),
    });
    io.dataOutput({
      id: "userId",
      name: "User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "message",
      name: "Message",
      type: t.string(),
    });
    io.dataOutput({
      id: "messageId",
      name: "Message ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "broadcaster",
      name: "Broadcaster",
      type: t.bool(),
    });
    io.dataOutput({
      id: "mod",
      name: "Moderator",
      type: t.bool(),
    });
    io.dataOutput({
      id: "sub",
      name: "Subscriber",
      type: t.bool(),
    });
    io.dataOutput({
      id: "vip",
      name: "VIP",
      type: t.bool(),
    });
  },
  run({ ctx, data }) {
    if (data.self) return;

    ctx.setOutput("username", data.tags.username);
    ctx.setOutput("displayName", data.tags["display-name"]);
    ctx.setOutput("userId", data.tags["user-id"]);
    ctx.setOutput("message", data.message);
    ctx.setOutput("messageId", data.tags.id);
    ctx.setOutput("mod", data.tags.mod);
    ctx.setOutput("sub", data.tags.subscriber);
    ctx.setOutput("vip", data.tags.vip);
    ctx.exec("exec");
  },
});
