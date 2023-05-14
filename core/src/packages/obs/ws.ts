import { createSignal, createRoot } from "solid-js";
import OBS from "obs-websocket-js";
import { z } from "zod";
import { map } from "../../utils";

export const obs = new OBS();

const OBS_WS = "obsWs";

export const SCHEMA = z.object({
  url: z.string(),
  password: z.string().optional(),
});

const { connect, disconnect, state } = createRoot(() => {
  const [state, setState] = createSignal<
    "disconnected" | "connecting" | "connected"
  >("disconnected");

  const disconnect = async () => {
    setState("disconnected");
    await obs.disconnect();
  };

  const connect = async (url: string, password?: string) => {
    await disconnect();

    await obs.connect(url, password);

    localStorage.setItem(OBS_WS, JSON.stringify({ url, password }));

    setState("connected");
  };

  obs.on("ConnectionClosed", () => setState("disconnected"));
  obs.on("ConnectionError", () => setState("disconnected"));

  map(localStorage.getItem(OBS_WS), (jstr) => {
    const { url, password } = SCHEMA.parse(JSON.parse(jstr));

    connect(url, password);
  });

  return { connect, disconnect, state };
});

export { connect, disconnect, state };
