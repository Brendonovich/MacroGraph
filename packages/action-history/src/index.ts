import * as Solid from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";

export type HistoryEntry<T> = T extends object ? T : never;
export type PrepareOptions = { ephemeral?: boolean };
export type HistoryAction<E, P, I = void> = {
  prepare(input: I, opts?: PrepareOptions): E;
  perform(entry: HistoryEntry<E>): P;
  rewind(entry: HistoryEntry<E>): void;
};
export type HistoryItemEntry<T extends HistoryAction<any, any, any>> =
  T extends HistoryAction<infer E, any, any> ? HistoryEntry<E> : never;
export type HistoryEntryData = {
  type: string;
  entry: object;
};
export type HistoryActions = Record<string, HistoryAction<any, any, any>>;

export function historyAction<E, P, I = void>(args: HistoryAction<E, P, I>) {
  return args;
}

export type PerformInput<Input, RewindData = Input> =
  | { type: "perform"; data: Input }
  | { type: "redo"; data: RewindData };

export type MaybePromise<T> = T | Promise<T>;
export interface _HistoryAction<Input, PerformResult, PerformData, RewindData> {
  perform(
    data: PerformInput<Input, RewindData>,
  ): MaybePromise<[PerformResult, PerformData] | undefined>;
  rewind(performData: PerformData): MaybePromise<RewindData | undefined>;
}

export const _historyAction = <Input, PerformResult, PerformData, RewindData>(
  args:
    | _HistoryAction<Input, PerformResult, PerformData, RewindData>
    | (() => _HistoryAction<Input, PerformResult, PerformData, RewindData>),
) => {
  if (typeof args === "function") return args();
  return args;
};

type HistoryItem<T extends HistoryActions, TKey extends keyof T> = {
  type: TKey;
  entry: HistoryItemEntry<T[TKey]>;
};

export function createActionHistory<TActions extends HistoryActions>(
  actions: TActions,
  save: () => void,
) {
  const [state, setState] = createStore<{
    undo: Array<Array<HistoryItem<TActions, keyof TActions>>>;
    redo: Array<Array<HistoryItem<TActions, keyof TActions>>>;
  }>({
    undo: [],
    redo: [],
  });

  const [history, setHistory] = createStore<
    Array<Array<HistoryItem<TActions, keyof TActions>>>
  >([]);

  const [nextHistoryIndex, setNextHistoryIndex] = Solid.createSignal(0);

  let queued: HistoryItem<TActions, keyof TActions>[] | undefined = undefined;

  function addHistoryItem<T extends keyof TActions>(
    item: HistoryItem<TActions, T> | HistoryItem<TActions, T>[],
  ) {
    setHistory(
      produce((history) => {
        history.splice(
          nextHistoryIndex(),
          history.length - nextHistoryIndex(),
          Array.isArray(item) ? item : [item],
        );
      }),
    );
    setNextHistoryIndex((i) => i + 1);
  }

  function undo() {
    setNextHistoryIndex(Math.max(0, nextHistoryIndex() - 1));
    const entry = history[nextHistoryIndex()];
    if (!entry) return;

    Solid.batch(() => {
      for (const e of [...entry].reverse()) {
        actions[e.type]!.rewind(unwrap(e.entry as any));
      }
    });

    save();
  }

  function redo() {
    const entry = history[nextHistoryIndex()];
    setNextHistoryIndex(Math.min(history.length, nextHistoryIndex() + 1));
    if (!entry) return;

    Solid.batch(() => {
      console.log(entry);
      for (const e of entry) {
        actions[e.type]!.perform(unwrap(e.entry as any));
      }
    });

    save();
  }

  function execute<K extends keyof TActions>(
    type: K,
    ...args: TActions[K] extends HistoryAction<any, any, infer I>
      ? I extends void
        ? []
        : [I] | [I, { ephemeral?: boolean }]
      : []
  ): TActions[K] extends HistoryAction<any, infer P, any> ? P : never {
    const action = actions[type]!;

    const entry = action.prepare(args[0] as any, args[1]);
    if (!entry) return undefined as any;

    return Solid.batch(() => {
      const result = action.perform(entry as any) as any;

      if (!args[1]?.ephemeral) {
        if (queued !== undefined) {
          queued.push({ type, entry });
        } else {
          addHistoryItem({ type, entry });
          save();
        }
      }

      return result;
    });
  }

  function batch<T = void>(fn: () => T): T {
    const isRootBatch = queued === undefined;
    if (isRootBatch) queued = [];
    const result = fn();

    if (isRootBatch) {
      addHistoryItem(queued!);
      save();
      queued = undefined;
    }

    return result;
  }

  return { undo, redo, execute, batch, history, nextHistoryIndex };
}

const abortToken = {};

export function abort(): never {
  throw abortToken;
}
