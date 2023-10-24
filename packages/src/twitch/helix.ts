import {
  Core,
  InferEnum,
  Maybe,
  None,
  OAuthToken,
  Package,
  Some,
  createEnum,
  createStruct,
  makePersisted,
  t,
} from "@macrograph/core";
import { Accessor, createSignal } from "solid-js";
import { z } from "zod";

import { createEndpoint } from "../httpEndpoint";
import { Auth, createUserInstance } from "./auth";

export const HELIX_USER_ID = "helixUserId";

export function createHelixEndpoint(
  clientId: string,
  getToken: Accessor<OAuthToken>,
  setToken: (token: OAuthToken) => void,
  core: Core
) {
  let refreshPromise: Promise<any> | null = null;

  const root = createEndpoint({
    path: "https://api.twitch.tv/helix",
    fetch: async (url, args) => {
      if (args?.body && args.body instanceof URLSearchParams) {
        url += `?${args.body.toString()}`;
        delete args.body;
      }

      const run = () =>
        fetch(url, {
          headers: {
            ...args?.headers,
            "content-type": "application/json",
            "Client-Id": clientId,
            Authorization: `Bearer ${getToken().access_token}`,
          },
          ...args,
        });

      let resp = await run();

      if (Math.floor(resp.status / 100) !== 2) {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const oldToken = getToken();
            const token = await core.oauth.refresh(
              "twitch",
              oldToken.refresh_token
            );
            setToken({ ...oldToken, ...token });
            refreshPromise = null;
          })();
        }
        await refreshPromise;
        resp = await run();
      }

      return resp.json().then((json: any) => json.data[0]);
    },
  });

  const client = {
    channels: (() => {
      const channels = root.extend(`/channels`);

      return {
        ...channels,
        followers: channels.extend(`/followers`),
        vips: channels.extend(`/vips`),
        followed: channels.extend(`/followed`),
        editors: channels.extend(`/editors`),
        commercial: channels.extend(`/commercial`),
      };
    })(),
    analytics: (() => {
      const analytics = root.extend(`/analytics`);

      return {
        games: analytics.extend(`/games`),
        extensions: analytics.extend(`/extensions`),
      };
    })(),
    bits: (() => {
      const bits = root.extend(`/bits`);

      return {
        leaderboard: bits.extend(`/leaderboard`),
        cheermotes: bits.extend(`/cheermotes`),
        extensions: bits.extend(`/extensions`),
      };
    })(),
    extensions: (() => {
      const extensions = root.extend(`/extensions`);

      return {
        transactions: extensions.extend(`/transactions`),
        configurations: extensions.extend(`/configurations`),
        requiredConfiguration: extensions.extend(`/required_configuration`),
        pubsub: extensions.extend(`/pubsub`),
        live: extensions.extend(`/live`),
        jwt: () => {
          const jwt = extensions.extend(`/jwt`);

          return {
            ...jwt,
            secrets: jwt.extend(`/secrets`),
          };
        },
        chat: extensions.extend(`/chat`),
        released: extensions.extend(`/released`),
      };
    })(),
    moderation: (() => {
      const moderation = root.extend(`/moderation`);

      return {
        bans: moderation.extend(`/bans`),
        blockedTerms: moderation.extend(`/blocked_terms`),
        chat: moderation.extend(`/chat`),
        moderators: moderation.extend(`/moderators`),
        shieldMode: moderation.extend(`/shield_mode`),
        enforcements: (() => {
          const enforcements = moderation.extend(`/enforcements`);

          return {
            ...enforcements,
            status: enforcements.extend(`/status`),
          };
        })(),

        automod: (() => {
          const automod = moderation.extend(`/automod`);

          return {
            ...automod,
            message: automod.extend(`/message`),
            settings: automod.extend(`/settings`),
          };
        })(),
      };
    })(),
    eventsub: (() => {
      const eventsub = root.extend(`/eventsub`);

      return {
        ...eventsub,
        subscriptions: eventsub.extend(`/subscriptions`),
      };
    })(),
    channelPoints: (() => {
      const channelPoints = root.extend(`/channel_points`);

      return {
        ...channelPoints,
        customRewards: (() => {
          const customRewards = channelPoints.extend(`/custom_rewards`);

          return {
            ...customRewards,
            redemptions: customRewards.extend(`/redemptions`),
          };
        })(),
      };
    })(),
    charity: (() => {
      const charity = root.extend(`/charity`);

      return {
        ...charity,
        donations: charity.extend(`/donations`),
        campaigns: charity.extend(`/campaigns`),
      };
    })(),
    chat: (() => {
      const chat = root.extend(`/chat`);

      return {
        chatters: chat.extend(`/chatters`),
        settings: chat.extend(`/settings`),
        announcements: chat.extend(`/announcements`),
        shoutouts: chat.extend(`/shoutouts`),
        color: chat.extend(`/color`),
        emotes: (() => {
          const emotes = chat.extend(`/emotes`);

          return {
            ...emotes,
            global: emotes.extend(`/global`),
            set: emotes.extend(`/set`),
          };
        })(),
        badges: (() => {
          const badges = chat.extend(`/badges`);

          return {
            ...badges,
            global: badges.extend(`/global`),
          };
        })(),
      };
    })(),
    clips: root.extend(`/clips`),
    entitlements: (() => {
      const entitlements = root.extend(`/entitlements`);

      return {
        drops: entitlements.extend(`/drops`),
      };
    })(),
    games: (() => {
      const games = root.extend(`/games`);

      return {
        ...games,
        top: root.extend(`/top`),
      };
    })(),
    goals: root.extend(`/goals`),
    guestStar: (() => {
      const guestStar = root.extend(`/guest_star`);

      return {
        channelSettings: guestStar.extend(`/channel_settings`),
        session: guestStar.extend(`/session`),
        invites: guestStar.extend(`/invites`),
        slot: guestStar.extend(`/slot`),
        slotSettings: guestStar.extend(`/slot_settings`),
      };
    })(),
    hypetrain: (() => {
      const hypetrain = root.extend(`/hypetrain`);

      return {
        events: hypetrain.extend(`/events`),
      };
    })(),
    polls: root.extend(`/polls`),
    predictions: root.extend(`/predictions`),
    raids: root.extend(`/raids`),
    schedule: (() => {
      const schedule = root.extend(`/schedule`);

      return {
        ...schedule,
        icalendar: schedule.extend(`/icalendar`),
        settings: schedule.extend(`/settings`),
        segment: schedule.extend(`/segment`),
      };
    })(),
    search: (() => {
      const search = root.extend(`/search`);

      return {
        catagories: search.extend(`/catagories`),
        channels: search.extend(`/channels`),
      };
    })(),
    soundtrack: (() => {
      const soundtrack = root.extend(`/soundtrack`);

      return {
        playlist: soundtrack.extend(`/playlist`),
        playlists: soundtrack.extend(`/playlists`),
        currentTrack: soundtrack.extend(`/current_track`),
      };
    })(),
    streams: (() => {
      const streams = root.extend(`/streams`);

      return {
        ...streams,
        key: streams.extend(`/key`),
        followed: streams.extend(`/followed`),
        markers: streams.extend(`/markers`),
        tags: streams.extend(`/tags`),
      };
    })(),
    subscriptions: (() => {
      const subscriptions = root.extend(`/subscriptions`);

      return {
        ...subscriptions,
        user: subscriptions.extend(`/user`),
      };
    })(),
    teams: (() => {
      const teams = root.extend(`/teams`);

      return {
        ...teams,
        channel: teams.extend(`/channel`),
      };
    })(),
    users: (() => {
      const users = root.extend(`/users`);

      return {
        ...users,
        follows: users.extend(`/follows`),
        blocks: users.extend(`/blocks`),
        extensions: (() => {
          const extensions = users.extend(`/extensions`);

          return {
            ...extensions,
            list: extensions.extend(`/list`),
          };
        })(),
      };
    })(),
    videos: root.extend(`/videos`),
    whispers: root.extend(`/whispers`),
  };

  return client;
}

