import { createStore } from "solid-js/store";

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

export function createCtx(ws: WsProvider) {
  const [state, setState] = createADTStore<ConnectionState>({
    type: "Stopped",
  });

  async function startServer(port: number) {
    try {
      setState({
        type: "Starting",
      });

      await ws.startServer(port, (msg) => console.log(JSON.parse(msg)));

      setState({ type: "Running", port, connected: false });
    } catch {
      setState({ type: "Stopped" });
    }
  }

  return { state, startServer };
}
