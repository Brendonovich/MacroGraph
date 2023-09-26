import { createEffect, createSignal, onCleanup, on } from "solid-js";
import {
  createEnum,
  createStruct,
  OnEvent,
  Package,
  t,
} from "@macrograph/core";
import { z } from "zod";

import { Helix } from "./helix";

export function createEventSub(helix: Helix, onEvent: OnEvent) {
  const [state, setState] = createSignal<
    | { type: "disconnected" }
    | { type: "connecting" | "connected"; ws: WebSocket }
  >({ type: "disconnected" });

  createEffect(
    on(
      () => helix.userId(),
      (user) => {
        user.mapOrElse(
          () => setState({ type: "disconnected" }),
          (userId) => {
            const ws = new WebSocket(`wss://eventsub.wss.twitch.tv/ws`);

            ws.addEventListener("message", async (data) => {
              let info = JSON.parse(data.data);

              switch (info.metadata.message_type) {
                case "session_welcome":
                  setState({ type: "connected", ws });

                  await Promise.allSettled(
                    SubTypes.map((type) =>
                      helix.client.eventsub.subscriptions.post(z.any(), {
                        body: JSON.stringify({
                          type,
                          version: type == "channel.follow" ? "2" : "1",
                          condition: {
                            broadcaster_user_id: userId,
                            moderator_user_id: userId,
                            to_broadcaster_user_id: userId,
                          },
                          transport: {
                            method: "websocket",
                            session_id: info.payload.session.id,
                          },
                        }),
                      })
                    )
                  );

                  break;
                case "notification":
                  onEvent({
                    name: info.payload.subscription.type,
                    data: info.payload.event,
                  });
                  break;
              }
            });

            setState({ type: "connecting", ws });

            onCleanup(() => {
              ws.close();
              setState({ type: "disconnected" });
            });
          }
        );
      }
    )
  );

  return { state };
}

const PredictionStatus = createEnum("Prediction Status", (e) => [
  e.variant("resolved"),
  e.variant("canceled"),
]);

const OutcomesBegin = createStruct("Outcomes Begin", (s) => ({
  id: s.field("id", t.string()),
  title: s.field("title", t.string()),
  color: s.field("Color", t.string()),
}));

const TopPredictors = createStruct("Top Predictors", (s) => ({
  userName: s.field("User Name", t.string()),
  userLogin: s.field("User Login", t.string()),
  userId: s.field("User ID", t.string()),
  channelPointsWon: s.field("Channel Points Won", t.option(t.int())),
  channelPointsUser: s.field("Channel Points User", t.int()),
}));

const OutcomesProgress = createStruct("Outcomes Progress", (s) => ({
  id: s.field("id", t.string()),
  title: s.field("title", t.string()),
  color: s.field("Color", t.string()),
  users: s.field("Users", t.int()),
  channelPoints: s.field("Channel Points", t.int()),
  topPredictors: s.field("Top Predictors", t.list(t.struct(TopPredictors))),
  votes: s.field("votes", t.int()),
}));

const Poll = createStruct("Choices", (s) => ({
  id: s.field("id", t.string()),
  title: s.field("title", t.string()),
  channel_points_votes: s.field("Channel Points Votes", t.option(t.int())),
  votes: s.field("votes", t.int()),
}));

