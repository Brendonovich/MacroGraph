import { createActionHistory } from "@macrograph/action-history";
import type {
	CommentBox,
	Core,
	Graph,
	IORef,
	Node,
	Pin,
	Size,
	XY,
} from "@macrograph/runtime";
import { serializeProject } from "@macrograph/runtime-serde";
import { createContextProvider } from "@solid-primitives/context";
import { ReactiveWeakMap } from "@solid-primitives/map";
import { leading, throttle } from "@solid-primitives/scheduled";
import { makePersisted } from "@solid-primitives/storage";
import { createMemo, createSignal, onCleanup } from "solid-js";
import { createStore, reconcile } from "solid-js/store";

import { historyActions } from "./actions";
import {
	type GraphState,
	type SelectedItemID,
	createGraphState,
} from "./components/Graph/Context";
import { MIN_WIDTH } from "./components/Sidebar";

export type Environment = "custom" | "browser";

export type GraphBounds = XY & {
	width: number;
	height: number;
};

function createEditorState() {
	const [hoveringPin, setHoveringPin] = createSignal<Pin | null>(null);
	const [state, setState] = createStore<MouseState>({
		status: "idle",
	});
	const leftSidebar = createSidebarState("left-sidebar");
	const rightSidebar = createSidebarState("right-sidebar");

	const [graphStates, setGraphStates] = makePersisted(
		createStore<GraphState[]>([]),
		{
			name: "graph-states",
			deserialize: (data) => {
				const json: Array<
					GraphState & {
						// old
						selectedItemId?: SelectedItemID | null;
					}
				> = JSON.parse(data) as any;

				for (const state of json) {
					if ("selectedItemId" in state) {
						if (state.selectedItemId === null) {
							state.selectedItemIds = [];
						} else if (typeof state.selectedItemId === "object") {
							state.selectedItemIds = [state.selectedItemId];
						}

						state.selectedItemId = undefined;
					}
				}

				return json;
			},
		},
	);

	const [currentGraphId, setCurrentGraphId] = makePersisted(
		createSignal<number>(0),
		{ name: "current-graph-id" },
	);

	const currentGraphIndex = createMemo(() => {
		const index = graphStates.findIndex((g) => g.id === currentGraphId());

		if (index < 0) return null;
		return index;
	});

	return {
		state,
		setState: (value: MouseState) => {
			setState(reconcile(value));
		},
		hoveringPin,
		setHoveringPin,
		nodeSizes: new WeakMap<Node, Size>(),
		pinPositions: new ReactiveWeakMap<Pin, XY>(),
		leftSidebar,
		rightSidebar,
		currentGraphId,
		setCurrentGraphId,
		currentGraphIndex,
		graphStates,
		setGraphStates,
	};
}

export type EditorState = ReturnType<typeof createEditorState>;

export const [InterfaceContextProvider, useInterfaceContext] =
	createContextProvider((props: { core: Core; environment: Environment }) => {
		const state = createEditorState();

		const save = leading(
			throttle,
			() => {
				if (props.core.project.disableSave) return;

				localStorage.setItem(
					"project",
					JSON.stringify(serializeProject(props.core.project)),
				);
			},
			100,
		);

		onCleanup(
			props.core.project.events.listen((e) => {
				if (e === "modified") save();
			}),
		);

		const [graphBounds, setGraphBounds] = createStore<GraphBounds>({
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		});

		return {
			...createActionHistory(historyActions(props.core, state), save),
			...state,
			get core() {
				return props.core;
			},
			save,
			itemSizes: new WeakMap<Node | CommentBox, Size>(),
			pinPositions: new ReactiveWeakMap<Pin, XY>(),
			get environment() {
				return props.environment;
			},
			selectGraph(graph: Graph) {
				const currentIndex = state.graphStates.findIndex(
					(s) => s.id === graph.id,
				);

				if (currentIndex === -1) {
					state.setGraphStates((s) => [...s, createGraphState(graph)]);
					state.setCurrentGraphId(graph.id);
				} else state.setCurrentGraphId(graph.id);
			},
			graphBounds,
			setGraphBounds,
		};
	}, null!);

export type InterfaceContext = ReturnType<typeof useInterfaceContext>;

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
				| { status: "draggingPin"; autoconnectIO?: IORef }
				| SchemaMenuOpenState;
	  };

function createSidebarState(name: string) {
	const [state, setState] = makePersisted(
		createStore({ width: MIN_WIDTH, open: true }),
		{ name },
	);

	// Solid.createEffect(
	//   Solid.on(
	//     () => state.width,
	//     (width) => {
	//       if (width < MIN_WIDTH * (1 - SNAP_CLOSE_PCT)) setState({ open: false });
	//       else if (width > MIN_WIDTH * (1 - SNAP_CLOSE_PCT))
	//         setState({ open: true });
	//     }
	//   )
	// );

	return { state, setState };
}
