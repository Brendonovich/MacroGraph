import { API_KEY } from "./APIKEY";
import { core } from "../models";
import { types } from "../types";
import  tmi  from "tmi.js";
import { StaticAuthProvider} from "@twurple/auth";
import { ApiClient } from "@twurple/api";

const clientId = "wg8e35ddq28vfzw2jmu6c661nqsjg2";
const accessToken = localStorage.getItem("TwitchAccessToken");

const authProvider = new StaticAuthProvider(clientId, accessToken);

const apiClient = new ApiClient({authProvider});

let userID = localStorage.getItem("AuthedUserId");
let username = localStorage.getItem("AuthedUserName");;

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
]

let sessionID = "";

const ws = new WebSocket(`wss://eventsub.wss.twitch.tv/ws`);

ws.addEventListener("open", data => {
    console.log(data);
});

ws.addEventListener("message", data => {
    let info = JSON.parse(data.data);
    console.log(info.metadata.message_type);
    console.log(info.payload);
    switch(info.metadata.message_type){
        case "session_welcome":
            sessionID = info.payload.session.id;
            SubTypes.forEach( data => {
                Subscriptions(data);
            })
        break;
        case "notification":
            console.log(info);
            pkg.emitEvent({name: info.payload.subscription.type, data: info.payload});
    }

});

const pkg = core.createPackage<any>({name: "Twitch Events"});

// pkg.createEventSchema({
//     name: " Follow",
//     event: "channel.follow",
//     generateIO: (t) => {
//         t.execOutput({
//             id: "user_name",
//             name: "User Name",
//         });
//     },
//     run({ctx, data}) {
//         console.log(data);
//     }
// })

pkg.createEventSchema({
    name: "Chat Message",
    event: "chatMessage",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "username",
            name: "Username",
            type: types.string(),
        });
        t.dataOutput({
            id: "message",
            name: "Message",
            type: types.string(),
        });
        t.dataOutput({
            id: "mod",
            name: "Moderator",
            type: types.bool(),
        });
        t.dataOutput({
            id: "sub",
            name: "Subscriber",
            type: types.bool(),
        });
        t.dataOutput({
            id: "vip",
            name: "VIP",
            type: types.bool(),
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("username", data.username);
        ctx.setOutput("message", data.message);
        ctx.setOutput("mod", data.tags.mod);
        ctx.setOutput("sub", data.tags.subscriber);
        ctx.setOutput("sub", data.tags.vip);
        ctx.exec("exec");
    }
});

pkg.createNonEventSchema({
    name: "Send Chat Message",
    variant: "Exec",
    generateIO: (t) => {
        t.dataInput({
            id: "message",
            name: "Message",
            type: types.string(),
        });
    },
    run({ ctx }) {
        Client.say( username , ctx.getInput("message"));
    }
});

pkg.createNonEventSchema({
    name: "Emote Only Mode",
    variant: "Exec",
    generateIO: (t) => {
        t.dataInput({
            id: "switch",
            name: "",
            type: types.bool(),
        });
    },
    run({ ctx }) {
        apiClient.chat.updateSettings(userID, userID, {emoteOnlyModeEnabled: ctx.getInput("switch")});
    } 
})

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
            id: "switch",
            name: "",
            type: types.bool(),
        });
    },
    run({ ctx }) {
        apiClient.chat.updateSettings(userID, userID, {followerOnlyModeEnabled: ctx.getInput("switch"), followerOnlyModeDelay: ctx.getInput("delay")});
    } 
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
            id: "switch",
            name: "",
            type: types.bool(),
        });
    },
    run({ ctx }) {
        apiClient.chat.updateSettings(userID, userID, {slowModeEnabled: ctx.getInput("switch"), slowModeDelay: ctx.getInput("delay")});
    } 
});

pkg.createNonEventSchema({
    name: "Sub Only Mode",
    variant: "Exec",
    generateIO: (t) => {
        t.dataInput({
            id: "switch",
            name: "",
            type: types.bool(),
        });
    },
    run({ ctx }) {
        apiClient.chat.updateSettings(userID, userID, {subscriberOnlyModeEnabled: ctx.getInput("switch")});
    } 
});

