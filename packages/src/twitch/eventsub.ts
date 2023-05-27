import * as helix from "./helix";
import pkg from "./pkg";
import { createRoot, createEffect, createSignal, onCleanup } from "solid-js";
import { t } from "@macrograph/core";

const SubTypes = [
  "channel.update",
  "channel.follow",
  "channel.subscribe",
  "channel.subscription.end",
  "channel.subscription.gift",
  "channel.subscription.message",
  "channel.cheer",
  "channel.raid",
  "channel.ban",
  "channel.unban",
  "channel.moderator.add",
  "channel.moderator.remove",
  "channel.channel_points_custom_reward.add",
  "channel.channel_points_custom_reward.update",
  "channel.channel_points_custom_reward.remove",
  "channel.channel_points_custom_reward_redemption.add",
  "channel.channel_points_custom_reward_redemption.update",
  "channel.poll.begin",
  "channel.poll.progress",
  "channel.poll.end",
  "channel.prediction.begin",
  "channel.prediction.progress",
  "channel.prediction.lock",
  "channel.prediction.end",
  "channel.hype_train.begin",
  "channel.hype_train.progress",
  "channel.hype_train.end",
  "channel.shield_mode.begin",
  "channel.shield_mode.end",
  "channel.shoutout.create",
  "channel.shoutout.receive",
  "stream.online",
  "stream.offline",
];

const { state } = createRoot(() => {
  const [state, setWs] = createSignal<
    | { type: "disconnected" }
    | { type: "connecting" }
    | { type: "connected"; ws: WebSocket }
  >({ type: "disconnected" });

  createEffect(() => {
    helix
      .userId()
      .map((userId) => {
        const ws = new WebSocket(`wss://eventsub.wss.twitch.tv/ws`);

        ws.addEventListener("message", async (data) => {
          let info = JSON.parse(data.data);

          switch (info.metadata.message_type) {
            case "session_welcome":
              setWs({ type: "connected", ws });

              await Promise.all(
                SubTypes.map((type) =>
                  helix.client.eventSub.createSubscription(
                    type,
                    type == "channel.follow" ? "2" : "1",
                    {
                      from_broadcaster_user_id: userId,
                      broadcaster_user_id: userId,
                      moderator_user_id: userId,
                    },
                    {
                      method: "websocket",
                      session_id: info.payload.session.id,
                    },
                    { id: userId }
                  )
                )
              );

              break;
            case "notification":
              pkg.emitEvent({
                name: info.payload.subscription.type,
                data: info.payload,
              });
              break;
          }
        });

        setWs({ type: "connecting" });

        onCleanup(() => ws.close());
      })
      .unwrapOrElse(() => 
        setWs({ type: "disconnected" })
      );
  });

  return { state };
});

export { state };

