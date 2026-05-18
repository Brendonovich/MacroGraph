import { createEffect, createRoot } from "solid-js";
import { reconcile } from "solid-js/store";

import type { SetStoreFunction } from "solid-js/store";

import type { Config } from "./ConfigDialog";
import { loadEditorConfigJson, saveEditorConfigJson } from "./projectStorage";

let hydrated = false;
let persistenceStarted = false;

export function isEditorConfigHydrated() {
	return hydrated;
}

export async function hydrateEditorConfig(
	setConfig: SetStoreFunction<Config>,
	defaultConfig: Config,
): Promise<void> {
	if (hydrated) return;
	const raw = await loadEditorConfigJson();
	if (raw) {
		try {
			const parsed = JSON.parse(raw) as Partial<Config>;
			setConfig(
				reconcile({
					...structuredClone(defaultConfig),
					...parsed,
					nodes: { ...defaultConfig.nodes, ...parsed.nodes },
					tabColors: { ...defaultConfig.tabColors, ...parsed.tabColors },
				}),
			);
		} catch {
			setConfig(reconcile(structuredClone(defaultConfig)));
		}
	}
	hydrated = true;
}

export function startEditorConfigPersistence(
	config: () => Config,
): void {
	if (persistenceStarted) return;
	persistenceStarted = true;
	createRoot(() => {
		createEffect(() => {
			if (!hydrated) return;
			const snapshot = JSON.stringify(config());
			void saveEditorConfigJson(snapshot);
		});
	});
}
