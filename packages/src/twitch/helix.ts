import {
  createComputed,
  createEffect,
  createRoot,
  createSignal,
  on,
} from "solid-js";
import { auth } from "./auth";
import pkg from "./pkg";
import { t, Maybe, None, InferEnum } from "@macrograph/core";
import { z } from "zod";
import { createEndpoint } from "../httpEndpoint";

export const HELIX_USER_ID = "helixUserId";

export const { client, userId, setUserId } = createRoot(() => {
  const [userId, setUserId] = createSignal(
    Maybe(localStorage.getItem(HELIX_USER_ID))
  );

  const root = createEndpoint({
    path: "https://api.twitch.tv/helix",
    fetchFn: async (url, args) => {
      const user = await auth.getAccessTokenForUser(userId().unwrap());
      const token = auth.tokens.get(userId().unwrap());
      await auth.refreshAccessTokenForUser(token?.userId);
      if (args.body instanceof URLSearchParams) {
        url = `${url}?${args.body.toString()}`;
      }

      return await fetch(url, {
        method: args.method,
        headers: {
          ...args.headers,
          "content-type": "application/json",
          "Client-Id": auth.clientId,
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: args.body
          ? !(
              args.body instanceof FormData ||
              args.body instanceof URLSearchParams
            )
            ? JSON.stringify(args.body)
            : undefined
          : undefined,
      }).then((res) => {
        if (res.status === 204) return;
        return res.json();
      });
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

  createEffect(
    on(
      () => userId(),
      (userId) =>
        userId
          .map((id) => (localStorage.setItem(HELIX_USER_ID, id), true))
          .unwrapOrElse(() => (localStorage.removeItem(HELIX_USER_ID), false))
    )
  );

  createComputed(() => {
    userId().map((id) => {
      !auth.tokens.has(id) && setUserId(None);
    });
  });

  return {
    client,
    userId,
    setUserId,
  };
});

pkg.createNonEventSchema({
  name: "Ban User",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "userID",
      id: "userId",
      type: t.string(),
    });
    io.dataInput({
      name: "Duration",
      id: "duration",
      type: t.int(),
    });
    io.dataInput({
      name: "Reason",
      id: "reason",
      type: t.string(),
    });
  },
  async run({ ctx }) {
    const user = userId().unwrap();

    client.moderation.bans.post(z.any(), {
      body: {
        broadcaster_id: user,
        moderator_id: user,
        data: {
          user_id: ctx.getInput("userId"),
          duration: ctx.getInput("duration"),
          reason: ctx.getInput("reason"),
        },
      },
    });
  },
});

pkg.createNonEventSchema({
  name: "Unban User",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "userID",
      id: "userId",
      type: t.string(),
    });
  },
  run({ ctx }) {
    client.moderation.bans.delete(z.any(), {
      body: {
        broadcaster_id: userId().unwrap(),
        moderator_id: userId().unwrap(),
        user_id: ctx.getInput("userId"),
      },
    });
  },
});

pkg.createNonEventSchema({
  name: "Add Moderator",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "userID",
      id: "userId",
      type: t.string(),
    });
  },
  run({ ctx }) {
    return client.moderation.moderators.post(z.any(), {
      body: {
        broadcaster_id: userId().unwrap(),
        user_id: ctx.getInput("userId"),
      },
    });
  },
});

pkg.createNonEventSchema({
  name: "Remove Moderator",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "userID",
      id: "userId",
      type: t.string(),
    });
  },
  run({ ctx }) {
    client.moderation.moderators.delete(z.any(), {
      body: {
        broadcaster_id: userId().unwrap(),
        user_id: ctx.getInput("userId"),
      },
    });
  },
});

