import { OnEvent, WsProvider } from "@macrograph/runtime";
import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { z } from "zod";

export const SDWS = "SDWS_PORT";

export type ConnectionState =
  | {
      type: "Stopped";
    }
  | { type: "Starting" }
  | {
      type: "Running";
      port: number;
      connected(): boolean;
      stop(): Promise<void>;
    };

/**
 * `createStore` wrapper that doesn't allow partial updates.
 * Makes using discriminated unions actually typesafe
 */
function createADTStore<T extends object>(init: T) {
  return createStore<T>(init) as [T, (arg: T | ((prev: T) => T)) => void];
}

export type Ctx = ReturnType<typeof createCtx>;

const COORDINATES = z.object({
  column: z.number(),
  row: z.number(),
});

const keyEvent = <TEvent extends string>(event: TEvent) =>
  z.object({
    event: z.literal(event),
    payload: z.object({
      coordinates: COORDINATES,
      isInMultiAction: z.boolean(),
      settings: z.object({
        id: z.string(),
        remoteServer: z.string(),
      }),
    }),
  });

const MESSAGE = z.discriminatedUnion("event", [
  keyEvent("keyDown"),
  keyEvent("keyUp"),
]);

export type Message = z.infer<typeof MESSAGE>;

export type Events = {
  [Event in Message["event"]]: Extract<Message, { event: Event }>["payload"];
};

export function createCtx(ws: WsProvider<unknown>, onEvent: OnEvent<Events>) {
  const [state, setState] = createADTStore<ConnectionState>({
    type: "Stopped",
  });

  async function startServer(port: number) {
    try {
      setState({ type: "Starting" });

      const [connectedClient, setConnectedClient] = createSignal<null | number>(
        null
      );
      localStorage.setItem(SDWS, port.toString());

      const server = await ws.startServer(port, ([client, msg]) => {
        if (msg === "Connected" && connectedClient() === null)
          setConnectedClient(client);
        else if (msg === "Disconnected" && client === connectedClient())
          setConnectedClient(null);
        else if (
          typeof msg === "object" &&
          "Text" in msg &&
          client === connectedClient()
        ) {
          const parsed = MESSAGE.parse(JSON.parse(msg.Text));

          onEvent({ name: parsed.event, data: parsed.payload });
        }
      });

      setState({
        type: "Running",
        port,
        connected: () => connectedClient() !== null,
        async stop() {
          await ws.stopServer(server);
          localStorage.removeItem(SDWS);
          setState({ type: "Stopped" });
        },
      });
    } catch {
      setState({ type: "Stopped" });
    }
  }

  if (localStorage.getItem(SDWS) !== null)
    startServer(Number(localStorage.getItem(SDWS)));

  return { state, startServer };
}