export function createHelix(core: Core, auth: Auth) {
  const user = createUserInstance(HELIX_USER_ID, auth);

  const client = createHelixEndpoint(
    auth.clientId,
    () => user.account().unwrap().token,
    (token) => {
      const prevData = user.account().unwrap();
      if (prevData)
        auth.accounts.set(prevData.data.id, {
          ...prevData,
          token,
        });
    },
    core
  );

  return {
    client,
    user,
  };
}

export type Helix = ReturnType<typeof createHelix>;

export const UserSubscription = createStruct("User Subscription", (s) => ({
  tier: s.field("Tier", t.string()),
  gifted: s.field("Gifted", t.bool()),
  gifterName: s.field("Gifter Name", t.option(t.string())),
  gifterDisplayName: s.field("Gifter Display Name", t.option(t.string())),
  gifterId: s.field("Gifter ID", t.option(t.string())),
}));

export const AnnouncementColors = createEnum("Color", (e) => [
  e.variant("blue"),
  e.variant("green"),
  e.variant("orange"),
  e.variant("purple"),
  e.variant("default"),
]);

export const UserType = createEnum("User Type", (e) => [
  e.variant("Admin"),
  e.variant("Global Mod"),
  e.variant("Staff"),
  e.variant("Normal User"),
]);

export const BroadcasterType = createEnum("Broadcaster Type", (e) => [
  e.variant("Affliate"),
  e.variant("Partner"),
  e.variant("Normal User"),
]);

export const User = createStruct("User", (s) => ({
  id: s.field("ID", t.string()),
  login: s.field("Login", t.string()),
  displayName: s.field("Display Name", t.string()),
  userType: s.field("User Type", t.enum(UserType)),
  broadcasterType: s.field("Broadcaster Type", t.enum(BroadcasterType)),
  description: s.field("Description", t.string()),
  profileImage: s.field("Profile Image URL", t.string()),
  offlineImage: s.field("Offline Image URL", t.string()),
  createdAt: s.field("Created At", t.string()),
}));

