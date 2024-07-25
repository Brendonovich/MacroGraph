import type { Pin, XY } from "@macrograph/runtime";
import { createContextProvider } from "@solid-primitives/context";
import { createStore, reconcile } from "solid-js/store";

import type { GraphState } from "./components/Graph/Context";

export const [InterfaceContextProvider, useInterfaceContext] =
	createContextProvider(() => {
		const [state, setState] = createStore<MouseState>({ status: "idle" });
		return {
			state,
			setState: (state: MouseState) => {
				setState(reconcile(state));
			},
		};
	}, null!);

export type SchemaMenuOpenState = {
	status: "schemaMenuOpen";
	position: XY;
	graph: GraphState;
};

// https://stately.ai/registry/editor/embed/1f1797a0-4d3f-4441-b8c7-292f3ed59008?machineId=62d40a42-0c7f-4c26-aa26-ef61b57f0b1b&mode=Design
export type MouseState =
	| { status: "idle" }
	| SchemaMenuOpenState
	| {
			status: "connectionAssignMode";
			pin: Pin;
			state: { status: "active" } | SchemaMenuOpenState;
	  }
	| {
			status: "pinDragMode";
			pin: Pin;
			state:
				| { status: "awaitingDragConfirmation" }
				| { status: "draggingPin" }
				| SchemaMenuOpenState;
	  };
