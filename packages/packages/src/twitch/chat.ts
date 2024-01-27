import {
  Package,
  PropertyDef,
  CreateEventSchema,
  SchemaProperties,
} from "@macrograph/runtime";
import { jsToJSON, JSON } from "@macrograph/json";
import { t } from "@macrograph/typesystem";
import { Maybe } from "@macrograph/option";
import {
  onCleanup,
  createEffect,
  mapArray,
  createMemo,
  on,
  createRoot,
  runWithOwner,
} from "solid-js";
import tmi, { Events } from "tmi.js";
import { ReactiveMap } from "@solid-primitives/map";
import { createEventBus } from "@solid-primitives/event-bus";
import { createMutable } from "solid-js/store";

import { Ctx } from "./ctx";
import { Account } from "./auth";
import { TwitchAccount, TwitchChannel } from "./resource";
import { getOwner } from "solid-js/web";

type ChatState = {
  client: tmi.Client;
  status: "disconnected" | "connecting" | "connected";
  channelListenerCounts: Record<string, number>;
};

export function createChat() {
  const clients = new ReactiveMap<string, ChatState>();

  function createClient(account: Account) {
    const client = new tmi.Client({
      options: { skipUpdatingEmotesets: true },
      identity: {
        username: account.data.display_name,
        password: account.token.access_token,
      },
    });

    const state = createMutable<ChatState>({
      client,
      status: "disconnected",
      channelListenerCounts: {},
    });

    let dispose: () => void | undefined;

    client.on("connected", () => {
      if (state.status === "connected") return;

      state.status = "connected";

      dispose = createRoot((dispose) => {
        createEffect(
          mapArray(
            () => Object.keys(state.channelListenerCounts),
            (channel) => {
              const shouldListen = createMemo(() => {
                const count = state.channelListenerCounts[channel];
                return count !== undefined && count > 0;
              });

              createEffect(
                on(shouldListen, (shouldListen) => {
                  if (shouldListen) client.join(channel);
                  else client.part(channel);
                })
              );
            }
          )
        );

        return dispose;
      });
    });

    client.on("disconnected", () => {
      state.status = "disconnected";

      dispose?.();
    });

    return state;
  }

  async function connectClient(account: Account) {
    if (!clients.has(account.data.id))
      clients.set(account.data.id, createClient(account));

    const chat = clients.get(account.data.id)!;

    if (chat.status !== "disconnected") return;

    await chat.client.connect();
  }

  async function disconnectClient(account: Account) {
    const chat = clients.get(account.data.id);
    if (!chat) return;

    await chat.client.disconnect();
  }

  return {
    clients,
    connectClient,
    disconnectClient,
  };
}

export type Chat = ReturnType<typeof createChat>;

