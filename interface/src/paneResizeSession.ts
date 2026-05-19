/** Ref-counted pane/split drag — heavy graph work is deferred until resize ends. */

let depth = 0;
const endListeners = new Set<() => void>();

export function isPaneResizing(): boolean {
	return depth > 0;
}

export function beginPaneResize(): void {
	depth++;
}

export function endPaneResize(): void {
	if (depth <= 0) return;
	depth--;
	if (depth === 0) {
		for (const fn of endListeners) fn();
	}
}

export function onPaneResizeEnd(fn: () => void): () => void {
	endListeners.add(fn);
	return () => {
		endListeners.delete(fn);
	};
}
