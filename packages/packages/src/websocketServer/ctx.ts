import { OnEvent, WsProvider } from "@macrograph/runtime";
import { Maybe } from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";
import { ReactiveSet } from "@solid-primitives/set";

export const WS_PORTS_LOCALSTORAGE = "wsPorts";

export type ConnectionState = {
  connections: ReactiveSet<number>;
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
    const server = await ws.startServer(port, ([client, msg]) => {
      const websocketData = websockets.get(port);
      if (!websocketData) return;

      if (msg === "Connected") {
        websocketData.connections.add(client);
        onEvent({
          name: "WSSConnect",
          data: { client, port },
        });
      }
      else if (msg === "Disconnected") {
        websocketData.connections.delete(client);
        onEvent({
          name: "WSSDisconnect",
          data: { client, port },
        });
      }
      else
        onEvent({
          name: "wsEvent",
          data: { data: msg.Text, client, port: port },
        });
    });

    websockets.set(port, { connections: new ReactiveSet(), server });

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
