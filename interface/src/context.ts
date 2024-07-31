import type { Core, Pin, XY } from "@macrograph/runtime";
import { serializeProject } from "@macrograph/runtime-serde";
import { createContextProvider } from "@solid-primitives/context";
import { createSignal } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

import type { GraphState } from "./components/Graph/Context";

export const [InterfaceContextProvider, useInterfaceContext] =
	createContextProvider((props: { core: Core }) => {
		const [hoveringPin, setHoveringPin] = createSignal<Pin | null>(null);
		const [state, setState] = createStore<MouseState>({
			status: "idle",
		});
		return {
			state,
			setState: (value: MouseState) => {
				setState(reconcile(value));
			},
			hoveringPin,
			setHoveringPin,
			get core() {
				return props.core;
			},
			save() {
				// disableSave
				localStorage.setItem(
					"project",
					JSON.stringify(serializeProject(props.core.project)),
				);
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
