import { ApiClient } from "@twurple/api";
import { createRoot, createEffect, createMemo, createSignal } from "solid-js";
import { accessToken, authProvider } from "./auth";
import pkg from "./pkg";
import { None, types, Maybe } from "@macrograph/core";

export const { helix, user } = createRoot(() => {
  const helix = createMemo(
    () => authProvider().map((p) => new ApiClient({ authProvider: p })),
    None
  );

  const getUser = () =>
    accessToken()
      .zip(helix())
      .andThenAsync(([token, helix]) =>
        helix.getTokenInfo().then(({ userId, userName }) =>
          Maybe(
            userId !== null && userName !== null
              ? {
                  id: userId,
                  name: userName,
                  token,
                }
              : null
          )
        )
      );

  const [user, setUser] =
    createSignal<Awaited<ReturnType<typeof getUser>>>(None);

  createEffect(() => getUser().then(setUser));

  return {
    helix,
    user,
  };
});

const unwrapApi = () => {
  const [h, u] = helix().zip(user()).unwrap();

  return {
    helix: h,
    user: u,
  };
};

pkg.createNonEventSchema({
  name: "Ban User",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "userID",
      id: "userId",
      type: types.string(),
    });
    t.dataInput({
      name: "Duration",
      id: "duration",
      type: types.int(),
    });
    t.dataInput({
      name: "Reason",
      id: "reason",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const { helix, user } = unwrapApi();

    helix.moderation.banUser(user.id, user.id, {
      user: ctx.getInput("userId"),
      duration: ctx.getInput("duration"),
      reason: ctx.getInput("reason"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Unban User",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "userID",
      id: "userId",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, helix } = unwrapApi();

    helix.moderation.unbanUser(user.id, user.id, ctx.getInput("userId"));
  },
});

pkg.createNonEventSchema({
  name: "Add Moderator",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "userID",
      id: "userId",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, helix } = unwrapApi();

    helix.moderation.addModerator(user.id, ctx.getInput("userId"));
  },
});

pkg.createNonEventSchema({
  name: "Remove Moderator",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "userID",
      id: "userId",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, helix } = unwrapApi();

    helix.moderation.removeModerator(user.id, ctx.getInput("userId"));
  },
});

pkg.createNonEventSchema({
  name: "Delete Chat message",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "Message ID",
      id: "messageId",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, helix } = unwrapApi();

    helix.moderation.deleteChatMessages(
      user.id,
      user.id,
      ctx.getInput("messageId")
    );
  },
});