pkg.createNonEventSchema({
    name: "R9K Mode",
    variant: "Exec",
    generateIO: (t) => {
        t.dataInput({
            id: "switch",
            name: "",
            type: types.bool(),
        });
    },
    run({ ctx }) {
        apiClient.chat.updateSettings(userID, userID, {uniqueChatModeEnabled: ctx.getInput("switch")});
    } 
});

pkg.createNonEventSchema({
    name: "Shoutout User",
    variant: "Exec",
    generateIO: (t) => {
        t.dataInput({
            id: "switch",
            name: "",
            type: types.bool(),
        });
    },
    run({ ctx }) {
        apiClient.chat.updateSettings(userID, userID, {subscriberOnlyModeEnabled: ctx.getInput("switch")});
    } 
});

pkg.createEventSchema({
    name: "User Banned",
    event: "channel.ban",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "channelId",
            name: "Channel ID",
            type: types.string()
        });
        t.dataOutput({
            id: "channelName",
            name: "Channel Name",
            type: types.string()
        });
        t.dataOutput({
            id: "modId",
            name: "Mod Who Banned ID",
            type: types.string()
        });
        t.dataOutput({
            id: "modName",
            name: "Mod Who Banned Name",
            type: types.string()
        });
        t.dataOutput({
            id: "bannedUserID",
            name: "Banned User ID",
            type: types.string()
        });
        t.dataOutput({
            id: "bannedUserName",
            name: "Banned Username",
            type: types.string()
        });
        t.dataOutput({
            id: "reason",
            name: "Ban Reason",
            type: types.string()
        });
        t.dataOutput({
            id: "permanent",
            name: "Perma Ban",
            type: types.bool()
        });
        t.dataOutput({
            id: "ends",
            name: "End Time",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("channelId", data.event.broadcaster_user_id);
        ctx.setOutput("channelName", data.event.broadcaster_user_login);
        ctx.setOutput("modId", data.event.moderator_user_id);
        ctx.setOutput("modName", data.event.moderator_user_login);
        ctx.setOutput("bannedUserID", data.event.user_id);
        ctx.setOutput("bannedUserName", data.event.user_login);
        ctx.setOutput("reason", data.event.reason);
        ctx.setOutput("permanent", data.event.is_permanent);
        ctx.setOutput("ends", data.event.ends_at);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "User Unbanned",
    event: "channel.unban",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "userId",
            name: "userID",
            type: types.string()
        });
        t.dataOutput({
            id: "userLogin",
            name: "Username",
            type: types.string()
        });
        t.dataOutput({
            id: "modName",
            name: "Mod Who unbanned name",
            type: types.string()
        });
        t.dataOutput({
            id: "modId",
            name: "Mod Who unbanned Id",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("userId", data.event.from_broadcaster_user_id);
        ctx.setOutput("userLogin", data.event.from_broadcaster_user_login);
        ctx.setOutput("modName", data.event.moderator_user_login);
        ctx.setOutput("modId", data.event.moderator_user_id);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Moderator Add",
    event: "channel.moderator.add",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "userId",
            name: "userID",
            type: types.string()
        });
        t.dataOutput({
            id: "userLogin",
            name: "Username",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("userId", data.event.user_id);
        ctx.setOutput("userLogin", data.event.user_login);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Moderator Remove",
    event: "channel.moderator.remove",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "userId",
            name: "userID",
            type: types.string()
        });
        t.dataOutput({
            id: "userLogin",
            name: "Username",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("userId", data.event.user_id);
        ctx.setOutput("userLogin", data.event.user_login);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Point Reward Add",
    event: "channel.channel_points_custom_reward.add",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "id",
            name: "ID",
            type: types.string()
        });
        t.dataOutput({
            id: "enabled",
            name: "Enabled",
            type: types.bool()
        });
        t.dataOutput({
            id: "paused",
            name: "Paused",
            type: types.bool()
        });
        t.dataOutput({
            id: "inStock",
            name: "In Stock",
            type: types.bool()
        });
        t.dataOutput({
            id: "title",
            name: "Title",
            type: types.string()
        });
        t.dataOutput({
            id: "cost",
            name: "Cost",
            type: types.int()
        });
        t.dataOutput({
            id: "prompt",
            name: "Prompt",
            type: types.string()
        });
        t.dataOutput({
            id: "inputRequired",
            name: "Input Required",
            type: types.bool()
        });
        t.dataOutput({
            id: "skipQueue",
            name: "Skip Request Queue",
            type: types.bool()
        });
        t.dataOutput({
            id: "cooldownExpire",
            name: "Cooldown Expire Timestamp",
            type: types.string()
        });
        t.dataOutput({
            id: "redemptTotalStream",
            name: "Current Stream Total Redemptions",
            type: types.int()
        });
        t.dataOutput({
            id: "maxPerStreamEnabled",
            name: "Max per Stream",
            type: types.bool()
        });
        t.dataOutput({
            id: "maxPerStreamValue",
            name: "Max Per Stream Value",
            type: types.int()
        });
        t.dataOutput({
            id: "maxUserPerStream",
            name: "Max User Per Stream Enabled",
            type: types.bool()
        });
        t.dataOutput({
            id: "maxUserPerStreamValue",
            name: "Max User Per Stream Value",
            type: types.int()
        });
        t.dataOutput({
            id: "globalCooldown",
            name: "Global Cooldown",
            type: types.bool()
        });
        t.dataOutput({
            id: "globalCooldownValue",
            name: "Global Cooldown Value",
            type: types.int()
        });
        t.dataOutput({
            id: "backgroundColor",
            name: "Background Color",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("id", data.event.id);
        ctx.setOutput("enabled", data.event.is_enabled);
        ctx.setOutput("paused", data.event.is_paused);
        ctx.setOutput("inStock", data.event.is_in_stock);
        ctx.setOutput("title", data.event.title);
        ctx.setOutput("cost", data.event.cost);
        ctx.setOutput("prompt", data.event.prompt);
        ctx.setOutput("inputRequired", data.event.is_user_input_required);
        ctx.setOutput("skipQueue", data.event.should_redemptions_skip_request_queue);
        ctx.setOutput("cooldownExpire", data.event.cooldown_expires_at);
        ctx.setOutput("redemptTotalStream", data.event.redemptions_redeemed_current_stream);
        ctx.setOutput("maxPerStreamEnabled", data.event.max_per_stream.is_enabled);
        ctx.setOutput("maxPerStreamValue", data.event.max_per_stream.value);
        ctx.setOutput("maxUserPerStream", data.event.max_per_user_per_stream.is_enabled);
        ctx.setOutput("maxUserPerStreamValue", data.event.max_per_user_per_stream.value);
        ctx.setOutput("globalCooldown", data.event.global_cooldown.is_enabled);
        ctx.setOutput("globalCooldownValue", data.event.global_cooldown.seconds);
        ctx.setOutput("backgroundColor", data.event.background_color);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Point Reward Updated",
    event: "channel.channel_points_custom_reward.update",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "id",
            name: "ID",
            type: types.string()
        });
        t.dataOutput({
            id: "enabled",
            name: "Enabled",
            type: types.bool()
        });
        t.dataOutput({
            id: "paused",
            name: "Paused",
            type: types.bool()
        });
        t.dataOutput({
            id: "inStock",
            name: "In Stock",
            type: types.bool()
        });
        t.dataOutput({
            id: "title",
            name: "Title",
            type: types.string()
        });
        t.dataOutput({
            id: "cost",
            name: "Cost",
            type: types.int()
        });
        t.dataOutput({
            id: "prompt",
            name: "Prompt",
            type: types.string()
        });
        t.dataOutput({
            id: "inputRequired",
            name: "Input Required",
            type: types.bool()
        });
        t.dataOutput({
            id: "skipQueue",
            name: "Skip Request Queue",
            type: types.bool()
        });
        t.dataOutput({
            id: "cooldownExpire",
            name: "Cooldown Expire Timestamp",
            type: types.string()
        });
        t.dataOutput({
            id: "redemptTotalStream",
            name: "Current Stream Total Redemptions",
            type: types.int()
        });
        t.dataOutput({
            id: "maxPerStreamEnabled",
            name: "Max per Stream",
            type: types.bool()
        });
        t.dataOutput({
            id: "maxPerStreamValue",
            name: "Max Per Stream Value",
            type: types.int()
        });
        t.dataOutput({
            id: "maxUserPerStream",
            name: "Max User Per Stream Enabled",
            type: types.bool()
        });
        t.dataOutput({
            id: "maxUserPerStreamValue",
            name: "Max User Per Stream Value",
            type: types.int()
        });
        t.dataOutput({
            id: "globalCooldown",
            name: "Global Cooldown",
            type: types.bool()
        });
        t.dataOutput({
            id: "globalCooldownValue",
            name: "Global Cooldown Value",
            type: types.int()
        });
        t.dataOutput({
            id: "backgroundColor",
            name: "Background Color",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("id", data.event.id);
        ctx.setOutput("enabled", data.event.is_enabled);
        ctx.setOutput("paused", data.event.is_paused);
        ctx.setOutput("inStock", data.event.is_in_stock);
        ctx.setOutput("title", data.event.title);
        ctx.setOutput("cost", data.event.cost);
        ctx.setOutput("prompt", data.event.prompt);
        ctx.setOutput("inputRequired", data.event.is_user_input_required);
        ctx.setOutput("skipQueue", data.event.should_redemptions_skip_request_queue);
        ctx.setOutput("cooldownExpire", data.event.cooldown_expires_at);
        ctx.setOutput("redemptTotalStream", data.event.redemptions_redeemed_current_stream);
        ctx.setOutput("maxPerStreamEnabled", data.event.max_per_stream.is_enabled);
        ctx.setOutput("maxPerStreamValue", data.event.max_per_stream.value);
        ctx.setOutput("maxUserPerStream", data.event.max_per_user_per_stream.is_enabled);
        ctx.setOutput("maxUserPerStreamValue", data.event.max_per_user_per_stream.value);
        ctx.setOutput("globalCooldown", data.event.global_cooldown.is_enabled);
        ctx.setOutput("globalCooldownValue", data.event.global_cooldown.seconds);
        ctx.setOutput("backgroundColor", data.event.background_color);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Point Reward Remove",
    event: "channel.channel_points_custom_reward.remove",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "id",
            name: "ID",
            type: types.string()
        });
        t.dataOutput({
            id: "enabled",
            name: "Enabled",
            type: types.bool()
        });
        t.dataOutput({
            id: "paused",
            name: "Paused",
            type: types.bool()
        });
        t.dataOutput({
            id: "inStock",
            name: "In Stock",
            type: types.bool()
        });
        t.dataOutput({
            id: "title",
            name: "Title",
            type: types.string()
        });
        t.dataOutput({
            id: "cost",
            name: "Cost",
            type: types.int()
        });
        t.dataOutput({
            id: "prompt",
            name: "Prompt",
            type: types.string()
        });
        t.dataOutput({
            id: "inputRequired",
            name: "Input Required",
            type: types.bool()
        });
        t.dataOutput({
            id: "skipQueue",
            name: "Skip Request Queue",
            type: types.bool()
        });
        t.dataOutput({
            id: "cooldownExpire",
            name: "Cooldown Expire Timestamp",
            type: types.string()
        });
        t.dataOutput({
            id: "redemptTotalStream",
            name: "Current Stream Total Redemptions",
            type: types.int()
        });
        t.dataOutput({
            id: "maxPerStreamEnabled",
            name: "Max per Stream",
            type: types.bool()
        });
        t.dataOutput({
            id: "maxPerStreamValue",
            name: "Max Per Stream Value",
            type: types.int()
        });
        t.dataOutput({
            id: "maxUserPerStream",
            name: "Max User Per Stream Enabled",
            type: types.bool()
        });
        t.dataOutput({
            id: "maxUserPerStreamValue",
            name: "Max User Per Stream Value",
            type: types.int()
        });
        t.dataOutput({
            id: "globalCooldown",
            name: "Global Cooldown",
            type: types.bool()
        });
        t.dataOutput({
            id: "globalCooldownValue",
            name: "Global Cooldown Value",
            type: types.int()
        });
        t.dataOutput({
            id: "backgroundColor",
            name: "Background Color",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("id", data.event.id);
        ctx.setOutput("enabled", data.event.is_enabled);
        ctx.setOutput("paused", data.event.is_paused);
        ctx.setOutput("inStock", data.event.is_in_stock);
        ctx.setOutput("title", data.event.title);
        ctx.setOutput("cost", data.event.cost);
        ctx.setOutput("prompt", data.event.prompt);
        ctx.setOutput("inputRequired", data.event.is_user_input_required);
        ctx.setOutput("skipQueue", data.event.should_redemptions_skip_request_queue);
        ctx.setOutput("cooldownExpire", data.event.cooldown_expires_at);
        ctx.setOutput("redemptTotalStream", data.event.redemptions_redeemed_current_stream);
        ctx.setOutput("maxPerStreamEnabled", data.event.max_per_stream.is_enabled);
        ctx.setOutput("maxPerStreamValue", data.event.max_per_stream.value);
        ctx.setOutput("maxUserPerStream", data.event.max_per_user_per_stream.is_enabled);
        ctx.setOutput("maxUserPerStreamValue", data.event.max_per_user_per_stream.value);
        ctx.setOutput("globalCooldown", data.event.global_cooldown.is_enabled);
        ctx.setOutput("globalCooldownValue", data.event.global_cooldown.seconds);
        ctx.setOutput("backgroundColor", data.event.background_color);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Point Reward Redeemed",
    event: "channel.channel_points_custom_reward_redemption.add",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "id",
            name: "ID",
            type: types.string()
        });
        t.dataOutput({
            id: "userId",
            name: "User ID",
            type: types.string()
        });
        t.dataOutput({
            id: "userLogin",
            name: "User Login",
            type: types.string()
        });
        t.dataOutput({
            id: "userName",
            name: "User Name",
            type: types.string()
        });
        t.dataOutput({
            id: "userInput",
            name: "User Input",
            type: types.string()
        });
        t.dataOutput({
            id: "status",
            name: "Status",
            type: types.string()
        });
        t.dataOutput({
            id: "rewardId",
            name: "Rewards Id",
            type: types.string()
        });
        t.dataOutput({
            id: "rewardTitle",
            name: "Reward Title",
            type: types.string()
        });
        t.dataOutput({
            id: "rewardCost",
            name: "Reward Cost",
            type: types.int()
        });
        t.dataOutput({
            id: "rewardPrompt",
            name: "Reward Prompt",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
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
    }
});

