import { z } from "zod";
import { core } from "../models";
import { types } from "../types";
import { createEndpoint } from "../utils/httpEndpoint";
import { fs } from "@tauri-apps/api";
import { Body, Part, Part } from "@tauri-apps/api/http"
import { http } from "@tauri-apps/api"

const pkg = core.createPackage<any>({ name: "Discord" });

export const LSTokenName = "discordBotToken";
const Token = localStorage.getItem(LSTokenName);

const ws = new WebSocket("wss://gateway.discord.gg/?v=6&encoding=json");

// let test = http.fetch("https://discord.com/api/webhooks/1104900564304789665/ABrjwBFnHY0VCO0maAENNiPcvvXgqC753ImJ38e1i8ZEZgUEvD9wDC5U_aG424H-PBEh", {
//   method: "POST",
//   headers: { "Content-Type": "multipart/form-data" },
//   body: Body.form({
//     content: "test test",
//     "file[0]": {
//       file: await fs.readBinaryFile("C:/Users/Josh/Downloads/test.png"),
//       fileName: "test.png"
//     }
//   })
// })

if (Token) {
  var interval = 0;
  var token = Token;

  const payload = {
    op: 2,
    d: {
      token: token,
      intents: 33280,
      properties: {
        $os: "linux",
        $browser: "chrome",
        $device: "chrome",
      },
    },
  };

  ws.addEventListener("open", function open(x) {
    ws.send(JSON.stringify(payload));
  });

  let seq;
  ws.addEventListener("message", function incoming(data) {
    let x = data.data;
    let payload = JSON.parse(x);

    const { t, event, op, d, s } = payload;
    seq = s;
    switch (op) {
      // OPCODE 10 GIVES the HEARTBEAT INTERVAL, SO YOU CAN KEEP THE CONNECTION ALIVE
      case 10:
        const { heartbeat_interval } = d;
        ws.send(JSON.stringify({ op: 1, d: null }));
        setInterval(() => {
          ws.send(JSON.stringify({ op: 1, d: seq }));
        }, heartbeat_interval);

        break;
    }

    switch (t) {
      // IF MESSAGE IS CREATED, IT WILL LOG IN THE CONSOLE
      case "MESSAGE_CREATE":
        console.log(d.type);
        if (d.type !== 0) return;
        pkg.emitEvent({
          name: "discordMessage",
          data: d,
        });
    }
  });
}

const apiEndpoint = createEndpoint({
  path: "https://discordapp.com/api",
  fetchFn: async (url, args) => {
    const res = await fetch(url, {
      ...args,
      headers: {
        ...args?.headers,
        "Content-Type": "application/json",
        Authorization: `Bot ${Token}`,
      },
    });

    return await res.json();
  },
});

const discordApi = {
  channels: (id: string) => {
    const channelsEndpoint = createEndpoint({
      path: `/channels/${id}`,
      extend: apiEndpoint,
    });

    return {
      messages: createEndpoint({
        extend: channelsEndpoint,
        path: `/messages`,
      }),
    };
  },
  users: (id: string) =>
    createEndpoint({ path: `/users/${id}`, extend: apiEndpoint }),
  guilds: (guildId: string) => {
    const guildsEndpoint = createEndpoint({
      path: `/guilds/${guildId}`,
      extend: apiEndpoint,
    });

    return {
      members: createEndpoint({ path: `/members`, extend: guildsEndpoint }),
      member: (userId: string) =>
        createEndpoint({
          path: `/members/${userId}`,
          extend: guildsEndpoint,
        }),
      roles: createEndpoint({ path: `/roles`, extend: guildsEndpoint }),
    };
  },
};

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
      id: "channel",
      name: "Channel ID",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    await discordApi
      .channels(ctx.getInput("channel"))
      .messages.post(z.undefined(), {
        body: JSON.stringify({ content: ctx.getInput("message") }),
      });

    ctx.exec("exec");
  },
});

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
      type: types.string(),
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
    console.log(data);
    ctx.setOutput("message", data.content);
    ctx.setOutput("channelId", data.channel_id);
    ctx.setOutput("username", data.author.username);
    ctx.setOutput("userId", data.author.id);
    ctx.setOutput("nickname", data.member.nick);
    ctx.setOutput("guildId", data.guild_id);
    ctx.setOutput("roles", data.member.roles);
    ctx.exec("exec");
  },
});