pkg.createNonEventSchema({
  name: "Edit Stream Info",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "Game ID",
      id: "gameId",
      type: types.string(),
    });
    t.dataInput({
      name: "Language",
      id: "language",
      type: types.string(),
    });
    t.dataInput({
      name: "Title",
      id: "title",
      type: types.string(),
    });
    t.dataInput({
      name: "Delay (s)",
      id: "delay",
      type: types.string(),
    });
    t.dataInput({
      name: "Tags",
      id: "tags",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();

    let data = await helix.channels.updateChannelInfo(user.id, {
      gameId: ctx.getInput("gameId"),
      language: ctx.getInput("language"),
      title: ctx.getInput("title"),
      delay: ctx.getInput("delay"),
      tags: ctx.getInput("tags"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Edit Stream Info",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "Game ID",
      id: "gameId",
      type: types.string(),
    });
    t.dataInput({
      name: "Language",
      id: "language",
      type: types.string(),
    });
    t.dataInput({
      name: "Title",
      id: "title",
      type: types.string(),
    });
    t.dataInput({
      name: "Delay (s)",
      id: "delay",
      type: types.string(),
    });
    t.dataInput({
      name: "Tags",
      id: "tags",
      type: types.list(types.string()),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();

    let data = await helix.channels.updateChannelInfo(user.id, {
      gameId: ctx.getInput("gameId"),
      language: ctx.getInput("language"),
      title: ctx.getInput("title"),
      delay: ctx.getInput("delay"),
      tags: ctx.getInput("tags"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Create Clip",
  variant: "Exec",
  generateIO: (t) => {
    t.dataOutput({
      name: "Clip ID",
      id: "clipId",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();

    let clipId = await helix.clips.createClip({
      channel: user.id,
    });

    ctx.setOutput("clipId", clipId);
  },
});

pkg.createNonEventSchema({
  name: "Check User Subscription",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "User ID",
      id: "userId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Is Subscribed",
      id: "subbed",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Tier",
      id: "tier",
      type: types.string(),
    });
    t.dataOutput({
      name: "Gifted",
      id: "gifted",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Gifter Name",
      id: "gifterName",
      type: types.string(),
    });
    t.dataOutput({
      name: "Gifter Display Name",
      id: "gifterDisplayName",
      type: types.string(),
    });
    t.dataOutput({
      name: "Gifter ID",
      id: "gifterId",
      type: types.int(),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();

    let data = await helix.subscriptions.getSubscriptionForUser(
      user.id,
      ctx.getInput("userId")
    );

    ctx.setOutput("subbed", data !== null);

    if (!data) return;

    ctx.setOutput("tier", data.tier);
    ctx.setOutput("gifted", data.isGift);
    ctx.setOutput("gifterName", data.gifterName);
    ctx.setOutput("gifterDisplayName", data.gifterDisplayName);
    ctx.setOutput("gifterId", data.gifterId);
  },
});

pkg.createNonEventSchema({
  name: "Check User Follow",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "User ID",
      id: "userId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Following",
      id: "following",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();

    let data = await helix.channels.getChannelFollowers(
      user.id,
      user.id,
      ctx.getInput("userId")
    );

    ctx.setOutput("following", data?.data.length === 1);
  },
});

pkg.createNonEventSchema({
  name: "Check User VIP",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "User ID",
      id: "userId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Vip",
      id: "vip",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();

    let data = await helix.channels.checkVipForUser(
      user.id,
      ctx.getInput("userId")
    );

    ctx.setOutput("vip", data);
  },
});

pkg.createNonEventSchema({
  name: "Check User Mod",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "User ID",
      id: "userId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Moderator",
      id: "moderator",
      type: types.bool(),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();

    let data = await helix.moderation.checkUserMod(
      user.id,
      ctx.getInput("userId")
    );

    ctx.setOutput("moderator", data);
  },
});

pkg.createNonEventSchema({
  name: "Create Custom Reward",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "Title",
      id: "title",
      type: types.string(),
    });
    t.dataInput({
      name: "Cost",
      id: "cost",
      type: types.int(),
    });
    t.dataInput({
      name: "Prompt",
      id: "prompt",
      type: types.string(),
    });
    t.dataInput({
      name: "Enabled",
      id: "isEnabled",
      type: types.bool(),
    });
    t.dataInput({
      name: "Background Color",
      id: "backgroundColor",
      type: types.string(),
    });
    t.dataInput({
      name: "User Input Required",
      id: "userInputRequired",
      type: types.bool(),
    });
    t.dataInput({
      name: "Max Redemptions Per Stream",
      id: "maxRedemptionsPerStream",
      type: types.int(),
    });
    t.dataInput({
      name: "Max Redemptions Per User Per Stream",
      id: "maxRedemptionsPerUserPerStream",
      type: types.int(),
    });
    t.dataInput({
      name: "Global Cooldown",
      id: "globalCooldown",
      type: types.int(),
    });
    t.dataInput({
      name: "Skip Redemption Queue",
      id: "autoFulfill",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Success",
      id: "success",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Error Message",
      id: "errorMessage",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward ID",
      id: "rewardId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Title",
      id: "rewardTitle",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Prompt",
      id: "rewardPrompt",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Cost",
      id: "rewardCost",
      type: types.string(),
    });
    t.dataOutput({
      name: "Background Color",
      id: "backgroundColor",
      type: types.string(),
    });
    t.dataOutput({
      name: "Enabled",
      id: "enabled",
      type: types.bool(),
    });
    t.dataOutput({
      name: "User Input Required",
      id: "userInputRequired",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Max Redemptions Per Stream",
      id: "maxRedemptionsPerStream",
      type: types.int(),
    });
    t.dataOutput({
      name: "Max Redemptions Per User Per Stream",
      id: "maxRedemptionsPerUserPerStream",
      type: types.int(),
    });
    t.dataInput({
      name: "Global Cooldown",
      id: "globalCooldown",
      type: types.int(),
    });
    t.dataOutput({
      name: "Paused",
      id: "paused",
      type: types.bool(),
    });
    t.dataOutput({
      name: "in Stock",
      id: "stock",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Skip Request Queue",
      id: "skipRequestQueue",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Redemptions Current Stream",
      id: "redemptionsCurrentStream",
      type: types.int(),
    });
    t.dataOutput({
      name: "Cooldown Expires in",
      id: "cooldownExpire",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();

    try {
      let data = await helix.channelPoints.createCustomReward(user.id, {
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
      });
      ctx.setOutput("success", true);
      ctx.setOutput("errorMessage", "");
      ctx.setOutput("rewardId", data?.id);
      ctx.setOutput("rewardTitle", data?.title);
      ctx.setOutput("rewardPrompt", data?.prompt);
      ctx.setOutput("rewardCost", data?.cost);
      ctx.setOutput("backgroundColor", data?.backgroundColor);
      ctx.setOutput("enabled", data?.isEnabled);
      ctx.setOutput("userInputRequired", data?.userInputRequired);
      ctx.setOutput("maxRedemptionsPerStream", data?.maxRedemptionsPerStream);
      ctx.setOutput(
        "maxRedemptionsPerUserPerStream",
        data?.maxRedemptionsPerUserPerStream
      );
      ctx.setOutput("globalCooldown", data?.globalCooldown);
      ctx.setOutput("paused", data?.isPaused);
      ctx.setOutput("stock", data?.isInStock);
      ctx.setOutput("skipRequestQueue", data?.autoFulfill);
      ctx.setOutput("redemptionsCurrentStream", data?.redemptionsThisStream);
      ctx.setOutput("cooldownExpire", JSON.stringify(data?.cooldownExpiryDate));
    } catch (error: any) {
      ctx.setOutput("success", false);
      ctx.setOutput("errorMessage", (JSON.parse(error.body) as any).message);
    }
  },
});

pkg.createNonEventSchema({
  name: "Edit Custom Reward",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "Reward Id",
      id: "id",
      type: types.string(),
    });
    t.dataInput({
      name: "Title",
      id: "title",
      type: types.string(),
    });
    t.dataInput({
      name: "Cost",
      id: "cost",
      type: types.int(),
    });
    t.dataInput({
      name: "Prompt",
      id: "prompt",
      type: types.string(),
    });
    t.dataInput({
      name: "Enabled",
      id: "isEnabled",
      type: types.bool(),
    });
    t.dataInput({
      name: "Background Color",
      id: "backgroundColor",
      type: types.string(),
    });
    t.dataInput({
      name: "User Input Required",
      id: "userInputRequired",
      type: types.bool(),
    });
    t.dataInput({
      name: "Max Redemptions Per Stream",
      id: "maxRedemptionsPerStream",
      type: types.int(),
    });
    t.dataInput({
      name: "Max Redemptions Per User Per Stream",
      id: "maxRedemptionsPerUserPerStream",
      type: types.int(),
    });
    t.dataInput({
      name: "Global Cooldown",
      id: "globalCooldown",
      type: types.int(),
    });
    t.dataInput({
      name: "Skip Redemption Queue",
      id: "autoFulfill",
      type: types.bool(),
    });
    t.dataInput({
      name: "Paused",
      id: "paused",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Success",
      id: "success",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Error Message",
      id: "errorMessage",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward ID",
      id: "rewardId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Title",
      id: "rewardTitle",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Prompt",
      id: "rewardPrompt",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Cost",
      id: "rewardCost",
      type: types.string(),
    });
    t.dataOutput({
      name: "Background Color",
      id: "backgroundColor",
      type: types.string(),
    });
    t.dataOutput({
      name: "Enabled",
      id: "enabled",
      type: types.bool(),
    });
    t.dataOutput({
      name: "User Input Required",
      id: "userInputRequired",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Max Redemptions Per Stream",
      id: "maxRedemptionsPerStream",
      type: types.int(),
    });
    t.dataOutput({
      name: "Max Redemptions Per User Per Stream",
      id: "maxRedemptionsPerUserPerStream",
      type: types.int(),
    });
    t.dataInput({
      name: "Global Cooldown",
      id: "globalCooldown",
      type: types.int(),
    });
    t.dataOutput({
      name: "Paused",
      id: "paused",
      type: types.bool(),
    });
    t.dataOutput({
      name: "in Stock",
      id: "stock",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Skip Request Queue",
      id: "skipRequestQueue",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Redemptions Current Stream",
      id: "redemptionsCurrentStream",
      type: types.int(),
    });
    t.dataOutput({
      name: "Cooldown Expires in",
      id: "cooldownExpire",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();
    try {
      let data = await helix.channelPoints.updateCustomReward(
        user.id,
        ctx.getInput("id"),
        {
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
          isPaused: ctx.getInput("paused"),
          globalCooldown: ctx.getInput("globalCooldown"),
        }
      );
      ctx.setOutput("success", true);
      ctx.setOutput("errorMessage", "");
      ctx.setOutput("rewardId", data?.id);
      ctx.setOutput("rewardTitle", data?.title);
      ctx.setOutput("rewardPrompt", data?.prompt);
      ctx.setOutput("rewardCost", data?.cost);
      ctx.setOutput("backgroundColor", data?.backgroundColor);
      ctx.setOutput("enabled", data?.isEnabled);
      ctx.setOutput("userInputRequired", data?.userInputRequired);
      ctx.setOutput("maxRedemptionsPerStream", data?.maxRedemptionsPerStream);
      ctx.setOutput(
        "maxRedemptionsPerUserPerStream",
        data?.maxRedemptionsPerUserPerStream
      );
      ctx.setOutput("globalCooldown", data?.globalCooldown);
      ctx.setOutput("paused", data?.isPaused);
      ctx.setOutput("stock", data?.isInStock);
      ctx.setOutput("skipRequestQueue", data?.autoFulfill);
      ctx.setOutput("redemptionsCurrentStream", data?.redemptionsThisStream);
      ctx.setOutput("cooldownExpire", JSON.stringify(data?.cooldownExpiryDate));
    } catch (error: any) {
      ctx.setOutput("success", false);
      ctx.setOutput("errorMessage", JSON.parse(error.body).message);
    }
  },
});

pkg.createNonEventSchema({
  name: "Update Redemption Status",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      name: "Redemption ID",
      id: "redemptionId",
      type: types.string(),
    });
    t.dataInput({
      name: "Reward ID",
      id: "rewardId",
      type: types.string(),
    });
    t.dataInput({
      name: "Cancel",
      id: "cancel",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Success",
      id: "success",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Error Message",
      id: "errorMessage",
      type: types.string(),
    });
    t.dataOutput({
      name: "Redemption ID",
      id: "redemptionId",
      type: types.string(),
    });
    t.dataOutput({
      name: "User ID",
      id: "userId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Display Name",
      id: "displayName",
      type: types.string(),
    });
    t.dataOutput({
      name: "User Login Name",
      id: "userLogin",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward ID",
      id: "rewardId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Title",
      id: "rewardTitle",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Prompt",
      id: "rewardPrompt",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Cost",
      id: "rewardCost",
      type: types.string(),
    });
    t.dataOutput({
      name: "User Input",
      id: "userInput",
      type: types.string(),
    });
    t.dataOutput({
      name: "Status",
      id: "status",
      type: types.string(),
    });
    t.dataOutput({
      name: "Redeemed At",
      id: "redeemedAt",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();
    try {
      let data = await helix.channelPoints.updateRedemptionStatusByIds(
        user.id,
        ctx.getInput("redemptionId"),
        ctx.getInput("rewardId"),
        ctx.getInput("cancel") ? "FULFILLED" : "CANCELED"
      );
      ctx.setOutput("success", true);
      ctx.setOutput("redemptionId", data[0]?.id);
      ctx.setOutput("userId", data[0]?.userId);
      ctx.setOutput("displayName", data[0]?.userDisplayName);
      ctx.setOutput("userLogin", data[0]?.userName);
      ctx.setOutput("rewardId", data[0]?.rewardId);
      ctx.setOutput("rewardTitle", data[0]?.rewardTitle);
      ctx.setOutput("rewardPrompt", data[0]?.rewardPrompt);
      ctx.setOutput("rewardCost", data[0]?.rewardCost);
      ctx.setOutput("userInput", data[0]?.userInput);
      ctx.setOutput("status", data[0]?.updateStatus);
      ctx.setOutput("redeemedAt", JSON.stringify(data[0]?.redemptionDate));
    } catch (error: any) {
      ctx.setOutput("success", false);
      ctx.setOutput("errorMessage", JSON.parse(error.body).message);
    }
  },
});

pkg.createNonEventSchema({
  name: "Get Reward By Title",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "title",
      name: "Title",
      type: types.string(),
    });
    t.dataInput({
      name: "Manageable Only",
      id: "manageableOnly",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Success",
      id: "success",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Reward ID",
      id: "rewardId",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Title",
      id: "rewardTitle",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Prompt",
      id: "rewardPrompt",
      type: types.string(),
    });
    t.dataOutput({
      name: "Reward Cost",
      id: "rewardCost",
      type: types.string(),
    });
    t.dataOutput({
      name: "Background Color",
      id: "backgroundColor",
      type: types.string(),
    });
    t.dataOutput({
      name: "Enabled",
      id: "enabled",
      type: types.bool(),
    });
    t.dataOutput({
      name: "User Input Required",
      id: "userInputRequired",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Max Redemptions Per Stream",
      id: "maxRedemptionsPerStream",
      type: types.int(),
    });
    t.dataOutput({
      name: "Max Redemptions Per User Per Stream",
      id: "maxRedemptionsPerUserPerStream",
      type: types.int(),
    });
    t.dataOutput({
      name: "Global Cooldown",
      id: "globalCooldown",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Paused",
      id: "paused",
      type: types.bool(),
    });
    t.dataOutput({
      name: "in Stock",
      id: "stock",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Skip Request Queue",
      id: "skipRequestQueue",
      type: types.bool(),
    });
    t.dataOutput({
      name: "Redemptions Current Stream",
      id: "redemptionsCurrentStream",
      type: types.int(),
    });
    t.dataOutput({
      name: "Cooldown Expires in",
      id: "cooldownExpire",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();
    let rewards = await helix.channelPoints.getCustomRewards(
      user.id,
      ctx.getInput("manageableOnly")
    );
    const data = rewards.find(
      (reward) => reward.title === ctx.getInput("title")
    );
    ctx.setOutput("success", !!data);
    ctx.setOutput("rewardId", data?.id);
    ctx.setOutput("rewardTitle", data?.title);
    ctx.setOutput("rewardPrompt", data?.prompt);
    ctx.setOutput("rewardCost", data?.cost);
    ctx.setOutput("backgroundColor", data?.backgroundColor);
    ctx.setOutput("enabled", data?.isEnabled);
    ctx.setOutput("userInputRequired", data?.userInputRequired);
    ctx.setOutput("maxRedemptionsPerStream", data?.maxRedemptionsPerStream);
    ctx.setOutput(
      "maxRedemptionsPerUserPerStream",
      data?.maxRedemptionsPerUserPerStream
    );
    ctx.setOutput("globalCooldown", data?.globalCooldown);
    ctx.setOutput("paused", data?.isPaused);
    ctx.setOutput("stock", data?.isInStock);
    ctx.setOutput("skipRequestQueue", data?.autoFulfill);
    ctx.setOutput("redemptionsCurrentStream", data?.redemptionsThisStream);
    ctx.setOutput("cooldownExpire", JSON.stringify(data?.cooldownExpiryDate));
  },
});