pkg.createEventSchema({
    name: "Channel Point Reward Redeemed",
    event: "channel.channel_points_custom_reward_redemption.add",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "id",
            name: "ID",
            type: types.string()
        });
        t.dataOutput({
            id: "userId",
            name: "User ID",
            type: types.string()
        });
        t.dataOutput({
            id: "userLogin",
            name: "User Login",
            type: types.string()
        });
        t.dataOutput({
            id: "userName",
            name: "User Name",
            type: types.string()
        });
        t.dataOutput({
            id: "userInput",
            name: "User Input",
            type: types.string()
        });
        t.dataOutput({
            id: "status",
            name: "Status",
            type: types.string()
        });
        t.dataOutput({
            id: "rewardId",
            name: "Rewards Id",
            type: types.string()
        });
        t.dataOutput({
            id: "rewardTitle",
            name: "Reward Title",
            type: types.string()
        });
        t.dataOutput({
            id: "rewardCost",
            name: "Reward Cost",
            type: types.int()
        });
        t.dataOutput({
            id: "rewardPrompt",
            name: "Reward Prompt",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
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
    }
});

pkg.createEventSchema({
    name: "Channel Poll Begin",
    event: "channel.poll.begin",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });

    },
    run({ ctx, data}) {
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Poll Progress",
    event: "channel.poll.progress",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
    },
    run({ ctx, data}) {
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Poll End",
    event: "channel.poll.end",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
    },
    run({ ctx, data}) {
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Prediction Begin",
    event: "channel.prediction.begin",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
    },
    run({ ctx, data}) {
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Prediction Progress",
    event: "channel.prediction.progress",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
    },
    run({ ctx, data}) {
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Prediction Lock",
    event: "channel.prediction.lock",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
    },
    run({ ctx, data}) {
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Prediction End",
    event: "channel.prediction.end",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
    },
    run({ ctx, data}) {
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Hype Train Begin",
    event: "channel.hype_train.begin",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
    },
    run({ ctx, data}) {
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Hype Train Progress",
    event: "channel.hype_train.progress",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
    },
    run({ ctx, data}) {
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Hype Train End",
    event: "channel.hype_train.end",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
    },
    run({ ctx, data}) {
        ctx.exec("exec");
    }
});


