import type { CREDENTIAL, Credential } from "@macrograph/api-contract";
import { Maybe, type Option } from "@macrograph/option";
import type {
  Core,
  CreateIOFn,
  CreateNonEventSchema,
  MergeFnProps,
  Package,
  PropertyDef,
  RunProps,
  SchemaProperties,
} from "@macrograph/runtime";
import { type InferEnum, t } from "@macrograph/typesystem";
import type { z } from "zod";

import { createHTTPClient } from "../httpEndpoint";
import type { Account } from "./auth";
import { CLIENT_ID } from "./ctx";
import { defaultProperties } from "./resource";
import type { Types } from "./types";

export const HELIX_USER_ID = "helixUserId";

export function createHelix(core: Core) {
  const refreshPromises = new Map<
    string,
    Promise<z.infer<typeof CREDENTIAL>>
  >();

  return createHTTPClient<Requests, Credential>({
    root: "https://api.twitch.tv/helix",
    fetch: async (credential, _url, args) => {
      let url = _url;
      if (args?.body && args.body instanceof URLSearchParams) {
        url += `?${args.body.toString()}`;
        args.body = undefined;
      }

      const run = (accessToken: string) =>
        fetch(url, {
          headers: {
            ...args?.headers,
            "content-type": "application/json",
            "Client-Id": CLIENT_ID,
            Authorization: `Bearer ${accessToken}`,
          },
          ...args,
        });

      let resp = await run(credential.token.access_token);

      if (resp.status === 401) {
        if (!refreshPromises.has(credential.id)) {
          const promise = core
            .refreshCredential("twitch", credential.id)
            .finally(() => refreshPromises.delete(credential.id));

          refreshPromises.set(credential.id, promise);
        }

        const newCredential = await refreshPromises.get(credential.id)!;

        resp = await run(newCredential.token.access_token);
      }

      if (resp.status === 204) {
        return;
      }

      return resp.json();
    },
  });
}

export type Helix = ReturnType<typeof createHelix>;

