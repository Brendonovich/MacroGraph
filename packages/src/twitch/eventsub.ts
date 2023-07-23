import * as helix from "./helix";
import pkg from "./pkg";
import {
  createRoot,
  createEffect,
  createSignal,
  onCleanup,
  on,
} from "solid-js";
import { t } from "@macrograph/core";
import { auth } from "./auth";
import { z } from "zod";

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
  const [state, setState] = createSignal<
    | { type: "disconnected" }
    | { type: "connecting" | "connected"; ws: WebSocket }
  >({ type: "disconnected" });

  createEffect(
    on(
      () => helix.userId(),
      (user) => {
        user
          .map((userId) => {
            auth.refreshAccessTokenForUser(userId);
            const ws = new WebSocket(`wss://eventsub.wss.twitch.tv/ws`);

            ws.addEventListener("message", async (data) => {
              let info = JSON.parse(data.data);

              switch (info.metadata.message_type) {
                case "session_welcome":
                  setState({ type: "connected", ws });

                  await Promise.all(
                    SubTypes.map((type) =>
                      helix.client.eventsub.subscriptions.post(z.any(), {
                        body: {
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
                        },
                      })
                    )
                  );

                  break;
                case "notification":
                  pkg.emitEvent({
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
          })
          .unwrapOrElse(() => setState({ type: "disconnected" }));
      }
    )
  );

  return { state };
});

export { state };

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
    ctx.setOutput("userId", data.from_broadcaster_user_id);
    ctx.setOutput("userLogin", data.from_broadcaster_user_login);
    ctx.setOutput("modName", data.moderator_user_login);
    ctx.setOutput("modId", data.moderator_user_id);
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
    ctx.setOutput("userId", data.user_id);
    ctx.setOutput("userLogin", data.user_login);
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
    ctx.setOutput("userId", data.user_id);
    ctx.setOutput("userLogin", data.user_login);
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
    ctx.setOutput("id", data.id);
    ctx.setOutput("enabled", data.is_enabled);
    ctx.setOutput("paused", data.is_paused);
    ctx.setOutput("inStock", data.is_in_stock);
    ctx.setOutput("title", data.title);
    ctx.setOutput("cost", data.cost);
    ctx.setOutput("prompt", data.prompt);
    ctx.setOutput("inputRequired", data.is_user_input_required);
    ctx.setOutput("skipQueue", data.should_redemptions_skip_request_queue);
    ctx.setOutput("cooldownExpire", data.cooldown_expires_at);
    ctx.setOutput(
      "redemptTotalStream",
      data.redemptions_redeemed_current_stream
    );
    ctx.setOutput("maxPerStreamEnabled", data.max_per_stream.is_enabled);
    ctx.setOutput("maxPerStreamValue", data.max_per_stream.value);
    ctx.setOutput("maxUserPerStream", data.max_per_user_per_stream.is_enabled);
    ctx.setOutput("maxUserPerStreamValue", data.max_per_user_per_stream.value);
    ctx.setOutput("globalCooldown", data.global_cooldown.is_enabled);
    ctx.setOutput("globalCooldownValue", data.global_cooldown.seconds);
    ctx.setOutput("backgroundColor", data.background_color);
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
    ctx.setOutput("id", data.id);
    ctx.setOutput("enabled", data.is_enabled);
    ctx.setOutput("paused", data.is_paused);
    ctx.setOutput("inStock", data.is_in_stock);
    ctx.setOutput("title", data.title);
    ctx.setOutput("cost", data.cost);
    ctx.setOutput("prompt", data.prompt);
    ctx.setOutput("inputRequired", data.is_user_input_required);
    ctx.setOutput("skipQueue", data.should_redemptions_skip_request_queue);
    ctx.setOutput("cooldownExpire", data.cooldown_expires_at);
    ctx.setOutput(
      "redemptTotalStream",
      data.redemptions_redeemed_current_stream
    );
    ctx.setOutput("maxPerStreamEnabled", data.max_per_stream.is_enabled);
    ctx.setOutput("maxPerStreamValue", data.max_per_stream.value);
    ctx.setOutput("maxUserPerStream", data.max_per_user_per_stream.is_enabled);
    ctx.setOutput("maxUserPerStreamValue", data.max_per_user_per_stream.value);
    ctx.setOutput("globalCooldown", data.global_cooldown.is_enabled);
    ctx.setOutput("globalCooldownValue", data.global_cooldown.seconds);
    ctx.setOutput("backgroundColor", data.background_color);
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
    ctx.setOutput("id", data.id);
    ctx.setOutput("enabled", data.is_enabled);
    ctx.setOutput("paused", data.is_paused);
    ctx.setOutput("inStock", data.is_in_stock);
    ctx.setOutput("title", data.title);
    ctx.setOutput("cost", data.cost);
    ctx.setOutput("prompt", data.prompt);
    ctx.setOutput("inputRequired", data.is_user_input_required);
    ctx.setOutput("skipQueue", data.should_redemptions_skip_request_queue);
    ctx.setOutput("cooldownExpire", data.cooldown_expires_at);
    ctx.setOutput(
      "redemptTotalStream",
      data.redemptions_redeemed_current_stream
    );
    ctx.setOutput("maxPerStreamEnabled", data.max_per_stream.is_enabled);
    ctx.setOutput("maxPerStreamValue", data.max_per_stream.value);
    ctx.setOutput("maxUserPerStream", data.max_per_user_per_stream.is_enabled);
    ctx.setOutput("maxUserPerStreamValue", data.max_per_user_per_stream.value);
    ctx.setOutput("globalCooldown", data.global_cooldown.is_enabled);
    ctx.setOutput("globalCooldownValue", data.global_cooldown.seconds);
    ctx.setOutput("backgroundColor", data.background_color);
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
      name: "Reward Id",
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
    ctx.setOutput("id", data.id);
    ctx.setOutput("userId", data.user_id);
    ctx.setOutput("userLogin", data.user_login);
    ctx.setOutput("userName", data.user_name);
    ctx.setOutput("userInput", data.user_input);
    ctx.setOutput("status", data.status);
    ctx.setOutput("rewardId", data.reward.id);
    ctx.setOutput("rewardTitle", data.reward.title);
    ctx.setOutput("rewardCost", data.reward.cost);
    ctx.setOutput("rewardPrompt", data.reward.prompt);
    ctx.exec("exec");
  },
});