pkg.createEventSchema({
    name: "Channel Updated",
    event: "channel.update",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "channelId",
            name: "Channel ID",
            type: types.string()
        });
        t.dataOutput({
            id: "channelName",
            name: "Channel Name",
            type: types.string()
        });
        t.dataOutput({
            id: "title",
            name: "Title",
            type: types.string()
        });
        t.dataOutput({
            id: "categoryId",
            name: "Category Id",
            type: types.string()
        });
        t.dataOutput({
            id: "categoryName",
            name: "Category Name",
            type: types.string()
        });
        t.dataOutput({
            id: "mature",
            name: "Mature",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("channelId", data.event.broadcaster_user_id);
        ctx.setOutput("channelName", data.event.broadcaster_user_login);
        ctx.setOutput("title", data.event.title);
        ctx.setOutput("categoryId", data.event.category_id);
        ctx.setOutput("categoryName", data.event.category_name);
        ctx.setOutput("mature", data.event.is_mature);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Subscribe",
    event: "channel.subscribe",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "userId",
            name: "userID",
            type: types.string()
        });
        t.dataOutput({
            id: "userLogin",
            name: "Username",
            type: types.string()
        });
        t.dataOutput({
            id: "tier",
            name: "Tier",
            type: types.string()
        });
        t.dataOutput({
            id: "isGift",
            name: "Gifted",
            type: types.bool()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("userId", data.event.user_id);
        ctx.setOutput("userLogin", data.event.user_login);
        ctx.setOutput("tier", data.event.tier);
        ctx.setOutput("isGift", data.event.is_gift);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Subscribe End",
    event: "channel.subscription.end",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "userId",
            name: "userID",
            type: types.string()
        });
        t.dataOutput({
            id: "userLogin",
            name: "Username",
            type: types.string()
        });
        t.dataOutput({
            id: "tier",
            name: "Tier",
            type: types.string()
        });
        t.dataOutput({
            id: "isGift",
            name: "Gifted",
            type: types.bool()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("userId", data.event.user_id);
        ctx.setOutput("userLogin", data.event.user_login);
        ctx.setOutput("tier", data.event.tier);
        ctx.setOutput("isGift", data.event.is_gift);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Subscription Gift",
    event: "channel.subscription.gift",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "userId",
            name: "userID",
            type: types.string()
        });
        t.dataOutput({
            id: "userLogin",
            name: "Username",
            type: types.string()
        });
        t.dataOutput({
            id: "tier",
            name: "Tier",
            type: types.string()
        });
        t.dataOutput({
            id: "total",
            name: "Total",
            type: types.int()
        });
        t.dataOutput({
            id: "cumulative",
            name: "Cumulative Total",
            type: types.int()
        });
        t.dataOutput({
            id: "anonymous",
            name: "Anonymous",
            type: types.bool()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("userId", data.event.user_id);
        ctx.setOutput("userLogin", data.event.user_login);
        ctx.setOutput("tier", data.event.tier);
        ctx.setOutput("total", data.event.total);
        ctx.setOutput("cumulative", data.event.cumulative_total);
        ctx.setOutput("anonymous", data.event.is_anonymous);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Subscription Message",
    event: "channel.subscription.message",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "userId",
            name: "userID",
            type: types.string()
        });
        t.dataOutput({
            id: "userLogin",
            name: "Username",
            type: types.string()
        });
        t.dataOutput({
            id: "tier",
            name: "Tier",
            type: types.string()
        });
        t.dataOutput({
            id: "message",
            name: "Message",
            type: types.string()
        });
        t.dataOutput({
            id: "streak",
            name: "Streak Months",
            type: types.int()
        });
        t.dataOutput({
            id: "cumulative",
            name: "Cumulative Months",
            type: types.int()
        });
        t.dataOutput({
            id: "duration",
            name: "Duration Months",
            type: types.bool()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("userId", data.event.user_id);
        ctx.setOutput("userLogin", data.event.user_login);
        ctx.setOutput("tier", data.event.tier);
        ctx.setOutput("message", data.event.message.text);
        ctx.setOutput("cumulative", data.event.cumulative_months);
        ctx.setOutput("streak", data.event.streak_months);
        ctx.setOutput("duration", data.event.duration_months);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Cheers",
    event: "channel.cheer",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "userId",
            name: "userID",
            type: types.string()
        });
        t.dataOutput({
            id: "userLogin",
            name: "Username",
            type: types.string()
        });
        t.dataOutput({
            id: "anonymous",
            name: "Anonymous",
            type: types.bool()
        });
        t.dataOutput({
            id: "message",
            name: "Message",
            type: types.string()
        });
        t.dataOutput({
            id: "bits",
            name: "Bits",
            type: types.int()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("userId", data.event.user_id);
        ctx.setOutput("userLogin", data.event.user_login);
        ctx.setOutput("anonymous", data.event.is_anonymous);
        ctx.setOutput("message", data.event.message.text);
        ctx.setOutput("bits", data.event.bits);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Raid",
    event: "channel.raid",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "userId",
            name: "userID",
            type: types.string()
        });
        t.dataOutput({
            id: "userLogin",
            name: "Username",
            type: types.string()
        });
        t.dataOutput({
            id: "viewers",
            name: "Viewers",
            type: types.int()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("userId", data.event.from_broadcaster_user_id);
        ctx.setOutput("userLogin", data.event.from_broadcaster_user_login);
        ctx.setOutput("viewers", data.event.viewers);
        ctx.exec("exec");
    }
});



