import {
  EffectFunction,
  MemoOptions,
  SignalOptions,
  createMemo,
  createSignal,
} from "solid-js";

import { None, Option } from ".";

export function createOptionMemo<T>(
  effect: EffectFunction<Option<T>>,
  options?: MemoOptions<T>
) {
  return createMemo(effect, None, {
    ...options,
    equals: (prev, next) => {
      const eq = prev.eq(next);

      const equalsFn = options?.equals;
      if (!equalsFn || typeof equalsFn !== "function") return eq;

      return (
        eq ||
        prev
          .zip(next)
          .map(([prev, next]) => equalsFn(prev, next))
          .unwrapOr(false)
      );
    },
  });
}

export function createOptionSignal<T>(
  value: Option<T>,
  options?: SignalOptions<T>
) {
  return createSignal(value, {
    ...options,
    equals: (prev, next) => {
      const eq = prev.eq(next);

      const equalsFn = options?.equals;
      if (!equalsFn || typeof equalsFn !== "function") return eq;

      return (
        eq ||
        prev
          .zip(next)
          .map(([prev, next]) => equalsFn(prev, next))
          .unwrapOr(false)
      );
    },
  });
}

export abstract class Disposable {
  disposeListeners: Set<() => void> = new Set();

  private disposed = false;
  dispose() {
    if (this.disposed) return;

    for (const cb of this.disposeListeners) {
      cb();
    }

    this.disposed = true;
  }

  addDisposeListener(cb: () => void): () => void {
    this.disposeListeners.add(cb);

    return () => this.disposeListeners.delete(cb);
  }
}
