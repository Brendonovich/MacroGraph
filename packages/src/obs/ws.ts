import { createSignal, createRoot } from "solid-js";
import OBS, { EventSubscription } from "obs-websocket-js";
import { z } from "zod";
import { Maybe } from "@macrograph/core";

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

    await obs.connect(url, password, {
      eventSubscriptions:
        EventSubscription.All |
        EventSubscription.SceneItemTransformChanged |
        EventSubscription.InputActiveStateChanged |
        EventSubscription.InputShowStateChanged,
    });

    localStorage.setItem(OBS_WS, JSON.stringify({ url, password }));

    setState("connected");
  };

  obs.on("ConnectionClosed", () => setState("disconnected"));
  obs.on("ConnectionError", () => setState("disconnected"));

  Maybe(localStorage.getItem(OBS_WS)).mapAsync(async (jstr) => {
    const { url, password } = SCHEMA.parse(JSON.parse(jstr));

    try {
      await connect(url, password);
    } catch {
      localStorage.removeItem(OBS_WS);
    }
  });

  return { connect, disconnect, state };
});

export { connect, disconnect, state };