export function register(pkg: Package, helix: Helix, types: Types) {
  function createHelixExecSchema<
    TProperties extends Record<string, PropertyDef> = Record<string, never>,
    TIO = void,
  >(
    s: Omit<
      CreateNonEventSchema<TProperties & typeof defaultProperties, TIO>,
      "type" | "createListener" | "run" | "createIO"
    > & {
      properties?: TProperties;
      run(
        props: RunProps<TProperties, TIO> & {
          account: Account;
        },
      ): void | Promise<void>;
      createIO: MergeFnProps<
        CreateIOFn<TProperties, TIO>,
        { account(): Option<Account> }
      >;
    },
  ) {
    pkg.createSchema({
      ...s,
      type: "exec",
      properties: { ...s.properties, ...defaultProperties } as any,
      createIO(props) {
        const account = props.ctx.getProperty(
          props.properties.account as SchemaProperties<
            typeof defaultProperties
          >["account"],
        );

        return s.createIO({
          ...props,
          account() {
            return account;
          },
        });
      },
      run(props) {
        const account = props.ctx
          .getProperty(
            props.properties.account as SchemaProperties<
              typeof defaultProperties
            >["account"],
          )
          .expect("No Twitch account available!");

        return s.run({ ...props, account });
      },
    });
  }
  createHelixExecSchema({
    name: "Warn User",
    createIO: ({ io }) => ({
      userId: io.dataInput({
        name: "User ID",
        id: "userId",
        type: t.string(),
      }),
      reason: io.dataInput({
        name: "Reason",
        id: "reason",
        type: t.string(),
      }),
    }),
    async run({ ctx, io, account }) {
      await helix.call("POST /moderation/warnings", account.credential, {
        body: JSON.stringify({
          broadcaster_id: account.data.id,
          moderator_id: account.data.id,
          data: {
            user_id: ctx.getInput(io.userId),
            reason: ctx.getInput(io.reason),
          },
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Ban User",
    createIO: ({ io }) => ({
      userId: io.dataInput({
        name: "User ID",
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
    }),
    run({ ctx, io, account }) {
      return helix.call("POST /moderation/bans", account.credential, {
        body: JSON.stringify({
          broadcaster_id: account.data.id,
          moderator_id: account.data.id,
          data: {
            user_id: ctx.getInput(io.userId),
            duration: ctx.getInput(io.duration),
            reason: ctx.getInput(io.reason),
          },
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Unban User",
    createIO: ({ io }) => ({
      userId: io.dataInput({
        name: "userID",
        id: "userId",
        type: t.string(),
      }),
    }),
    run({ ctx, io, account }) {
      return helix.call("DELETE /moderation/bans", account.credential, {
        body: JSON.stringify({
          broadcaster_id: account.data.id,
          moderator_id: account.data.id,
          user_id: ctx.getInput(io.userId),
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Add Moderator",
    createIO: ({ io }) => ({
      userId: io.dataInput({
        name: "userID",
        id: "userId",
        type: t.string(),
      }),
    }),
    run({ ctx, io, account }) {
      return helix.call("POST /moderation/moderators", account.credential, {
        body: JSON.stringify({
          broadcaster_id: account.data.id,
          user_id: ctx.getInput(io.userId),
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Remove Moderator",
    createIO: ({ io }) => ({
      userId: io.dataInput({
        name: "userID",
        id: "userId",
        type: t.string(),
      }),
    }),
    run({ ctx, io, account }) {
      return helix.call("DELETE /moderation/moderators", account.credential, {
        body: JSON.stringify({
          broadcaster_id: account.data.id,
          user_id: ctx.getInput(io.userId),
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Get Channel Info",
    createIO: ({ io }) => ({
      broadcasterIdIn: io.dataInput({
        name: "ID",
        id: "broadcasterId",
        type: t.string(),
      }),
      broadcasterIdOut: io.dataOutput({
        name: "ID",
        id: "broadcasterId",
        type: t.string(),
      }),
      broadcasterLogin: io.dataOutput({
        name: "Login",
        id: "broadcasterLogin",
        type: t.string(),
      }),
      broadcasterDisplay: io.dataOutput({
        name: "Display Name",
        id: "broadcasterDisplay",
        type: t.string(),
      }),
      broadcasterLanguage: io.dataOutput({
        name: "Language",
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
    }),
    async run({ ctx, io, account }) {
      const data = await helix.call("GET /channels", account.credential, {
        body: new URLSearchParams({
          broadcaster_id: ctx.getInput(io.broadcasterIdIn),
        }),
      });
      const info = data.data[0]!;
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

  createHelixExecSchema({
    name: "Modify Channel Info",
    createIO: ({ io }) => ({
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
        name: "Catagory",
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
    }),
    async run({ ctx, io, account }) {
      const body = {} as any;

      if (ctx.getInput(io.broadcasterLanguage))
        body.broadcaster_language = ctx.getInput(io.broadcasterLanguage);
      if (ctx.getInput(io.title)) body.title = ctx.getInput(io.title);
      if (ctx.getInput(io.delay)) body.delay = ctx.getInput(io.delay);
      if (ctx.getInput(io.tags)) body.tags = ctx.getInput(io.tags);

      if (ctx.getInput(io.catagoryName)) {
        const data = await helix.call("GET /games", account.credential, {
          body: new URLSearchParams({
            name: ctx.getInput(io.catagoryName),
          }),
        });

        body.game_id = data.data[0].id;
      }

      await helix.call("PATCH /channels", account.credential, {
        body: {
          ...body,
          broadcaster_id: account.data.id,
        },
      });
    },
  });

  const StreamInfo = pkg.createStruct("Stream Info", (s) => ({
    broadcasterId: s.field("Broadcaster ID", t.string()),
    broadcasterLogin: s.field("Broadcaster Login Name", t.string()),
    broadcasterDisplay: s.field("Broadcaster Display Name", t.string()),
    broadcasterLanguage: s.field("Broadcaster Language", t.string()),
    title: s.field("Title", t.string()),
    catagory: s.field("Stream Catagory", t.string()),
    catagoryId: s.field("Catagory ID", t.string()),
    viewerCount: s.field("Viewer Count", t.int()),
    startedAt: s.field("Started At", t.string()),
    thumbnailUrl: s.field("Thumbnail URL", t.string()),
  }));

  createHelixExecSchema({
    name: "Get Stream info",
    createIO: ({ io }) => ({
      broadcasterId: io.dataInput({
        name: "Broadcaster ID",
        id: "broadcasterId",
        type: t.string(),
      }),
      info: io.dataOutput({
        name: "Stream Info",
        id: "info",
        type: t.option(t.struct(StreamInfo)),
      }),
    }),
    async run({ ctx, io, account }) {
      const data = await helix.call("GET /streams", account.credential, {
        body: new URLSearchParams({
          user_id: ctx.getInput(io.broadcasterId),
        }),
      });
      const info = Maybe(data[0]);

      ctx.setOutput(
        io.info,
        info.map((i) =>
          StreamInfo.create({
            broadcasterId: ctx.getInput(io.broadcasterId),
            broadcasterLogin: i.user_login,
            broadcasterDisplay: i.user_name,
            broadcasterLanguage: i.language,
            catagory: i.game_name,
            catagoryId: i.game_id,
            title: i.title,
            viewerCount: i.viewer_count,
            startedAt: i.started_at,
            thumbnailUrl: i.thumbnail_url,
          }),
        ),
      );
    },
  });

  createHelixExecSchema({
    name: "Create Clip",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, account }) {
      const clipId = await helix.call("POST /clips", account.credential, {
        body: new URLSearchParams({ broadcaster_id: account.data.id }),
      });

      ctx.setOutput(io.clipId, clipId.id);
      ctx.setOutput(io.editUrl, clipId.edit_url);
    },
  });

  createHelixExecSchema({
    name: "Send Whisper",
    createIO: ({ io }) => ({
      touserId: io.dataInput({
        name: "User ID",
        id: "userId",
        type: t.string(),
      }),
      message: io.dataInput({
        name: "Message",
        id: "message",
        type: t.string(),
      }),
    }),
    async run({ ctx, io, account }) {
      await helix.call("POST /whispers", account.credential, {
        body: new URLSearchParams({
          from_user_id: account.data.id,
          to_user_id: ctx.getInput(io.touserId),
          message: ctx.getInput(io.message),
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Get Hype Train",
    createIO: ({ io }) => ({
      cooldownEndTime: io.dataOutput({
        name: "Cooldown End Time",
        id: "cooldownEndTime",
        type: t.string(),
      }),
      expires_at: io.dataOutput({
        name: "Expires At",
        id: "expiresAt",
        type: t.string(),
      }),
      level: io.dataOutput({
        name: "Level",
        id: "level",
        type: t.int(),
      }),
      goal: io.dataOutput({
        name: "Goal",
        id: "goal",
        type: t.int(),
      }),
      total: io.dataOutput({
        name: "Total",
        id: "total",
        type: t.int(),
      }),
    }),
    async run({ ctx, io, account }) {
      const data = await helix.call(
        "GET /hypetrain/events",
        account.credential,
        {
          body: new URLSearchParams({ broadcaster_id: account.data.id }),
        },
      );

      ctx.setOutput(io.cooldownEndTime, data.event_data.cooldown_end_time);
      ctx.setOutput(io.expires_at, data.event_data.expires_at);
      ctx.setOutput(io.level, data.event_data.level);
      ctx.setOutput(io.goal, data.event_data.goal);
      ctx.setOutput(io.total, data.event_data.total);
    },
  });

  createHelixExecSchema({
    name: "Check User Subscription",
    createIO: ({ io }) => ({
      userId: io.dataInput({
        name: "User ID",
        id: "userId",
        type: t.string(),
      }),
      out: io.dataOutput({
        id: "out",
        type: t.option(t.struct(types.UserSubscription)),
      }),
    }),
    async run({ ctx, io, account }) {
      const data = await helix.call("GET /subscriptions", account.credential, {
        body: new URLSearchParams({
          user_id: ctx.getInput(io.userId),
          broadcaster_id: account.data.id,
        }),
      });

      const struct = Maybe(data).map((data) =>
        types.UserSubscription.create({
          tier: data.tier,
          userId: data.user_id,
          userLogin: data.user_login,
          userName: data.user_name,
          planName: data.plan_name,
          gifted: data.is_gift,
          gifterName: Maybe(data.gifter_login),
          gifterDisplayName: Maybe(data.gifter_name),
          gifterId: Maybe(data.gifter_id),
        }),
      );

      ctx.setOutput(io.out, struct);
    },
  });

  createHelixExecSchema({
    name: "Check User Follow",
    createIO: ({ io }) => {
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
        followedAt: io.dataOutput({
          name: "Followed At",
          id: "followedAt",
          type: t.option(t.string()),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const user = account.data.id;

      const data = await helix.call(
        "GET /channels/followers",
        account.credential,
        {
          body: new URLSearchParams({
            broadcaster_id: user,
            user_id: ctx.getInput(io.userId),
          }),
        },
      );
      ctx.setOutput(io.following, !Array.isArray(data));
      ctx.setOutput(io.followedAt, Maybe(data.followed_at));
    },
  });

  createHelixExecSchema({
    name: "Check User VIP",
    createIO: ({ io }) => {
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
    async run({ ctx, io, account }) {
      const data = await helix.call("GET /channels/vips", account.credential, {
        body: new URLSearchParams({
          broadcaster_id: account.data.id,
          user_id: ctx.getInput(io.userId),
        }),
      });

      ctx.setOutput(io.vip, data.data[0] !== undefined);
    },
  });

  createHelixExecSchema({
    name: "Check User Mod",
    createIO: ({ io }) => ({
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
    }),
    async run({ ctx, io, account }) {
      const data = await helix.call(
        "GET /moderation/moderators",
        account.credential,
        {
          body: new URLSearchParams({
            broadcaster_id: account.data.id,
            user_id: ctx.getInput(io.userId),
          }),
        },
      );

      ctx.setOutput(io.moderator, data.data[0] !== undefined);
    },
  });

  createHelixExecSchema({
    name: "Add VIP",
    createIO: ({ io }) => {
      return {
        userId: io.dataInput({
          name: "User ID",
          id: "userId",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io, account }) {
      helix.call("POST /channels/vips", account.credential, {
        body: new URLSearchParams({
          broadcaster_id: account.data.id,
          user_id: ctx.getInput(io.userId),
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Remove VIP",
    createIO: ({ io }) => {
      return {
        userId: io.dataInput({
          name: "User ID",
          id: "userId",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io, account }) {
      helix.call("DELETE /channels/vips", account.credential, {
        body: new URLSearchParams({
          broadcaster_id: account.data.id,
          user_id: ctx.getInput(io.userId),
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Create Custom Reward",
    createIO: ({ io }) => {
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
          type: t.option(t.string()),
        }),
        enabled: io.dataInput({
          name: "Enabled",
          id: "enabled",
          type: t.option(t.bool()),
        }),
        userInput: io.dataInput({
          name: "User Input Required",
          id: "userInput",
          type: t.option(t.bool()),
        }),
        backgroundColor: io.dataInput({
          name: "Background Color",
          id: "backgroundColor",
          type: t.option(t.string()),
        }),
        maxRedemptionsPerStream: io.dataInput({
          name: "Max Per Stream",
          id: "maxPerStream",
          type: t.option(t.int()),
        }),
        maxRedemptionsPerUserPerStream: io.dataInput({
          name: "Max Per User Per Stream",
          id: "maxPerUserPerStream",
          type: t.option(t.int()),
        }),
        globalCooldown: io.dataInput({
          name: "Global Cooldown",
          id: "globalCooldown",
          type: t.option(t.int()),
        }),
        skipRequestQueue: io.dataInput({
          name: "Skip Request Queue",
          id: "skipRequestQueue",
          type: t.option(t.bool()),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.struct(types.Reward),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const broadcaster_id = account.data.id;
      const body: Record<string, any> = {
        title: ctx.getInput(io.title),
        cost: ctx.getInput(io.cost),
      };

      ctx.getInput(io.prompt).peek((v) => {
        body.prompt = v;
        body.is_user_input_required = true;
      });
      ctx.getInput(io.enabled).peek((v) => {
        body.is_enabled = v;
      });
      ctx.getInput(io.userInput).peek((v) => {
        body.is_user_input_required = v;
      });
      ctx.getInput(io.backgroundColor).peek((v) => {
        body.background_color = v;
      });
      ctx.getInput(io.maxRedemptionsPerStream).peek((v) => {
        body.is_max_per_stream_enabled = true;
        body.max_per_stream = v;
      });
      ctx.getInput(io.maxRedemptionsPerUserPerStream).peek((v) => {
        body.is_max_per_user_per_stream_enabled = true;
        body.max_per_user_per_stream = v;
      });
      ctx.getInput(io.globalCooldown).peek((v) => {
        body.is_global_cooldown_enabled = true;
        body.global_cooldown_seconds = v;
      });
      ctx.getInput(io.skipRequestQueue).peek((v) => {
        body.should_redemptions_skip_request_queue = v;
      });

      const data = await helix.call(
        `POST /channel_points/custom_rewards?broadcaster_id=${encodeURIComponent(
          broadcaster_id,
        )}`,
        account.credential,
        { body: JSON.stringify(body) },
      );

      const response = data.data[0];

      console.log(response);

      ctx.setOutput(
        io.out,
        types.Reward.create({
          id: response.id,
          title: response.title,
          prompt: response.prompt,
          cost: response.cost,
          bgColor: response.background_color,
          enabled: response.is_enabled,
          input_required: response.is_user_input_required,
          maxRedemptionsPerStream: Maybe(
            response.max_per_stream_setting.is_enabled
              ? response.max_per_stream_setting.max_per_stream
              : null,
          ),
          maxRedemptionsPerUserPerStream: Maybe(
            response.max_per_user_per_stream_setting.is_enabled
              ? response.max_per_user_per_stream_setting.max_per_user_per_stream
              : null,
          ),
          globalCooldown: Maybe(
            response.global_cooldown_setting.is_enabled
              ? response.global_cooldown_setting.global_cooldown_seconds
              : null,
          ),
          paused: response.is_paused,
          inStock: response.is_in_stock,
          skipRequestQueue: response.should_redemptions_skip_request_queue,
          redemptionsThisStream: Maybe(
            response.redemptions_redeemed_current_stream,
          ),
          cooldownExpire: Maybe(response.cooldownExpiryDate).map(
            JSON.stringify,
          ),
        }),
      );
    },
  });

  createHelixExecSchema({
    name: "Start Commercial",
    createIO: ({ io }) => {
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
    async run({ ctx, io, account }) {
      const response = await helix.call(
        "POST /channels/commercial",
        account.credential,
        {
          body: JSON.stringify({
            broadcaster_id: account.data.id,
            length: ctx.getInput(io.duration),
          }),
        },
      );

      ctx.setOutput(io.retryAfter, response.data[0].retry_after);
    },
  });

  //still to complete
  createHelixExecSchema({
    name: "Get Ad Schedule",
    createIO: ({ io }) => {
      return {
        duration: io.dataInput({
          name: "Duration (s)",
          id: "duraton",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const response = await helix.call(
        "GET /channels/ads",
        account.credential,
        {
          body: JSON.stringify({
            broadcaster_id: account.data.id,
            length: ctx.getInput(io.duration),
          }),
        },
      );

      // ctx.setOutput(io.retryAfter, response.data[0].retry_after);
      console.log(response);
    },
  });

  //still to complete
  createHelixExecSchema({
    name: "Snooze Next Ad",
    createIO: ({ io }) => {
      return {
        duration: io.dataInput({
          name: "Duration (s)",
          id: "duraton",
          type: t.int(),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const response = await helix.call(
        "POST /channels/ads/schedule/snooze",
        account.credential,
        {
          body: JSON.stringify({
            broadcaster_id: account.data.id,
            length: ctx.getInput(io.duration),
          }),
        },
      );

      // ctx.setOutput(io.retryAfter, response.data[0].retry_after);
      console.log(response);
    },
  });

  const leaderboardPerson = pkg.createStruct("Leaderboard User", (s) => ({
    user_id: s.field("ID", t.string()),
    user_login: s.field("Login", t.string()),
    user_name: s.field("Name", t.string()),
    rank: s.field("Rank", t.int()),
    score: s.field("Score", t.int()),
  }));

  const periodtext = pkg.createEnum("Time Period", (e) => [
    e.variant("day"),
    e.variant("week"),
    e.variant("month"),
    e.variant("year"),
    e.variant("all"),
  ]);

  //To be completed
  // createHelixExecSchema({
  //   name: "Get Bits Leaderboard",
  //   createIO: ({ io }) => {
  //     return {
  //       count: io.dataInput({
  //         name: "Count",
  //         id: "count",
  //         type: t.option(t.int()),
  //       }),
  //       period: io.dataInput({
  //         name: "Period",
  //         id: "period",
  //         type: t.option(t.enum(periodtext)),
  //       }),
  //       startedAt: io.dataInput({
  //         name: "Started At",
  //         id: "startedAt",
  //         type: t.option(t.string()),
  //       }),
  //       userId: io.dataInput({
  //         name: "User ID",
  //         id: "userId",
  //         type: t.option(t.string()),
  //       }),
  //       list: io.dataOutput({
  //         name: "Leaderboard",
  //         id: "leaderboard",
  //         type: t.list(t.struct(leaderboardPerson)),
  //       }),
  //       startedAtOut: io.dataOutput({
  //         id: "startedAtOut",
  //         name: "Date Range Start",
  //         type: t.string(),
  //       }),
  //       endedAt: io.dataOutput({
  //         id: "endedAt",
  //         name: "Date Range End",
  //         type: t.string(),
  //       }),
  //       total: io.dataOutput({
  //         id: "total",
  //         name: "Total",
  //         type: t.int(),
  //       }),
  //     };
  //   },
  //   async run({ ctx, io, account }) {
  //     let body = {} as any;

  //     ctx.getInput(io.count).peek((count) => (body.count = count));
  //     ctx.getInput(io.period).peek((period) => (body.period = period));
  //     ctx.getInput(io.startedAt).peek((startedAt) => (body.started_at = startedAt));
  //     ctx.getInput(io.userId).peek((userId) => (body.user_id = userId));

  //     const response = await helix.call(
  //       "GET /bits/leaderboard",
  //       account.credential,
  //       {
  //         body: JSON.stringify(body),
  //       }
  //     );
  //     // ctx.setOutput(io.retryAfter, response.data[0].retry_after);
  //     console.log(response);
  //   },
  // });

  createHelixExecSchema({
    name: "Edit Custom Reward",
    createIO: ({ io }) => {
      return {
        id: io.dataInput({
          name: "Reward Id",
          id: "id",
          type: t.string(),
        }),
        title: io.dataInput({
          name: "Title",
          id: "title",
          type: t.option(t.string()),
        }),
        cost: io.dataInput({
          name: "Cost",
          id: "cost",
          type: t.option(t.int()),
        }),
        prompt: io.dataInput({
          name: "Prompt",
          id: "prompt",
          type: t.option(t.string()),
        }),
        isEnabled: io.dataInput({
          name: "Enabled",
          id: "isEnabled",
          type: t.option(t.bool()),
        }),
        userInputRequired: io.dataInput({
          name: "User Input Required",
          id: "userInputRequired",
          type: t.option(t.bool()),
        }),
        backgroundColor: io.dataInput({
          name: "Background Color",
          id: "backgroundColor",
          type: t.option(t.string()),
        }),
        maxRedemptionsPerStream: io.dataInput({
          name: "Max Redemptions Per Stream",
          id: "maxRedemptionsPerStream",
          type: t.option(t.int()),
        }),
        maxRedemptionsPerUserPerStream: io.dataInput({
          name: "Max Redemptions Per User Per Stream",
          id: "maxRedemptionsPerUserPerStream",
          type: t.option(t.int()),
        }),
        globalCooldown: io.dataInput({
          name: "Global Cooldown",
          id: "globalCooldown",
          type: t.option(t.int()),
        }),
        paused: io.dataInput({
          name: "Paused",
          id: "paused",
          type: t.option(t.bool()),
        }),
        skipRequestQueue: io.dataInput({
          name: "Skip Redemption Queue",
          id: "skipRequestQueue",
          type: t.option(t.bool()),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.struct(types.Reward),
        }),
      };
    },
    async run({ ctx, io, account }) {
      if (ctx.getInput(io.id) === "") return;

      const body: Record<string, any> = {};
      ctx.getInput(io.title).peek((v) => {
        body.title = v;
      });
      ctx.getInput(io.cost).peek((v) => {
        body.cost = v;
      });
      ctx.getInput(io.prompt).peek((v) => {
        body.prompt = v;
        body.is_user_input_required = true;
      });
      ctx.getInput(io.isEnabled).peek((v) => {
        body.is_enabled = v;
      });
      ctx.getInput(io.userInputRequired).peek((v) => {
        body.is_user_input_required = v;
      });
      ctx.getInput(io.backgroundColor).peek((v) => {
        body.background_color = v;
      });
      ctx.getInput(io.maxRedemptionsPerStream).peek((v) => {
        body.is_max_per_stream_enabled = true;
        body.max_per_stream = v;
      });
      ctx.getInput(io.maxRedemptionsPerUserPerStream).peek((v) => {
        body.is_max_per_user_per_stream_enabled = true;
        body.max_per_user_per_stream = v;
      });
      ctx.getInput(io.globalCooldown).peek((v) => {
        body.is_global_cooldown_enabled = true;
        body.global_cooldown_seconds = v;
      });
      ctx.getInput(io.skipRequestQueue).peek((v) => {
        body.should_redemptions_skip_request_queue = v;
      });
      ctx.getInput(io.paused).peek((v) => {
        body.is_paused = v;
      });

      const data = await helix.call(
        "PATCH /channel_points/custom_rewards",
        account.credential,
        {
          body: JSON.stringify({
            broadcaster_id: account.data.id,
            id: ctx.getInput(io.id),
            ...body,
          }),
        },
      );

      const response = data.data[0];

      ctx.setOutput(
        io.out,
        types.Reward.create({
          id: response.id,
          title: response.title,
          prompt: response.prompt,
          cost: response.cost,
          bgColor: response.background_color,
          enabled: response.is_enabled,
          input_required: response.is_user_input_required,
          maxRedemptionsPerStream: Maybe(
            response.max_per_stream_setting.is_enabled
              ? response.max_per_stream_setting.max_per_stream
              : null,
          ),
          maxRedemptionsPerUserPerStream: Maybe(
            response.max_per_user_per_stream_setting.is_enabled
              ? response.max_per_user_per_stream_setting.max_per_user_per_stream
              : null,
          ),
          globalCooldown: Maybe(
            response.global_cooldown_setting.is_enabled
              ? response.global_cooldown_setting.global_cooldown_seconds
              : null,
          ),
          paused: response.is_paused,
          inStock: response.is_in_stock,
          skipRequestQueue: response.should_redemptions_skip_request_queue,
          redemptionsThisStream: Maybe(
            response.redemptions_redeemed_current_stream,
          ),
          cooldownExpire: Maybe(response.cooldownExpiryDate).map(
            JSON.stringify,
          ),
        }),
      );
    },
  });

  createHelixExecSchema({
    name: "Update Redemption Status",
    createIO: ({ io }) => {
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
          type: t.enum(types.RedemptionStatus),
        }),
        out: io.dataOutput({
          name: "Redemption",
          id: "out",
          type: t.struct(types.Redemption),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const status = ctx.getInput(io.status) as InferEnum<
        typeof types.RedemptionStatus
      >;

      const response = await helix.call(
        "PATCH /channel_points/custom_rewards/redemptions",
        account.credential,
        {
          body: new URLSearchParams({
            id: ctx.getInput(io.redemptionId),
            broadcaster_id: account.data.id,
            reward_id: ctx.getInput(io.rewardId),
            status: status.variant === "Fulfilled" ? "FULFILLED" : "CANCELED",
          }),
        },
      );

      const data = response.data[0];

      ctx.setOutput(
        io.out,
        types.Redemption.create({
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
        }),
      );
    },
  });

  createHelixExecSchema({
    name: "Get Reward By Title",
    createIO: ({ io }) => {
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
          type: t.option(t.struct(types.Reward)),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const rewards = await helix.call(
        "GET /channel_points/custom_rewards",
        account.credential,
        {
          body: new URLSearchParams({
            broadcaster_id: account.data.id,
            only_manageable_rewards: ctx.getInput(io.manageableOnly).toString(),
          }),
        },
      );

      const data = rewards.data.find(
        (reward: any) => reward.title === ctx.getInput(io.title),
      );

      ctx.setOutput(
        io.out,
        Maybe(data).map((data) =>
          types.Reward.create({
            id: data.id,
            title: data.title,
            prompt: data.prompt,
            cost: data.cost,
            bgColor: data.backgroundColor,
            enabled: data.isEnabled,
            maxRedemptionsPerStream: Maybe(data.maxRedemptionsPerStream),
            maxRedemptionsPerUserPerStream: Maybe(
              data.maxRedemptionsPerUserPerStream,
            ),
            globalCooldown: Maybe(data.globalCooldown),
            paused: data.isPaused,
            inStock: data.isInStock,
            skipRequestQueue: data.autoFulfill,
            redemptionsThisStream: Maybe(data.redemptionsThisStream),
            cooldownExpire: Maybe(data.cooldownExpiryDate).map(JSON.stringify),
          } as any),
        ),
      );
    },
  });

  createHelixExecSchema({
    name: "Delete Custom Reward",
    createIO: ({ io }) => {
      return {
        id: io.dataInput({
          id: "id",
          name: "Reward Id",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io, account }) {
      return helix.call(
        "DELETE /channel_points/custom_rewards",
        account.credential,
        {
          body: new URLSearchParams({
            broadcaster_id: account.data.id,
            id: ctx.getInput(io.id),
          }),
        },
      );
    },
  });

  createHelixExecSchema({
    name: "Get User By Login",
    createIO: ({ io }) => {
      return {
        userLoginIn: io.dataInput({
          id: "login",
          name: "Username",
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
          type: t.enum(types.UserType),
        }),
        broadcasterType: io.dataOutput({
          id: "broadcasterType",
          name: "Broadcaster Type",
          type: t.enum(types.BroadcasterType),
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
    async run({ ctx, io, account }) {
      const response = await helix.call("GET /users", account.credential, {
        body: new URLSearchParams({
          login: ctx.getInput(io.userLoginIn),
        }),
      });

      const data = Maybe(response.data[0]).expect("No user found");

      // const optData = Maybe(data);
      ctx.setOutput(io.userIdOut, data.id);
      ctx.setOutput(io.userLogin, ctx.getInput(io.userLoginIn));
      ctx.setOutput(io.displayName, data.display_name);
      ctx.setOutput(
        io.type,
        (() => {
          if (data.type === "admin") return types.UserType.variant("Admin");
          if (data.type === "global_mod")
            return types.UserType.variant("Global Mod");
          if (data.type === "staff") return types.UserType.variant("Staff");
          return types.UserType.variant("Normal User");
        })(),
      );
      ctx.setOutput(
        io.broadcasterType,
        (() => {
          const type = data.broadcaster_type;
          if (type === "affiliate")
            return types.BroadcasterType.variant("Affliate");
          if (type === "partner")
            return types.BroadcasterType.variant("Partner");
          return types.BroadcasterType.variant("Normal User");
        })(),
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

  createHelixExecSchema({
    name: "Get User By ID",
    createIO: ({ io }) => ({
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
        type: t.enum(types.UserType),
      }),
      broadcasterType: io.dataOutput({
        id: "broadcasterType",
        name: "Broadcaster Type",
        type: t.enum(types.BroadcasterType),
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
    }),
    async run({ ctx, io, account }) {
      const resp = await helix.call("GET /users", account.credential, {
        body: new URLSearchParams({
          id: ctx.getInput(io.userIdIn),
        }),
      });

      const data = Maybe(resp.data[0]).expect("No user found");

      // const optData = Maybe(data);
      ctx.setOutput(io.userIdOut, data.id);
      ctx.setOutput(io.userLogin, data.login);
      ctx.setOutput(io.displayName, data.display_name);
      ctx.setOutput(
        io.type,
        (() => {
          if (data.type === "admin") return types.UserType.variant("Admin");
          if (data.type === "global_mod")
            return types.UserType.variant("Global Mod");
          if (data.type === "staff") return types.UserType.variant("Staff");
          return types.UserType.variant("Normal User");
        })(),
      );
      ctx.setOutput(
        io.broadcasterType,
        (() => {
          const type = data.broadcaster_type;
          if (type === "affiliate")
            return types.BroadcasterType.variant("Affliate");
          if (type === "partner")
            return types.BroadcasterType.variant("Partner");
          return types.BroadcasterType.variant("Normal User");
        })(),
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

  createHelixExecSchema({
    name: "Follower Only Mode",
    createIO: ({ io }) => {
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
    async run({ ctx, io, account }) {
      const user = account.data.id;
      await helix.call("PATCH /chat/settings", account.credential, {
        body: JSON.stringify({
          broadcaster_Id: user,
          moderator_id: user,
          follower_mode: ctx.getInput(io.enabled),
          follower_mode_duration: ctx.getInput(io.delay),
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Get Chatters",
    createIO: ({ io }) => {
      return {
        first: io.dataInput({
          id: "first",
          name: "First",
          type: t.option(t.int()),
        }),
        after: io.dataInput({
          id: "after",
          name: "After",
          type: t.option(t.string()),
        }),
        chatters: io.dataOutput({
          id: "chatters",
          name: "Chatters",
          type: t.list(t.struct(types.Chatter)),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const user = account.data.id;
      const data = await helix.call("GET /chat/chatters", account.credential, {
        body: new URLSearchParams({
          broadcaster_id: user,
          moderator_id: user,
          first: ctx.getInput(io.first).unwrapOr(100).toString(),
          after: ctx.getInput(io.after).unwrapOr(""),
        }),
      });

      const array = data.data.map((user: any) =>
        types.Chatter.create({
          user_id: user.user_id,
          user_login: user.user_login,
          user_name: user.user_name,
        }),
      );

      ctx.setOutput(io.chatters, array);
    },
  });

  createHelixExecSchema({
    name: "Get User Chat Color By ID",
    createIO: ({ io }) => {
      return {
        userId: io.dataInput({
          id: "userId",
          name: "User ID",
          type: t.string(),
        }),
        color: io.dataOutput({
          id: "color",
          name: "color",
          type: t.option(t.string()),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const color = await helix.call("GET /chat/color", account.credential, {
        body: new URLSearchParams({
          user_id: ctx.getInput(io.userId),
        }),
      });

      ctx.setOutput(
        io.color,
        Maybe(color.data[0].color !== "" ? color.data[0].color : null),
      );
    },
  });

  createHelixExecSchema({
    name: "Slow Mode",
    createIO: ({ io }) => {
      return {
        delay: io.dataInput({
          id: "delay",
          name: "Delay (s)",
          type: t.int(),
        }),
        enabled: io.dataInput({
          id: "enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const user = account.data.id;
      await helix.call("PATCH /chat/settings", account.credential, {
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
              },
        ),
      });
    },
  });

  createHelixExecSchema({
    name: "Moderation Chat Delay",
    createIO: ({ io }) => {
      return {
        delay: io.dataInput({
          id: "delay",
          name: "Delay (s)",
          type: t.int(),
        }),
        enabled: io.dataInput({
          id: "enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const user = account.data.id;
      await helix.call("PATCH /chat/settings", account.credential, {
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
              },
        ),
      });
    },
  });

  createHelixExecSchema({
    name: "Sub Only Mode",
    createIO: ({ io }) => {
      return {
        enabled: io.dataInput({
          id: "enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const user = account.data.id;

      await helix.call("PATCH /chat/settings", account.credential, {
        body: JSON.stringify({
          broadcaster_Id: user,
          moderator_id: user,
          subscriber_mode: ctx.getInput(io.enabled),
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Unique Chat Mode",
    createIO: ({ io }) => {
      return {
        enabled: io.dataInput({
          id: "enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const user = account.data.id;

      await helix.call("PATCH /chat/settings", account.credential, {
        body: JSON.stringify({
          broadcaster_Id: user,
          moderator_id: user,
          unique_chat_mode: ctx.getInput(io.enabled),
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Emote Only Mode",
    createIO: ({ io }) => {
      return {
        enabled: io.dataInput({
          id: "enabled",
          type: t.bool(),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const user = account.data.id;

      await helix.call("PATCH /chat/settings", account.credential, {
        body: JSON.stringify({
          broadcaster_Id: user,
          moderator_id: user,
          emote_mode: ctx.getInput(io.enabled),
        }),
      });
    },
  });

  createHelixExecSchema({
    name: "Shoutout User",
    createIO: ({ io }) => {
      return {
        toId: io.dataInput({
          id: "toId",
          name: "Id Of Shoutout User",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io, account }) {
      const user = account.data.id;

      return helix.call("POST /chat/shoutouts", account.credential, {
        body: new URLSearchParams({
          from_broadcaster_id: user,
          moderator_id: user,
          to_broadcaster_id: ctx.getInput(io.toId),
        }),
      });
    },
  });

  const Choices = pkg.createStruct("Choices", (s) => ({
    id: s.field("ID", t.string()),
    title: s.field("Title", t.string()),
    votes: s.field("Votes", t.int()),
    channelPointsVotes: s.field("Channel Point Votes", t.int()),
  }));

  const PollStatus = pkg.createEnum("Poll Status", (e) => [
    e.variant("ACTIVE"),
    e.variant("COMPLETED"),
    e.variant("TERMINATED"),
    e.variant("ARCHIVED"),
    e.variant("MODERATED"),
    e.variant("INVALID"),
  ]);

  const Poll = pkg.createStruct("Poll", (s) => ({
    id: s.field("ID", t.string()),
    title: s.field("Title", t.string()),
    choices: s.field("Choices", t.struct(Choices)),
    channelPointsVotingEnabled: s.field(
      "Channel Points Voting Enabled",
      t.bool(),
    ),
    channelPointsPerVote: s.field("Channel Points Per Vote", t.int()),
    status: s.field("Status", t.enum(PollStatus)),
    duration: s.field("Duration", t.int()),
    startedAt: s.field("Started At", t.string()),
    endedAt: s.field("Ended At", t.string()),
  }));

  createHelixExecSchema({
    name: "Get Polls",
    createIO: ({ io }) => {
      return {
        id: io.dataInput({
          id: "id",
          name: "Poll ID",
          type: t.option(t.string()),
        }),
        first: io.dataInput({
          id: "first",
          name: "First",
          type: t.option(t.string()),
        }),
        after: io.dataInput({
          id: "after",
          name: "After",
          type: t.option(t.string()),
        }),
        polls: io.dataOutput({
          id: "polls",
          name: "Polls",
          type: t.list(t.struct(Poll)),
        }),
        pagination: io.dataOutput({
          id: "pagination",
          name: "Pagination",
          type: t.option(t.string()),
        }),
      };
    },
    async run({ ctx, io, account }) {
      const params: any = {
        broadcaster_id: account.credential.id,
      };

      console.log("id", ctx.getInput(io.id));

      ctx.getInput(io.id).peek((id) => {
        params.id = id;
      });
      ctx.getInput(io.first).peek((first) => {
        params.first = first;
      });
      ctx.getInput(io.after).peek((after) => {
        params.after = after;
      });

      const data = await helix.call("GET /polls", account.credential, {
        body: new URLSearchParams(params),
      });

      console.log(data);
    },
  });

  createHelixExecSchema({
    name: "Send Announcement",
    createIO: ({ io }) => {
      return {
        announcement: io.dataInput({
          id: "announcement",
          name: "Announcement",
          type: t.string(),
        }),

        color: io.dataInput({
          id: "color",
          name: "Color",
          type: t.enum(types.AnnouncementColors),
        }),
      };
    },
    run({ ctx, io, account }) {
      const color = ctx.getInput(io.color) as InferEnum<
        typeof types.AnnouncementColors
      >;
      const user = account.data.id;

      return helix.call("POST /chat/announcements", account.credential, {
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

type PaginatedData<T> = {
  data: Array<T>;
  pagination: Partial<{
    cursor: string;
  }>;
};

// thanks twurple :)
export type Requests = {
  "POST /whispers": any;
  "POST /moderation/bans": any;
  "POST /moderation/warnings": any;
  "DELETE /moderation/bans": any;
  "GET /moderation/moderators": PaginatedData<{
    user_id: string;
    user_name: string;
    user_login: string;
  }>;
  "POST /moderation/moderators": any;
  "DELETE /moderation/moderators": any;
  "GET /channels": {
    data: Array<{
      broadcaster_id: string;
      broadcaster_name: string;
      broadcaster_login: string;
      broadcaster_language: string;
      game_id: string;
      game_name: string;
      title: string;
      delay: number;
      tags: string[];
      content_classification_labels: string[];
      is_branded_content: boolean;
    }>;
  };
  "PATCH /channels": any;
  "GET /users": {
    data: Array<{
      id: string;
      login: string;
      display_name: string;
      type: "admin" | "global_mod" | "staff" | "";
      broadcaster_type: "affiliate" | "partner" | "";
      description: string;
      profile_image_url: string;
      offline_image_url: string;
      email: string;
      created_at: string;
    }>;
  };
  "GET /bits/leaderboard": any;
  "GET /games": any;
  "GET /streams": any;
  "POST /clips": any;
  "GET /hypetrain/events": any;
  "GET /subscriptions": any;
  "GET /channels/followers": any;
  "GET /channels/vips": any;
  "POST /channels/vips": any;
  "DELETE /channels/vips": any;
  "GET /eventsub/subscriptions": any;
  "GET /polls": any;
  "POST /polls": any;
  "PATCH /polls": any;
  "GET /predictions": any;
  "POST /predictions": any;
  "PATCH /predictions": any;
  "DELETE /eventsub/subscriptions": any;

  "GET /channel_points/custom_rewards": any;
  [key: `POST /channel_points/custom_rewards?${string}`]: any;
  "PATCH /channel_points/custom_rewards": any;
  "DELETE /channel_points/custom_rewards": undefined;
  "PATCH /channel_points/custom_rewards/redemptions": any;

  "PATCH /chat/settings": any;
  "GET /chat/color": any;
  "GET /chat/chatters": any;
  "POST /chat/shoutouts": any;
  "POST /chat/announcements": any;
  "POST /channels/commercial": any;
  "GET /channels/ads": any;
  "POST /channels/ads/schedule/snooze": any;

  "POST /eventsub/subscriptions": any;
};
