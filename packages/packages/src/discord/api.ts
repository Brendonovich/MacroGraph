import { Accessor, createResource } from "solid-js";
import { Core, OAuthToken, Package } from "@macrograph/runtime";
import { Maybe, None } from "@macrograph/option";
import { t } from "@macrograph/typesystem";
import { z } from "zod";

import { Auth } from "./auth";
import { GUILD_MEMBER_SCHEMA, ROLE_SCHEMA, USER_SCHEMA } from "./schemas";
import { Endpoint, createEndpoint } from "../httpEndpoint";
import { Ctx } from ".";

function createApiEndpoint(core: Core, getToken: Accessor<OAuthToken>) {
  const root = createEndpoint({
    path: "https://discord.com/api/v10",
    fetch: async (url, args) => {
      const run = () =>
        core
          .fetch(url, {
            ...args,
            headers: {
              ...args?.headers,
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken().access_token}`,
            },
          })
          .then((res) => res.json());

      try {
        return await run();
      } catch {
        await core.oauth.refresh("discord", getToken().refresh_token);
        return await run();
      }
    },
  });

  return {
    channels: (id: string) => {
      const channel = root.extend(`/channels/${id}`);

      return { messages: channel.extend(`/messages`) };
    },
    users: (() => {
      const fn = (id: string) => root.extend(`/users/${id}`);
      Object.assign(fn, { me: root.extend(`/users/@me`) });
      return fn as {
        (id: string): Endpoint;
        me: Endpoint;
      };
    })(),
    guilds: (guildId: string) => {
      const guild = root.extend(`/guilds/${guildId}`);

      return {
        members: guild.extend(`/members`),
        member: (userId: string) => guild.extend(`/members/${userId}`),
        roles: guild.extend(`/roles`),
      };
    },
  };
}

export function create({ authToken, botToken, setBotToken }: Auth, core: Core) {
  const userApi = createApiEndpoint(core, () =>
    authToken().expect("Not logged in!")
  );

  const [user] = createResource(
    () => authToken().toNullable(),
    () => userApi.users.me.get(USER_SCHEMA)
  );

  const botApi = createApiEndpoint(core, () =>
    authToken().expect("Not logged in!")
  );

  const [bot] = createResource(botToken, async () => {
    try {
      return await botApi.users.me.get(USER_SCHEMA);
    } catch (e) {
      setBotToken(None);
    }
  });

  return { bot, api: userApi, user };
}

export function register(pkg: Package, { api }: Ctx, core: Core) {
  pkg.createNonEventSchema({
    name: "Send Discord Message",
    variant: "Exec",
    createIO: ({ io }) => {
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
          name: "Allow @everyone",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      await api.channels(ctx.getInput(io.channelId)).messages.post(z.any(), {
        body: JSON.stringify({
          content: ctx.getInput(io.message),
          allowed_mentions: {
            parse: ctx.getInput(io.everyone) ? ["everyone"] : [],
          },
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Discord User",
    variant: "Exec",
    createIO: ({ io }) => {
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
      const response = await api
        .users(ctx.getInput(io.userId))
        .get(USER_SCHEMA);

      ctx.setOutput(io.username, response.username);
      ctx.setOutput(io.avatarId, Maybe(response.avatar));
      ctx.setOutput(io.bannerId, Maybe(response.avatar));
    },
  });

  pkg.createNonEventSchema({
    name: "Get Discord Guild User",
    variant: "Exec",
    createIO: ({ io }) => {
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
    createIO: ({ io }) => {
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
    createIO: ({ io }) => {
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

      const formData = new FormData();

      for (const [key, value] of Object.entries(body)) {
        formData.set(key, value);
      }

      let response = await core.fetch(ctx.getInput(io.webhookUrl), {
        method: "POST",
        body: formData,
      });

      ctx.setOutput(io.status, response.status);
    },
  });
}
