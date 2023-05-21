import { z } from "zod";
import { fs } from "@tauri-apps/api";
import pkg from "./pkg";
import { botToken, setBotToken } from "./auth";
import { createResource, createRoot } from "solid-js";
import { GUILD_MEMBER_SCHEMA, ROLE_SCHEMA, USER_SCHEMA } from "./schemas";
import { createEndpoint } from "../httpEndpoint";
import { Maybe, Option, rspcClient, types } from "@macrograph/core";

const root = createEndpoint({
  path: "https://discord.com/api/v10",
  fetchFn: async (args) => {
    const token = botToken();
    if (token === null) throw new Error("No bot token!");

    const { data } = await rspcClient.query([
      "http.json",
      {
        ...args,
        headers: {
          ...args?.headers,
          "Content-Type": "application/json",
          Authorization: `Bot ${token}`,
        },
      },
    ]);

    return data;
  },
});

const api = {
  channels: (id: string) => {
    const channels = createEndpoint({
      path: `/channels/${id}`,
      extend: root,
    });

    return {
      messages: createEndpoint({
        extend: channels,
        path: `/messages`,
      }),
    };
  },
  users: (id: string) => createEndpoint({ path: `/users/${id}`, extend: root }),
  guilds: (guildId: string) => {
    const guilds = createEndpoint({
      path: `/guilds/${guildId}`,
      extend: root,
    });

    return {
      members: createEndpoint({ path: `/members`, extend: guilds }),
      member: (userId: string) =>
        createEndpoint({
          path: `/members/${userId}`,
          extend: guilds,
        }),
      roles: createEndpoint({ path: `/roles`, extend: guilds }),
    };
  },
};

const [bot] = createRoot(() =>
  createResource(botToken, async () => {
    try {
      return await api.users("@me").get(USER_SCHEMA);
    } catch {
      setBotToken(null);
    }
  })
);

export { bot };

pkg.createNonEventSchema({
  name: "Send Discord Message",
  variant: "Exec",
  generateIO: (t) => {
    t.execInput({
      id: "exec",
    });
    t.dataInput({
      id: "message",
      name: "Message",
      type: types.string(),
    });
    t.dataInput({
      id: "channelId",
      name: "Channel ID",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    await api.channels(ctx.getInput("channelId")).messages.post(z.undefined(), {
      body: { Json: { content: ctx.getInput("message") } },
    });
  },
});

pkg.createNonEventSchema({
  name: "Get Discord User",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "userId",
      name: "User ID",
      type: types.string(),
    });
    io.dataOutput({
      id: "username",
      name: "UserName",
      type: types.string(),
    });
    io.dataOutput({
      id: "avatarId",
      name: "Avatar ID",
      type: types.option(types.string()),
    });
    io.dataOutput({
      id: "bannerId",
      name: "Banner ID",
      type: types.option(types.string()),
    });
  },
  async run({ ctx }) {
    const response = await api.users(ctx.getInput("userId")).get(USER_SCHEMA);

    ctx.setOutput("username", response.username);
    ctx.setOutput("avatarId", Maybe(response.avatar));
    ctx.setOutput("bannerId", Maybe(response.avatar));
  },
});

pkg.createNonEventSchema({
  name: "Get Discord Guild User",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "guildId",
      name: "Guild ID",
      type: types.string(),
    });
    t.dataInput({
      id: "userId",
      name: "User ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "username",
      name: "UserName",
      type: types.string(),
    });
    t.dataOutput({
      id: "displayName",
      name: "Display Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "avatarId",
      name: "Avatar ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "bannerId",
      name: "Banner ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "nick",
      name: "Nickname",
      type: types.string(),
    });
    t.dataOutput({
      id: "roles",
      name: "Roles",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const response = await api
      .guilds(ctx.getInput("guildId"))
      .member(ctx.getInput("userId"))
      .get(GUILD_MEMBER_SCHEMA);

    ctx.setOutput("username", Maybe(response.user?.username));
    ctx.setOutput("avatarId", Maybe(response.user?.avatar));
    ctx.setOutput("bannerId", Maybe(response.user?.banner));
    ctx.setOutput("nick", response.nick);
    ctx.setOutput("roles", response.roles);
  },
});

pkg.createNonEventSchema({
  name: "Get Discord Role By Id",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "guildId",
      name: "Guild ID",
      type: types.string(),
    });
    t.dataInput({
      id: "roleIdIn",
      name: "Role ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "name",
      name: "Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "roleIdOut",
      name: "Role ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "position",
      name: "Position",
      type: types.int(),
    });
    t.dataOutput({
      id: "mentionable",
      name: "Mentionable",
      type: types.bool(),
    });
    t.dataOutput({
      id: "permissions",
      name: "Permissions",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    let roleId = ctx.getInput("roleIdIn");

    const roles = await api
      .guilds(ctx.getInput("guildId"))
      .roles.get(z.array(ROLE_SCHEMA));

    const role = roles.find((role) => role.id === roleId);

    if (!role) return;

    ctx.setOutput("name", role.name);
    ctx.setOutput("roleIdOut", role.id);
    ctx.setOutput("position", role.position);
    ctx.setOutput("mentionable", role.mentionable);
    ctx.setOutput("permissions", role.permissions);
  },
});

pkg.createNonEventSchema({
  name: "Send Discord Webhook",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "webhookUrl",
      name: "Webhook URL",
      type: types.string(),
    });
    t.dataInput({
      id: "content",
      name: "Message",
      type: types.option(types.string()),
    });
    t.dataInput({
      id: "username",
      name: "Username",
      type: types.string(),
    });
    t.dataInput({
      id: "avatarUrl",
      name: "Avatar URL",
      type: types.option(types.string()),
    });
    t.dataInput({
      id: "tts",
      name: "TTS",
      type: types.option(types.bool()),
    });
    t.dataInput({
      id: "fileLocation",
      name: "File Location",
      type: types.option(types.string()),
    });
    t.dataOutput({
      id: "status",
      name: "Status",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const body: Record<string, string> = {};

    ctx.getInput<Option<string>>("content").map((v) => (body.content = v));
    ctx.getInput<Option<string>>("avatarUrl").map((v) => (body.avatar_url = v));
    ctx.getInput<Option<string>>("username").map((v) => (body.username = v));
    ctx.getInput<Option<boolean>>("tts").map((v) => (body.tts = v.toString()));
    await ctx.getInput<Option<string>>("fileLocation").mapAsync(async (v) => {
      body["file[0]"] = JSON.stringify({
        file: await fs.readBinaryFile(v),
        fileName: ctx
          .getInput<string>("fileLocation")
          .split(/[\/\\]/)
          .at(-1),
      });
    });

    let response = await rspcClient.query([
      "http.json",
      {
        url: ctx.getInput("webhookUrl"),
        method: "POST",
        body: {
          Form: body,
        },
      },
    ]);

    ctx.setOutput("status", response.status);
  },
});