export function register(pkg: Package, { chat }: Ctx) {
  const defaultProperties = {
    channel: { name: "Twitch Channel", resource: TwitchChannel },
    sender: { name: "Sender Account", resource: TwitchAccount },
  };

  type DefaultProperties = SchemaProperties<typeof defaultProperties>;

  pkg.createSchema({
    name: "Send Chat Message",
    type: "exec",
    properties: defaultProperties,
    createIO: ({ ctx, properties, io }) => {
      const state = () =>
        ctx
          .getProperty(properties.sender as DefaultProperties["sender"])
          .andThen((sender) => Maybe(chat.clients.get(sender.data.id)))
          .filter((s) => s.status === "connected");

      const data = () =>
        [
          state().expect("No chat client connected"),
          ctx
            .getProperty(properties.channel as DefaultProperties["channel"])
            .expect("Channel not provided"),
        ] as const;

      createEffect(
        on(data, ([state, channel]) => {
          const channelLowercase = channel.toLowerCase();

          state.channelListenerCounts[channelLowercase] ??= 0;
          state.channelListenerCounts[channelLowercase] += 1;

          onCleanup(() => (state.channelListenerCounts[channelLowercase] -= 1));
        })
      );

      return {
        message: io.dataInput({
          id: "message",
          name: "Message",
          type: t.string(),
        }),
        data,
      };
    },
    run({ ctx, io }) {
      const [state, channel] = io.data();

      return state.client.say(channel, ctx.getInput(io.message));
    },
  });

  type ListenerType<T> = [T] extends [(...args: infer U) => any]
    ? U
    : [T] extends [never]
    ? []
    : [T];

  function createChatEventSchema<
    TFire,
    TEvent extends keyof Events,
    TProperties extends Record<string, PropertyDef> = {},
    TIO = void
  >({
    event,
    ...s
  }: Omit<
    CreateEventSchema<TProperties & typeof defaultProperties, TIO, TFire>,
    "type" | "createListener"
  > & {
    properties?: TProperties;
    event: {
      type: TEvent;
      handler(...args: ListenerType<Events[TEvent]>): {
        channel: string;
        data: TFire;
      };
    };
  }) {
    pkg.createSchema({
      ...s,
      type: "event",
      properties: { ...s.properties, ...defaultProperties } as any,
      createListener({ ctx, properties }) {
        const client = () =>
          ctx
            .getProperty(properties.sender as DefaultProperties["sender"])
            .andThen((sender) => Maybe(chat.clients.get(sender.data.id)))
            .filter((s) => s.status === "connected");

        const data = () =>
          [
            client().expect("No chat client connected"),
            ctx
              .getProperty(properties.channel as DefaultProperties["channel"])
              .expect("Channel not provided"),
          ] as const;

        createEffect(() => {
          const [state, channel] = data();
          state.client.join(channel);
          onCleanup(() => state.client.part(channel));
        });

        const bus = createEventBus<TFire>();

        createEffect(() => {
          const [state, channel] = data();

          const channelHash = `#${channel.toLowerCase()}`;

          const cb = (...args: ListenerType<Events[TEvent]>) => {
            const { channel, data } = event.handler(...args);
            if (channel !== channelHash) return;

            bus.emit(data);
          };

          state.client.addListener(event.type, cb);
          onCleanup(() => state.client.removeListener(event.type, cb));
        });

        return bus;
      },
    });
  }

  createChatEventSchema({
    name: "Chat Message",
    event: {
      type: "message",
      handler: (channel, userstate, message, self) => ({
        channel,
        data: { userstate, message, self },
      }),
    },
    createIO: ({ io }) => ({
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
        type: t.option(t.string()),
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
    }),
    run({ ctx, data, io }) {
      if (data.self) return;
      console.log(data);
      ctx.setOutput(io.username, data.userstate.username!);
      ctx.setOutput(io.displayName, data.userstate["display-name"]!);
      ctx.setOutput(io.userId, data.userstate["user-id"]!);
      ctx.setOutput(io.message, data.message);
      ctx.setOutput(io.messageId, data.userstate.id!);
      ctx.setOutput(io.mod, data.userstate.mod !== true);
      ctx.setOutput(io.sub, data.userstate.subscriber !== true);
      ctx.setOutput(io.vip, data.userstate.vip !== true);
      ctx.setOutput(io.color, Maybe(data.userstate.color));
      ctx.setOutput(
        io.broadcaster,
        data.userstate["room-id"] === data.userstate["user-id"]
      );
      ctx.setOutput(
        io.emotes,
        new ReactiveMap(
          Object.entries(data.userstate.emotes ?? {}).map(([key, value]) => [
            key,
            jsToJSON(value)!,
          ])
        )
      );

      return ctx.exec(io.exec);
    },
  });

  createChatEventSchema({
    name: "Slow Mode Toggled",
    event: {
      type: "slowmode",
      handler: (channel, enabled, length) => ({
        channel,
        data: { enabled, length },
      }),
    },
    createIO: ({ io }) => ({
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
        type: t.int(),
      }),
    }),
    run({ ctx, data, io }) {
      ctx.setOutput(io.enabled, data.enabled);
      ctx.setOutput(io.length, data.length);
      return ctx.exec(io.exec);
    },
  });

  createChatEventSchema({
    name: "Emote Only Mode Toggled",
    event: {
      type: "emoteonly",
      handler: (channel, data) => ({ channel, data }),
    },
    createIO: ({ io }) => ({
      exec: io.execOutput({
        id: "exec",
      }),
      enabled: io.dataOutput({
        id: "enabled",
        name: "Enabled",
        type: t.bool(),
      }),
    }),
    run({ ctx, data, io }) {
      ctx.setOutput(io.enabled, data);
      return ctx.exec(io.exec);
    },
  });

  createChatEventSchema({
    name: "Subscriber Only Mode Toggled",
    event: {
      type: "subscribers",
      handler: (channel, data) => ({ channel, data }),
    },
    createIO: ({ io }) => ({
      exec: io.execOutput({
        id: "exec",
      }),
      enabled: io.dataOutput({
        id: "enabled",
        name: "Enabled",
        type: t.bool(),
      }),
    }),
    run({ ctx, data, io }) {
      ctx.setOutput(io.enabled, data);
      return ctx.exec(io.exec);
    },
  });

  createChatEventSchema({
    name: "Follower Only Mode Toggled",
    event: {
      type: "followersonly",
      handler: (channel, enabled, length) => ({
        channel,
        data: { enabled, length },
      }),
    },
    createIO: ({ io }) => ({
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
        type: t.int(),
      }),
    }),
    run({ ctx, data, io }) {
      ctx.setOutput(io.enabled, data.enabled);
      ctx.setOutput(io.length, data.length);
      return ctx.exec(io.exec);
    },
  });

  createChatEventSchema({
    name: "Chat Message Deleted",
    event: {
      type: "messagedeleted",
      handler: (channel, username, deletedMessage, userstate) => ({
        channel,
        data: { username, deletedMessage, userstate },
      }),
    },
    createIO: ({ io }) => ({
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
    }),
    run({ ctx, data, io }) {
      ctx.setOutput(io.username, data.username);
      ctx.setOutput(io.deletedMessage, data.deletedMessage);
      ctx.setOutput(io.messageId, data.userstate["target-msg-id"]!);
      ctx.exec(io.exec);
    },
  });
}
