import { core } from "../models";
import { types } from "../types";
import { createEndpoint } from "../utils/httpEndpoint";

const pkg = core.createPackage<any>({ name: "Discord" });

export const LSTokenName = "discordBotToken";
const Token = localStorage.getItem(LSTokenName);
console.log(Token);

const ws = new WebSocket("wss://gateway.discord.gg/?v=6&encoding=json");

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
  path: "https://discordapp.com/api/v10",
  fetchFn: (url, args) =>
    fetch(url, {
      ...args,
      headers: {
        ...args?.headers,
        "Content-Type": "application/json",
        Authorization: `Bot ${Token}`,
      },
    }),
});

const discordApi = {
  channels(id: string) {
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
  users(id: string) {
    return createEndpoint({ path: `/users/${id}`, extend: apiEndpoint });
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
    await discordApi.channels(ctx.getInput("channel")).messages.post({
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
    ctx.setOutput("roles", data.member.roles);
    ctx.exec("exec");
  },
});

pkg.createNonEventSchema({
  name: "Get Discord User",
  variant: "Exec",
  generateIO: (t) => {
    t.execInput({
      id: "exec",
    });
    t.dataInput({
      id: "userId",
      name: "User ID",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const response = await discordApi.users(ctx.getInput("userId")).get();
    console.log(response);
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
    ctx.setOutput("roles", data.member.roles);
    ctx.exec("exec");
  },
});
