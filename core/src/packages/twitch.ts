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
            name: "Mod Who Banned",
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
        ctx.setOutput("modId", data.event.moderator_user_login);
        ctx.setOutput("bannedUserID", data.event.user_id);
        ctx.setOutput("bannedUserName", data.event.user_login);
        ctx.setOutput("reason", data.event.reason);
        ctx.setOutput("permanent", data.event.is_permanent);
        ctx.setOutput("ends", data.event.ends_at);
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
        t.dataInput({
            id: "channel",
            name: "Channel",
            type: types.string(),
        });
    },
    run({ ctx }) {
        Client.say(ctx.getInput<string>("channel").toLowerCase(), ctx.getInput("message"));
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

