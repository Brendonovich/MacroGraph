import { createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";

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

type HistoryItem<T extends HistoryActions, TKey extends keyof T> = {
	type: TKey;
	entry: HistoryItemEntry<T[TKey]>;
};

export function createActionHistory<TActions extends HistoryActions>(
	actions: TActions,
	save: () => void,
) {
	const [history, setHistory] = createStore<
		Array<HistoryItem<TActions, keyof TActions>>
	>([]);

	const [nextHistoryIndex, setNextHistoryIndex] = createSignal(0);

	function addHistoryItem<T extends keyof TActions>(
		item: HistoryItem<TActions, T>,
	) {
		setHistory(
			produce((history) => {
				history.splice(
					nextHistoryIndex(),
					history.length - nextHistoryIndex(),
					item,
				);
			}),
		);
		setNextHistoryIndex((i) => i + 1);
	}

	function undo() {
		setNextHistoryIndex(Math.max(0, nextHistoryIndex() - 1));
		const entry = history[nextHistoryIndex()];
		if (!entry) return;

		actions[entry.type]!.rewind(entry.entry as any);

		// console.log(nextHistoryIndex);
		save();
	}

	function redo() {
		const entry = history[nextHistoryIndex()];
		setNextHistoryIndex(Math.min(history.length, nextHistoryIndex() + 1));
		if (!entry) return;

		// console.log(nextHistoryIndex);
		actions[entry.type]!.perform(entry.entry as any);

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

		const result = action.perform(entry as any) as any;

		if (!args[1]?.ephemeral) {
			addHistoryItem({ type, entry });
			save();
		}

		return result;
	}

	return { undo, redo, execute, history, nextHistoryIndex };
}
