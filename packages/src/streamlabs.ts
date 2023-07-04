import { Maybe, None, Option, core, t } from "@macrograph/core";
import { io } from "socket.io-client";
import { createRoot, createSignal } from "solid-js";

const pkg = core.createPackage({
  name: "Streamlabs",
});

const { setToken, Token, Connect, Disconnect, State, Socket } = createRoot(
  () => {
    const [State, setState] = createSignal<boolean>(false);
    const [Token, setToken] = createSignal<any>(
      Maybe(localStorage.getItem("streamlabsToken"))
    );

    let Socket = io(`https://sockets.streamlabs.com?token=${Token()}`, {
      transports: ["websocket"],
      autoConnect: false,
    });

    if (Token().value !== null) Socket.connect();

    const Connect = async (data: string) => {
      Socket = io(`https://sockets.streamlabs.com?token=${Token()}`, {
        transports: ["websocket"],
        autoConnect: false,
      });
      setState(true);
      Socket.connect();
      localStorage.setItem("streamlabsToken", data);
    };

    const Disconnect = async () => {
      setState(false);
      Socket.disconnect();
      localStorage.removeItem("streamlabsToken");
    };

    if (Socket.active) setState(true);

    Socket.on("event", (eventData: any) => {
      console.log(eventData);
      if (!eventData.for && eventData.type === "donation") {
        console.log(eventData.message[0]);
        pkg.emitEvent({ name: "SLDonation", data: eventData.message[0] });
      }
    });

    return {
      Token,
      Connect,
      Disconnect,
      State,
      Socket,
      setToken,
    };
  }
);

export { setToken, Token, Connect, Disconnect, State, Socket };

pkg.createEventSchema({
  name: "Streamlabs Donation",
  event: "SLDonation",
  generateIO: (io) => {
    io.execOutput({
      id: "exec",
    });
    io.dataOutput({
      name: "Name",
      id: "name",
      type: t.string(),
    });
    io.dataOutput({
      name: "Amount",
      id: "amount",
      type: t.string(),
    });
    io.dataOutput({
      name: "Message",
      id: "message",
      type: t.string(),
    });
    io.dataOutput({
      name: "Currency",
      id: "currency",
      type: t.string(),
    });
    io.dataOutput({
      name: "From",
      id: "from",
      type: t.string(),
    });
    io.dataOutput({
      name: "From User Id",
      id: "fromUserId",
      type: t.string(),
    });
  },
  run({ ctx, data }) {
    ctx.setOutput("name", data.name);
    ctx.setOutput("amount", data.amount);
    ctx.setOutput("message", data.message);
    ctx.setOutput("currency", data.currency);
    ctx.setOutput("from", data.from);
    ctx.setOutput("fromUserId", data.from_user_id);
    ctx.exec("exec");
  },
});