pkg.createNonEventSchema({
  name: "Get User By ID",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "userId",
      name: "User ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "userId",
      name: "User ID",
      type: types.string(),
    });
    t.dataOutput({
      id: "userLogin",
      name: "Login Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "displayName",
      name: "Display Name",
      type: types.string(),
    });
    t.dataOutput({
      id: "type",
      name: "User Type",
      type: types.string(),
    });
    t.dataOutput({
      id: "broadcasterType",
      name: "Broadcaster Type",
      type: types.string(),
    });
    t.dataOutput({
      id: "description",
      name: "Description",
      type: types.string(),
    });
    t.dataOutput({
      id: "profileImageUrl",
      name: "Profile Image URL",
      type: types.string(),
    });
    t.dataOutput({
      id: "offlineImageUrl",
      name: "Offline Image URL",
      type: types.string(),
    });
    t.dataOutput({
      id: "createdAt",
      name: "Created At",
      type: types.string(),
    });
  },
  async run({ ctx }) {
    const { user, helix } = unwrapApi();
    let data = await helix.users.getUserById(ctx.getInput("userId"));
    ctx.setOutput("userId", data?.id);
    ctx.setOutput("userLogin", data?.name);
    ctx.setOutput("displayName", data?.displayName);
    ctx.setOutput("type", data?.type);
    ctx.setOutput("broadcasterType", data?.broadcasterType);
    ctx.setOutput("description", data?.description);
    ctx.setOutput("profileImageUrl", data?.profilePictureUrl);
    ctx.setOutput("offlineImageUrl", data?.offlinePlaceholderUrl);
    ctx.setOutput("createdAt", JSON.stringify(data?.creationDate));
  },
});

