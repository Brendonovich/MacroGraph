import { ApiClient, HelixBroadcasterType, HelixUserType } from "@twurple/api";
import { createRoot, createEffect, createSignal } from "solid-js";
import { authProvider } from "./auth";
import pkg from "./pkg";
import {
  None,
  t,
  Maybe,
  InferEnum,
  InferStruct,
  Option,
} from "@macrograph/core";

export const { helix, user, api, setApi } = createRoot(() => {
  const helix = new ApiClient({ authProvider });

  const [api, setApi] = createSignal<string>(localStorage.getItem("api") || "");

  const getUser = () =>
    Maybe(authProvider.tokens[api()]).andThenAsync((token) =>
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

  createEffect(async () => {
    getUser().then(setUser);
  });

  return {
    helix,
    user,
    api,
    setApi,
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
    const u = user().unwrap();

    helix.moderation.banUser(u.id, u.id, {
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
    const u = user().unwrap();

    helix.moderation.unbanUser(u.id, u.id, ctx.getInput("userId"));
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
    const u = user().unwrap();

    helix.moderation.addModerator(u.id, ctx.getInput("userId"));
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
    const u = user().unwrap();

    helix.moderation.removeModerator(u.id, ctx.getInput("userId"));
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
    const u = user().unwrap();

    helix.moderation.deleteChatMessages(u.id, u.id, ctx.getInput("messageId"));
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
  async run({ ctx }) {
    const u = user().unwrap();
    console.log(u.name);

    await helix.channels.updateChannelInfo(u.id, {
      gameId: ctx.getInput("gameId"),
      language: ctx.getInput("language"),
      title: ctx.getInput("title"),
      delay: ctx.getInput("delay"),
      tags: ctx.getInput("tags"),
    });
  },
});

pkg.createNonEventSchema({
  name: "test",
  variant: "Exec",
  generateIO: (io) => {},
  async run({ ctx }) {
    let data = await helix.getTokenInfo();
    console.log(data);
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
    const u = user().unwrap();

    let clipId = await helix.clips.createClip({
      channel: u.id,
    });

    ctx.setOutput("clipId", clipId);
  },
});

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
      name: "Is Subscribed",
      id: "subbed",
      type: t.bool(),
    });
    io.dataOutput({
      name: "Tier",
      id: "tier",
      type: t.string(),
    });
    io.dataOutput({
      name: "Gifted",
      id: "gifted",
      type: t.bool(),
    });
    io.dataOutput({
      name: "Gifter Name",
      id: "gifterName",
      type: t.string(),
    });
    io.dataOutput({
      name: "Gifter Display Name",
      id: "gifterDisplayName",
      type: t.string(),
    });
    io.dataOutput({
      name: "Gifter ID",
      id: "gifterId",
      type: t.int(),
    });
  },
  async run({ ctx }) {
    const u = user().unwrap();

    let data = await helix.subscriptions.getSubscriptionForUser(
      u.id,
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
    const u = user().unwrap();

    let data = await helix.channels.getChannelFollowers(
      u.id,
      u.id,
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
    const u = user().unwrap();

    let data = await helix.channels.checkVipForUser(
      u.id,
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
    const u = user().unwrap();

    let data = await helix.moderation.checkUserMod(
      u.id,
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
      name: "Success",
      id: "success",
      type: t.bool(),
    });
    io.dataOutput({
      name: "Error Message",
      id: "errorMessage",
      type: t.string(),
    });
    io.dataOutput({
      name: "Reward ID",
      id: "rewardId",
      type: t.string(),
    });
    io.dataOutput({
      name: "Reward Title",
      id: "rewardTitle",
      type: t.string(),
    });
    io.dataOutput({
      name: "Reward Prompt",
      id: "rewardPrompt",
      type: t.string(),
    });
    io.dataOutput({
      name: "Reward Cost",
      id: "rewardCost",
      type: t.string(),
    });
    io.dataOutput({
      name: "Background Color",
      id: "backgroundColor",
      type: t.string(),
    });
    io.dataOutput({
      name: "Enabled",
      id: "enabled",
      type: t.bool(),
    });
    io.dataOutput({
      name: "User Input Required",
      id: "userInputRequired",
      type: t.bool(),
    });
    io.dataOutput({
      name: "Max Redemptions Per Stream",
      id: "maxRedemptionsPerStream",
      type: t.int(),
    });
    io.dataOutput({
      name: "Max Redemptions Per User Per Stream",
      id: "maxRedemptionsPerUserPerStream",
      type: t.int(),
    });
    io.dataInput({
      name: "Global Cooldown",
      id: "globalCooldown",
      type: t.int(),
    });
    io.dataOutput({
      name: "Paused",
      id: "paused",
      type: t.bool(),
    });
    io.dataOutput({
      name: "in Stock",
      id: "stock",
      type: t.bool(),
    });
    io.dataOutput({
      name: "Skip Request Queue",
      id: "skipRequestQueue",
      type: t.bool(),
    });
    io.dataOutput({
      name: "Redemptions Current Stream",
      id: "redemptionsCurrentStream",
      type: t.int(),
    });
    io.dataOutput({
      name: "Cooldown Expires in",
      id: "cooldownExpire",
      type: t.string(),
    });
  },
  async run({ ctx }) {
    const u = user().unwrap();

    try {
      let data = await helix.channelPoints.createCustomReward(u.id, {
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
      name: "Success",
      id: "success",
      type: t.bool(),
    });
    io.dataOutput({
      name: "Error Message",
      id: "errorMessage",
      type: t.string(),
    });
    io.dataOutput({
      name: "Reward ID",
      id: "rewardId",
      type: t.string(),
    });
    io.dataOutput({
      name: "Reward Title",
      id: "rewardTitle",
      type: t.string(),
    });
    io.dataOutput({
      name: "Reward Prompt",
      id: "rewardPrompt",
      type: t.string(),
    });
    io.dataOutput({
      name: "Reward Cost",
      id: "rewardCost",
      type: t.string(),
    });
    io.dataOutput({
      name: "Background Color",
      id: "backgroundColor",
      type: t.string(),
    });
    io.dataOutput({
      name: "Enabled",
      id: "enabled",
      type: t.bool(),
    });
    io.dataOutput({
      name: "User Input Required",
      id: "userInputRequired",
      type: t.bool(),
    });
    io.dataOutput({
      name: "Max Redemptions Per Stream",
      id: "maxRedemptionsPerStream",
      type: t.int(),
    });
    io.dataOutput({
      name: "Max Redemptions Per User Per Stream",
      id: "maxRedemptionsPerUserPerStream",
      type: t.int(),
    });
    io.dataInput({
      name: "Global Cooldown",
      id: "globalCooldown",
      type: t.int(),
    });
    io.dataOutput({
      name: "Paused",
      id: "paused",
      type: t.bool(),
    });
    io.dataOutput({
      name: "in Stock",
      id: "stock",
      type: t.bool(),
    });
    io.dataOutput({
      name: "Skip Request Queue",
      id: "skipRequestQueue",
      type: t.bool(),
    });
    io.dataOutput({
      name: "Redemptions Current Stream",
      id: "redemptionsCurrentStream",
      type: t.int(),
    });
    io.dataOutput({
      name: "Cooldown Expires in",
      id: "cooldownExpire",
      type: t.string(),
    });
  },
  async run({ ctx }) {
    const u = user().unwrap();
    try {
      let data = await helix.channelPoints.updateCustomReward(
        u.id,
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
    const u = user().unwrap();
    const status = ctx.getInput<InferEnum<typeof RedemptionStatus>>("status");

    let data = await helix.channelPoints.updateRedemptionStatusByIds(
      u.id,
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
    const u = user().unwrap();
    let rewards = await helix.channelPoints.getCustomRewards(
      u.id,
      ctx.getInput("manageableOnly")
    );

    const data = rewards.find(
      (reward) => reward.title === ctx.getInput("title")
    );

    ctx.setOutput<Option<InferStruct<typeof Reward>>>(
      "out",
      Maybe(data).map((data) => ({
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
      }))
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
    const data = await helix.users.getUserById(ctx.getInput("userId"));

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
    const u = user().unwrap();
    return helix.channelPoints.deleteCustomReward(u.id, ctx.getInput("id"));
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
  run({ ctx }) {
    const u = user().unwrap();

    helix.chat.updateSettings(u.id, u.id, {
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
    const u = user().unwrap();

    helix.chat.updateSettings(u.id, u.id, {
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
    const u = user().unwrap();

    helix.chat.updateSettings(u.id, u.id, {
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
    const u = user().unwrap();

    helix.chat.updateSettings(u.id, u.id, {
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
    const u = user().unwrap();

    helix.chat.shoutoutUser(u.id, ctx.getInput("toId"), u.id);
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
    const u = user().unwrap();

    helix.chat.sendAnnouncement(u.id, u.id, ctx.getInput("announcement"));
  },
});
