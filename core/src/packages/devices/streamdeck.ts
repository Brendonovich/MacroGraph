// import { core } from "../../models";
// import { types } from "../../types";
// import { WebSocketServer } from "ws";

// const pkg = core.createPackage({
//   name: "Streamdeck",
// });

// const PORT = 1337;

// const server = new WebSocketServer({
//   port: PORT,
// });

// interface StreamdeckWebsocketMessage {
//     action: "org.tynsoe.streamdeck.wsproxy.proxy";
//     context: string;
//     device: string;
//     event: "willAppear" | "willDisappear" | "keyDown" | "keyUp";
//     payload: {
//       coordinates: {
//         column: number;
//         row: number;
//       };
//       isInMultiAction: boolean;
//       settings: {
//         id: string;
//         remoteServer: string;
//       };
//     };
//   }
  
//   server.on("connection", (socket: any) => {
//     console.log("streamdeck connected");
//     socket.on("message", async (rawData: any) => {
//       const data = JSON.parse(rawData.toString()) as StreamdeckWebsocketMessage;
//         pkg.emitEvent({name: "streamDeck", data: data});
//     });
//   });

//   pkg.createEventSchema({
//     name: "Streamdeck",
//     event: "streamDeck",
//     generateIO(t){
//         t.execOutput({
//             id: "exec",
//             name: "",
//         });
//         t.dataInput({
//             id: "string",
//             name: "Button Name",
//             type: types.string(),
//         });
//     },
//     run({ctx, data}) {
//         if(data.payload.settings.id === ctx.getInput("string")) ctx.exec("exec");
//     }
//   })

// import { emit, listen } from '@tauri-apps/api/event'

// // listen to the `click` event and get a function to remove the event listener
// // there's also a `once` function that subscribes to an event and automatically unsubscribes the listener on the first event
// const unlisten = await listen('event-name', (event) => {
//     console.log(event)
//     // event.event is the event name (useful if you want to use a single callback fn for multiple event types)
//     // event.payload is the payload object
// })