pkg.createNonEventSchema({
  name: "Delete Custom Reward",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "id",
      name: "Reward Id",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, helix } = unwrapApi();
    helix.channelPoints.deleteCustomReward(user.id, ctx.getInput("id"));
  },
});

pkg.createNonEventSchema({
  name: "Follower Only Mode",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "delay",
      name: "Delay (minutes)",
      type: types.int(),
    });
    t.dataInput({
      id: "enabled",
      type: types.bool(),
    });
  },
  run({ ctx }) {
    const { user, helix } = unwrapApi();

    helix.chat.updateSettings(user.id, user.id, {
      followerOnlyModeEnabled: ctx.getInput("enabled"),
      followerOnlyModeDelay: ctx.getInput("delay"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Slow Mode",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "delay",
      name: "Delay (seconds)",
      type: types.int(),
    });
    t.dataInput({
      id: "enabled",
      type: types.bool(),
    });
  },
  run({ ctx }) {
    const { user, helix } = unwrapApi();

    helix.chat.updateSettings(user.id, user.id, {
      slowModeEnabled: ctx.getInput("enabled"),
      slowModeDelay: ctx.getInput("delay"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Sub Only Mode",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "enabled",
      type: types.bool(),
    });
  },
  run({ ctx }) {
    const { user, helix } = unwrapApi();

    helix.chat.updateSettings(user.id, user.id, {
      subscriberOnlyModeEnabled: ctx.getInput("enabled"),
    });
  },
});

pkg.createNonEventSchema({
  name: "R9K Mode",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "enabled",
      type: types.bool(),
    });
  },
  run({ ctx }) {
    const { user, helix } = unwrapApi();

    helix.chat.updateSettings(user.id, user.id, {
      uniqueChatModeEnabled: ctx.getInput("enabled"),
    });
  },
});

pkg.createNonEventSchema({
  name: "Shoutout User",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "toId",
      name: "Id Of Shoutout User",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, helix } = unwrapApi();

    helix.chat.shoutoutUser(user.id, ctx.getInput("toId"), user.id);
  },
});

pkg.createNonEventSchema({
  name: "Send Announcement",
  variant: "Exec",
  generateIO: (t) => {
    t.dataInput({
      id: "announcement",
      name: "Announcement",
      type: types.string(),
    });
  },
  run({ ctx }) {
    const { user, helix } = unwrapApi();

    helix.chat.sendAnnouncement(user.id, user.id, ctx.getInput("announcement"));
  },
});
