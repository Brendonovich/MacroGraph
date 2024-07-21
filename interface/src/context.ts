import type { Pin, XY } from "@macrograph/runtime";
import { createContextProvider } from "@solid-primitives/context";
import { createStore } from "solid-js/store";

import type { GraphState } from "./components/Graph/Context";

export const [InterfaceContextProvider, useInterfaceContext] =
	createContextProvider(() => {
		const [state, setState] = createStore<InterfaceState>({ status: "idle" });
		return { state, setState };
	}, null!);

export type InterfaceState =
	| { status: "idle" }
	| { status: "mouseDownOnPin"; pin: Pin }
	| { status: "draggingPin"; pin: Pin; mousePosition: XY }
	| {
			status: "schemaMenuOpen";
			position: XY;
			graph: GraphState;
			suggestion?: { pin: Pin };
	  };