pkg.createNonEventSchema({
  name: "Get Channel Info",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "Broadcaster ID",
      id: "broadcasterId",
      type: t.string(),
    });
    io.dataOutput({
      name: "Broadcaster ID",
      id: "broadcasterId",
      type: t.string(),
    });
    io.dataOutput({
      name: "Broadcaster Login Name",
      id: "broadcasterLogin",
      type: t.string(),
    });
    io.dataOutput({
      name: "Broadcaster Display Name",
      id: "broadcasterDisplay",
      type: t.string(),
    });
    io.dataOutput({
      name: "Broadcaster Language",
      id: "broadcasterLanguage",
      type: t.string(),
    });
    io.dataOutput({
      name: "Title",
      id: "title",
      type: t.string(),
    });
    io.dataOutput({
      name: "Stream Catagory",
      id: "catagory",
      type: t.string(),
    });
    io.dataOutput({
      name: "Catagory ID",
      id: "catagoryId",
      type: t.string(),
    });
    io.dataOutput({
      name: "Tags",
      id: "tags",
      type: t.list(t.string()),
    });
    io.dataOutput({
      name: "Delay",
      id: "delay",
      type: t.int(),
    });
  },
  async run({ ctx }) {
    const data = await client.channels.get(z.any(), {
      body: new URLSearchParams({
        broadcaster_id: ctx.getInput("broadcasterId"),
      }),
    });
    const info = data.data[0];
    ctx.setOutput("broadcasterId", info.broadcaster_id);
    ctx.setOutput("broadcasterLogin", info.broadcaster_login);
    ctx.setOutput("broadcasterDisplay", info.broadcaster_name);
    ctx.setOutput("broadcasterLanguage", info.broadcaster_language);
    ctx.setOutput("catagory", info.game_name);
    ctx.setOutput("catagoryId", info.game_id);
    ctx.setOutput("title", info.title);
    ctx.setOutput("delay", info.delay);
    ctx.setOutput("tags", info.tags);
  },
});

pkg.createNonEventSchema({
  name: "Modify Channel Info",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "Broadcaster Language",
      id: "broadcasterLanguage",
      type: t.string(),
    });
    io.dataInput({
      name: "Title",
      id: "title",
      type: t.string(),
    });
    io.dataInput({
      name: "Catagory Name",
      id: "catagoryName",
      type: t.string(),
    });
    io.dataInput({
      name: "Tags",
      id: "tags",
      type: t.list(t.string()),
    });
    io.dataInput({
      name: "Delay",
      id: "delay",
      type: t.int(),
    });
  },
  async run({ ctx }) {
    const body = {} as any;

    if (ctx.getInput("broadcasterLanguage"))
      body.broadcaster_language = ctx.getInput("broadcasterLanguage");
    if (ctx.getInput("title")) body.title = ctx.getInput("title");
    if (ctx.getInput("delay")) body.delay = ctx.getInput("delay");
    if (ctx.getInput("tags")) body.tags = ctx.getInput("tags");

    if (ctx.getInput("catagoryName")) {
      let data = await client.games.get(z.any(), {
        body: new URLSearchParams({
          name: ctx.getInput("catagoryName"),
        }),
      });

      console.log(data.data[0].id);
      body.game_id = data.data[0].id;
      console.log(body);
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
    io.dataOutput({
      name: "Clip ID",
      id: "clipId",
      type: t.string(),
    });
    io.dataOutput({
      name: "Edit URL",
      id: "editUrl",
      type: t.string(),
    });
  },
  async run({ ctx }) {
    const clipId = await client.clips.post(z.any(), {
      body: new URLSearchParams({ broadcaster_id: userId().unwrap() }),
    });
    const data = clipId.data[0];
    console.log(clipId);

    ctx.setOutput("clipId", data.id);
    ctx.setOutput("editUrl", data.edit_url);
  },
});

const UserSubscription = pkg.createStruct("User Subscription", (s) => ({
  tier: s.field("Tier", t.string()),
  gifted: s.field("Gifted", t.bool()),
  gifterName: s.field("Gifter Name", t.option(t.string())),
  gifterDisplayName: s.field("Gifter Display Name", t.option(t.string())),
  gifterId: s.field("Gifter ID", t.option(t.string())),
}));

pkg.createNonEventSchema({
  name: "Check User Subscription",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "User ID",
      id: "userId",
      type: t.string(),
    });
    io.dataOutput({
      id: "out",
      type: t.option(t.struct(UserSubscription)),
    });
  },
  async run({ ctx }) {
    let response = await client.subscriptions.get(z.any(), {
      body: new URLSearchParams({
        user_id: ctx.getInput("userId"),
        broadcaster_id: userId().unwrap(),
      }),
    });

    const data = response.data[0];
    ctx.setOutput(
      "out",
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
    io.dataInput({
      name: "User ID",
      id: "userId",
      type: t.string(),
    });
    io.dataOutput({
      name: "Following",
      id: "following",
      type: t.bool(),
    });
  },
  async run({ ctx }) {
    const user = userId().unwrap();

    let data = await client.channels.followers.get(z.any(), {
      body: new URLSearchParams({
        broadcaster_id: user,
        user_id: ctx.getInput("userId"),
      }),
    });
    ctx.setOutput("following", data?.data.length === 1);
  },
});

