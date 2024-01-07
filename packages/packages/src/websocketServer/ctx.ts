import { OnEvent, WsProvider } from "@macrograph/runtime";
import { Maybe } from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";

export const WS_PORTS_LOCALSTORAGE = "wsPorts";

export type ConnectionState = {
  hasConnection: boolean;
  server: any;
};

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx(ws: WsProvider<unknown>, onEvent: OnEvent) {
  const websockets = new ReactiveMap<number, ConnectionState>();

  Maybe(localStorage.getItem(WS_PORTS_LOCALSTORAGE))
    .map((v) => JSON.parse(v) as number[])
    .map((ports) => {
      ports.forEach((port: number) => {
        startServer(port);
      });
    });

  async function startServer(port: number) {
    const server = await ws.startServer(port, (msg) => {
      let websocketData = websockets.get(port);
      if (!websocketData) return;

      if (msg === "Connected")
        websockets.set(port, { ...websocketData, hasConnection: true });
      else if (msg === "Disconnected")
        websockets.set(port, { ...websocketData, hasConnection: false });
      else onEvent({ name: "wsEvent", data: { data: msg.Text, port: port } });
    });
    websockets.set(port, { hasConnection: false, server });

    localStorage.setItem(
      WS_PORTS_LOCALSTORAGE,
      JSON.stringify(Array.from(websockets.keys()))
    );
  }

  async function stopServer(port: number) {
    const websocketData = websockets.get(port);
    if (!websocketData) return;

    ws.stopServer(websocketData.server);
    websockets.delete(port);
  }

  return { startServer, websockets, stopServer };
}