export const Reward = createStruct("Reward", (s) => ({
  id: s.field("ID", t.string()),
  title: s.field("Title", t.string()),
  prompt: s.field("Prompt", t.string()),
  cost: s.field("Cost", t.int()),
  bgColor: s.field("Background Color", t.string()),
  enabled: s.field("Enabled", t.bool()),
  userInputRequired: s.field("User Input Required", t.bool()),
  maxRedemptionsPerStream: s.field("Max Redemptions/Stream", t.option(t.int())),
  maxRedemptionsPerUserPerStream: s.field(
    "Max Redemptions/User/Stream",
    t.option(t.int())
  ),
  globalCooldown: s.field("Global Cooldown", t.option(t.bool())),
  paused: s.field("Paused", t.bool()),
  inStock: s.field("In Stock", t.bool()),
  skipRequestQueue: s.field("Skip Request Queue", t.bool()),
  redemptionsThisStream: s.field("Redemptions This Stream", t.option(t.int())),
  cooldownExpire: s.field("Cooldown Expires In", t.option(t.string())),
}));

export const RedemptionStatus = createEnum("Redemption Status", (e) => [
  e.variant("Fulfilled"),
  e.variant("Cancelled"),
]);

export const Redemption = createStruct("Redemption", (s) => ({
  id: s.field("ID", t.string()),
  userId: s.field("User ID", t.string()),
  userDisplayName: s.field("User Display Name", t.string()),
  userName: s.field("User Name", t.string()),
  rewardId: s.field("Reward ID", t.string()),
  rewardTitle: s.field("Reward Title", t.string()),
  rewardPrompt: s.field("Reward Prompt", t.string()),
  rewardCost: s.field("Reward Cost", t.string()),
  userInput: s.field("User Input", t.string()),
  updateStatus: s.field("Status", t.enum(RedemptionStatus)),
  redemptionDate: s.field("Redemption Date", t.string()),
}));