export function register(pkg: Package) {
  pkg.createEventSchema({
    name: "User Banned",
    event: "channel.ban",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        channelId: io.dataOutput({
          id: "channelId",
          name: "Channel ID",
          type: t.string(),
        }),
        channelName: io.dataOutput({
          id: "channelName",
          name: "Channel Name",
          type: t.string(),
        }),
        modId: io.dataOutput({
          id: "modId",
          name: "Mod Who Banned ID",
          type: t.string(),
        }),
        modName: io.dataOutput({
          id: "modName",
          name: "Mod Who Banned Name",
          type: t.string(),
        }),
        bannedUserID: io.dataOutput({
          id: "bannedUserID",
          name: "Banned User ID",
          type: t.string(),
        }),
        bannedUserLogin: io.dataOutput({
          id: "bannedUserLogin",
          name: "Banned Username",
          type: t.string(),
        }),
        reason: io.dataOutput({
          id: "reason",
          name: "Ban Reason",
          type: t.string(),
        }),
        permanent: io.dataOutput({
          id: "permanent",
          name: "Perma Ban",
          type: t.bool(),
        }),
        ends: io.dataOutput({
          id: "ends",
          name: "End Time",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.channelId, data.broadcaster_user_id);
      ctx.setOutput(io.channelName, data.broadcaster_user_login);
      ctx.setOutput(io.modId, data.moderator_user_id);
      ctx.setOutput(io.modName, data.moderator_user_login);
      ctx.setOutput(io.bannedUserID, data.user_id);
      ctx.setOutput(io.bannedUserLogin, data.user_login);
      ctx.setOutput(io.reason, data.reason);
      ctx.setOutput(io.permanent, data.is_permanent);
      ctx.setOutput(io.ends, data.ends_at);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "User Unbanned",
    event: "channel.unban",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "userID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "Username",
          type: t.string(),
        }),
        modName: io.dataOutput({
          id: "modName",
          name: "Mod Who unbanned name",
          type: t.string(),
        }),
        modId: io.dataOutput({
          id: "modId",
          name: "Mod Who unbanned Id",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.userId, data.from_broadcaster_user_id);
      ctx.setOutput(io.userLogin, data.from_broadcaster_user_login);
      ctx.setOutput(io.modName, data.moderator_user_login);
      ctx.setOutput(io.modId, data.moderator_user_id);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Moderator Add",
    event: "channel.moderator.add",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "userID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "Username",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.userId, data.user_id);
      ctx.setOutput(io.userLogin, data.user_login);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Moderator Remove",
    event: "channel.moderator.remove",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "userID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "Username",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.userId, data.user_id);
      ctx.setOutput(io.userLogin, data.user_login);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Point Reward Add",
    event: "channel.channel_points_custom_reward.add",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        id: io.dataOutput({
          id: "id",
          name: "ID",
          type: t.string(),
        }),
        enabled: io.dataOutput({
          id: "enabled",
          name: "Enabled",
          type: t.bool(),
        }),
        paused: io.dataOutput({
          id: "paused",
          name: "Paused",
          type: t.bool(),
        }),
        inStock: io.dataOutput({
          id: "inStock",
          name: "In Stock",
          type: t.bool(),
        }),
        title: io.dataOutput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        cost: io.dataOutput({
          id: "cost",
          name: "Cost",
          type: t.int(),
        }),
        prompt: io.dataOutput({
          id: "prompt",
          name: "Prompt",
          type: t.string(),
        }),
        inputRequired: io.dataOutput({
          id: "inputRequired",
          name: "Input Required",
          type: t.bool(),
        }),
        skipQueue: io.dataOutput({
          id: "skipQueue",
          name: "Skip Request Queue",
          type: t.bool(),
        }),
        cooldownExpire: io.dataOutput({
          id: "cooldownExpire",
          name: "Cooldown Expire Timestamp",
          type: t.string(),
        }),
        redemptTotalStream: io.dataOutput({
          id: "redemptTotalStream",
          name: "Current Stream Total Redemptions",
          type: t.int(),
        }),
        maxPerStreamEnabled: io.dataOutput({
          id: "maxPerStreamEnabled",
          name: "Max per Stream",
          type: t.bool(),
        }),
        maxPerStreamValue: io.dataOutput({
          id: "maxPerStreamValue",
          name: "Max Per Stream Value",
          type: t.int(),
        }),
        maxUserPerStream: io.dataOutput({
          id: "maxUserPerStream",
          name: "Max User Per Stream Enabled",
          type: t.bool(),
        }),
        maxUserPerStreamValue: io.dataOutput({
          id: "maxUserPerStreamValue",
          name: "Max User Per Stream Value",
          type: t.int(),
        }),
        globalCooldown: io.dataOutput({
          id: "globalCooldown",
          name: "Global Cooldown",
          type: t.bool(),
        }),
        globalCooldownValue: io.dataOutput({
          id: "globalCooldownValue",
          name: "Global Cooldown Value",
          type: t.int(),
        }),
        backgroundColor: io.dataOutput({
          id: "backgroundColor",
          name: "Background Color",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.id, data.id);
      ctx.setOutput(io.enabled, data.is_enabled);
      ctx.setOutput(io.paused, data.is_paused);
      ctx.setOutput(io.inStock, data.is_in_stock);
      ctx.setOutput(io.title, data.title);
      ctx.setOutput(io.cost, data.cost);
      ctx.setOutput(io.prompt, data.prompt);
      ctx.setOutput(io.inputRequired, data.is_user_input_required);
      ctx.setOutput(io.skipQueue, data.should_redemptions_skip_request_queue);
      ctx.setOutput(io.cooldownExpire, data.cooldown_expires_at);
      ctx.setOutput(
        io.redemptTotalStream,
        data.redemptions_redeemed_current_stream
      );
      ctx.setOutput(io.maxPerStreamEnabled, data.max_per_stream.is_enabled);
      ctx.setOutput(io.maxPerStreamValue, data.max_per_stream.value);
      ctx.setOutput(
        io.maxUserPerStream,
        data.max_per_user_per_stream.is_enabled
      );
      ctx.setOutput(
        io.maxUserPerStreamValue,
        data.max_per_user_per_stream.value
      );
      ctx.setOutput(io.globalCooldown, data.global_cooldown.is_enabled);
      ctx.setOutput(io.globalCooldownValue, data.global_cooldown.seconds);
      ctx.setOutput(io.backgroundColor, data.background_color);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Point Reward Updated",
    event: "channel.channel_points_custom_reward.update",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        id: io.dataOutput({
          id: "id",
          name: "ID",
          type: t.string(),
        }),
        enabled: io.dataOutput({
          id: "enabled",
          name: "Enabled",
          type: t.bool(),
        }),
        paused: io.dataOutput({
          id: "paused",
          name: "Paused",
          type: t.bool(),
        }),
        inStock: io.dataOutput({
          id: "inStock",
          name: "In Stock",
          type: t.bool(),
        }),
        title: io.dataOutput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        cost: io.dataOutput({
          id: "cost",
          name: "Cost",
          type: t.int(),
        }),
        prompt: io.dataOutput({
          id: "prompt",
          name: "Prompt",
          type: t.string(),
        }),
        inputRequired: io.dataOutput({
          id: "inputRequired",
          name: "Input Required",
          type: t.bool(),
        }),
        skipQueue: io.dataOutput({
          id: "skipQueue",
          name: "Skip Request Queue",
          type: t.bool(),
        }),
        cooldownExpire: io.dataOutput({
          id: "cooldownExpire",
          name: "Cooldown Expire Timestamp",
          type: t.string(),
        }),
        redemptTotalStream: io.dataOutput({
          id: "redemptTotalStream",
          name: "Current Stream Total Redemptions",
          type: t.int(),
        }),
        maxPerStreamEnabled: io.dataOutput({
          id: "maxPerStreamEnabled",
          name: "Max per Stream",
          type: t.bool(),
        }),
        maxPerStreamValue: io.dataOutput({
          id: "maxPerStreamValue",
          name: "Max Per Stream Value",
          type: t.int(),
        }),
        maxUserPerStream: io.dataOutput({
          id: "maxUserPerStream",
          name: "Max User Per Stream Enabled",
          type: t.bool(),
        }),
        maxUserPerStreamValue: io.dataOutput({
          id: "maxUserPerStreamValue",
          name: "Max User Per Stream Value",
          type: t.int(),
        }),
        globalCooldown: io.dataOutput({
          id: "globalCooldown",
          name: "Global Cooldown",
          type: t.bool(),
        }),
        globalCooldownValue: io.dataOutput({
          id: "globalCooldownValue",
          name: "Global Cooldown Value",
          type: t.int(),
        }),
        backgroundColor: io.dataOutput({
          id: "backgroundColor",
          name: "Background Color",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.id, data.id);
      ctx.setOutput(io.enabled, data.is_enabled);
      ctx.setOutput(io.paused, data.is_paused);
      ctx.setOutput(io.inStock, data.is_in_stock);
      ctx.setOutput(io.title, data.title);
      ctx.setOutput(io.cost, data.cost);
      ctx.setOutput(io.prompt, data.prompt);
      ctx.setOutput(io.inputRequired, data.is_user_input_required);
      ctx.setOutput(io.skipQueue, data.should_redemptions_skip_request_queue);
      ctx.setOutput(io.cooldownExpire, data.cooldown_expires_at);
      ctx.setOutput(
        io.redemptTotalStream,
        data.redemptions_redeemed_current_stream
      );
      ctx.setOutput(io.maxPerStreamEnabled, data.max_per_stream.is_enabled);
      ctx.setOutput(io.maxPerStreamValue, data.max_per_stream.value);
      ctx.setOutput(
        io.maxUserPerStream,
        data.max_per_user_per_stream.is_enabled
      );
      ctx.setOutput(
        io.maxUserPerStreamValue,
        data.max_per_user_per_stream.value
      );
      ctx.setOutput(io.globalCooldown, data.global_cooldown.is_enabled);
      ctx.setOutput(io.globalCooldownValue, data.global_cooldown.seconds);
      ctx.setOutput(io.backgroundColor, data.background_color);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Point Reward Remove",
    event: "channel.channel_points_custom_reward.remove",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        id: io.dataOutput({
          id: "id",
          name: "ID",
          type: t.string(),
        }),
        enabled: io.dataOutput({
          id: "enabled",
          name: "Enabled",
          type: t.bool(),
        }),
        paused: io.dataOutput({
          id: "paused",
          name: "Paused",
          type: t.bool(),
        }),
        inStock: io.dataOutput({
          id: "inStock",
          name: "In Stock",
          type: t.bool(),
        }),
        title: io.dataOutput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        cost: io.dataOutput({
          id: "cost",
          name: "Cost",
          type: t.int(),
        }),
        prompt: io.dataOutput({
          id: "prompt",
          name: "Prompt",
          type: t.string(),
        }),
        inputRequired: io.dataOutput({
          id: "inputRequired",
          name: "Input Required",
          type: t.bool(),
        }),
        skipQueue: io.dataOutput({
          id: "skipQueue",
          name: "Skip Request Queue",
          type: t.bool(),
        }),
        cooldownExpire: io.dataOutput({
          id: "cooldownExpire",
          name: "Cooldown Expire Timestamp",
          type: t.string(),
        }),
        redemptTotalStream: io.dataOutput({
          id: "redemptTotalStream",
          name: "Current Stream Total Redemptions",
          type: t.int(),
        }),
        maxPerStreamEnabled: io.dataOutput({
          id: "maxPerStreamEnabled",
          name: "Max per Stream",
          type: t.bool(),
        }),
        maxPerStreamValue: io.dataOutput({
          id: "maxPerStreamValue",
          name: "Max Per Stream Value",
          type: t.int(),
        }),
        maxUserPerStream: io.dataOutput({
          id: "maxUserPerStream",
          name: "Max User Per Stream Enabled",
          type: t.bool(),
        }),
        maxUserPerStreamValue: io.dataOutput({
          id: "maxUserPerStreamValue",
          name: "Max User Per Stream Value",
          type: t.int(),
        }),
        globalCooldown: io.dataOutput({
          id: "globalCooldown",
          name: "Global Cooldown",
          type: t.bool(),
        }),
        globalCooldownValue: io.dataOutput({
          id: "globalCooldownValue",
          name: "Global Cooldown Value",
          type: t.int(),
        }),
        backgroundColor: io.dataOutput({
          id: "backgroundColor",
          name: "Background Color",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.id, data.id);
      ctx.setOutput(io.enabled, data.is_enabled);
      ctx.setOutput(io.paused, data.is_paused);
      ctx.setOutput(io.inStock, data.is_in_stock);
      ctx.setOutput(io.title, data.title);
      ctx.setOutput(io.cost, data.cost);
      ctx.setOutput(io.prompt, data.prompt);
      ctx.setOutput(io.inputRequired, data.is_user_input_required);
      ctx.setOutput(io.skipQueue, data.should_redemptions_skip_request_queue);
      ctx.setOutput(io.cooldownExpire, data.cooldown_expires_at);
      ctx.setOutput(
        io.redemptTotalStream,
        data.redemptions_redeemed_current_stream
      );
      ctx.setOutput(io.maxPerStreamEnabled, data.max_per_stream.is_enabled);
      ctx.setOutput(io.maxPerStreamValue, data.max_per_stream.value);
      ctx.setOutput(
        io.maxUserPerStream,
        data.max_per_user_per_stream.is_enabled
      );
      ctx.setOutput(
        io.maxUserPerStreamValue,
        data.max_per_user_per_stream.value
      );
      ctx.setOutput(io.globalCooldown, data.global_cooldown.is_enabled);
      ctx.setOutput(io.globalCooldownValue, data.global_cooldown.seconds);
      ctx.setOutput(io.backgroundColor, data.background_color);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Point Reward Redeemed",
    event: "channel.channel_points_custom_reward_redemption.add",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        id: io.dataOutput({
          id: "id",
          name: "Redemption ID",
          type: t.string(),
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "User ID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "User Login",
          type: t.string(),
        }),
        userName: io.dataOutput({
          id: "userName",
          name: "User Name",
          type: t.string(),
        }),
        userInput: io.dataOutput({
          id: "userInput",
          name: "User Input",
          type: t.string(),
        }),
        status: io.dataOutput({
          id: "status",
          name: "Status",
          type: t.string(),
        }),
        rewardId: io.dataOutput({
          id: "rewardId",
          name: "Reward Id",
          type: t.string(),
        }),
        rewardTitle: io.dataOutput({
          id: "rewardTitle",
          name: "Reward Title",
          type: t.string(),
        }),
        rewardCost: io.dataOutput({
          id: "rewardCost",
          name: "Reward Cost",
          type: t.int(),
        }),
        rewardPrompt: io.dataOutput({
          id: "rewardPrompt",
          name: "Reward Prompt",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.id, data.id);
      ctx.setOutput(io.userId, data.user_id);
      ctx.setOutput(io.userLogin, data.user_login);
      ctx.setOutput(io.userName, data.user_name);
      ctx.setOutput(io.userInput, data.user_input);
      ctx.setOutput(io.status, data.status);
      ctx.setOutput(io.rewardId, data.reward.id);
      ctx.setOutput(io.rewardTitle, data.reward.title);
      ctx.setOutput(io.rewardCost, data.reward.cost);
      ctx.setOutput(io.rewardPrompt, data.reward.prompt);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Poll Begin",
    event: "channel.poll.begin",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        title: io.dataOutput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        choices: io.dataOutput({
          id: "choices",
          name: "Choices",
          type: t.list(t.struct(Poll)),
        }),
        channelPointVotingEnabled: io.dataOutput({
          id: "channelPointVotingEnabled",
          name: "Channel Point Voting Enabled",
          type: t.bool(),
        }),
        channelPointVotingCost: io.dataOutput({
          id: "channelPointVotingCost",
          name: "Channel Point Voting Cost",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.title, data.title);
      ctx.setOutput(io.choices, data.choices);
      ctx.setOutput(
        io.channelPointVotingEnabled,
        data.channel_points_voting.is_enabled
      );
      ctx.setOutput(
        io.channelPointVotingCost,
        data.channel_points_voting.amount_per_vote
      );
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Poll Progress",
    event: "channel.poll.progress",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        title: io.dataOutput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        choices: io.dataOutput({
          id: "choices",
          name: "Choices",
          type: t.list(t.struct(Poll)),
        }),
        channelPointVotingEnabled: io.dataOutput({
          id: "channelPointVotingEnabled",
          name: "Channel Point Voting Enabled",
          type: t.bool(),
        }),
        channelPointVotingCost: io.dataOutput({
          id: "channelPointVotingCost",
          name: "Channel Point Voting Cost",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.title, data.title);
      ctx.setOutput(io.choices, data.choices);
      ctx.setOutput(
        io.channelPointVotingEnabled,
        data.channel_points_voting.is_enabled
      );
      ctx.setOutput(
        io.channelPointVotingCost,
        data.channel_points_voting.amount_per_vote
      );
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Poll End",
    event: "channel.poll.end",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        title: io.dataOutput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        choices: io.dataOutput({
          id: "choices",
          name: "Choices",
          type: t.list(t.struct(Poll)),
        }),
        channelPointVotingEnabled: io.dataOutput({
          id: "channelPointVotingEnabled",
          name: "Channel Point Voting Enabled",
          type: t.bool(),
        }),
        channelPointVotingCost: io.dataOutput({
          id: "channelPointVotingCost",
          name: "Channel Point Voting Cost",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.title, data.title);
      ctx.setOutput(io.choices, data.choices);
      ctx.setOutput(
        io.channelPointVotingEnabled,
        data.channel_points_voting.is_enabled
      );
      ctx.setOutput(
        io.channelPointVotingCost,
        data.channel_points_voting.amount_per_vote
      );
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Prediction Begin",
    event: "channel.prediction.begin",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        title: io.dataOutput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        outcomes: io.dataOutput({
          id: "outcomes",
          name: "Outcomes",
          type: t.list(t.struct(OutcomesBegin)),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.title, data.title);
      ctx.setOutput(io.outcomes, data.outcomes);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Prediction Progress",
    event: "channel.prediction.progress",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        title: io.dataOutput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        outcomes: io.dataOutput({
          id: "outcomes",
          name: "Outcomes",
          type: t.list(t.struct(OutcomesProgress)),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.title, data.title);
      ctx.setOutput(io.outcomes, data.outcomes);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Prediction Lock",
    event: "channel.prediction.lock",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        title: io.dataOutput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        outcomes: io.dataOutput({
          id: "outcomes",
          name: "Outcomes",
          type: t.list(t.struct(OutcomesProgress)),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.title, data.title);
      ctx.setOutput(io.outcomes, data.outcomes);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Prediction End",
    event: "channel.prediction.end",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        title: io.dataOutput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        outcomes: io.dataOutput({
          id: "outcomes",
          name: "Outcomes",
          type: t.list(t.struct(OutcomesProgress)),
        }),
        winningOutcomeId: io.dataOutput({
          id: "winningOutcomeId",
          name: "Winning Outcome ID",
          type: t.string(),
        }),
        status: io.dataOutput({
          id: "status",
          name: "Status",
          type: t.enum(PredictionStatus),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.title, data.title);
      ctx.setOutput(io.outcomes, data.outcomes);
      ctx.setOutput(io.winningOutcomeId, data.winning_outcome_id);
      ctx.setOutput(io.status, data.status);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Hype Train Begin",
    event: "channel.hype_train.begin",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        total: io.dataOutput({
          id: "total",
          name: "Total",
          type: t.int(),
        }),
        progress: io.dataOutput({
          id: "progress",
          name: "Progress",
          type: t.int(),
        }),
        goal: io.dataOutput({
          id: "goal",
          name: "Goal",
          type: t.int(),
        }),
        topContributeBitsUserName: io.dataOutput({
          id: "topContributeBitsUserName",
          name: "Top Contribute Bit User Name",
          type: t.string(),
        }),
        topContributeBitsUserId: io.dataOutput({
          id: "topContributeBitsUserId",
          name: "Top Contribute Bit User ID",
          type: t.string(),
        }),
        topContributeBitsTotal: io.dataOutput({
          id: "topContributeBitsTotal",
          name: "Top Contribute Bits Total",
          type: t.int(),
        }),
        topContributeSubsUserName: io.dataOutput({
          id: "topContributeSubsUserName",
          name: "Top Contribute Subs Username",
          type: t.string(),
        }),
        topContributeSubsUserId: io.dataOutput({
          id: "topContributeSubsUserId",
          name: "Top Contribute Subs User ID",
          type: t.string(),
        }),
        topContributeSubsTotal: io.dataOutput({
          id: "topContributeSubsTotal",
          name: "Top Contribute Subs Total",
          type: t.int(),
        }),
        lastContributeUserName: io.dataOutput({
          id: "lastContributeUserName",
          name: "Last Contribute Username",
          type: t.string(),
        }),
        lastContributeUserId: io.dataOutput({
          id: "lastContributeUserId",
          name: "Last Contribute User ID",
          type: t.string(),
        }),
        lastContributeTotal: io.dataOutput({
          id: "lastContributeTotal",
          name: "Last Contribute Total",
          type: t.int(),
        }),
        lastContributeType: io.dataOutput({
          id: "lastContributeType",
          name: "Last Contribute Type",
          type: t.string(),
        }),
        level: io.dataOutput({
          id: "level",
          name: "Level",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.total, data.total);
      ctx.setOutput(io.progress, data.progress);
      ctx.setOutput(io.goal, data.goal);
      ctx.setOutput(io.level, data.level);
      ctx.setOutput(
        io.topContributeBitsUserName,
        data.top_contributions[0].user_name
      );
      ctx.setOutput(
        io.topContributeBitsUserId,
        data.top_contributions[0].user_id
      );
      ctx.setOutput(io.topContributeBitsTotal, data.top_contributions[0].total);
      ctx.setOutput(
        io.topContributeSubsUserName,
        data.top_contributions[1].user_name
      );
      ctx.setOutput(
        io.topContributeSubsUserId,
        data.top_contributions[1].user_id
      );
      ctx.setOutput(io.topContributeSubsTotal, data.top_contributions[1].total);
      ctx.setOutput(
        io.lastContributeUserName,
        data.last_contribution.user_name
      );
      ctx.setOutput(io.lastContributeUserId, data.last_contribution.user_id);
      ctx.setOutput(io.lastContributeTotal, data.last_contribution.total);
      ctx.setOutput(io.lastContributeType, data.last_contribution.type);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Hype Train Progress",
    event: "channel.hype_train.progress",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        total: io.dataOutput({
          id: "total",
          name: "Total",
          type: t.int(),
        }),
        progress: io.dataOutput({
          id: "progress",
          name: "Progress",
          type: t.int(),
        }),
        goal: io.dataOutput({
          id: "goal",
          name: "Goal",
          type: t.int(),
        }),
        topContributeBitsUserName: io.dataOutput({
          id: "topContributeBitsUserName",
          name: "Top Contribute Bit User Name",
          type: t.string(),
        }),
        topContributeBitsUserId: io.dataOutput({
          id: "topContributeBitsUserId",
          name: "Top Contribute Bit User ID",
          type: t.string(),
        }),
        topContributeBitsTotal: io.dataOutput({
          id: "topContributeBitsTotal",
          name: "Top Contribute Bits Total",
          type: t.int(),
        }),
        topContributeSubsUserName: io.dataOutput({
          id: "topContributeSubsUserName",
          name: "Top Contribute Subs Username",
          type: t.string(),
        }),
        topContributeSubsUserId: io.dataOutput({
          id: "topContributeSubsUserId",
          name: "Top Contribute Subs User ID",
          type: t.string(),
        }),
        topContributeSubsTotal: io.dataOutput({
          id: "topContributeSubsTotal",
          name: "Top Contribute Subs Total",
          type: t.int(),
        }),
        lastContributeUserName: io.dataOutput({
          id: "lastContributeUserName",
          name: "Last Contribute Username",
          type: t.string(),
        }),
        lastContributeUserId: io.dataOutput({
          id: "lastContributeUserId",
          name: "Last Contribute User ID",
          type: t.string(),
        }),
        lastContributeTotal: io.dataOutput({
          id: "lastContributeTotal",
          name: "Last Contribute Total",
          type: t.int(),
        }),
        lastContributeType: io.dataOutput({
          id: "lastContributeType",
          name: "Last Contribute Type",
          type: t.string(),
        }),
        level: io.dataOutput({
          id: "level",
          name: "Level",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.total, data.total);
      ctx.setOutput(io.progress, data.progress);
      ctx.setOutput(io.goal, data.goal);
      ctx.setOutput(io.level, data.level);
      ctx.setOutput(
        io.topContributeBitsUserName,
        data.top_contributions[0].user_name
      );
      ctx.setOutput(
        io.topContributeBitsUserId,
        data.top_contributions[0].user_id
      );
      ctx.setOutput(io.topContributeBitsTotal, data.top_contributions[0].total);
      ctx.setOutput(
        io.topContributeSubsUserName,
        data.top_contributions[1].user_name
      );
      ctx.setOutput(
        io.topContributeSubsUserId,
        data.top_contributions[1].user_id
      );
      ctx.setOutput(io.topContributeSubsTotal, data.top_contributions[1].total);
      ctx.setOutput(
        io.lastContributeUserName,
        data.last_contribution.user_name
      );
      ctx.setOutput(io.lastContributeUserId, data.last_contribution.user_id);
      ctx.setOutput(io.lastContributeTotal, data.last_contribution.total);
      ctx.setOutput(io.lastContributeType, data.last_contribution.type);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Hype Train End",
    event: "channel.hype_train.end",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        total: io.dataOutput({
          id: "total",
          name: "Total",
          type: t.int(),
        }),
        level: io.dataOutput({
          id: "level",
          name: "Level",
          type: t.int(),
        }),
        topContributeBitsUserName: io.dataOutput({
          id: "topContributeBitsUserName",
          name: "Top Contribute Bit Username",
          type: t.string(),
        }),
        topContributeBitsUserId: io.dataOutput({
          id: "topContributeBitsUserId",
          name: "Top Contribute Bit User ID",
          type: t.string(),
        }),
        topContributeBitsTotal: io.dataOutput({
          id: "topContributeBitsTotal",
          name: "Top Contribute Bits Total",
          type: t.int(),
        }),
        topContributeSubsUserName: io.dataOutput({
          id: "topContributeSubsUserName",
          name: "Top Contribute Subs Username",
          type: t.string(),
        }),
        topContributeSubsUserId: io.dataOutput({
          id: "topContributeSubsUserId",
          name: "Top Contribute Subs User ID",
          type: t.string(),
        }),
        topContributeSubsTotal: io.dataOutput({
          id: "topContributeSubsTotal",
          name: "Top Contribute Subs Total",
          type: t.int(),
        }),
        cooldownEndsAt: io.dataOutput({
          id: "cooldownEndsAt",
          name: "CooldownEndsAt",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.total, data.total);
      ctx.setOutput(io.level, data.level);
      ctx.setOutput(
        io.topContributeBitsUserName,
        data.top_contributions[0].user_name
      );
      ctx.setOutput(
        io.topContributeBitsUserId,
        data.top_contributions[0].user_id
      );
      ctx.setOutput(io.topContributeBitsTotal, data.top_contributions[0].total);
      ctx.setOutput(
        io.topContributeSubsUserName,
        data.top_contributions[1].user_name
      );
      ctx.setOutput(
        io.topContributeSubsUserId,
        data.top_contributions[1].user_id
      );
      ctx.setOutput(io.topContributeSubsTotal, data.top_contributions[1].total);
      ctx.setOutput(io.cooldownEndsAt, data.cooldown_ends_at);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Updated",
    event: "channel.update",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        channelId: io.dataOutput({
          id: "channelId",
          name: "Channel ID",
          type: t.string(),
        }),
        channelLogin: io.dataOutput({
          id: "channelLogin",
          name: "Channel Name",
          type: t.string(),
        }),
        title: io.dataOutput({
          id: "title",
          name: "Title",
          type: t.string(),
        }),
        categoryId: io.dataOutput({
          id: "categoryId",
          name: "Category Id",
          type: t.string(),
        }),
        categoryName: io.dataOutput({
          id: "categoryName",
          name: "Category Name",
          type: t.string(),
        }),
        mature: io.dataOutput({
          id: "mature",
          name: "Mature",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.channelId, data.broadcaster_user_id);
      ctx.setOutput(io.channelLogin, data.broadcaster_user_login);
      ctx.setOutput(io.title, data.title);
      ctx.setOutput(io.categoryId, data.category_id);
      ctx.setOutput(io.categoryName, data.category_name);
      ctx.setOutput(io.mature, data.is_mature);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Subscribe",
    event: "channel.subscribe",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "userID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "Username",
          type: t.string(),
        }),
        tier: io.dataOutput({
          id: "tier",
          name: "Tier",
          type: t.string(),
        }),
        isGift: io.dataOutput({
          id: "isGift",
          name: "Gifted",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.userId, data.user_id);
      ctx.setOutput(io.userLogin, data.user_login);
      ctx.setOutput(io.tier, data.tier);
      ctx.setOutput(io.isGift, data.is_gift);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Subscribe End",
    event: "channel.subscription.end",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "userID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "Username",
          type: t.string(),
        }),
        tier: io.dataOutput({
          id: "tier",
          name: "Tier",
          type: t.string(),
        }),
        isGift: io.dataOutput({
          id: "isGift",
          name: "Gifted",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.userId, data.user_id);
      ctx.setOutput(io.userLogin, data.user_login);
      ctx.setOutput(io.tier, data.tier);
      ctx.setOutput(io.isGift, data.is_gift);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Subscription Gift",
    event: "channel.subscription.gift",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "userID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "Username",
          type: t.string(),
        }),
        tier: io.dataOutput({
          id: "tier",
          name: "Tier",
          type: t.string(),
        }),
        total: io.dataOutput({
          id: "total",
          name: "Total",
          type: t.int(),
        }),
        cumulative: io.dataOutput({
          id: "cumulative",
          name: "Cumulative Total",
          type: t.int(),
        }),
        anonymous: io.dataOutput({
          id: "anonymous",
          name: "Anonymous",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.userId, data.user_id);
      ctx.setOutput(io.userLogin, data.user_login);
      ctx.setOutput(io.tier, data.tier);
      ctx.setOutput(io.total, data.total);
      ctx.setOutput(io.cumulative, data.cumulative_total);
      ctx.setOutput(io.anonymous, data.is_anonymous);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Subscription Message",
    event: "channel.subscription.message",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "userID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "Username",
          type: t.string(),
        }),
        tier: io.dataOutput({
          id: "tier",
          name: "Tier",
          type: t.string(),
        }),
        message: io.dataOutput({
          id: "message",
          name: "Message",
          type: t.string(),
        }),
        streak: io.dataOutput({
          id: "streak",
          name: "Streak Months",
          type: t.int(),
        }),
        cumulative: io.dataOutput({
          id: "cumulative",
          name: "Cumulative Months",
          type: t.int(),
        }),
        duration: io.dataOutput({
          id: "duration",
          name: "Duration Months",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.userId, data.user_id);
      ctx.setOutput(io.userLogin, data.user_login);
      ctx.setOutput(io.tier, data.tier);
      ctx.setOutput(io.message, data.message.text);
      ctx.setOutput(io.cumulative, data.cumulative_months);
      ctx.setOutput(io.streak, data.streak_months);
      ctx.setOutput(io.duration, data.duration_months);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Cheers",
    event: "channel.cheer",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "userID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "Username",
          type: t.string(),
        }),
        anonymous: io.dataOutput({
          id: "anonymous",
          name: "Anonymous",
          type: t.bool(),
        }),
        message: io.dataOutput({
          id: "message",
          name: "Message",
          type: t.string(),
        }),
        bits: io.dataOutput({
          id: "bits",
          name: "Bits",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.userId, data.user_id);
      ctx.setOutput(io.userLogin, data.user_login);
      ctx.setOutput(io.anonymous, data.is_anonymous);
      ctx.setOutput(io.message, data.message);
      ctx.setOutput(io.bits, data.bits);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Raid",
    event: "channel.raid",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        userId: io.dataOutput({
          id: "userId",
          name: "userID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "Username",
          type: t.string(),
        }),
        viewers: io.dataOutput({
          id: "viewers",
          name: "Viewers",
          type: t.int(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.userId, data.from_broadcaster_user_id);
      ctx.setOutput(io.userLogin, data.from_broadcaster_user_login);
      ctx.setOutput(io.viewers, data.viewers);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "User Followed",
    event: "channel.follow",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        userId: io.dataOutput({
          id: "userID",
          name: "User ID",
          type: t.string(),
        }),
        userLogin: io.dataOutput({
          id: "userLogin",
          name: "Username",
          type: t.string(),
        }),
        username: io.dataOutput({
          id: "username",
          name: "Display Name",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.userId, data.user_id);
      ctx.setOutput(io.userLogin, data.user_login);
      ctx.setOutput(io.username, data.user_name);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Shoutout Received",
    event: "channel.shoutout.receive",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        viewerCount: io.dataOutput({
          id: "viewerCount",
          name: "Type",
          type: t.int(),
        }),
        startedAt: io.dataOutput({
          id: "startedAt",
          name: "Started At",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.viewerCount, data.viewer_count);
      ctx.setOutput(io.startedAt, data.started_at);

      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Goal Begin",
    event: "channel.goal.begin",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        id: io.dataOutput({
          id: "id",
          name: "Id",
          type: t.string(),
        }),
        type: io.dataOutput({
          id: "type",
          name: "Type",
          type: t.string(),
        }),
        description: io.dataOutput({
          id: "description",
          name: "Description",
          type: t.string(),
        }),
        currentAmount: io.dataOutput({
          id: "currentAmount",
          name: "Current Amount",
          type: t.int(),
        }),
        targetAmount: io.dataOutput({
          id: "targetAmount",
          name: "Target Amount",
          type: t.int(),
        }),
        startedAt: io.dataOutput({
          id: "startedAt",
          name: "Started At",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.id, data.id);
      ctx.setOutput(io.type, data.type);
      ctx.setOutput(io.description, data.description);
      ctx.setOutput(io.currentAmount, data.current_amount);
      ctx.setOutput(io.targetAmount, data.target_amount);
      ctx.setOutput(io.startedAt, data.started_at);

      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Goal Progress",
    event: "channel.goal.progress",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        id: io.dataOutput({
          id: "id",
          name: "Id",
          type: t.string(),
        }),
        type: io.dataOutput({
          id: "type",
          name: "Type",
          type: t.string(),
        }),
        description: io.dataOutput({
          id: "description",
          name: "Description",
          type: t.string(),
        }),
        currentAmount: io.dataOutput({
          id: "currentAmount",
          name: "Current Amount",
          type: t.int(),
        }),
        targetAmount: io.dataOutput({
          id: "targetAmount",
          name: "Target Amount",
          type: t.int(),
        }),
        startedAt: io.dataOutput({
          id: "startedAt",
          name: "Started At",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.id, data.id);
      ctx.setOutput(io.type, data.type);
      ctx.setOutput(io.description, data.description);
      ctx.setOutput(io.currentAmount, data.current_amount);
      ctx.setOutput(io.targetAmount, data.target_amount);
      ctx.setOutput(io.startedAt, data.started_at);

      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Channel Goal End",
    event: "channel.goal.end",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        id: io.dataOutput({
          id: "id",
          name: "Id",
          type: t.string(),
        }),
        type: io.dataOutput({
          id: "type",
          name: "Type",
          type: t.string(),
        }),
        description: io.dataOutput({
          id: "description",
          name: "Description",
          type: t.string(),
        }),
        isAchieved: io.dataOutput({
          id: "isAchieved",
          name: "Is Achieved",
          type: t.bool(),
        }),
        currentAmount: io.dataOutput({
          id: "currentAmount",
          name: "Current Amount",
          type: t.int(),
        }),
        targetAmount: io.dataOutput({
          id: "targetAmount",
          name: "Target Amount",
          type: t.int(),
        }),
        startedAt: io.dataOutput({
          id: "startedAt",
          name: "Started At",
          type: t.string(),
        }),
        endedAt: io.dataOutput({
          id: "endedAt",
          name: "Ended At",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.id, data.id);
      ctx.setOutput(io.type, data.type);
      ctx.setOutput(io.description, data.description);
      ctx.setOutput(io.isAchieved, data.is_achieved);
      ctx.setOutput(io.currentAmount, data.current_amount);
      ctx.setOutput(io.targetAmount, data.target_amount);
      ctx.setOutput(io.startedAt, data.started_at);
      ctx.setOutput(io.endedAt, data.ended_at);

      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Stream Online",
    event: "stream.online",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        id: io.dataOutput({
          id: "id",
          name: "Id",
          type: t.string(),
        }),
        type: io.dataOutput({
          id: "type",
          name: "Type",
          type: t.string(),
        }),
        startedAt: io.dataOutput({
          id: "startedAt",
          name: "Started At",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.id, data.id);
      ctx.setOutput(io.type, data.type);
      ctx.setOutput(io.startedAt, data.started_at);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Stream Offline",
    event: "stream.offline",
    generateIO: (io) => {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
      };
    },
    run({ ctx, io }) {
      ctx.exec(io.exec);
    },
  });
}

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