pkg.createNonEventSchema({
  name: "Check User VIP",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "User ID",
      id: "userId",
      type: t.string(),
    });
    io.dataOutput({
      name: "Vip",
      id: "vip",
      type: t.bool(),
    });
  },
  async run({ ctx }) {
    const data = await client.channels.vips.get(z.any(), {
      body: new URLSearchParams({
        broadcaster_id: userId().unwrap(),
        user_id: ctx.getInput("userId"),
      }),
    });

    ctx.setOutput("vip", data.data[0] !== undefined);
  },
});

pkg.createNonEventSchema({
  name: "Check User Mod",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "User ID",
      id: "userId",
      type: t.string(),
    });
    io.dataOutput({
      name: "Moderator",
      id: "moderator",
      type: t.bool(),
    });
  },
  async run({ ctx }) {
    const data = await client.moderation.moderators.get(z.any(), {
      body: new URLSearchParams({
        broadcaster_id: userId().unwrap(),
        user_id: ctx.getInput("userId"),
      }),
    });

    ctx.setOutput("moderator", data.data[0] !== undefined);
  },
});

pkg.createNonEventSchema({
  name: "Create Custom Reward",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "Title",
      id: "title",
      type: t.string(),
    });
    io.dataInput({
      name: "Cost",
      id: "cost",
      type: t.int(),
    });
    io.dataInput({
      name: "Prompt",
      id: "prompt",
      type: t.string(),
    });
    io.dataInput({
      name: "Enabled",
      id: "isEnabled",
      type: t.bool(),
    });
    io.dataInput({
      name: "Background Color",
      id: "backgroundColor",
      type: t.string(),
    });
    io.dataInput({
      name: "User Input Required",
      id: "userInputRequired",
      type: t.bool(),
    });
    io.dataInput({
      name: "Max Redemptions Per Stream",
      id: "maxRedemptionsPerStream",
      type: t.int(),
    });
    io.dataInput({
      name: "Max Redemptions Per User Per Stream",
      id: "maxRedemptionsPerUserPerStream",
      type: t.int(),
    });
    io.dataInput({
      name: "Global Cooldown",
      id: "globalCooldown",
      type: t.int(),
    });
    io.dataInput({
      name: "Skip Redemption Queue",
      id: "autoFulfill",
      type: t.bool(),
    });

    io.dataOutput({
      id: "out",
      type: t.struct(Reward),
    });
  },
  async run({ ctx }) {
    const user = userId().unwrap();

    const response = await client.channelPoints.customRewards.post(z.any(), {
      body: {
        broadcaster_id: user,
        title: ctx.getInput("title"),
        cost: ctx.getInput("cost"),
        prompt: ctx.getInput("prompt"),
        isEnabled: ctx.getInput("isEnabled"),
        backgroundColor: ctx.getInput("backgroundColor"),
        userInputRequired: ctx.getInput("userInputRequired"),
        maxRedemptionsPerStream: ctx.getInput("maxRedemptionsPerStream"),
        maxRedemptionsPerUserPerStream: ctx.getInput(
          "maxRedemptionsPerUserPerStream"
        ),
        globalCooldown: ctx.getInput("globalCooldown"),
        autoFulfill: ctx.getInput("autoFulfill"),
      },
    });

    const data = response.data[0];

    ctx.setOutput(
      "out",
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
    io.dataInput({
      name: "Duration (s)",
      id: "duraton",
      type: t.int(),
    });
    io.dataOutput({
      name: "Cooldown",
      id: "retryAfter",
      type: t.int(),
    });
  },
  async run({ ctx }) {
    const response = await client.channels.commercial.post(z.any(), {
      body: {
        broadcaster_id: userId().unwrap(),
        length: ctx.getInput("duration"),
      },
    });

    ctx.setOutput("retryAfter", response.data[0].retry_after);
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
//   async run({ ctx }) {
//     const periodtxt = ctx.getInput<InferEnum<typeof periodtext>>("period");

//     const response = await client.bits.leaderboard.get(z.any(), {
//       body: new URLSearchParams({
//         count: ctx.getInput("count"),
//         period: periodtxt.variant,
//         started_at: ctx.getInput("startedAt"),
//         user_id: ctx.getInput("user_id"),
//       }),
//     });

//   },
// });

pkg.createNonEventSchema({
  name: "Edit Custom Reward",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "Reward Id",
      id: "id",
      type: t.string(),
    });
    io.dataInput({
      name: "Title",
      id: "title",
      type: t.string(),
    });
    io.dataInput({
      name: "Cost",
      id: "cost",
      type: t.int(),
    });
    io.dataInput({
      name: "Prompt",
      id: "prompt",
      type: t.string(),
    });
    io.dataInput({
      name: "Enabled",
      id: "isEnabled",
      type: t.bool(),
    });
    io.dataInput({
      name: "Background Color",
      id: "backgroundColor",
      type: t.string(),
    });
    io.dataInput({
      name: "User Input Required",
      id: "userInputRequired",
      type: t.bool(),
    });
    io.dataInput({
      name: "Max Redemptions Per Stream",
      id: "maxRedemptionsPerStream",
      type: t.int(),
    });
    io.dataInput({
      name: "Max Redemptions Per User Per Stream",
      id: "maxRedemptionsPerUserPerStream",
      type: t.int(),
    });
    io.dataInput({
      name: "Global Cooldown",
      id: "globalCooldown",
      type: t.int(),
    });
    io.dataInput({
      name: "Skip Redemption Queue",
      id: "autoFulfill",
      type: t.bool(),
    });
    io.dataInput({
      name: "Paused",
      id: "paused",
      type: t.bool(),
    });

    io.dataOutput({
      id: "out",
      type: t.struct(Reward),
    });
  },
  async run({ ctx }) {
    const response = await client.channelPoints.customRewards.patch(z.any(), {
      body: {
        broadcaster_id: userId().unwrap(),
        id: ctx.getInput("id"),
        title: ctx.getInput("title"),
        cost: ctx.getInput("cost") === 0 ? undefined : ctx.getInput("cost"),
        prompt: ctx.getInput("prompt"),
        isEnabled: ctx.getInput("isEnabled"),
        backgroundColor: ctx.getInput("backgroundColor"),
        userInputRequired: ctx.getInput("userInputRequired"),
        maxRedemptionsPerStream: ctx.getInput("maxRedemptionsPerStream"),
        maxRedemptionsPerUserPerStream: ctx.getInput(
          "maxRedemptionsPerUserPerStream"
        ),
        isPaused: ctx.getInput("paused"),
        globalCooldown: ctx.getInput("globalCooldown"),
      },
    });

    const data = response.data[0];

    ctx.setOutput(
      "out",
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

const RedemptionStatus = pkg.createEnum("Redemption Status", (e) => [
  e.variant("Fulfilled"),
  e.variant("Cancelled"),
]);

const Redemption = pkg.createStruct("Redemption", (s) => ({
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

pkg.createNonEventSchema({
  name: "Update Redemption Status",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "Redemption ID",
      id: "redemptionId",
      type: t.string(),
    });
    io.dataInput({
      name: "Reward ID",
      id: "rewardId",
      type: t.string(),
    });
    io.dataInput({
      name: "Status",
      id: "status",
      type: t.enum(RedemptionStatus),
    });
    io.dataOutput({
      name: "Redemption",
      id: "out",
      type: t.struct(Redemption),
    });
  },
  async run({ ctx }) {
    const status = ctx.getInput<InferEnum<typeof RedemptionStatus>>("status");

    const response = await client.channelPoints.customRewards.redemptions.patch(
      z.any(),
      {
        body: new URLSearchParams({
          id: ctx.getInput("redemptionId"),
          broadcaster_id: userId().unwrap(),
          reward_id: ctx.getInput("rewardId"),
          status: status.variant === "Fulfilled" ? "FULFILLED" : "CANCELED",
        }),
      }
    );

    const data = response.data[0];

    ctx.setOutput(
      "out",
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

const Reward = pkg.createStruct("Reward", (s) => ({
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

pkg.createNonEventSchema({
  name: "Get Reward By Title",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataInput({
      name: "Manageable Only",
      id: "manageableOnly",
      type: t.bool(),
    });

    io.dataOutput({
      id: "out",
      type: t.option(t.struct(Reward)),
    });
  },
  async run({ ctx }) {
    let rewards = await client.channelPoints.customRewards.get(z.any(), {
      body: new URLSearchParams({
        broadcaster_id: userId().unwrap(),
        only_manageable_rewards: ctx.getInput("manageableOnly"),
      }),
    });

    const data = rewards.data.find(
      (reward: any) => reward.title === ctx.getInput("title")
    );

    ctx.setOutput(
      "out",
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

const UserType = pkg.createEnum("User Type", (e) => [
  e.variant("Admin"),
  e.variant("Global Mod"),
  e.variant("Staff"),
  e.variant("Normal User"),
]);

const BroadcasterType = pkg.createEnum("Broadcaster Type", (e) => [
  e.variant("Affliate"),
  e.variant("Partner"),
  e.variant("Normal User"),
]);

const User = pkg.createStruct("User", (s) => ({
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

const UserTypeMap: Record<string, InferEnum<typeof UserType>> = {
  admin: UserType.variant("Admin"),
  global_mod: UserType.variant("Global Mod"),
  staff: UserType.variant("Staff"),
  "": UserType.variant("Normal User"),
};

const BroadcasterTypeMap: Record<string, InferEnum<typeof BroadcasterType>> = {
  affiliate: BroadcasterType.variant("Affliate"),
  partner: BroadcasterType.variant("Partner"),
  "": BroadcasterType.variant("Normal User"),
};

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
//   run({ ctx }) {
//     return client.channelPoints.deleteCustomReward(
//       userId().unwrap(),
//       ctx.getInput("id")
//     );
//   },
// });

pkg.createNonEventSchema({
  name: "Get User By ID",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "userId",
      name: "User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userId",
      name: "User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "Login Name",
      type: t.string(),
    });
    io.dataOutput({
      id: "displayName",
      name: "Display Name",
      type: t.string(),
    });
    io.dataOutput({
      id: "type",
      name: "User Type",
      type: t.option(t.enum(UserType)),
    });
    io.dataOutput({
      id: "broadcasterType",
      name: "Broadcaster Type",
      type: t.option(t.enum(BroadcasterType)),
    });
    io.dataOutput({
      id: "description",
      name: "Description",
      type: t.string(),
    });
    io.dataOutput({
      id: "profileImageUrl",
      name: "Profile Image URL",
      type: t.string(),
    });
    io.dataOutput({
      id: "offlineImageUrl",
      name: "Offline Image URL",
      type: t.string(),
    });
    io.dataOutput({
      id: "createdAt",
      name: "Created At",
      type: t.string(),
    });
    // io.dataOutput({
    //   id: "out",
    //   type: t.option(t.struct(User)),
    // });
  },
  async run({ ctx }) {
    const response = await client.users.get(z.any(), {
      body: new URLSearchParams({
        id: ctx.getInput("userId"),
      }),
    });

    const data = response.data[0];

    // const optData = Maybe(data);
    ctx.setOutput("userId", data?.id);
    ctx.setOutput("userLogin", data?.login);
    ctx.setOutput("displayName", data?.display_name);
    ctx.setOutput<InferEnum<typeof UserType>>(
      "type",
      (() => {
        if (data?.type === "admin") return { variant: "Admin" };
        else if (data?.type === "global_mod") return { variant: "Global Mod" };
        else if (data?.type === "staff") return { variant: "Staff" };
        else return { variant: "Normal User" };
      })()
    );
    ctx.setOutput<InferEnum<typeof BroadcasterType>>(
      "broadcasterType",
      (() => {
        const type = data?.broadcaster_type;
        if (type === "affiliate") return { variant: "Affliate" };
        else if (type === "partner") return { variant: "Partner" };
        else return { variant: "Normal User" };
      })()
    );
    ctx.setOutput("description", data?.description);
    ctx.setOutput("profileImageUrl", data?.profile_image_url);
    ctx.setOutput("offlineImageUrl", data?.offline_image_url);
    ctx.setOutput("createdAt", JSON.stringify(data?.created_at));
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
    io.dataInput({
      id: "delay",
      name: "Delay (minutes)",
      type: t.int(),
    });
    io.dataInput({
      id: "enabled",
      type: t.bool(),
    });
  },
  async run({ ctx }) {
    const user = userId().unwrap();
    await client.chat.settings.patch(z.any(), {
      body: {
        broadcaster_Id: user,
        moderator_id: user,
        follower_mode: ctx.getInput("enabled"),
        follower_mode_duration: ctx.getInput("delay"),
      },
    });
  },
});

pkg.createNonEventSchema({
  name: "Slow Mode",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "delay",
      name: "Delay (seconds)",
      type: t.int(),
    });
    io.dataInput({
      id: "enabled",
      type: t.bool(),
    });
  },
  async run({ ctx }) {
    const user = userId().unwrap();
    await client.chat.settings.patch(z.any(), {
      body: ctx.getInput("enabled")
        ? {
            broadcaster_Id: user,
            moderator_id: user,
            slow_mode: ctx.getInput("enabled"),
            slow_mode_duration: ctx.getInput("delay"),
          }
        : {
            broadcaster_Id: user,
            moderator_id: user,
            slow_mode: ctx.getInput("enabled"),
          },
    });
  },
});

pkg.createNonEventSchema({
  name: "Moderation Chat Delay",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "delay",
      name: "Delay (seconds)",
      type: t.int(),
    });
    io.dataInput({
      id: "enabled",
      type: t.bool(),
    });
  },
  async run({ ctx }) {
    const user = userId().unwrap();
    await client.chat.settings.patch(z.any(), {
      body: ctx.getInput("enabled")
        ? {
            broadcaster_Id: user,
            moderator_id: user,
            non_moderator_chat_delay: ctx.getInput("enabled"),
            non_moderator_chat_delay_duration: ctx.getInput("delay"),
          }
        : {
            broadcaster_Id: user,
            moderator_id: user,
            non_moderator_chat_delay: ctx.getInput("enabled"),
          },
    });
  },
});

pkg.createNonEventSchema({
  name: "Sub Only Mode",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "enabled",
      type: t.bool(),
    });
  },
  async run({ ctx }) {
    const user = userId().unwrap();

    await client.chat.settings.patch(z.any(), {
      body: {
        broadcaster_Id: user,
        moderator_id: user,
        subscriber_mode: ctx.getInput("enabled"),
      },
    });
  },
});

pkg.createNonEventSchema({
  name: "Unique Chat Mode",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "enabled",
      type: t.bool(),
    });
  },
  async run({ ctx }) {
    const user = userId().unwrap();

    await client.chat.settings.patch(z.any(), {
      body: {
        broadcaster_Id: user,
        moderator_id: user,
        unique_chat_mode: ctx.getInput("enabled"),
      },
    });
  },
});

pkg.createNonEventSchema({
  name: "Emote Only Mode",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "enabled",
      type: t.bool(),
    });
  },
  async run({ ctx }) {
    const user = userId().unwrap();

    await client.chat.settings.patch(z.any(), {
      body: {
        broadcaster_Id: user,
        moderator_id: user,
        emote_mode: ctx.getInput("enabled"),
      },
    });
  },
});

