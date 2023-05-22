import { createRoot, createEffect, createSignal } from "solid-js";
import tmi, { Client } from "tmi.js";
import pkg from "./pkg";
import { types, Option, None } from "@macrograph/core";
import { helix, user } from "./helix";

const { client } = createRoot(() => {
  const [client, setClient] = createSignal<Option<Client>>(None);

  createEffect(() =>
    setClient(
      user().map((user) => {
        const client = tmi.Client({
          channels: [user.name],
          identity: {
            username: user.name,
            password: user.token.accessToken,
          },
        });

        client.connect();

        client.on("connected", () => console.log("connected"));

        client.on("emoteonly", (channel, enabled) => pkg.emitEvent({ name: "emoteonly", data: { channel, enabled } }));

        client.on("subscribers", (channel, enabled) => pkg.emitEvent({ name: "subonlymode", data: { channel, enabled } }));

        client.on("slowmode", (channel, enabled, length) => pkg.emitEvent({ name: "slowmode", data: { channel, enabled, length } }));

        client.on("messagedeleted", (channel, username, deletedmessage, userstate) => pkg.emitEvent({ name: "messagedeleted", data: { channel, username, deletedmessage, userstate } }));

        client.on("followersonly", (channel, enabled, length) => pkg.emitEvent({ name: "followersonly", data: { channel, enabled, length } }));

        client.on("message", (_, tags, message, self) => {
          const data = { message, tags, self };
          if(tags["message-type"] === "action" || tags["message-type"] === "chat")
          pkg.emitEvent({ name: "chatMessage", data });
        });

        return client;
      })
    )
  );

  return { client };
});

export { client };

pkg.createNonEventSchema({
  name: "Send Chat Message",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "message",
      name: "Message",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const [c, u] = client().zip(user()).unwrap();

    c.say(u.name, ctx.getInput("message"));
  },
});

pkg.createEventSchema({
  name: "Slow Mode Toggled",
  event: "slowmode",
  generateIO: (t) => {
    t.execOutput({
      id: "exec",
    })
    t.dataOutput({
      id: "enabled",
      name: "Enabled",
      type: types.bool(),
    });
    t.dataOutput({
      id: "length",
      name: "Duration",
      type: types.string(),
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
  generateIO: (t) => {
    t.execOutput({
      id: "exec",
    })
    t.dataOutput({
      id: "enabled",
      name: "Enabled",
      type: types.bool(),
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
  generateIO: (t) => {
    t.execOutput({
      id: "exec",
    })
    t.dataOutput({
      id: "enabled",
      name: "Enabled",
      type: types.bool(),
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
  generateIO: (t) => {
    t.execOutput({
      id: "exec",
    })
    t.dataOutput({
      id: "enabled",
      name: "Enabled",
      type: types.bool(),
    });
    t.dataOutput({
      id: "length",
      name: "Duration",
      type: types.string(),
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
  generateIO: (t) => {
    t.execOutput({
      id: "exec",
    })
    t.dataOutput({
      id: "username",
      name: "Username",
      type: types.string(),
    });
    t.dataOutput({
      id: "deletedMessage",
      name: "Deleted Message",
      type: types.string(),
    });
    t.dataOutput({
      id: "messageId",
      name: "Messasge ID",
      type: types.string(),
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
  generateIO: (t) => {
    t.execOutput({
      id: "exec",
    });
    t.dataOutput({
      id: "username",
      name: "Username",
      type: types.string(),
    });
    t.dataOutput({
      id: "displayName",
      name: "Display Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "userId",
      name: "User ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "message",
      name: "Message",
      type: types.string(),
    });
    t.dataOutput({
      id: "messageId",
      name: "Message ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "broadcaster",
      name: "Broadcaster",
      type: types.bool(),
    });
    t.dataOutput({
      id: "mod",
      name: "Moderator",
      type: types.bool(),
    });
    t.dataOutput({
      id: "sub",
      name: "Subscriber",
      type: types.bool(),
    });
    t.dataOutput({
      id: "vip",
      name: "VIP",
      type: types.bool(),
    });
  },
  run({ ctx, data }) {
    const u = user().unwrap();
    if (data.self) return;
    ctx.setOutput("username", data.tags.username);
    ctx.setOutput("displayName", data.tags["display-name"]);
    ctx.setOutput("userId", data.tags["user-id"]);
    ctx.setOutput("message", data.message);
    ctx.setOutput("messageId", data.tags.id);
    ctx.setOutput("broadcaster", data.tags["user-id"] == u.id);
    ctx.setOutput("mod", data.tags.mod);
    ctx.setOutput("sub", data.tags.subscriber);
    ctx.setOutput("vip", data.tags.vip);
    ctx.exec("exec");
  },
});