pkg.createEventSchema({
  name: "User Banned",
  event: "channel.ban",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "channelId",
      name: "Channel ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "channelName",
      name: "Channel Name",
      type: t.string(),
    });
    io.dataOutput({
      id: "modId",
      name: "Mod Who Banned ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "modName",
      name: "Mod Who Banned Name",
      type: t.string(),
    });
    io.dataOutput({
      id: "bannedUserID",
      name: "Banned User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "bannedUserLogin",
      name: "Banned Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "reason",
      name: "Ban Reason",
      type: t.string(),
    });
    io.dataOutput({
      id: "permanent",
      name: "Perma Ban",
      type: t.bool(),
    });
    io.dataOutput({
      id: "ends",
      name: "End Time",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("channelId", data.event.broadcaster_user_id);
    ctx.setOutput("channelName", data.event.broadcaster_user_login);
    ctx.setOutput("modId", data.event.moderator_user_id);
    ctx.setOutput("modName", data.event.moderator_user_login);
    ctx.setOutput("bannedUserID", data.event.user_id);
    ctx.setOutput("bannedUserLogin", data.event.user_login);
    ctx.setOutput("reason", data.event.reason);
    ctx.setOutput("permanent", data.event.is_permanent);
    ctx.setOutput("ends", data.event.ends_at);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "User Unbanned",
  event: "channel.unban",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "userId",
      name: "userID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "modName",
      name: "Mod Who unbanned name",
      type: t.string(),
    });
    io.dataOutput({
      id: "modId",
      name: "Mod Who unbanned Id",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("userId", data.event.from_broadcaster_user_id);
    ctx.setOutput("userLogin", data.event.from_broadcaster_user_login);
    ctx.setOutput("modName", data.event.moderator_user_login);
    ctx.setOutput("modId", data.event.moderator_user_id);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Moderator Add",
  event: "channel.moderator.add",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "userId",
      name: "userID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "Username",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("userId", data.event.user_id);
    ctx.setOutput("userLogin", data.event.user_login);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Moderator Remove",
  event: "channel.moderator.remove",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "userId",
      name: "userID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "Username",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("userId", data.event.user_id);
    ctx.setOutput("userLogin", data.event.user_login);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Point Reward Add",
  event: "channel.channel_points_custom_reward.add",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "id",
      name: "ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "enabled",
      name: "Enabled",
      type: t.bool(),
    });
    io.dataOutput({
      id: "paused",
      name: "Paused",
      type: t.bool(),
    });
    io.dataOutput({
      id: "inStock",
      name: "In Stock",
      type: t.bool(),
    });
    io.dataOutput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "cost",
      name: "Cost",
      type: t.int(),
    });
    io.dataOutput({
      id: "prompt",
      name: "Prompt",
      type: t.string(),
    });
    io.dataOutput({
      id: "inputRequired",
      name: "Input Required",
      type: t.bool(),
    });
    io.dataOutput({
      id: "skipQueue",
      name: "Skip Request Queue",
      type: t.bool(),
    });
    io.dataOutput({
      id: "cooldownExpire",
      name: "Cooldown Expire Timestamp",
      type: t.string(),
    });
    io.dataOutput({
      id: "redemptTotalStream",
      name: "Current Stream Total Redemptions",
      type: t.int(),
    });
    io.dataOutput({
      id: "maxPerStreamEnabled",
      name: "Max per Stream",
      type: t.bool(),
    });
    io.dataOutput({
      id: "maxPerStreamValue",
      name: "Max Per Stream Value",
      type: t.int(),
    });
    io.dataOutput({
      id: "maxUserPerStream",
      name: "Max User Per Stream Enabled",
      type: t.bool(),
    });
    io.dataOutput({
      id: "maxUserPerStreamValue",
      name: "Max User Per Stream Value",
      type: t.int(),
    });
    io.dataOutput({
      id: "globalCooldown",
      name: "Global Cooldown",
      type: t.bool(),
    });
    io.dataOutput({
      id: "globalCooldownValue",
      name: "Global Cooldown Value",
      type: t.int(),
    });
    io.dataOutput({
      id: "backgroundColor",
      name: "Background Color",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("id", data.event.id);
    ctx.setOutput("enabled", data.event.is_enabled);
    ctx.setOutput("paused", data.event.is_paused);
    ctx.setOutput("inStock", data.event.is_in_stock);
    ctx.setOutput("title", data.event.title);
    ctx.setOutput("cost", data.event.cost);
    ctx.setOutput("prompt", data.event.prompt);
    ctx.setOutput("inputRequired", data.event.is_user_input_required);
    ctx.setOutput(
      "skipQueue",
      data.event.should_redemptions_skip_request_queue
    );
    ctx.setOutput("cooldownExpire", data.event.cooldown_expires_at);
    ctx.setOutput(
      "redemptTotalStream",
      data.event.redemptions_redeemed_current_stream
    );
    ctx.setOutput("maxPerStreamEnabled", data.event.max_per_stream.is_enabled);
    ctx.setOutput("maxPerStreamValue", data.event.max_per_stream.value);
    ctx.setOutput(
      "maxUserPerStream",
      data.event.max_per_user_per_stream.is_enabled
    );
    ctx.setOutput(
      "maxUserPerStreamValue",
      data.event.max_per_user_per_stream.value
    );
    ctx.setOutput("globalCooldown", data.event.global_cooldown.is_enabled);
    ctx.setOutput("globalCooldownValue", data.event.global_cooldown.seconds);
    ctx.setOutput("backgroundColor", data.event.background_color);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Point Reward Updated",
  event: "channel.channel_points_custom_reward.update",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "id",
      name: "ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "enabled",
      name: "Enabled",
      type: t.bool(),
    });
    io.dataOutput({
      id: "paused",
      name: "Paused",
      type: t.bool(),
    });
    io.dataOutput({
      id: "inStock",
      name: "In Stock",
      type: t.bool(),
    });
    io.dataOutput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "cost",
      name: "Cost",
      type: t.int(),
    });
    io.dataOutput({
      id: "prompt",
      name: "Prompt",
      type: t.string(),
    });
    io.dataOutput({
      id: "inputRequired",
      name: "Input Required",
      type: t.bool(),
    });
    io.dataOutput({
      id: "skipQueue",
      name: "Skip Request Queue",
      type: t.bool(),
    });
    io.dataOutput({
      id: "cooldownExpire",
      name: "Cooldown Expire Timestamp",
      type: t.string(),
    });
    io.dataOutput({
      id: "redemptTotalStream",
      name: "Current Stream Total Redemptions",
      type: t.int(),
    });
    io.dataOutput({
      id: "maxPerStreamEnabled",
      name: "Max per Stream",
      type: t.bool(),
    });
    io.dataOutput({
      id: "maxPerStreamValue",
      name: "Max Per Stream Value",
      type: t.int(),
    });
    io.dataOutput({
      id: "maxUserPerStream",
      name: "Max User Per Stream Enabled",
      type: t.bool(),
    });
    io.dataOutput({
      id: "maxUserPerStreamValue",
      name: "Max User Per Stream Value",
      type: t.int(),
    });
    io.dataOutput({
      id: "globalCooldown",
      name: "Global Cooldown",
      type: t.bool(),
    });
    io.dataOutput({
      id: "globalCooldownValue",
      name: "Global Cooldown Value",
      type: t.int(),
    });
    io.dataOutput({
      id: "backgroundColor",
      name: "Background Color",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("id", data.event.id);
    ctx.setOutput("enabled", data.event.is_enabled);
    ctx.setOutput("paused", data.event.is_paused);
    ctx.setOutput("inStock", data.event.is_in_stock);
    ctx.setOutput("title", data.event.title);
    ctx.setOutput("cost", data.event.cost);
    ctx.setOutput("prompt", data.event.prompt);
    ctx.setOutput("inputRequired", data.event.is_user_input_required);
    ctx.setOutput(
      "skipQueue",
      data.event.should_redemptions_skip_request_queue
    );
    ctx.setOutput("cooldownExpire", data.event.cooldown_expires_at);
    ctx.setOutput(
      "redemptTotalStream",
      data.event.redemptions_redeemed_current_stream
    );
    ctx.setOutput("maxPerStreamEnabled", data.event.max_per_stream.is_enabled);
    ctx.setOutput("maxPerStreamValue", data.event.max_per_stream.value);
    ctx.setOutput(
      "maxUserPerStream",
      data.event.max_per_user_per_stream.is_enabled
    );
    ctx.setOutput(
      "maxUserPerStreamValue",
      data.event.max_per_user_per_stream.value
    );
    ctx.setOutput("globalCooldown", data.event.global_cooldown.is_enabled);
    ctx.setOutput("globalCooldownValue", data.event.global_cooldown.seconds);
    ctx.setOutput("backgroundColor", data.event.background_color);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Point Reward Remove",
  event: "channel.channel_points_custom_reward.remove",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "id",
      name: "ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "enabled",
      name: "Enabled",
      type: t.bool(),
    });
    io.dataOutput({
      id: "paused",
      name: "Paused",
      type: t.bool(),
    });
    io.dataOutput({
      id: "inStock",
      name: "In Stock",
      type: t.bool(),
    });
    io.dataOutput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "cost",
      name: "Cost",
      type: t.int(),
    });
    io.dataOutput({
      id: "prompt",
      name: "Prompt",
      type: t.string(),
    });
    io.dataOutput({
      id: "inputRequired",
      name: "Input Required",
      type: t.bool(),
    });
    io.dataOutput({
      id: "skipQueue",
      name: "Skip Request Queue",
      type: t.bool(),
    });
    io.dataOutput({
      id: "cooldownExpire",
      name: "Cooldown Expire Timestamp",
      type: t.string(),
    });
    io.dataOutput({
      id: "redemptTotalStream",
      name: "Current Stream Total Redemptions",
      type: t.int(),
    });
    io.dataOutput({
      id: "maxPerStreamEnabled",
      name: "Max per Stream",
      type: t.bool(),
    });
    io.dataOutput({
      id: "maxPerStreamValue",
      name: "Max Per Stream Value",
      type: t.int(),
    });
    io.dataOutput({
      id: "maxUserPerStream",
      name: "Max User Per Stream Enabled",
      type: t.bool(),
    });
    io.dataOutput({
      id: "maxUserPerStreamValue",
      name: "Max User Per Stream Value",
      type: t.int(),
    });
    io.dataOutput({
      id: "globalCooldown",
      name: "Global Cooldown",
      type: t.bool(),
    });
    io.dataOutput({
      id: "globalCooldownValue",
      name: "Global Cooldown Value",
      type: t.int(),
    });
    io.dataOutput({
      id: "backgroundColor",
      name: "Background Color",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("id", data.event.id);
    ctx.setOutput("enabled", data.event.is_enabled);
    ctx.setOutput("paused", data.event.is_paused);
    ctx.setOutput("inStock", data.event.is_in_stock);
    ctx.setOutput("title", data.event.title);
    ctx.setOutput("cost", data.event.cost);
    ctx.setOutput("prompt", data.event.prompt);
    ctx.setOutput("inputRequired", data.event.is_user_input_required);
    ctx.setOutput(
      "skipQueue",
      data.event.should_redemptions_skip_request_queue
    );
    ctx.setOutput("cooldownExpire", data.event.cooldown_expires_at);
    ctx.setOutput(
      "redemptTotalStream",
      data.event.redemptions_redeemed_current_stream
    );
    ctx.setOutput("maxPerStreamEnabled", data.event.max_per_stream.is_enabled);
    ctx.setOutput("maxPerStreamValue", data.event.max_per_stream.value);
    ctx.setOutput(
      "maxUserPerStream",
      data.event.max_per_user_per_stream.is_enabled
    );
    ctx.setOutput(
      "maxUserPerStreamValue",
      data.event.max_per_user_per_stream.value
    );
    ctx.setOutput("globalCooldown", data.event.global_cooldown.is_enabled);
    ctx.setOutput("globalCooldownValue", data.event.global_cooldown.seconds);
    ctx.setOutput("backgroundColor", data.event.background_color);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Point Reward Redeemed",
  event: "channel.channel_points_custom_reward_redemption.add",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "id",
      name: "Redemption ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userId",
      name: "User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "User Login",
      type: t.string(),
    });
    io.dataOutput({
      id: "userName",
      name: "User Name",
      type: t.string(),
    });
    io.dataOutput({
      id: "userInput",
      name: "User Input",
      type: t.string(),
    });
    io.dataOutput({
      id: "status",
      name: "Status",
      type: t.string(),
    });
    io.dataOutput({
      id: "rewardId",
      name: "Rewards Id",
      type: t.string(),
    });
    io.dataOutput({
      id: "rewardTitle",
      name: "Reward Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "rewardCost",
      name: "Reward Cost",
      type: t.int(),
    });
    io.dataOutput({
      id: "rewardPrompt",
      name: "Reward Prompt",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("id", data.event.id);
    ctx.setOutput("userId", data.event.user_id);
    ctx.setOutput("userLogin", data.event.user_login);
    ctx.setOutput("userName", data.event.user_name);
    ctx.setOutput("userInput", data.event.user_input);
    ctx.setOutput("status", data.event.status);
    ctx.setOutput("rewardId", data.event.reward.id);
    ctx.setOutput("rewardTitle", data.event.reward.title);
    ctx.setOutput("rewardCost", data.event.reward.cost);
    ctx.setOutput("rewardPrompt", data.event.reward.prompt);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Poll Begin",
  event: "channel.poll.begin",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Poll Progress",
  event: "channel.poll.progress",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Poll End",
  event: "channel.poll.end",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Prediction Begin",
  event: "channel.prediction.begin",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Prediction Progress",
  event: "channel.prediction.progress",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Prediction Lock",
  event: "channel.prediction.lock",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Prediction End",
  event: "channel.prediction.end",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Hype Train Begin",
  event: "channel.hype_train.begin",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Hype Train Progress",
  event: "channel.hype_train.progress",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Hype Train End",
  event: "channel.hype_train.end",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Updated",
  event: "channel.update",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "channelId",
      name: "Channel ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "channelLogin",
      name: "Channel Name",
      type: t.string(),
    });
    io.dataOutput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "categoryId",
      name: "Category Id",
      type: t.string(),
    });
    io.dataOutput({
      id: "categoryName",
      name: "Category Name",
      type: t.string(),
    });
    io.dataOutput({
      id: "mature",
      name: "Mature",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("channelId", data.event.broadcaster_user_id);
    ctx.setOutput("channelLogin", data.event.broadcaster_user_login);
    ctx.setOutput("title", data.event.title);
    ctx.setOutput("categoryId", data.event.category_id);
    ctx.setOutput("categoryName", data.event.category_name);
    ctx.setOutput("mature", data.event.is_mature);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Subscribe",
  event: "channel.subscribe",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "userId",
      name: "userID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "tier",
      name: "Tier",
      type: t.string(),
    });
    io.dataOutput({
      id: "isGift",
      name: "Gifted",
      type: t.bool(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("userId", data.event.user_id);
    ctx.setOutput("userLogin", data.event.user_login);
    ctx.setOutput("tier", data.event.tier);
    ctx.setOutput("isGift", data.event.is_gift);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Subscribe End",
  event: "channel.subscription.end",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "userId",
      name: "userID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "tier",
      name: "Tier",
      type: t.string(),
    });
    io.dataOutput({
      id: "isGift",
      name: "Gifted",
      type: t.bool(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("userId", data.event.user_id);
    ctx.setOutput("userLogin", data.event.user_login);
    ctx.setOutput("tier", data.event.tier);
    ctx.setOutput("isGift", data.event.is_gift);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Subscription Gift",
  event: "channel.subscription.gift",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "userId",
      name: "userID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "tier",
      name: "Tier",
      type: t.string(),
    });
    io.dataOutput({
      id: "total",
      name: "Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "cumulative",
      name: "Cumulative Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "anonymous",
      name: "Anonymous",
      type: t.bool(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("userId", data.event.user_id);
    ctx.setOutput("userLogin", data.event.user_login);
    ctx.setOutput("tier", data.event.tier);
    ctx.setOutput("total", data.event.total);
    ctx.setOutput("cumulative", data.event.cumulative_total);
    ctx.setOutput("anonymous", data.event.is_anonymous);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Subscription Message",
  event: "channel.subscription.message",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "userId",
      name: "userID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "tier",
      name: "Tier",
      type: t.string(),
    });
    io.dataOutput({
      id: "message",
      name: "Message",
      type: t.string(),
    });
    io.dataOutput({
      id: "streak",
      name: "Streak Months",
      type: t.int(),
    });
    io.dataOutput({
      id: "cumulative",
      name: "Cumulative Months",
      type: t.int(),
    });
    io.dataOutput({
      id: "duration",
      name: "Duration Months",
      type: t.bool(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("userId", data.event.user_id);
    ctx.setOutput("userLogin", data.event.user_login);
    ctx.setOutput("tier", data.event.tier);
    ctx.setOutput("message", data.event.message.text);
    ctx.setOutput("cumulative", data.event.cumulative_months);
    ctx.setOutput("streak", data.event.streak_months);
    ctx.setOutput("duration", data.event.duration_months);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Cheers",
  event: "channel.cheer",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "userId",
      name: "userID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "anonymous",
      name: "Anonymous",
      type: t.bool(),
    });
    io.dataOutput({
      id: "message",
      name: "Message",
      type: t.string(),
    });
    io.dataOutput({
      id: "bits",
      name: "Bits",
      type: t.int(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("userId", data.event.user_id);
    ctx.setOutput("userLogin", data.event.user_login);
    ctx.setOutput("anonymous", data.event.is_anonymous);
    ctx.setOutput("message", data.event.message.text);
    ctx.setOutput("bits", data.event.bits);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Raid",
  event: "channel.raid",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "userId",
      name: "userID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "viewers",
      name: "Viewers",
      type: t.int(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("userId", data.event.from_broadcaster_user_id);
    ctx.setOutput("userLogin", data.event.from_broadcaster_user_login);
    ctx.setOutput("viewers", data.event.viewers);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "User Followed",
  event: "channel.follow",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "userID",
      name: "User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "userLogin",
      name: "Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "username",
      name: "Display Name",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("userID", data.event.user_id);
    ctx.setOutput("userLogin", data.event.user_login);
    ctx.setOutput("username", data.event.user_name);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Shoutout Received",
  event: "channel.shoutout.receive",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "viewerCount",
      name: "Type",
      type: t.int(),
    });
    io.dataOutput({
      id: "startedAt",
      name: "Started At",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("id", data.event.id);
    ctx.setOutput("viewerCount", data.event.viewer_count);
    ctx.setOutput("startedAt", data.event.started_at);

    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Goal Begin",
  event: "channel.goal.begin",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "id",
      name: "Id",
      type: t.string(),
    });
    io.dataOutput({
      id: "type",
      name: "Type",
      type: t.string(),
    });
    io.dataOutput({
      id: "description",
      name: "Description",
      type: t.string(),
    });
    io.dataOutput({
      id: "currentAmount",
      name: "Current Amount",
      type: t.int(),
    });
    io.dataOutput({
      id: "targetAmount",
      name: "Target Amount",
      type: t.int(),
    });
    io.dataOutput({
      id: "startedAt",
      name: "Started At",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("id", data.event.id);
    ctx.setOutput("type", data.event.type);
    ctx.setOutput("description", data.event.description);
    ctx.setOutput("currentAmount", data.event.current_amount);
    ctx.setOutput("targetAmount", data.event.target_amount);
    ctx.setOutput("startedAt", data.event.started_at);

    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Goal Progress",
  event: "channel.goal.progress",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "id",
      name: "Id",
      type: t.string(),
    });
    io.dataOutput({
      id: "type",
      name: "Type",
      type: t.string(),
    });
    io.dataOutput({
      id: "description",
      name: "Description",
      type: t.string(),
    });
    io.dataOutput({
      id: "currentAmount",
      name: "Current Amount",
      type: t.int(),
    });
    io.dataOutput({
      id: "targetAmount",
      name: "Target Amount",
      type: t.int(),
    });
    io.dataOutput({
      id: "startedAt",
      name: "Started At",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("id", data.event.id);
    ctx.setOutput("type", data.event.type);
    ctx.setOutput("description", data.event.description);
    ctx.setOutput("currentAmount", data.event.current_amount);
    ctx.setOutput("targetAmount", data.event.target_amount);
    ctx.setOutput("startedAt", data.event.started_at);

    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Goal End",
  event: "channel.goal.end",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "id",
      name: "Id",
      type: t.string(),
    });
    io.dataOutput({
      id: "type",
      name: "Type",
      type: t.string(),
    });
    io.dataOutput({
      id: "description",
      name: "Description",
      type: t.string(),
    });
    io.dataOutput({
      id: "isAchieved",
      name: "Is Achieved",
      type: t.bool(),
    });
    io.dataOutput({
      id: "currentAmount",
      name: "Current Amount",
      type: t.int(),
    });
    io.dataOutput({
      id: "targetAmount",
      name: "Target Amount",
      type: t.int(),
    });
    io.dataOutput({
      id: "startedAt",
      name: "Started At",
      type: t.string(),
    });
    io.dataOutput({
      id: "endedAt",
      name: "Ended At",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("id", data.event.id);
    ctx.setOutput("type", data.event.type);
    ctx.setOutput("description", data.event.description);
    ctx.setOutput("isAchieved", data.event.is_achieved);
    ctx.setOutput("currentAmount", data.event.current_amount);
    ctx.setOutput("targetAmount", data.event.target_amount);
    ctx.setOutput("startedAt", data.event.started_at);
    ctx.setOutput("endedAt", data.event.ended_at);

    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Stream Online",
  event: "stream.online",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "id",
      name: "Id",
      type: t.string(),
    });
    io.dataOutput({
      id: "type",
      name: "Type",
      type: t.string(),
    });
    io.dataOutput({
      id: "startedAt",
      name: "Started At",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("id", data.event.id);
    ctx.setOutput("type", data.event.type);
    ctx.setOutput("startedAt", data.event.started_at);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Stream Offline",
  event: "stream.offline",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
  },
  run({ ctx }) {
    ctx.exec("exec");
  },
});
