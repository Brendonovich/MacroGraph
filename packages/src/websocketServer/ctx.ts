import { Maybe, OnEvent } from "@macrograph/core";
import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { ReactiveMap } from "@solid-primitives/map";

export const WS_PORTS_LOCALSTORAGE = "wsPorts";

export type ConnectionState = {
  client_count: number;
  server: any;
};

/**
 * `createStore` wrapper that doesn't allow partial updates.
 * Makes using discriminated unions actually typesafe
 */
function createADTStore<T extends object>(init: T) {
  return createStore<T>(init) as [T, (arg: T | ((prev: T) => T)) => void];
}

export type WsMessage = "Connected" | "Disconnected" | { Text: string };

export interface WsProvider<TServer> {
  startServer(port: number, cb: (text: WsMessage) => void): Promise<TServer>;
  stopServer(server: TServer): Promise<void>;
  sendMessage(data: { data: string; port: number }): Promise<null>;
}

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx(ws: WsProvider<unknown>, onEvent: OnEvent) {
  const websockets = new ReactiveMap<number, ConnectionState>();

  Maybe(localStorage.getItem(WS_PORTS_LOCALSTORAGE))
    .map(JSON.parse)
    .map((ports) => {
      ports.forEach((port: number) => {
        startServer(port);
      });
    });

  async function startServer(port: number) {
    try {
      localStorage.setItem(
        WS_PORTS_LOCALSTORAGE,
        JSON.stringify(Array.from(websockets.keys()))
      );

      const server = await ws.startServer(port, (msg) => {
        let websocketData = websockets.get(port);
        if (!websocketData) {
          console.log("murder?");
          return;
        }
        if (msg === "Connected") {
          websocketData.client_count++;
          websockets.set(port, websocketData);
          console.log("Connected");
        } else if (msg === "Disconnected") {
          websocketData.client_count--;
          websockets.set(port, websocketData);
        } else {
          onEvent({ name: "wsEvent", data: { data: msg.Text, port: port } });
        }
        console.log(msg);
      });
      websockets.set(port, { client_count: 0, server });
    } catch {
      console.log("murder2?");
      websockets.delete(port);
    }
  }

  async function stopServer(port: number) {
    const websocketData = websockets.get(port);
    if (websocketData) {
      ws.stopServer(websocketData.server);
      websockets.delete(port);
    }
  }

  return { startServer, websockets, stopServer };
}
