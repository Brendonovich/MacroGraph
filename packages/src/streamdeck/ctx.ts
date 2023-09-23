import { OnEvent } from "@macrograph/core";
import { createStore } from "solid-js/store";
import { z } from "zod";

export type ConnectionState =
  | {
      type: "Stopped";
    }
  | { type: "Starting" }
  | { type: "Running"; port: number; connected: boolean };

/**
 * `createStore` wrapper that doesn't allow partial updates.
 * Makes using discriminated unions actually typesafe
 */
function createADTStore<T extends object>(init: T) {
  return createStore<T>(init) as [T, (arg: T | ((prev: T) => T)) => void];
}

export interface WsProvider {
  startServer(port: number, cb: (text: string) => void): Promise<void>;
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

export function createCtx(ws: WsProvider, onEvent: OnEvent<Events>) {
  const [state, setState] = createADTStore<ConnectionState>({
    type: "Stopped",
  });

  async function startServer(port: number) {
    try {
      setState({
        type: "Starting",
      });

      await ws.startServer(port, (msg) => {
        const parsed = MESSAGE.parse(JSON.parse(msg));

        onEvent({ name: parsed.event, data: parsed.payload });
      });

      setState({ type: "Running", port, connected: false });
    } catch {
      setState({ type: "Stopped" });
    }
  }

  return { state, startServer };
}
