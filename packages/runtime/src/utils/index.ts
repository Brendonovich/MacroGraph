export * from "./pins";

export type XY = { x: number; y: number };
export type Size = { width: number; height: number };

export const map = <I, O>(value: I | null, cb: (v: I) => O): O | null => {
  if (value === null) return null;
  else return cb(value);
};

export type WsMessage = "Connected" | "Disconnected" | { Text: string };

export interface WsProvider<TServer> {
  startServer(
    port: number,
    cb: (text: [number, WsMessage]) => void
  ): Promise<TServer>;
  stopServer(server: TServer): Promise<void>;
  sendMessage(data: {
    data: string;
    port: number;
    client: number | null;
  }): Promise<null>;
}

export function createWsProvider<T>(p: WsProvider<T>) {
  return p;
}
