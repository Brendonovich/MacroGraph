import { API_KEY } from "./APIKEY";
import { core } from "../models";
import { types } from "../types";
import  tmi  from "tmi.js";

const pkg = core.createPackage<any>({name: "Twitch Events"});

// // const ws = new WebSocket(`wss://api.eventsocket.brendonovich.dev/socket?api_key=${API_KEY}`);

// ws.addEventListener("open", data => {
//     console.log(data);
// });

// ws.addEventListener("message", data => {
//     console.log(data.data);
//     // if(data.data.metadata.message_type === "notification"){
//     //     pkg.emitEvent({name: data.data.metadata.subscription_type, data: data.data.payload});
//     // }
// });

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
        console.log("data");
        ctx.setOutput("username", data.tags.username);
        ctx.setOutput("message", data.message);
        ctx.setOutput("mod", data.tags.mod);
        ctx.setOutput("sub", data.tags.subscriber);
        ctx.setOutput("sub", data.tags.vip);
        ctx.exec("exec");
    }
})

const Client = tmi.Client({
    channels: [ "jdudetv"]
})

Client.connect();

Client.on("message", (channel, tags, message, self) => {
    console.log(tags.username);
    console.log(tags);
    const data = {message, tags};
    pkg.emitEvent({ name: "chatMessage", data})
})