const Poll = pkg.createStruct("Choices", (s) => ({
  id: s.field("id", t.string()),
  title: s.field("title", t.string()),
  channel_points_votes: s.field("Channel Points Votes", t.option(t.int())),
  votes: s.field("votes", t.int()),
}));

pkg.createEventSchema({
  name: "Channel Poll Begin",
  event: "channel.poll.begin",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "choices",
      name: "Choices",
      type: t.list(t.struct(Poll)),
    });
    io.dataOutput({
      id: "channelPointVotingEnabled",
      name: "Channel Point Voting Enabled",
      type: t.bool(),
    });
    io.dataOutput({
      id: "channelPointVotingCost",
      name: "Channel Point Voting Cost",
      type: t.int(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("title", data.title);
    ctx.setOutput("choices", data.choices);
    ctx.setOutput(
      "channelPointVotingEnabled",
      data.channel_points_voting.is_enabled
    );
    ctx.setOutput(
      "channelPointVotingCost",
      data.channel_points_voting.amount_per_vote
    );
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
    io.dataOutput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "choices",
      name: "Choices",
      type: t.list(t.struct(Poll)),
    });
    io.dataOutput({
      id: "channelPointVotingEnabled",
      name: "Channel Point Voting Enabled",
      type: t.bool(),
    });
    io.dataOutput({
      id: "channelPointVotingCost",
      name: "Channel Point Voting Cost",
      type: t.int(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("title", data.title);
    ctx.setOutput("choices", data.choices);
    ctx.setOutput(
      "channelPointVotingEnabled",
      data.channel_points_voting.is_enabled
    );
    ctx.setOutput(
      "channelPointVotingCost",
      data.channel_points_voting.amount_per_vote
    );
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
    io.dataOutput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "choices",
      name: "Choices",
      type: t.list(t.struct(Poll)),
    });
    io.dataOutput({
      id: "channelPointVotingEnabled",
      name: "Channel Point Voting Enabled",
      type: t.bool(),
    });
    io.dataOutput({
      id: "channelPointVotingCost",
      name: "Channel Point Voting Cost",
      type: t.int(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("title", data.title);
    ctx.setOutput("choices", data.choices);
    ctx.setOutput(
      "channelPointVotingEnabled",
      data.channel_points_voting.is_enabled
    );
    ctx.setOutput(
      "channelPointVotingCost",
      data.channel_points_voting.amount_per_vote
    );
    ctx.exec("exec");
  },
});

const outcomesBegin = pkg.createStruct("Outcomes Begin", (s) => ({
  id: s.field("id", t.string()),
  title: s.field("title", t.string()),
  color: s.field("Color", t.string()),
}));

const topPredictors = pkg.createStruct("Top Predictors", (s) => ({
  userName: s.field("User Name", t.string()),
  userLogin: s.field("User Login", t.string()),
  userId: s.field("User ID", t.string()),
  channelPointsWon: s.field("Channel Points Won", t.option(t.int())),
  channelPointsUser: s.field("Channel Points User", t.int()),
}));

const outcomesProgress = pkg.createStruct("Outcomes Progress", (s) => ({
  id: s.field("id", t.string()),
  title: s.field("title", t.string()),
  color: s.field("Color", t.string()),
  users: s.field("Users", t.int()),
  channelPoints: s.field("Channel Points", t.int()),
  topPredictors: s.field("Top Predictors", t.list(t.struct(topPredictors))),
  votes: s.field("votes", t.int()),
}));

pkg.createEventSchema({
  name: "Channel Prediction Begin",
  event: "channel.prediction.begin",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "outcomes",
      name: "Outcomes",
      type: t.list(t.struct(outcomesBegin)),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("title", data.title);
    ctx.setOutput("outcomes", data.outcomes);
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
    io.dataOutput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "outcomes",
      name: "Outcomes",
      type: t.list(t.struct(outcomesProgress)),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("title", data.title);
    ctx.setOutput("outcomes", data.outcomes);
    ctx.exec("exec");
  },
});

const PredictionStatus = pkg.createEnum("Prediction Status", (e) => [
  e.variant("resolved"),
  e.variant("canceled"),
]);

pkg.createEventSchema({
  name: "Channel Prediction Lock",
  event: "channel.prediction.lock",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "outcomes",
      name: "Outcomes",
      type: t.list(t.struct(outcomesProgress)),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("title", data.title);
    ctx.setOutput("outcomes", data.outcomes);
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
    io.dataOutput({
      id: "title",
      name: "Title",
      type: t.string(),
    });
    io.dataOutput({
      id: "outcomes",
      name: "Outcomes",
      type: t.list(t.struct(outcomesProgress)),
    });
    io.dataOutput({
      id: "winningOutcomeId",
      name: "Winning Outcome ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "status",
      name: "Status",
      type: t.enum(PredictionStatus),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("title", data.title);
    ctx.setOutput("outcomes", data.outcomes);
    ctx.setOutput("winningOutcomeId", data.winning_outcome_id);
    ctx.setOutput("status", data.status);
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
    io.dataOutput({
      id: "total",
      name: "Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "progress",
      name: "Progress",
      type: t.int(),
    });
    io.dataOutput({
      id: "goal",
      name: "Goal",
      type: t.int(),
    });
    io.dataOutput({
      id: "topContributeBitsUserName",
      name: "Top Contribute Bit Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeBitsUserId",
      name: "Top Contribute Bit User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeBitsTotal",
      name: "Top Contribute Bits Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "topContributeSubsUserName",
      name: "Top Contribute Subs Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeSubsUserId",
      name: "Top Contribute Subs User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeSubsTotal",
      name: "Top Contribute Subs Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "lastContributeUserName",
      name: "Last Contribute Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "lastContributeUserId",
      name: "Last Contribute User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "lastContributeTotal",
      name: "Last Contribute Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "lastContributeType",
      name: "Last Contribute Type",
      type: t.string(),
    });
    io.dataOutput({
      id: "level",
      name: "Level",
      type: t.int(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("total", data.total);
    ctx.setOutput("progress", data.progress);
    ctx.setOutput("goal", data.goal);
    ctx.setOutput("level", data.level);
    ctx.setOutput(
      "topContributeBitsUserName",
      data.top_contributions[0].user_name
    );
    ctx.setOutput("topContributeBitsUserId", data.top_contributions[0].user_id);
    ctx.setOutput("topContributeBitsTotal", data.top_contributions[0].total);
    ctx.setOutput(
      "topContributeSubsUserName",
      data.top_contributions[1].user_name
    );
    ctx.setOutput("topContributeSubsUserId", data.top_contributions[1].user_id);
    ctx.setOutput("topContributeSubsTotal", data.top_contributions[1].total);
    ctx.setOutput("lastContributeUserName", data.last_contribution.user_name);
    ctx.setOutput("lastContributeUserId", data.last_contribution.user_id);
    ctx.setOutput("lastContributeTotal", data.last_contribution.total);
    ctx.setOutput("lastContributeType", data.last_contribution.type);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Hype Train Progress",
  event: "channel.hype_train.progress",
  generateIO: (io) => {
    io.dataOutput({
      id: "total",
      name: "Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "progress",
      name: "Progress",
      type: t.int(),
    });
    io.dataOutput({
      id: "goal",
      name: "Goal",
      type: t.int(),
    });
    io.dataOutput({
      id: "level",
      name: "Level",
      type: t.int(),
    });
    io.dataOutput({
      id: "topContributeBitsUserName",
      name: "Top Contribute Bit Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeBitsUserId",
      name: "Top Contribute Bit User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeBitsTotal",
      name: "Top Contribute Bits Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "topContributeSubsUserName",
      name: "Top Contribute Subs Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeSubsUserId",
      name: "Top Contribute Subs User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeSubsTotal",
      name: "Top Contribute Subs Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "lastContributeUserName",
      name: "Last Contribute Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "lastContributeUserId",
      name: "Last Contribute User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "lastContributeTotal",
      name: "Last Contribute Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "lastContributeType",
      name: "Last Contribute Type",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("total", data.total);
    ctx.setOutput("progress", data.progress);
    ctx.setOutput("goal", data.goal);
    ctx.setOutput("level", data.level);
    ctx.setOutput(
      "topContributeBitsUserName",
      data.top_contributions[0].user_name
    );
    ctx.setOutput("topContributeBitsUserId", data.top_contributions[0].user_id);
    ctx.setOutput("topContributeBitsTotal", data.top_contributions[0].total);
    ctx.setOutput(
      "topContributeSubsUserName",
      data.top_contributions[1].user_name
    );
    ctx.setOutput("topContributeSubsUserId", data.top_contributions[1].user_id);
    ctx.setOutput("topContributeSubsTotal", data.top_contributions[1].total);
    ctx.setOutput("lastContributeUserName", data.last_contribution.user_name);
    ctx.setOutput("lastContributeUserId", data.last_contribution.user_id);
    ctx.setOutput("lastContributeTotal", data.last_contribution.total);
    ctx.setOutput("lastContributeType", data.last_contribution.type);
    ctx.exec("exec");
  },
});

pkg.createEventSchema({
  name: "Channel Hype Train End",
  event: "channel.hype_train.end",
  generateIO: (io) => {
    io.dataOutput({
      id: "total",
      name: "Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "level",
      name: "Level",
      type: t.int(),
    });
    io.dataOutput({
      id: "topContributeBitsUserName",
      name: "Top Contribute Bit Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeBitsUserId",
      name: "Top Contribute Bit User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeBitsTotal",
      name: "Top Contribute Bits Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "topContributeSubsUserName",
      name: "Top Contribute Subs Username",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeSubsUserId",
      name: "Top Contribute Subs User ID",
      type: t.string(),
    });
    io.dataOutput({
      id: "topContributeSubsTotal",
      name: "Top Contribute Subs Total",
      type: t.int(),
    });
    io.dataOutput({
      id: "cooldownEndsAt",
      name: "CooldownEndsAt",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("total", data.total);
    ctx.setOutput("level", data.level);
    ctx.setOutput(
      "topContributeBitsUserName",
      data.top_contributions[0].user_name
    );
    ctx.setOutput("topContributeBitsUserId", data.top_contributions[0].user_id);
    ctx.setOutput("topContributeBitsTotal", data.top_contributions[0].total);
    ctx.setOutput(
      "topContributeSubsUserName",
      data.top_contributions[1].user_name
    );
    ctx.setOutput("topContributeSubsUserId", data.top_contributions[1].user_id);
    ctx.setOutput("topContributeSubsTotal", data.top_contributions[1].total);
    ctx.setOutput("cooldownEndsAt", data.cooldown_ends_at);
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
    ctx.setOutput("channelId", data.broadcaster_user_id);
    ctx.setOutput("channelLogin", data.broadcaster_user_login);
    ctx.setOutput("title", data.title);
    ctx.setOutput("categoryId", data.category_id);
    ctx.setOutput("categoryName", data.category_name);
    ctx.setOutput("mature", data.is_mature);
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
    ctx.setOutput("userId", data.user_id);
    ctx.setOutput("userLogin", data.user_login);
    ctx.setOutput("tier", data.tier);
    ctx.setOutput("isGift", data.is_gift);
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
    ctx.setOutput("userId", data.user_id);
    ctx.setOutput("userLogin", data.user_login);
    ctx.setOutput("tier", data.tier);
    ctx.setOutput("isGift", data.is_gift);
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
    ctx.setOutput("userId", data.user_id);
    ctx.setOutput("userLogin", data.user_login);
    ctx.setOutput("tier", data.tier);
    ctx.setOutput("total", data.total);
    ctx.setOutput("cumulative", data.cumulative_total);
    ctx.setOutput("anonymous", data.is_anonymous);
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
      type: t.int(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("userId", data.user_id);
    ctx.setOutput("userLogin", data.user_login);
    ctx.setOutput("tier", data.tier);
    ctx.setOutput("message", data.message.text);
    ctx.setOutput("cumulative", data.cumulative_months);
    ctx.setOutput("streak", data.streak_months);
    ctx.setOutput("duration", data.duration_months);
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
    ctx.setOutput("userId", data.user_id);
    ctx.setOutput("userLogin", data.user_login);
    ctx.setOutput("anonymous", data.is_anonymous);
    ctx.setOutput("message", data.message);
    ctx.setOutput("bits", data.bits);
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
    ctx.setOutput("userId", data.from_broadcaster_user_id);
    ctx.setOutput("userLogin", data.from_broadcaster_user_login);
    ctx.setOutput("viewers", data.viewers);
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
    ctx.setOutput("userID", data.user_id);
    ctx.setOutput("userLogin", data.user_login);
    ctx.setOutput("username", data.user_name);
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
    ctx.setOutput("id", data.id);
    ctx.setOutput("viewerCount", data.viewer_count);
    ctx.setOutput("startedAt", data.started_at);

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
    ctx.setOutput("id", data.id);
    ctx.setOutput("type", data.type);
    ctx.setOutput("description", data.description);
    ctx.setOutput("currentAmount", data.current_amount);
    ctx.setOutput("targetAmount", data.target_amount);
    ctx.setOutput("startedAt", data.started_at);

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
    ctx.setOutput("id", data.id);
    ctx.setOutput("type", data.type);
    ctx.setOutput("description", data.description);
    ctx.setOutput("currentAmount", data.current_amount);
    ctx.setOutput("targetAmount", data.target_amount);
    ctx.setOutput("startedAt", data.started_at);

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
    ctx.setOutput("id", data.id);
    ctx.setOutput("type", data.type);
    ctx.setOutput("description", data.description);
    ctx.setOutput("isAchieved", data.is_achieved);
    ctx.setOutput("currentAmount", data.current_amount);
    ctx.setOutput("targetAmount", data.target_amount);
    ctx.setOutput("startedAt", data.started_at);
    ctx.setOutput("endedAt", data.ended_at);

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
    ctx.setOutput("id", data.id);
    ctx.setOutput("type", data.type);
    ctx.setOutput("startedAt", data.started_at);
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
