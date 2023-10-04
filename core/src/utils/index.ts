import { createSignal } from "solid-js";
import { None, Option, Some } from "../types";

export * from "./pins";

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
    (value) => {
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
