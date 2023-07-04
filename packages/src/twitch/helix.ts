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
      if (Date.now() > token?.obtainmentTimestamp + token?.expiresIn * 1000) {
        await auth.refreshAccessTokenForUser(token?.userId);
        console.log("refreshing");
      }
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
        res.json();
      });
    },
  });

  const client = {
    channels: (() => {
      const channels = createEndpoint({
        path: `/channels`,
        extend: root,
      });

      return {
        ...channels,
        followers: createEndpoint({
          path: `/followers`,
          extend: channels,
        }),
        vips: createEndpoint({
          path: `/vips`,
          extend: channels,
        }),
        followed: createEndpoint({
          path: `/followed`,
          extend: channels,
        }),
        editors: createEndpoint({
          path: `/editors`,
          extend: channels,
        }),
        commercial: createEndpoint({
          path: `/commercial`,
          extend: channels,
        }),
      };
    })(),
    analytics: (() => {
      const analytics = createEndpoint({
        path: `/analytics`,
        extend: root,
      });

      return {
        games: createEndpoint({
          path: `/games`,
          extend: analytics,
        }),
        extensions: createEndpoint({
          path: `/extensions`,
          extend: analytics,
        }),
      };
    })(),
    bits: (() => {
      const bits = createEndpoint({
        path: `/bits`,
        extend: root,
      });

      return {
        leaderboard: createEndpoint({
          path: `/leaderboard`,
          extend: bits,
        }),
        cheermotes: createEndpoint({
          path: `/cheermotes`,
          extend: bits,
        }),
        extensions: createEndpoint({
          path: `/extensions`,
          extend: bits,
        }),
      };
    })(),
    extensions: (() => {
      const extensions = createEndpoint({
        path: `/extensions`,
        extend: root,
      });

      return {
        transactions: createEndpoint({
          path: `/transactions`,
          extend: extensions,
        }),
        configurations: createEndpoint({
          path: `/configurations`,
          extend: extensions,
        }),
        required_configuration: createEndpoint({
          path: `/required_configuration`,
          extend: extensions,
        }),
        pubsub: createEndpoint({
          path: `/pubsub`,
          extend: extensions,
        }),
        live: createEndpoint({
          path: `/live`,
          extend: extensions,
        }),
        jwt: createEndpoint({
          path: `/jwt/secrets`,
          extend: extensions,
        }),
        chat: createEndpoint({
          path: `/chat`,
          extend: extensions,
        }),
        released: createEndpoint({
          path: `/released`,
          extend: extensions,
        }),
      };
    })(),
    moderation: (() => {
      const moderation = createEndpoint({
        path: `/moderation`,
        extend: root,
      });

      return {
        bans: createEndpoint({ path: `/bans`, extend: moderation }),
        blockedTerms: createEndpoint({
          path: `/blocked_terms`,
          extend: moderation,
        }),
        chat: createEndpoint({ path: `/chat`, extend: moderation }),
        moderators: createEndpoint({ path: `/moderators`, extend: moderation }),
        shieldMode: createEndpoint({
          path: `/shield_mode`,
          extend: moderation,
        }),
        enforcements: (() => {
          const enforcements = createEndpoint({
            path: `/enforcements`,
            extend: moderation,
          });

          return {
            status: createEndpoint({
              path: `/status`,
              extend: enforcements,
            }),
          };
        })(),

        automod: (() => {
          const automod = createEndpoint({
            path: `/automod`,
            extend: moderation,
          });

          return {
            message: createEndpoint({ path: `/message`, extend: automod }),
            settings: createEndpoint({ path: `/settings`, extend: automod }),
          };
        })(),
      };
    })(),
    eventsub: (() => {
      const eventsub = createEndpoint({
        path: `/eventsub`,
        extend: root,
      });

      return {
        ...eventsub,
        subscriptions: createEndpoint({
          path: `/subscriptions`,
          extend: eventsub,
        }),
      };
    })(),
    channelPoints: (() => {
      const channelPoints = createEndpoint({
        path: `/channel_points`,
        extend: root,
      });

      return {
        customRewards: (() => {
          const customRewards = createEndpoint({
            path: `/custom_rewards`,
            extend: channelPoints,
          });

          return {
            ...customRewards,
            redemptions: createEndpoint({
              path: `/redemptions`,
              extend: customRewards,
            }),
          };
        })(),
      };
    })(),
    charity: (() => {
      const charity = createEndpoint({
        path: `/charity`,
        extend: root,
      });

      return {
        donations: createEndpoint({
          path: `/donations`,
          extend: charity,
        }),
        campaigns: createEndpoint({
          path: `/campaigns`,
          extend: charity,
        }),
      };
    })(),
    chat: (() => {
      const chat = createEndpoint({
        path: `/chat`,
        extend: root,
      });

      return {
        chatters: createEndpoint({
          path: `/chatters`,
          extend: chat,
        }),
        settings: createEndpoint({
          path: `/settings`,
          extend: chat,
        }),
        announcements: createEndpoint({
          path: `/announcements`,
          extend: chat,
        }),
        shoutouts: createEndpoint({
          path: `/shoutouts`,
          extend: chat,
        }),
        color: createEndpoint({
          path: `/color`,
          extend: chat,
        }),
        emotes: (() => {
          const emotes = createEndpoint({
            path: `/emotes`,
            extend: chat,
          });

          return {
            ...emotes,
            global: createEndpoint({
              path: `/global`,
              extend: emotes,
            }),
            set: createEndpoint({
              path: `/set`,
              extend: emotes,
            }),
          };
        })(),
        badges: (() => {
          const badges = createEndpoint({
            path: `/badges`,
            extend: chat,
          });

          return {
            ...badges,
            global: createEndpoint({
              path: `/global`,
              extend: badges,
            }),
          };
        })(),
      };
    })(),
    clips: createEndpoint({
      path: `/clips`,
      extend: root,
    }),
    entitlements: (() => {
      const entitlements = createEndpoint({
        path: `/entitlements`,
        extend: root,
      });

      return {
        drops: createEndpoint({
          path: `/drops`,
          extend: entitlements,
        }),
      };
    })(),
    games: (() => {
      const games = createEndpoint({
        path: `/games`,
        extend: root,
      });

      return {
        ...games,
        top: createEndpoint({
          path: `/top`,
          extend: games,
        }),
      };
    })(),
    goals: createEndpoint({
      path: `/goals`,
      extend: root,
    }),
    guestStar: (() => {
      const guestStar = createEndpoint({
        path: `/guest_star`,
        extend: root,
      });

      return {
        channelSettings: createEndpoint({
          path: `/channel_settings`,
          extend: guestStar,
        }),
        session: createEndpoint({
          path: `/session`,
          extend: guestStar,
        }),
        invites: createEndpoint({
          path: `/invites`,
          extend: guestStar,
        }),
        slot: createEndpoint({
          path: `/slot`,
          extend: guestStar,
        }),
        slotSettings: createEndpoint({
          path: `/slot_settings`,
          extend: guestStar,
        }),
      };
    })(),
    hypetrain: (() => {
      const hypetrain = createEndpoint({
        path: `/hypetrain`,
        extend: root,
      });

      return {
        events: createEndpoint({
          path: `/events`,
          extend: hypetrain,
        }),
      };
    })(),
    polls: createEndpoint({
      path: `/polls`,
      extend: root,
    }),
    predictions: createEndpoint({
      path: `/predictions`,
      extend: root,
    }),
    raids: createEndpoint({
      path: `/raids`,
      extend: root,
    }),
    schedule: (() => {
      const schedule = createEndpoint({
        path: `/schedule`,
        extend: root,
      });

      return {
        ...schedule,
        icalendar: createEndpoint({
          path: `/icalendar`,
          extend: schedule,
        }),
        settings: createEndpoint({
          path: `/segment`,
          extend: schedule,
        }),
        segment: createEndpoint({
          path: `/segment`,
          extend: schedule,
        }),
      };
    })(),
    search: (() => {
      const search = createEndpoint({
        path: `/search`,
        extend: root,
      });

      return {
        catagories: createEndpoint({
          path: `/catagories`,
          extend: search,
        }),
        channels: createEndpoint({
          path: `/channels`,
          extend: search,
        }),
      };
    })(),
    soundtrack: (() => {
      const soundtrack = createEndpoint({
        path: `/soundtrack`,
        extend: root,
      });

      return {
        playlist: createEndpoint({
          path: `/playlist`,
          extend: soundtrack,
        }),
        playlists: createEndpoint({
          path: `/playlists`,
          extend: soundtrack,
        }),
        currentTrack: createEndpoint({
          path: `/current_track`,
          extend: soundtrack,
        }),
      };
    })(),
    streams: (() => {
      const streams = createEndpoint({
        path: `/streams`,
        extend: root,
      });

      return {
        ...streams,
        key: createEndpoint({
          path: `/key`,
          extend: streams,
        }),
        followed: createEndpoint({
          path: `/followed`,
          extend: streams,
        }),
        markers: createEndpoint({
          path: `/markers`,
          extend: streams,
        }),
        tags: createEndpoint({
          path: `/tags`,
          extend: streams,
        }),
      };
    })(),
    subscriptions: (() => {
      const subscriptions = createEndpoint({
        path: `/subscriptions`,
        extend: root,
      });

      return {
        ...subscriptions,
        user: createEndpoint({
          path: `/user`,
          extend: subscriptions,
        }),
      };
    })(),
    teams: (() => {
      const teams = createEndpoint({
        path: `/teams`,
        extend: root,
      });

      return {
        ...teams,
        channel: createEndpoint({
          path: `/channel`,
          extend: teams,
        }),
      };
    })(),
    users: (() => {
      const users = createEndpoint({
        path: `/users`,
        extend: root,
      });

      return {
        ...users,
        follows: createEndpoint({
          path: `/follows`,
          extend: users,
        }),
        blocks: createEndpoint({
          path: `/blocks`,
          extend: users,
        }),
        extensions: (() => {
          const extensions = createEndpoint({
            path: `/extensions`,
            extend: users,
          });

          return {
            ...extensions,
            list: createEndpoint({
              path: `/list`,
              extend: extensions,
            }),
          };
        })(),
      };
    })(),
    videos: createEndpoint({
      path: `/videos`,
      extend: root,
    }),
    whispers: createEndpoint({
      path: `/whispers`,
      extend: root,
    }),
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
    console.log(data);
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
    console.log(data);
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

    console.log(data);

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
    console.log(data);
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
