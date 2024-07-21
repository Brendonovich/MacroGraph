import type { Pin, XY } from "@macrograph/runtime";
import { type ParentProps, createContext, useContext } from "solid-js";
import { createMutable } from "solid-js/store";

export function createUIStore() {
	const state = createMutable({
		hoveringPin: null as Pin | null,
		mouseDownTranslate: null as XY | null,
	});

	return {
		state,
		setHoveringPin(pin?: Pin) {
			state.hoveringPin = pin ?? null;
		},
		setMouseDownTranslate(translate?: XY) {
			state.mouseDownTranslate = translate ?? null;
		},
	};
}

export type UIStore = ReturnType<typeof createUIStore>;

const UIStoreContext = createContext<UIStore | null>(null);

export const useUIStore = () => {
	const ctx = useContext(UIStoreContext);

	if (!ctx) throw new Error("UIStoreContext not found!");

	return ctx;
};

export const UIStoreProvider = (props: ParentProps<{ store: UIStore }>) => {
	return (
		<UIStoreContext.Provider value={props.store}>
			{props.children}
		</UIStoreContext.Provider>
	);
};
