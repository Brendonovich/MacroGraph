import { z } from "zod";
import pkg from "./pkg";
import { botToken, setBotToken } from "./auth";
import { createResource, createRoot } from "solid-js";
import { GUILD_MEMBER_SCHEMA, ROLE_SCHEMA, USER_SCHEMA } from "./schemas";
import { createEndpoint, nativeFetch } from "../httpEndpoint";
import { Maybe, None, rspcClient, t } from "@macrograph/core";

const root = createEndpoint({
  path: "https://discord.com/api/v10",
  fetchFn: async (url, args) => {
    const token = botToken();
    if (token.isNone()) throw new Error("No bot token!");

    return await nativeFetch(url, {
      ...args,
      headers: {
        ...args?.headers,
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`,
      },
    });
  },
});

const api = {
  channels: (id: string) => {
    const channel = root.extend(`/channels/${id}`);

    return { messages: channel.extend(`/messages`) };
  },
  users: (id: string) => root.extend(`/users/${id}`),
  guilds: (guildId: string) => {
    const guild = root.extend(`/guilds/${guildId}`);

    return {
      members: guild.extend(`/members`),
      member: (userId: string) => guild.extend(`/members/${userId}`),
      roles: guild.extend(`/roles`),
    };
  },
};

const [bot] = createRoot(() =>
  createResource(botToken, async () => {
    try {
      return await api.users("@me").get(USER_SCHEMA);
    } catch (e) {
      setBotToken(None);
    }
  })
);

export { bot };

pkg.createNonEventSchema({
  name: "Send Discord Message",
  variant: "Exec",
  generateIO: (io) => {
    return {
      message: io.dataInput({
        id: "message",
        name: "Message",
        type: t.string(),
      }),
      channelId: io.dataInput({
        id: "channelId",
        name: "Channel ID",
        type: t.string(),
      }),
      everyone: io.dataInput({
        id: "everyone",
        name: "Allow @Everyone",
        type: t.bool(),
      }),
    };
  },
  async run({ ctx, io }) {
    await api.channels(ctx.getInput(io.channelId)).messages.post(z.any(), {
      body: {
        content: ctx.getInput(io.message),
        allowed_mentions: {
          parse: ctx.getInput(io.everyone) ? ["everyone"] : [],
        },
      },
    });
  },
});

pkg.createNonEventSchema({
  name: "Get Discord User",
  variant: "Exec",
  generateIO: (io) => {
    return {
      userId: io.dataInput({
        id: "userId",
        name: "User ID",
        type: t.string(),
      }),
      username: io.dataOutput({
        id: "username",
        name: "UserName",
        type: t.string(),
      }),
      avatarId: io.dataOutput({
        id: "avatarId",
        name: "Avatar ID",
        type: t.option(t.string()),
      }),
      bannerId: io.dataOutput({
        id: "bannerId",
        name: "Banner ID",
        type: t.option(t.string()),
      }),
    };
  },
  async run({ ctx, io }) {
    const response = await api.users(ctx.getInput(io.userId)).get(USER_SCHEMA);

    ctx.setOutput(io.username, response.username);
    ctx.setOutput(io.avatarId, Maybe(response.avatar));
    ctx.setOutput(io.bannerId, Maybe(response.avatar));
  },
});

pkg.createNonEventSchema({
  name: "Get Discord Guild User",
  variant: "Exec",
  generateIO: (io) => {
    return {
      guildId: io.dataInput({
        id: "guildId",
        name: "Guild ID",
        type: t.string(),
      }),
      userId: io.dataInput({
        id: "userId",
        name: "User ID",
        type: t.string(),
      }),
      username: io.dataOutput({
        id: "username",
        name: "UserName",
        type: t.option(t.string()),
      }),
      displayName: io.dataOutput({
        id: "displayName",
        name: "Display Name",
        type: t.option(t.string()),
      }),
      avatarId: io.dataOutput({
        id: "avatarId",
        name: "Avatar ID",
        type: t.option(t.string()),
      }),
      bannerId: io.dataOutput({
        id: "bannerId",
        name: "Banner ID",
        type: t.option(t.string()),
      }),
      nick: io.dataOutput({
        id: "nick",
        name: "Nickname",
        type: t.option(t.string()),
      }),
      roles: io.dataOutput({
        id: "roles",
        name: "Roles",
        type: t.list(t.string()),
      }),
    };
  },
  async run({ ctx, io }) {
    const response = await api
      .guilds(ctx.getInput(io.guildId))
      .member(ctx.getInput(io.userId))
      .get(GUILD_MEMBER_SCHEMA);

    ctx.setOutput(io.username, Maybe(response.user?.username));
    ctx.setOutput(io.avatarId, Maybe(response.user?.avatar));
    ctx.setOutput(io.bannerId, Maybe(response.user?.banner));
    ctx.setOutput(io.nick, Maybe(response.nick));
    ctx.setOutput(io.roles, response.roles);
  },
});

pkg.createNonEventSchema({
  name: "Get Discord Role By Id",
  variant: "Exec",
  generateIO: (io) => {
    return {
      guildId: io.dataInput({
        id: "guildId",
        name: "Guild ID",
        type: t.string(),
      }),
      roleIdIn: io.dataInput({
        id: "roleIdIn",
        name: "Role ID",
        type: t.string(),
      }),
      name: io.dataOutput({
        id: "name",
        name: "Name",
        type: t.string(),
      }),
      roleIdOut: io.dataOutput({
        id: "roleIdOut",
        name: "Role ID",
        type: t.string(),
      }),
      position: io.dataOutput({
        id: "position",
        name: "Position",
        type: t.int(),
      }),
      mentionable: io.dataOutput({
        id: "mentionable",
        name: "Mentionable",
        type: t.bool(),
      }),
      permissions: io.dataOutput({
        id: "permissions",
        name: "Permissions",
        type: t.string(),
      }),
    };
  },
  async run({ ctx, io }) {
    let roleId = ctx.getInput(io.roleIdIn);

    const roles = await api
      .guilds(ctx.getInput(io.guildId))
      .roles.get(z.array(ROLE_SCHEMA));

    const role = roles.find((role) => role.id === roleId);

    if (!role) return;

    ctx.setOutput(io.name, role.name);
    ctx.setOutput(io.roleIdOut, role.id);
    ctx.setOutput(io.position, role.position);
    ctx.setOutput(io.mentionable, role.mentionable);
    ctx.setOutput(io.permissions, role.permissions);
  },
});

pkg.createNonEventSchema({
  name: "Send Discord Webhook",
  variant: "Exec",
  generateIO: (io) => {
    return {
      webhookUrl: io.dataInput({
        id: "webhookUrl",
        name: "Webhook URL",
        type: t.string(),
      }),
      content: io.dataInput({
        id: "content",
        name: "Message",
        type: t.string(),
      }),
      username: io.dataInput({
        id: "username",
        name: "Username",
        type: t.string(),
      }),
      avatarUrl: io.dataInput({
        id: "avatarUrl",
        name: "Avatar URL",
        type: t.string(),
      }),
      tts: io.dataInput({
        id: "tts",
        name: "TTS",
        type: t.bool(),
      }),
      // fileLocation: io.dataInput({
      //   id: "fileLocation",
      //   name: "File Location",
      //   type: types.option(types.string()),
      // }),
      status: io.dataOutput({
        id: "status",
        name: "Status",
        type: t.int(),
      }),
    };
  },
  async run({ ctx, io }) {
    const body: Record<string, string> = {};
    if (ctx.getInput(io.content)) body.content = ctx.getInput(io.content);
    if (ctx.getInput(io.avatarUrl))
      body.avatar_url = ctx.getInput(io.avatarUrl);
    if (ctx.getInput(io.username)) body.username = ctx.getInput(io.username);
    if (ctx.getInput(io.tts)) body.tts = ctx.getInput(io.tts).toString();
    // ctx.getInput<Option<string>>("content").map((v) => (body.content = v));
    // ctx.getInput<Option<string>>("avatarUrl").map((v) => (body.avatar_url = v));
    // ctx.getInput<Option<string>>("username").map((v) => (body.username = v));
    // ctx.getInput<Option<boolean>>("tts").map((v) => (body.tts = v.toString()));
    // await ctx.getInput<Option<string>>("fileLocation").mapAsync(async (v) => {
    //   body["file[0]"] = JSON.stringify({
    //     file: await fs.readBinaryFile(v),
    //     fileName: ctx
    //       .getInput<string>("fileLocation")
    //       .split(/[\/\\]/)
    //       .at(-1),
    //   });
    // });

    let response = await rspcClient.query([
      "http.json",
      {
        url: ctx.getInput(io.webhookUrl),
        method: "POST",
        body: {
          Form: body,
        },
      },
    ]);

    ctx.setOutput(io.status, response.status);
  },
});
