import { Maybe } from "@macrograph/core";
import { ReactiveMap } from "@solid-primitives/map";

export const WS_IPS_LOCALSTORAGE = "wsServers";

export function createCtx(callback: any) {
  const websockets = new ReactiveMap<string, WebSocket | null>();

  const connectWebsocket = (ip: string) => {
    let ws = new WebSocket(ip);
    websockets.set(ip, null);
    ws.onopen = () => {
      websockets.set(ip, ws);
      localStorage.setItem(
        WS_IPS_LOCALSTORAGE,
        JSON.stringify(Array.from(websockets.keys()))
      );
    };

    ws.onmessage = (event) => {
      callback({ ip, data: event.data });
    };
  };

  Maybe(localStorage.getItem(WS_IPS_LOCALSTORAGE))
    .map(JSON.parse)
    .map((sockets) => {
      sockets.forEach((key: string) => {
        connectWebsocket(key);
      });
    });

  const addWebsocket = (ip: string) => {
    websockets.set(ip, null);

    localStorage.setItem(
      WS_IPS_LOCALSTORAGE,
      JSON.stringify(Array.from(websockets.keys()))
    );
    connectWebsocket(ip);
  };

  const removeWebsocket = (ip: string) => {
    let ws = websockets.get(ip);
    websockets.delete(ip);
    ws?.close();
    localStorage.setItem(
      WS_IPS_LOCALSTORAGE,
      JSON.stringify(Array.from(websockets.keys()))
    );
  };

  return { websockets, addWebsocket, removeWebsocket };
}

export type Ctx = ReturnType<typeof createCtx>;
