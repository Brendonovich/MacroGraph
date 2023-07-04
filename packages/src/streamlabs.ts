import { Maybe, None, Option, core, t } from "@macrograph/core";
import { io } from "socket.io-client";
import { createRoot, createSignal } from "solid-js";

const pkg = core.createPackage({
  name: "Streamlabs",
});

const { setSLToken, slToken, slConnect, slDisconnect, slState, slSocket } =
  createRoot(() => {
    const [slState, setSLState] = createSignal<boolean>(false);
    const [slToken, setSLToken] = createSignal<any>(
      Maybe(localStorage.getItem("streamlabsToken"))
    );

    let slSocket = io(`https://sockets.streamlabs.com?token=${slToken()}`, {
      transports: ["websocket"],
      autoConnect: false,
    });

    if (slToken().value !== null) slSocket.connect();

    const slConnect = async (data: string) => {
      slSocket = io(`https://sockets.streamlabs.com?token=${slToken()}`, {
        transports: ["websocket"],
        autoConnect: false,
      });
      setSLState(true);
      slSocket.connect();
      localStorage.setItem("streamlabsToken", data);
    };

    const slDisconnect = async () => {
      setSLState(false);
      slSocket.disconnect();
      localStorage.removeItem("streamlabsToken");
    };

    if (slSocket.active) setSLState(true);

    slSocket.on("event", (eventData: any) => {
      console.log(eventData);
      if (!eventData.for && eventData.type === "donation") {
        console.log(eventData.message[0]);
        pkg.emitEvent({ name: "SLDonation", data: eventData.message[0] });
      }
    });

    return {
      slToken,
      slConnect,
      slDisconnect,
      slState,
      slSocket,
      setSLToken,
    };
  });

export { setSLToken, slToken, slConnect, slDisconnect, slState, slSocket };

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
