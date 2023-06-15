import { ApiClient, HelixBroadcasterType, HelixUserType } from "@twurple/api";
import {
  createComputed,
  createEffect,
  createRoot,
  createSignal,
  on,
} from "solid-js";
import { auth } from "./auth";
import pkg from "./pkg";
import { t, Maybe, InferEnum, None } from "@macrograph/core";
import { z } from "zod";

export const HELIX_USER_ID = "helixUserId";

export const { client, userId, setUserId } = createRoot(() => {
  const client = new ApiClient({ authProvider: auth });

  const [userId, setUserId] = createSignal(
    Maybe(localStorage.getItem(HELIX_USER_ID))
  );

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

    client.moderation.banUser(user, user, {
      user: ctx.getInput("userId"),
      duration: ctx.getInput("duration"),
      reason: ctx.getInput("reason"),
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
    const user = userId().unwrap();

    return client.moderation.unbanUser(user, user, ctx.getInput("userId"));
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
    return client.moderation.addModerator(
      userId().unwrap(),
      ctx.getInput("userId")
    );
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
    return client.moderation.removeModerator(
      userId().unwrap(),
      ctx.getInput("userId")
    );
  },
});

pkg.createNonEventSchema({
  name: "Delete Chat message",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "Message ID",
      id: "messageId",
      type: t.string(),
    });
  },
  run({ ctx }) {
    const user = userId().unwrap();

    client.moderation.deleteChatMessages(user, user, ctx.getInput("messageId"));
  },
});

pkg.createNonEventSchema({
  name: "Edit Stream Info",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      name: "Game ID",
      id: "gameId",
      type: t.string(),
    });
    io.dataInput({
      name: "Language",
      id: "language",
      type: t.string(),
    });
    io.dataInput({
      name: "Title",
      id: "title",
      type: t.string(),
    });
    io.dataInput({
      name: "Delay (s)",
      id: "delay",
      type: t.string(),
    });
    io.dataInput({
      name: "Tags",
      id: "tags",
      type: t.list(t.string()),
    });
  },
  run({ ctx }) {
    return client.channels.updateChannelInfo(userId().unwrap(), {
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
  generateIO: (io) => {
    io.dataOutput({
      name: "Clip ID",
      id: "clipId",
      type: t.string(),
    });
  },
  async run({ ctx }) {
    let clipId = await client.clips.createClip({
      channel: userId().unwrap(),
    });

    ctx.setOutput("clipId", clipId);
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
    let data = await client.subscriptions.getSubscriptionForUser(
      userId().unwrap(),
      ctx.getInput("userId")
    );

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

    let data = await client.channels.getChannelFollowers(
      user,
      user,
      ctx.getInput("userId")
    );

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
    let data = await client.channels.checkVipForUser(
      userId().unwrap(),
      ctx.getInput("userId")
    );

    ctx.setOutput("vip", data);
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
    let data = await client.moderation.checkUserMod(
      userId().unwrap(),
      ctx.getInput("userId")
    );

    ctx.setOutput("moderator", data);
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

    let data = await client.channelPoints.createCustomReward(user, {
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
    const data = await client.channelPoints.updateCustomReward(
      userId().unwrap(),
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
    io.dataOutput({
      name: "Redemption",
      id: "out",
      type: t.struct(Redemption),
    });
  },
  async run({ ctx }) {
    const status = ctx.getInput<InferEnum<typeof RedemptionStatus>>("status");

    let data = await client.channelPoints.updateRedemptionStatusByIds(
      userId().unwrap(),
      ctx.getInput("rewardId"),
      [ctx.getInput("redemptionId")],
      status.variant === "Fulfilled" ? "FULFILLED" : "CANCELED"
    );

    ctx.setOutput("out", data[0]);
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
    let rewards = await client.channelPoints.getCustomRewards(
      userId().unwrap(),
      ctx.getInput("manageableOnly")
    );

    const data = rewards.find(
      (reward) => reward.title === ctx.getInput("title")
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

const UserTypeMap: Record<HelixUserType, InferEnum<typeof UserType>> = {
  admin: UserType.variant("Admin"),
  global_mod: UserType.variant("Global Mod"),
  staff: UserType.variant("Staff"),
  "": UserType.variant("Normal User"),
};

const BroadcasterTypeMap: Record<
  HelixBroadcasterType,
  InferEnum<typeof BroadcasterType>
> = {
  affiliate: BroadcasterType.variant("Affliate"),
  partner: BroadcasterType.variant("Partner"),
  "": BroadcasterType.variant("Normal User"),
};

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
      id: "out",
      type: t.option(t.struct(User)),
    });
  },
  async run({ ctx }) {
    const data = await client.users.getUserById(ctx.getInput("userId"));

    ctx.setOutput(
      "out",
      Maybe(data).map((data) =>
        User.create({
          id: data.id,
          login: data.name,
          displayName: data.displayName,
          userType: UserTypeMap[data.type],
          broadcasterType: BroadcasterTypeMap[data.broadcasterType],
          description: data.description,
          profileImage: data.profilePictureUrl,
          offlineImage: data.offlinePlaceholderUrl,
          createdAt: JSON.stringify(data.creationDate),
        })
      )
    );
  },
});

pkg.createNonEventSchema({
  name: "Delete Custom Reward",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "id",
      name: "Reward Id",
      type: t.string(),
    });
  },
  run({ ctx }) {
    return client.channelPoints.deleteCustomReward(
      userId().unwrap(),
      ctx.getInput("id")
    );
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

    await client.chat.updateSettings(user, user, {
      followerOnlyModeEnabled: ctx.getInput("enabled"),
      followerOnlyModeDelay: ctx.getInput("delay"),
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
  run({ ctx }) {
    const user = userId().unwrap();

    client.chat.updateSettings(user, user, {
      slowModeEnabled: ctx.getInput("enabled"),
      slowModeDelay: ctx.getInput("delay"),
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
  run({ ctx }) {
    const user = userId().unwrap();

    client.chat.updateSettings(user, user, {
      subscriberOnlyModeEnabled: ctx.getInput("enabled"),
    });
  },
});

pkg.createNonEventSchema({
  name: "R9K Mode",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "enabled",
      type: t.bool(),
    });
  },
  run({ ctx }) {
    const user = userId().unwrap();

    client.chat.updateSettings(user, user, {
      uniqueChatModeEnabled: ctx.getInput("enabled"),
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

    client.chat.shoutoutUser(user, ctx.getInput("toId"), user);
  },
});

pkg.createNonEventSchema({
  name: "Send Announcement",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "announcement",
      name: "Announcement",
      type: t.string(),
    });
  },
  run({ ctx }) {
    const user = userId().unwrap();

    client.chat.sendAnnouncement(user, user, ctx.getInput("announcement"));
  },
});