export function register(pkg: Package, { client, user }: Helix) {
  const userId = () => user.account().map((a) => a.data.id);

  pkg.createNonEventSchema({
    name: "Ban User",
    variant: "Exec",
    generateIO: (io) => {
      return {
        userId: io.dataInput({
          name: "userID",
          id: "userId",
          type: t.string(),
        }),
        duration: io.dataInput({
          name: "Duration",
          id: "duration",
          type: t.int(),
        }),
        reason: io.dataInput({
          name: "Reason",
          id: "reason",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      client.moderation.bans.post(z.any(), {
        body: JSON.stringify({
          broadcaster_id: userId().unwrap(),
          moderator_id: userId().unwrap(),
          data: {
            user_id: ctx.getInput(io.userId),
            duration: ctx.getInput(io.duration),
            reason: ctx.getInput(io.reason),
          },
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Unban User",
    variant: "Exec",
    generateIO: (io) => {
      return {
        userId: io.dataInput({
          name: "userID",
          id: "userId",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      client.moderation.bans.delete(z.any(), {
        body: JSON.stringify({
          broadcaster_id: userId().unwrap(),
          moderator_id: userId().unwrap(),
          user_id: ctx.getInput(io.userId),
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Add Moderator",
    variant: "Exec",
    generateIO: (io) => {
      return {
        userId: io.dataInput({
          name: "userID",
          id: "userId",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      return client.moderation.moderators.post(z.any(), {
        body: JSON.stringify({
          broadcaster_id: userId().unwrap(),
          user_id: ctx.getInput(io.userId),
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Remove Moderator",
    variant: "Exec",
    generateIO: (io) => {
      return {
        userId: io.dataInput({
          name: "userID",
          id: "userId",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      client.moderation.moderators.delete(z.any(), {
        body: JSON.stringify({
          broadcaster_id: userId().unwrap(),
          user_id: ctx.getInput(io.userId),
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get Channel Info",
    variant: "Exec",
    generateIO: (io) => {
      return {
        broadcasterIdIn: io.dataInput({
          name: "Broadcaster ID",
          id: "broadcasterId",
          type: t.string(),
        }),
        broadcasterIdOut: io.dataOutput({
          name: "Broadcaster ID",
          id: "broadcasterId",
          type: t.string(),
        }),
        broadcasterLogin: io.dataOutput({
          name: "Broadcaster Login Name",
          id: "broadcasterLogin",
          type: t.string(),
        }),
        broadcasterDisplay: io.dataOutput({
          name: "Broadcaster Display Name",
          id: "broadcasterDisplay",
          type: t.string(),
        }),
        broadcasterLanguage: io.dataOutput({
          name: "Broadcaster Language",
          id: "broadcasterLanguage",
          type: t.string(),
        }),
        title: io.dataOutput({
          name: "Title",
          id: "title",
          type: t.string(),
        }),
        catagory: io.dataOutput({
          name: "Stream Catagory",
          id: "catagory",
          type: t.string(),
        }),
        catagoryId: io.dataOutput({
          name: "Catagory ID",
          id: "catagoryId",
          type: t.string(),
        }),
        tags: io.dataOutput({
          name: "Tags",
          id: "tags",
          type: t.list(t.string()),
        }),
        delay: io.dataOutput({
          name: "Delay",
          id: "delay",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await client.channels.get(z.any(), {
        body: new URLSearchParams({
          broadcaster_id: ctx.getInput(io.broadcasterIdIn),
        }),
      });
      const info = data.data[0];
      ctx.setOutput(io.broadcasterIdOut, info.broadcaster_id);
      ctx.setOutput(io.broadcasterLogin, info.broadcaster_login);
      ctx.setOutput(io.broadcasterDisplay, info.broadcaster_name);
      ctx.setOutput(io.broadcasterLanguage, info.broadcaster_language);
      ctx.setOutput(io.catagory, info.game_name);
      ctx.setOutput(io.catagoryId, info.game_id);
      ctx.setOutput(io.title, info.title);
      ctx.setOutput(io.delay, info.delay);
      ctx.setOutput(io.tags, info.tags);
    },
  });

  pkg.createNonEventSchema({
    name: "Modify Channel Info",
    variant: "Exec",
    generateIO: (io) => {
      return {
        broadcasterLanguage: io.dataInput({
          name: "Broadcaster Language",
          id: "broadcasterLanguage",
          type: t.string(),
        }),
        title: io.dataInput({
          name: "Title",
          id: "title",
          type: t.string(),
        }),
        catagoryName: io.dataInput({
          name: "Catagory Name",
          id: "catagoryName",
          type: t.string(),
        }),
        tags: io.dataInput({
          name: "Tags",
          id: "tags",
          type: t.list(t.string()),
        }),
        delay: io.dataInput({
          name: "Delay",
          id: "delay",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const body = {} as any;

      if (ctx.getInput(io.broadcasterLanguage))
        body.broadcaster_language = ctx.getInput(io.broadcasterLanguage);
      if (ctx.getInput(io.title)) body.title = ctx.getInput(io.title);
      if (ctx.getInput(io.delay)) body.delay = ctx.getInput(io.delay);
      if (ctx.getInput(io.tags)) body.tags = ctx.getInput(io.tags);

      if (ctx.getInput(io.catagoryName)) {
        let data = await client.games.get(z.any(), {
          body: new URLSearchParams({
            name: ctx.getInput(io.catagoryName),
          }),
        });

        body.game_id = data.data[0].id;
      }

      client.channels.patch(z.any(), {
        body: {
          ...body,
          broadcaster_id: userId().unwrap(),
        },
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Create Clip",
    variant: "Exec",
    generateIO: (io) => {
      return {
        clipId: io.dataOutput({
          name: "Clip ID",
          id: "clipId",
          type: t.string(),
        }),
        editUrl: io.dataOutput({
          name: "Edit URL",
          id: "editUrl",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      const clipId = await client.clips.post(z.any(), {
        body: new URLSearchParams({ broadcaster_id: userId().unwrap() }),
      });
      const data = clipId.data[0];

      ctx.setOutput(io.clipId, data.id);
      ctx.setOutput(io.editUrl, data.edit_url);
    },
  });

  pkg.createNonEventSchema({
    name: "Check User Subscription",
    variant: "Exec",
    generateIO: (io) => {
      return {
        userId: io.dataInput({
          name: "User ID",
          id: "userId",
          type: t.string(),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.option(t.struct(UserSubscription)),
        }),
      };
    },
    async run({ ctx, io }) {
      let response = await client.subscriptions.get(z.any(), {
        body: new URLSearchParams({
          user_id: ctx.getInput(io.userId),
          broadcaster_id: userId().unwrap(),
        }),
      });

      const data = response.data[0];
      ctx.setOutput(
        io.out,
        Maybe(data).map((data) =>
          UserSubscription.create({
            tier: data.tier,
            gifted: data.isGift,
            gifterName: Maybe(data.gifterName),
            gifterDisplayName: Maybe(data.gifterDisplayName),
            gifterId: Maybe(data.gifterId),
          })
        )
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Check User Follow",
    variant: "Exec",
    generateIO: (io) => {
      return {
        userId: io.dataInput({
          name: "User ID",
          id: "userId",
          type: t.string(),
        }),
        following: io.dataOutput({
          name: "Following",
          id: "following",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const user = userId().unwrap();

      let data = await client.channels.followers.get(z.any(), {
        body: new URLSearchParams({
          broadcaster_id: user,
          user_id: ctx.getInput(io.userId),
        }),
      });
      ctx.setOutput(io.following, data?.data.length === 1);
    },
  });

  pkg.createNonEventSchema({
    name: "Check User VIP",
    variant: "Exec",
    generateIO: (io) => {
      return {
        userId: io.dataInput({
          name: "User ID",
          id: "userId",
          type: t.string(),
        }),
        vip: io.dataOutput({
          name: "Vip",
          id: "vip",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await client.channels.vips.get(z.any(), {
        body: new URLSearchParams({
          broadcaster_id: userId().unwrap(),
          user_id: ctx.getInput(io.userId),
        }),
      });

      ctx.setOutput(io.vip, data.data[0] !== undefined);
    },
  });

  pkg.createNonEventSchema({
    name: "Check User Mod",
    variant: "Exec",
    generateIO: (io) => {
      return {
        userId: io.dataInput({
          name: "User ID",
          id: "userId",
          type: t.string(),
        }),
        moderator: io.dataOutput({
          name: "Moderator",
          id: "moderator",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const data = await client.moderation.moderators.get(z.any(), {
        body: new URLSearchParams({
          broadcaster_id: userId().unwrap(),
          user_id: ctx.getInput(io.userId),
        }),
      });

      ctx.setOutput(io.moderator, data.data[0] !== undefined);
    },
  });

  pkg.createNonEventSchema({
    name: "Create Custom Reward",
    variant: "Exec",
    generateIO: (io) => {
      return {
        title: io.dataInput({
          name: "Title",
          id: "title",
          type: t.string(),
        }),
        cost: io.dataInput({
          name: "Cost",
          id: "cost",
          type: t.int(),
        }),
        prompt: io.dataInput({
          name: "Prompt",
          id: "prompt",
          type: t.string(),
        }),
        enabled: io.dataInput({
          name: "Enabled",
          id: "isEnabled",
          type: t.bool(),
        }),
        backgroundColor: io.dataInput({
          name: "Background Color",
          id: "backgroundColor",
          type: t.string(),
        }),
        userInputRequired: io.dataInput({
          name: "User Input Required",
          id: "userInputRequired",
          type: t.bool(),
        }),
        maxRedemptionsPerStream: io.dataInput({
          name: "Max Redemptions Per Stream",
          id: "maxRedemptionsPerStream",
          type: t.int(),
        }),
        maxRedemptionsPerUserPerStream: io.dataInput({
          name: "Max Redemptions Per User Per Stream",
          id: "maxRedemptionsPerUserPerStream",
          type: t.int(),
        }),
        globalCooldown: io.dataInput({
          name: "Global Cooldown",
          id: "globalCooldown",
          type: t.int(),
        }),
        autoFulfill: io.dataInput({
          name: "Skip Redemption Queue",
          id: "autoFulfill",
          type: t.bool(),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.struct(Reward),
        }),
      };
    },
    async run({ ctx, io }) {
      const user = userId().unwrap();

      const response = await client.channelPoints.customRewards.post(z.any(), {
        body: JSON.stringify({
          broadcaster_id: user,
          title: ctx.getInput(io.title),
          cost: ctx.getInput(io.cost),
          prompt: ctx.getInput(io.prompt),
          isEnabled: ctx.getInput(io.enabled),
          backgroundColor: ctx.getInput(io.backgroundColor),
          userInputRequired: ctx.getInput(io.userInputRequired),
          maxRedemptionsPerStream: ctx.getInput(io.maxRedemptionsPerStream),
          maxRedemptionsPerUserPerStream: ctx.getInput(
            io.maxRedemptionsPerUserPerStream
          ),
          globalCooldown: ctx.getInput(io.globalCooldown),
          autoFulfill: ctx.getInput(io.autoFulfill),
        }),
      });

      const data = response.data[0];

      ctx.setOutput(
        io.out,
        Reward.create({
          id: data.id,
          title: data.title,
          prompt: data.prompt,
          cost: data.cost,
          bgColor: data.backgroundColor,
          enabled: data.isEnabled,
          userInputRequired: data.userInputRequired,
          maxRedemptionsPerStream: Maybe(data.maxRedemptionsPerStream),
          maxRedemptionsPerUserPerStream: Maybe(
            data.maxRedemptionsPerUserPerStream
          ),
          globalCooldown: Maybe(data.globalCooldown),
          paused: data.isPaused,
          inStock: data.isInStock,
          skipRequestQueue: data.autoFulfill,
          redemptionsThisStream: Maybe(data.redemptionsThisStream),
          cooldownExpire: Maybe(data.cooldownExpiryDate).map(JSON.stringify),
        })
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Start Commercial",
    variant: "Exec",
    generateIO: (io) => {
      return {
        duration: io.dataInput({
          name: "Duration (s)",
          id: "duraton",
          type: t.int(),
        }),
        retryAfter: io.dataOutput({
          name: "Cooldown",
          id: "retryAfter",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io }) {
      const response = await client.channels.commercial.post(z.any(), {
        body: JSON.stringify({
          broadcaster_id: userId().unwrap(),
          length: ctx.getInput(io.duration),
        }),
      });

      ctx.setOutput(io.retryAfter, response.data[0].retry_after);
    },
  });

  // const periodtext = pkg.createEnum("period", (e) => [
  //   e.variant("day"),
  //   e.variant("week"),
  //   e.variant("month"),
  //   e.variant("year"),
  //   e.variant("all"),
  // ]);

  // pkg.createNonEventSchema({
  //   name: "Get Bits Leaderboard",
  //   variant: "Exec",
  //   generateIO: (io) => {
  //     io.dataInput({
  //       name: "Count",
  //       id: "count",
  //       type: t.int(),
  //     });
  //     io.dataInput({
  //       name: "Period",
  //       id: "period",
  //       type: t.enum(periodtext),
  //     });
  //     io.dataInput({
  //       name: "Started At",
  //       id: "startedAt",
  //       type: t.string(),
  //     });
  //     io.dataInput({
  //       name: "User ID",
  //       id: "userId",
  //       type: t.string() ,
  //     });
  //   },
  //   async run({ ctx, io }) {
  //     const periodtxt = ctx.getInput<InferEnum<typeof periodtext>>("period");

  //     const response = await client.bits.leaderboard.get(z.any(), {
  //       body: new URLSearchParams({
  //         count: ctx.getInput(io.count"),
  //         period: periodtxt.variant,
  //         started_at: ctx.getInput(io.startedAt"),
  //         user_id: ctx.getInput(io.user_id"),
  //       }),
  //     });

  //   },
  // });

  pkg.createNonEventSchema({
    name: "Edit Custom Reward",
    variant: "Exec",
    generateIO: (io) => {
      return {
        rewardId: io.dataInput({
          name: "Reward Id",
          id: "id",
          type: t.string(),
        }),
        title: io.dataInput({
          name: "Title",
          id: "title",
          type: t.string(),
        }),
        cost: io.dataInput({
          name: "Cost",
          id: "cost",
          type: t.int(),
        }),
        prompt: io.dataInput({
          name: "Prompt",
          id: "prompt",
          type: t.string(),
        }),
        enabled: io.dataInput({
          name: "Enabled",
          id: "isEnabled",
          type: t.bool(),
        }),
        backgroundColor: io.dataInput({
          name: "Background Color",
          id: "backgroundColor",
          type: t.string(),
        }),
        userInputRequired: io.dataInput({
          name: "User Input Required",
          id: "userInputRequired",
          type: t.bool(),
        }),
        maxRedemptionsPerStream: io.dataInput({
          name: "Max Redemptions Per Stream",
          id: "maxRedemptionsPerStream",
          type: t.int(),
        }),
        maxRedemptionsPerUserPerStream: io.dataInput({
          name: "Max Redemptions Per User Per Stream",
          id: "maxRedemptionsPerUserPerStream",
          type: t.int(),
        }),
        globalCooldown: io.dataInput({
          name: "Global Cooldown",
          id: "globalCooldown",
          type: t.int(),
        }),
        autoFulfill: io.dataInput({
          name: "Skip Redemption Queue",
          id: "autoFulfill",
          type: t.bool(),
        }),
        paused: io.dataInput({
          name: "Paused",
          id: "paused",
          type: t.bool(),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.struct(Reward),
        }),
      };
    },
    async run({ ctx, io }) {
      const response = await client.channelPoints.customRewards.patch(z.any(), {
        body: JSON.stringify({
          broadcaster_id: userId().unwrap(),
          id: ctx.getInput(io.rewardId),
          title: ctx.getInput(io.title),
          cost: ctx.getInput(io.cost) === 0 ? undefined : ctx.getInput(io.cost),
          prompt: ctx.getInput(io.prompt),
          isEnabled: ctx.getInput(io.enabled),
          backgroundColor: ctx.getInput(io.backgroundColor),
          userInputRequired: ctx.getInput(io.userInputRequired),
          maxRedemptionsPerStream: ctx.getInput(io.maxRedemptionsPerStream),
          maxRedemptionsPerUserPerStream: ctx.getInput(
            io.maxRedemptionsPerUserPerStream
          ),
          isPaused: ctx.getInput(io.paused),
          globalCooldown: ctx.getInput(io.globalCooldown),
        }),
      });

      const data = response.data[0];

      ctx.setOutput(
        io.out,
        Reward.create({
          id: data.id,
          title: data.title,
          prompt: data.prompt,
          cost: data.cost,
          bgColor: data.backgroundColor,
          enabled: data.isEnabled,
          userInputRequired: data.userInputRequired,
          maxRedemptionsPerStream: Maybe(data.maxRedemptionsPerStream),
          maxRedemptionsPerUserPerStream: Maybe(
            data.maxRedemptionsPerUserPerStream
          ),
          globalCooldown: Maybe(data.globalCooldown),
          paused: data.isPaused,
          inStock: data.isInStock,
          skipRequestQueue: data.autoFulfill,
          redemptionsThisStream: Maybe(data.redemptionsThisStream),
          cooldownExpire: Maybe(data.cooldownExpiryDate).map(JSON.stringify),
        })
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Update Redemption Status",
    variant: "Exec",
    generateIO: (io) => {
      return {
        redemptionId: io.dataInput({
          name: "Redemption ID",
          id: "redemptionId",
          type: t.string(),
        }),
        rewardId: io.dataInput({
          name: "Reward ID",
          id: "rewardId",
          type: t.string(),
        }),
        status: io.dataInput({
          name: "Status",
          id: "status",
          type: t.enum(RedemptionStatus),
        }),
        out: io.dataOutput({
          name: "Redemption",
          id: "out",
          type: t.struct(Redemption),
        }),
      };
    },
    async run({ ctx, io }) {
      const status = ctx.getInput(io.status) as InferEnum<
        typeof RedemptionStatus
      >;

      const response =
        await client.channelPoints.customRewards.redemptions.patch(z.any(), {
          body: new URLSearchParams({
            id: ctx.getInput(io.redemptionId),
            broadcaster_id: userId().unwrap(),
            reward_id: ctx.getInput(io.rewardId),
            status: status.variant === "Fulfilled" ? "FULFILLED" : "CANCELED",
          }),
        });

      const data = response.data[0];

      ctx.setOutput(
        io.out,
        Redemption.create({
          id: data.id,
          userId: data.user_id,
          userName: data.user_name,
          userDisplayName: data.user_login,
          rewardId: data.reward.id,
          rewardTitle: data.reward.title,
          rewardCost: data.reward.cost,
          rewardPrompt: data.reward.prompt,
          userInput: data.user_input,
          updateStatus: data.status,
          redemptionDate: data.redeemed_at,
        })
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Get Reward By Title",
    variant: "Exec",
    generateIO: (io) => {
      return {
        title: io.dataInput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        manageableOnly: io.dataInput({
          name: "Manageable Only",
          id: "manageableOnly",
          type: t.bool(),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.option(t.struct(Reward)),
        }),
      };
    },
    async run({ ctx, io }) {
      let rewards = await client.channelPoints.customRewards.get(z.any(), {
        body: JSON.stringify({
          broadcaster_id: userId().unwrap(),
          only_manageable_rewards: ctx.getInput(io.manageableOnly),
        }),
      });

      const data = rewards.data.find(
        (reward: any) => reward.title === ctx.getInput(io.title)
      );

      ctx.setOutput(
        io.out,
        Maybe(data).map((data) =>
          Reward.create({
            id: data.id,
            title: data.title,
            prompt: data.prompt,
            cost: data.cost,
            bgColor: data.backgroundColor,
            enabled: data.isEnabled,
            userInputRequired: data.userInputRequired,
            maxRedemptionsPerStream: Maybe(data.maxRedemptionsPerStream),
            maxRedemptionsPerUserPerStream: Maybe(
              data.maxRedemptionsPerUserPerStream
            ),
            globalCooldown: Maybe(data.globalCooldown),
            paused: data.isPaused,
            inStock: data.isInStock,
            skipRequestQueue: data.autoFulfill,
            redemptionsThisStream: Maybe(data.redemptionsThisStream),
            cooldownExpire: Maybe(data.cooldownExpiryDate).map(JSON.stringify),
          })
        )
      );
    },
  });

  // pkg.createNonEventSchema({
  //   name: "Delete Custom Reward",
  //   variant: "Exec",
  //   generateIO: (io) => {
  //     io.dataInput({
  //       id: "id",
  //       name: "Reward Id",
  //       type: t.string(),
  //     });
  //   },
  //   run({ ctx, io }) {
  //     return client.channelPoints.deleteCustomReward(
  //       userId().unwrap(),
  //       ctx.getInput(io.id")
  //     );
  //   },
  // });

  pkg.createNonEventSchema({
    name: "Get User By ID",
    variant: "Exec",
    generateIO: (io) => {
      return {
        userIdIn: io.dataInput({
          id: "userId",
          name: "User ID",
          type: t.string(),
        }),
        userIdOut: io.dataOutput({
          id: "userId",
          name: "User ID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "Login Name",
          type: t.string(),
        }),
        displayName: io.dataOutput({
          id: "displayName",
          name: "Display Name",
          type: t.string(),
        }),
        type: io.dataOutput({
          id: "type",
          name: "User Type",
          type: t.enum(UserType),
        }),
        broadcasterType: io.dataOutput({
          id: "broadcasterType",
          name: "Broadcaster Type",
          type: t.enum(BroadcasterType),
        }),
        description: io.dataOutput({
          id: "description",
          name: "Description",
          type: t.string(),
        }),
        profileImageUrl: io.dataOutput({
          id: "profileImageUrl",
          name: "Profile Image URL",
          type: t.string(),
        }),
        offlineImageUrl: io.dataOutput({
          id: "offlineImageUrl",
          name: "Offline Image URL",
          type: t.string(),
        }),
        createdAt: io.dataOutput({
          id: "createdAt",
          name: "Created At",
          type: t.string(),
        }),
        //out: io.dataOutput({
        //   id: "out",
        //   type: t.option(t.struct(User)),
        // }),
      };
    },
    async run({ ctx, io }) {
      const response = await client.users.get(z.any(), {
        body: new URLSearchParams({
          id: ctx.getInput(io.userIdIn),
        }),
      });

      const data = Maybe(response).expect("No user found");

      // const optData = Maybe(data);
      ctx.setOutput(io.userIdOut, data.id);
      ctx.setOutput(io.userLogin, data.login);
      ctx.setOutput(io.displayName, data.display_name);
      ctx.setOutput(
        io.type,
        (() => {
          if (data.type === "admin") return UserType.variant("Admin");
          else if (data.type === "global_mod")
            return UserType.variant("Global Mod");
          else if (data.type === "staff") return UserType.variant("Staff");
          else return UserType.variant("Normal User");
        })()
      );
      ctx.setOutput(
        io.broadcasterType,
        (() => {
          const type = data.broadcaster_type;
          if (type === "affiliate") return BroadcasterType.variant("Affliate");
          else if (type === "partner")
            return BroadcasterType.variant("Partner");
          else return BroadcasterType.variant("Normal User");
        })()
      );
      ctx.setOutput(io.description, data.description);
      ctx.setOutput(io.profileImageUrl, data.profile_image_url);
      ctx.setOutput(io.offlineImageUrl, data.offline_image_url);
      ctx.setOutput(io.createdAt, JSON.stringify(data.created_at));
      // ctx.setOutput(
      //   "out",
      //   Maybe(data).map((data) =>
      //     User.create({
      //       id: data.id,
      //       login: data.name,
      //       displayName: data.displayName,
      //       userType: UserTypeMap[data.type],
      //       broadcasterType: BroadcasterTypeMap[data.broadcasterType],
      //       description: data.description,
      //       profileImage: data.profilePictureUrl,
      //       offlineImage: data.offlinePlaceholderUrl,
      //       createdAt: JSON.stringify(data.creationDate),
      //     })
      //   )
      // );
    },
  });

  pkg.createNonEventSchema({
    name: "Follower Only Mode",
    variant: "Exec",
    generateIO: (io) => {
      return {
        delay: io.dataInput({
          id: "delay",
          name: "Delay (minutes)",
          type: t.int(),
        }),
        enabled: io.dataInput({
          id: "enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const user = userId().unwrap();
      await client.chat.settings.patch(z.any(), {
        body: JSON.stringify({
          broadcaster_Id: user,
          moderator_id: user,
          follower_mode: ctx.getInput(io.enabled),
          follower_mode_duration: ctx.getInput(io.delay),
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Get User Chat Color By ID",
    variant: "Exec",
    generateIO: (io) => {
      return {
        userId: io.dataInput({
          id: "userId",
          name: "User ID",
          type: t.string(),
        }),
        color: io.dataOutput({
          id: "color",
          name: "color",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      const user = userId().unwrap();
      let color = await client.chat.color.get(z.any(), {
        body: new URLSearchParams({
          user_id: ctx.getInput(io.userId),
        }),
      });
      console.log(color);
      ctx.setOutput(io.color, color.color);
    },
  });

  pkg.createNonEventSchema({
    name: "Slow Mode",
    variant: "Exec",
    generateIO: (io) => {
      return {
        delay: io.dataInput({
          id: "delay",
          name: "Delay (seconds)",
          type: t.int(),
        }),
        enabled: io.dataInput({
          id: "enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const user = userId().unwrap();
      await client.chat.settings.patch(z.any(), {
        body: JSON.stringify(
          ctx.getInput(io.enabled)
            ? {
                broadcaster_Id: user,
                moderator_id: user,
                slow_mode: ctx.getInput(io.enabled),
                slow_mode_duration: ctx.getInput(io.delay),
              }
            : {
                broadcaster_Id: user,
                moderator_id: user,
                slow_mode: ctx.getInput(io.enabled),
              }
        ),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Moderation Chat Delay",
    variant: "Exec",
    generateIO: (io) => {
      return {
        delay: io.dataInput({
          id: "delay",
          name: "Delay (seconds)",
          type: t.int(),
        }),
        enabled: io.dataInput({
          id: "enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const user = userId().unwrap();
      await client.chat.settings.patch(z.any(), {
        body: JSON.stringify(
          ctx.getInput(io.enabled)
            ? {
                broadcaster_Id: user,
                moderator_id: user,
                non_moderator_chat_delay: ctx.getInput(io.enabled),
                non_moderator_chat_delay_duration: ctx.getInput(io.delay),
              }
            : {
                broadcaster_Id: user,
                moderator_id: user,
                non_moderator_chat_delay: ctx.getInput(io.enabled),
              }
        ),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Sub Only Mode",
    variant: "Exec",
    generateIO: (io) => {
      return {
        enabled: io.dataInput({
          id: "enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const user = userId().unwrap();

      await client.chat.settings.patch(z.any(), {
        body: JSON.stringify({
          broadcaster_Id: user,
          moderator_id: user,
          subscriber_mode: ctx.getInput(io.enabled),
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Unique Chat Mode",
    variant: "Exec",
    generateIO: (io) => {
      return {
        enabled: io.dataInput({
          id: "enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const user = userId().unwrap();

      await client.chat.settings.patch(z.any(), {
        body: JSON.stringify({
          broadcaster_Id: user,
          moderator_id: user,
          unique_chat_mode: ctx.getInput(io.enabled),
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Emote Only Mode",
    variant: "Exec",
    generateIO: (io) => {
      return {
        enabled: io.dataInput({
          id: "enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io }) {
      const user = userId().unwrap();

      await client.chat.settings.patch(z.any(), {
        body: JSON.stringify({
          broadcaster_Id: user,
          moderator_id: user,
          emote_mode: ctx.getInput(io.enabled),
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Shoutout User",
    variant: "Exec",
    generateIO: (io) => {
      return {
        toId: io.dataInput({
          id: "toId",
          name: "Id Of Shoutout User",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      const user = userId().unwrap();

      client.chat.shoutouts.post(z.any(), {
        body: new URLSearchParams({
          from_broadcaster_id: user,
          moderator_id: user,
          to_broadcaster_id: ctx.getInput(io.toId),
        }),
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Send Announcement",
    variant: "Exec",
    generateIO: (io) => {
      return {
        announcement: io.dataInput({
          id: "announcement",
          name: "Announcement",
          type: t.string(),
        }),

        color: io.dataInput({
          id: "color",
          name: "Color",
          type: t.enum(AnnouncementColors),
        }),
      };
    },
    run({ ctx, io }) {
      const color = ctx.getInput(io.color) as InferEnum<
        typeof AnnouncementColors
      >;
      const user = userId().unwrap();

      client.chat.announcements.post(z.any(), {
        body: JSON.stringify({
          broadcaster_id: user,
          moderator_id: user,
          message: ctx.getInput(io.announcement),
          color: color.variant === "default" ? "primary" : color.variant,
        }),
      });
    },
  });
}
