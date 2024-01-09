import { createSignal } from "solid-js";

import { Option, Some } from "@macrograph/typesystem";

export * from "./pins";

export type XY = { x: number; y: number };
export type Size = { width: number; height: number };

export const map = <I, O>(value: I | null, cb: (v: I) => O): O | null => {
  if (value === null) return null;
  else return cb(value);
};

type CreateSignal<T> = ReturnType<typeof createSignal<Option<T>>>;

export function makePersisted<T>(
  [get, set]: CreateSignal<T>,
  key: string
): CreateSignal<T> {
  const init = localStorage.getItem(key);

  if (init) {
    try {
      set(Some(JSON.parse(init) as any));
    } catch {}
  }

  return [
    get,
    (value: Parameters<CreateSignal<T>[1]>[0]) => {
      const newValue = set(value);

      if (newValue.isNone()) localStorage.removeItem(key);
      else
        newValue.peek((value) =>
          localStorage.setItem(key, JSON.stringify(value))
        );

      return newValue;
    },
  ];
}

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