const USER_SCHEMA = z.object({
  username: z.string(),
  display_name: z.string().nullable(),
  avatar: z.string(),
  banner: z.string(),
});

pkg.createNonEventSchema({
  name: "Get Discord User",
  variant: "Exec",
  generateIO: (t) => {
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
      id: "display_name",
      name: "Display Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "avatar",
      name: "Avatar ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "banner",
      name: "Banner ID",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const response = await discordApi
      .users(ctx.getInput("userId"))
      .get(USER_SCHEMA);

    ctx.setOutput("username", response.username);
    ctx.setOutput("display_name", response.display_name);
    ctx.setOutput("avatar", response.avatar);
    ctx.setOutput("banner", response.banner);
  },
});

const GUILD_MEMBER_SCHEMA = z.object({
  user: USER_SCHEMA,
  nick: z.string(),
  roles: z.array(z.string()),
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
      id: "display_name",
      name: "Display Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "avatar",
      name: "Avatar ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "banner",
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
    const response = await discordApi
      .guilds(ctx.getInput("guildId"))
      .member(ctx.getInput("userId"))
      .get(GUILD_MEMBER_SCHEMA);

    ctx.setOutput("username", response.user.username);
    ctx.setOutput("display_name", response.user.display_name);
    ctx.setOutput("avatar", response.user.avatar);
    ctx.setOutput("banner", response.user.banner);
    ctx.setOutput("nick", response.nick);
    ctx.setOutput("roles", response.roles);
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
      type: types.string(),
    });
    t.dataInput({
      id: "username",
      name: "Username",
      type: types.string(),
    });
    t.dataInput({
      id: "avatarUrl",
      name: "Avatar URL",
      type: types.string(),
    });
    t.dataInput({
      id: "tts",
      name: "TTS",
      type: types.bool(),
    });
    t.dataInput({
      id: "fileLocation",
      name: "File Location",
      type: types.string(),
    });
    t.dataOutput({
      id: "success",
      name: "Success",
      type: types.bool(),
    })
  },
  async run({ ctx }) {
    // const bodyForm = new FormData();

    //   content: "test butt",
    //   "file[0]": {
    //     file: await fs.readBinaryFile(ctx.getInput("fileLocation")),
    //     fileName: ctx.getInput<string>("fileLocation").split(/[\/\\]/).at(-1)
    //   }
    // }
    console.log(ctx.getInput("tts"));

    const body: Record<string, Part> = {}
    if (ctx.getInput("content")) body.content = ctx.getInput("content");
    if (ctx.getInput("avatarUrl")) body.avatar_url = ctx.getInput("avatarUrl");
    if (ctx.getInput("username")) body.username = ctx.getInput("username");
    if (ctx.getInput("tts")) body.tts = ctx.getInput<Boolean>("tts").toString();
    if (ctx.getInput("fileLocation")) {
      body["file[0]"] = {
        file: await fs.readBinaryFile(ctx.getInput("fileLocation")),
        fileName: ctx.getInput<string>("fileLocation").split(/[\/\\]/).at(-1)
      }
    }

    console.log(ctx.getInput<string>("fileLocation").split(/[\/\\]/).at(-1));
    const headers = new Headers();
    headers.append("Content-Type", "multipart/form-data");
    let response = await http.fetch(ctx.getInput("webhookUrl"), {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
      body: Body.form(body)
    });
    ctx.setOutput("success", response.status === 200);
  }
});

const ROLE_SCHEMA = z.object({
  color: z.number(),
  flags: z.number(),
  hoise: z.boolean(),
  id: z.string(),
  managed: z.boolean(),
  mentionable: z.boolean(),
  permissions: z.string(),
  position: z.number(),
  name: z.string(),
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
      id: "roleId",
      name: "Role ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "roleId",
      name: "Role ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "name",
      name: "Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "roleId",
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
    let roleId = ctx.getInput("roleId");

    const roles = await discordApi
      .guilds(ctx.getInput("guildId"))
      .roles.get(z.array(ROLE_SCHEMA));

    const role = roles.find((role) => role.id === roleId);

    if (!role) return;

    ctx.setOutput("name", role.name);
    ctx.setOutput("roleId", role.id);
    ctx.setOutput("position", role.position);
    ctx.setOutput("mentionable", role.mentionable);
    ctx.setOutput("permissions", role.permissions);
  },
});