pkg.createNonEventSchema({
  name: "Shoutout User",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "toId",
      name: "Id Of Shoutout User",
      type: t.string(),
    });
  },
  run({ ctx }) {
    const user = userId().unwrap();

    client.chat.shoutouts.post(z.any(), {
      body: new URLSearchParams({
        from_broadcaster_id: user,
        moderator_id: user,
        to_broadcaster_id: ctx.getInput("toId"),
      }),
    });
  },
});

const announcementColors = pkg.createEnum("Color", (e) => [
  e.variant("blue"),
  e.variant("green"),
  e.variant("orange"),
  e.variant("purple"),
  e.variant("default"),
]);

pkg.createNonEventSchema({
  name: "Send Announcement",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "announcement",
      name: "Announcement",
      type: t.string(),
    });
    io.dataInput({
      id: "color",
      name: "Color",
      type: t.enum(announcementColors),
    });
  },
  run({ ctx }) {
    const color = ctx.getInput<InferEnum<typeof announcementColors>>("color");
    const user = userId().unwrap();

    client.chat.announcements.post(z.any(), {
      body: {
        broadcaster_id: user,
        moderator_id: user,
        message: ctx.getInput("announcement"),
        color: color.variant === "default" ? "primary" : color.variant,
      },
    });
  },
});