pkg.createEventSchema({
    name: "User Followed",
    event: "channel.follow",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "userID",
            name: "User ID",
            type: types.string()
        });
        t.dataOutput({
            id: "userName",
            name: "Username",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("userID", data.event.user_id);
        ctx.setOutput("userName", data.event.user_login);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Shoutout Received",
    event: "channel.shoutout.receive",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "viewerCount",
            name: "Type",
            type: types.int()
        });
        t.dataOutput({
            id: "startedAt",
            name: "Started At",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("id", data.event.id);
        ctx.setOutput("viewerCount", data.event.viewer_count);
        ctx.setOutput("startedAt", data.event.started_at);

        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Goal Begin",
    event: "channel.goal.begin",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "id",
            name: "Id",
            type: types.string()
        });
        t.dataOutput({
            id: "type",
            name: "Type",
            type: types.string()
        });
        t.dataOutput({
            id: "description",
            name: "Description",
            type: types.string()
        });
        t.dataOutput({
            id: "currentAmount",
            name: "Current Amount",
            type: types.int()
        });
        t.dataOutput({
            id: "targetAmount",
            name: "Target Amount",
            type: types.int()
        });
        t.dataOutput({
            id: "startedAt",
            name: "Started At",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("id", data.event.id);
        ctx.setOutput("type", data.event.type);
        ctx.setOutput("description", data.event.description);
        ctx.setOutput("currentAmount", data.event.current_amount);
        ctx.setOutput("targetAmount", data.event.target_amount);
        ctx.setOutput("startedAt", data.event.started_at);

        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Goal Progress",
    event: "channel.goal.progress",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "id",
            name: "Id",
            type: types.string()
        });
        t.dataOutput({
            id: "type",
            name: "Type",
            type: types.string()
        });
        t.dataOutput({
            id: "description",
            name: "Description",
            type: types.string()
        });
        t.dataOutput({
            id: "currentAmount",
            name: "Current Amount",
            type: types.int()
        });
        t.dataOutput({
            id: "targetAmount",
            name: "Target Amount",
            type: types.int()
        });
        t.dataOutput({
            id: "startedAt",
            name: "Started At",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("id", data.event.id);
        ctx.setOutput("type", data.event.type);
        ctx.setOutput("description", data.event.description);
        ctx.setOutput("currentAmount", data.event.current_amount);
        ctx.setOutput("targetAmount", data.event.target_amount);
        ctx.setOutput("startedAt", data.event.started_at);

        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Channel Goal End",
    event: "channel.goal.end",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "id",
            name: "Id",
            type: types.string()
        });
        t.dataOutput({
            id: "type",
            name: "Type",
            type: types.string()
        });
        t.dataOutput({
            id: "description",
            name: "Description",
            type: types.string()
        });
        t.dataOutput({
            id: "isAchieved",
            name: "Is Achieved",
            type: types.bool()
        });
        t.dataOutput({
            id: "currentAmount",
            name: "Current Amount",
            type: types.int()
        });
        t.dataOutput({
            id: "targetAmount",
            name: "Target Amount",
            type: types.int()
        });
        t.dataOutput({
            id: "startedAt",
            name: "Started At",
            type: types.string()
        });
        t.dataOutput({
            id: "endedAt",
            name: "Ended At",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("id", data.event.id);
        ctx.setOutput("type", data.event.type);
        ctx.setOutput("description", data.event.description);
        ctx.setOutput("isAchieved", data.event.is_achieved);
        ctx.setOutput("currentAmount", data.event.current_amount);
        ctx.setOutput("targetAmount", data.event.target_amount);
        ctx.setOutput("startedAt", data.event.started_at);
        ctx.setOutput("endedAt", data.event.ended_at);

        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Stream Online",
    event: "stream.online",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
        t.dataOutput({
            id: "id",
            name: "Id",
            type: types.string()
        });
        t.dataOutput({
            id: "type",
            name: "Type",
            type: types.string()
        });
        t.dataOutput({
            id: "startedAt",
            name: "Started At",
            type: types.string()
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.setOutput("id", data.event.id);
        ctx.setOutput("type", data.event.type);
        ctx.setOutput("startedAt", data.event.started_at);
        ctx.exec("exec");
    }
});

pkg.createEventSchema({
    name: "Stream Offline",
    event: "stream.offline",
    generateIO: (t) => {
        t.execOutput({
            id: "exec",
            name: "",
        });
    },
    run({ ctx, data}) {
        console.log(data);
        ctx.exec("exec");
    }
});

const Client = tmi.Client({
    channels: [ username ],
    identity: {
        username: username,
        password: localStorage.getItem("TwitchAccessToken")
    }
});

Client.connect();

Client.on("connected", (data) => {
    console.log("connected");
})

Client.on("message", (channel, tags, message, self) => {
    console.log(tags.username);
    console.log(tags);
    const data = {message, tags};
    pkg.emitEvent({ name: "chatMessage", data})
})


function Subscriptions(subscription: string){
    let WSdata = {
        "type": subscription,
        "version": "1",
        "condition": {
            "from_broadcaster_user_id": userID,
            "broadcaster_user_id": userID,
            "moderator_user_id": userID,
        },
        "transport": {
            "method": "websocket",
            "session_id": sessionID,
        }
    }
    if(subscription == "channel.follow"){
        WSdata.version = "2";
    }
    fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + accessToken,
            "Client-Id": clientId,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(WSdata),
    }).then(res => res.json())
        .then(res => {
        console.log(res);
    })
};

