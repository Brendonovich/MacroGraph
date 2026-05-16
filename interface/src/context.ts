import { createActionHistory } from "@macrograph/action-history";
import type {
	CommentBox,
	Core,
	Graph,
	IORef,
	Node,
	Pin,
	Project,
	Size,
	XY,
} from "@macrograph/runtime";
import {
	type NodeInvocationFileRow,
	serializeProject,
} from "@macrograph/runtime-serde";
import { createContextProvider } from "@solid-primitives/context";
import { ReactiveWeakMap } from "@solid-primitives/map";
import { leading, throttle } from "@solid-primitives/scheduled";
import { makePersisted } from "@solid-primitives/storage";
import { createEffect, createMemo, createSignal, on, onCleanup, onMount } from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";

import { historyActions } from "./actions";
import {
	type GraphState,
	type SelectedItemID,
	makeGraphState,
} from "./components/Graph/Context";
import { MIN_WIDTH } from "./components/Sidebar";
import {
	getFollowUserId,
	getRemoteCursors,
	isRemoteHistoryInboundApply,
	registerRemoteHistoryActions,
	setOnCursorUpdate,
	type RemoteHistoryWireItem,
	type WireGraphPositionsEphemeral,
} from "./remoteHistorySync";
import {
	appendInvocationReport,
	exportInvocationLogForGraphs,
	flushInvocationLogPending,
	invocationRowKey,
	loadInvocationsForNode,
	migrateInvocationWorkspaceKeys,
	type StoredNodeInvocation,
} from "./nodeInvocationLog";

export type Environment = "custom" | "browser";

export type GraphBounds = XY & {
	width: number;
	height: number;
};

const MOSAIC_LS_PREFIX = "macrograph-editor-mosaic-";

export type MosaicWorkspaceState = {
	groups: Array<GraphTabListState>;
	focusedIndex: number;
};

function mosaicLocalStorageKey(workspaceSegment: string) {
	return `${MOSAIC_LS_PREFIX}${encodeURIComponent(workspaceSegment)}`;
}

function filterTabToProject(tab: GraphState, project: Project): GraphState | null {
	const graph = project.graph(tab.id);
	if (!graph) return null;

	const selectedItemIds = (tab.selectedItemIds ?? []).filter((sid) => {
		if (sid.type === "node") return graph.nodes.has(sid.id);
		if (sid.type === "commentBox") return graph.commentBoxes.has(sid.id);
		return false;
	});

	const translate = tab.translate ?? { x: 0, y: 0 };
	const scale =
		typeof tab.scale === "number" && Number.isFinite(tab.scale) && tab.scale > 0
			? tab.scale
			: 1;

	return {
		id: tab.id,
		translate: { x: translate.x ?? 0, y: translate.y ?? 0 },
		scale,
		selectedItemIds,
	};
}

function loadMosaicForWorkspace(
	workspaceKey: string,
	project: Project,
): MosaicWorkspaceState {
	const defaultState: MosaicWorkspaceState = {
		groups: [{ tabs: [], selectedIndex: 0 }],
		focusedIndex: 0,
	};

	if (typeof localStorage === "undefined") return structuredClone(defaultState);

	let parsed: unknown;
	try {
		const raw = localStorage.getItem(mosaicLocalStorageKey(workspaceKey));
		if (!raw) return structuredClone(defaultState);
		parsed = JSON.parse(raw);
	} catch {
		return structuredClone(defaultState);
	}

	if (
		typeof parsed !== "object" ||
		parsed === null ||
		!("groups" in parsed) ||
		!("focusedIndex" in parsed)
	) {
		return structuredClone(defaultState);
	}

	const p = parsed as { groups: unknown; focusedIndex: unknown };
	if (!Array.isArray(p.groups) || typeof p.focusedIndex !== "number") {
		return structuredClone(defaultState);
	}

	const groups: Array<GraphTabListState> = p.groups.map((g) => {
		if (typeof g !== "object" || g === null || !("tabs" in g)) {
			return { tabs: [], selectedIndex: 0 };
		}
		const tabsRaw = (g as { tabs: unknown }).tabs;
		const selectedIndexRaw = (g as unknown as { selectedIndex: unknown }).selectedIndex;
		if (!Array.isArray(tabsRaw)) return { tabs: [], selectedIndex: 0 };

		const tabs = tabsRaw
			.filter((t): t is GraphState => typeof t === "object" && t !== null && "id" in t)
			.map((t) => filterTabToProject(t as GraphState, project))
			.filter((t): t is GraphState => t !== null);

		const selectedIndex =
			typeof selectedIndexRaw === "number" && selectedIndexRaw >= 0
				? Math.min(selectedIndexRaw, Math.max(0, tabs.length - 1))
				: 0;

		return { tabs, selectedIndex: tabs.length ? selectedIndex : 0 };
	});

	if (!groups.length) return structuredClone(defaultState);

	const focusedIndex = Math.min(
		Math.max(0, p.focusedIndex),
		groups.length - 1,
	);

	return { groups, focusedIndex };
}

function createEditorState(initialMosaic: MosaicWorkspaceState) {
	const [hoveringPin, setHoveringPin] = createSignal<Pin | null>(null);
	const [state, setState] = createStore<GraphMouseState>({
		status: "idle",
	});
	const leftSidebar = createSidebarState("left-sidebar");
	const rightSidebar = createSidebarState("right-sidebar");

	const [graphStates, setGraphStates] =
		// makePersisted(
		createStore<GraphState[]>([]);
	//   ,
	//   {
	//     name: "graph-states",
	//     deserialize: (data) => {
	//       const json: Array<
	//         GraphState & {
	//           // old
	//           selectedItemId?: SelectedItemID | null;
	//         }
	//       > = JSON.parse(data) as any;

	//       for (const state of json) {
	//         if ("selectedItemId" in state) {
	//           if (state.selectedItemId === null) {
	//             state.selectedItemIds = [];
	//           } else if (typeof state.selectedItemId === "object") {
	//             state.selectedItemIds = [state.selectedItemId];
	//           }

	//           state.selectedItemId = undefined;
	//         }
	//       }

	//       return json;
	//     },
	//   },
	// );

	// const [currentGraphId, setCurrentGraphId] = makePersisted(
	//   createSignal<number>(0),
	//   { name: "current-graph-id" },
	// );

	// const currentGraphIndex = createMemo(() => {
	// const index = graphStates.findIndex((g) => g.id === currentGraphId());

	// if (index < 0) return null;
	// return index;
	//   return null;
	// });

	const [mosaicState, setMosaicState] = createStore<MosaicWorkspaceState>(
		structuredClone(initialMosaic),
	);

	return {
		state,
		setState: (value: GraphMouseState) => {
			setState(reconcile(value));
		},
		hoveringPin,
		setHoveringPin,
		nodeSizes: new WeakMap<Node, Size>(),
		pinPositions: new ReactiveWeakMap<Pin, XY>(),
		leftSidebar,
		rightSidebar,
		mosaicState,
		setMosaicState,
	};
}

export type EditorState = ReturnType<typeof createEditorState>;

export type { RemoteCursor } from "./remoteHistorySync";

export const [InterfaceContextProvider, useInterfaceContext] =
	createContextProvider(
		(props: {
			core: Core;
			environment: Environment;
			mosaicWorkspaceKey?: () => string | null | undefined;
			/** When set, committed editor actions (non-ephemeral) are forwarded for remote host sync. */
			broadcastHistoryCommit?: (items: RemoteHistoryWireItem[]) => void;
			/** Ephemeral node/box drag frames (same as local pointermove `setGraphItemPositions` with `ephemeral: true`). */
			broadcastGraphPositionsLive?: (payload: WireGraphPositionsEphemeral) => void;
			/** True while a graph item pointer-drag session is active (used to ignore echoed live frames). */
			onGraphLivePointerSession?: (active: boolean) => void;
			/** Broadcast local cursor position to remote clients. */
			broadcastCursorPosition?: (payload: { graphId: number; position: { x: number; y: number } }) => void;
		}) => {
		const workspaceKey = createMemo(() => {
			const k = props.mosaicWorkspaceKey?.();
			return k != null && k !== "" ? String(k) : "default";
		});

		let previousWorkspaceSegment = workspaceKey();

		const initialKey = workspaceKey();
		const initialMosaic = loadMosaicForWorkspace(initialKey, props.core.project);
		const state = createEditorState(initialMosaic);
		let loadedWorkspaceKey = initialKey;

		const { mosaicState, setMosaicState } = state;

		const histActions = historyActions(props.core, state);
		/** Must be sync: remote WS handlers can run in the same microtask as `core.load` finishing, before `onMount`. */
		registerRemoteHistoryActions(histActions);

		createEffect(
			on(workspaceKey, (k) => {
				setMosaicState(
					reconcile(loadMosaicForWorkspace(k, props.core.project)),
				);
				loadedWorkspaceKey = k;
			}),
		);

		const persistMosaicLayout = leading(
			throttle,
			() => {
				const k = workspaceKey();
				if (k !== loadedWorkspaceKey) return;
				try {
					const payload: MosaicWorkspaceState = {
						groups: mosaicState.groups.map((g) => ({
							tabs: g.tabs.map((t) => ({ ...t })),
							selectedIndex: g.selectedIndex,
						})),
						focusedIndex: mosaicState.focusedIndex,
					};
					localStorage.setItem(
						mosaicLocalStorageKey(k),
						JSON.stringify(payload),
					);
				} catch {
					/* quota / private mode */
				}
			},
			100,
		);

		createEffect(() => {
			const k = workspaceKey();
			const _groups = JSON.stringify(mosaicState.groups);
			const _focused = mosaicState.focusedIndex;
			if (k !== loadedWorkspaceKey) return;
			void _groups;
			void _focused;
			persistMosaicLayout();
		});

		const save = leading(
			throttle,
			() => {
				void (async () => {
					if (props.core.project.disableSave) return;

					const serialized = serializeProject(props.core.project);
					const wk = workspaceKey();
					const nodeInvocations = await exportInvocationLogForGraphs(
						props.core.project.graphOrder,
						wk,
					).catch((): NodeInvocationFileRow[] => []);

					localStorage.setItem(
						"project-root",
						JSON.stringify({
							...serialized,
							graphs: serialized.graphs.map((g) => g.id),
							variables: serialized.variables?.map((v) => v.id),
							queues: serialized.queues?.map((q) => q.id),
							nodeInvocations,
						}),
					);

					for (const graph of serialized.graphs) {
						localStorage.setItem(
							`project-graph-${graph.id}`,
							JSON.stringify(graph),
						);
					}

					for (const variable of serialized.variables ?? []) {
						localStorage.setItem(
							`project-variable-${variable.id}`,
							JSON.stringify(variable),
						);
					}

					for (const queue of serialized.queues ?? []) {
						localStorage.setItem(
							`project-queue-${queue.id}`,
							JSON.stringify(queue),
						);
					}

					localStorage.removeItem("project");
				})();
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

		const [nodeInvocationLogByKey, setNodeInvocationLogByKey] = createStore<
			Record<string, StoredNodeInvocation[]>
		>({});
		const invocationHydrated = new Set<string>();

		createEffect(
			on(workspaceKey, async (k) => {
				const prev = previousWorkspaceSegment;
				if (prev === k) return;
				await flushInvocationLogPending();
				if (prev === "default" && k !== "default") {
					await migrateInvocationWorkspaceKeys("default", k).catch((e) =>
						console.error("Invocation workspace migrate failed", e),
					);
				}
				previousWorkspaceSegment = k;
				setNodeInvocationLogByKey(reconcile({}));
				invocationHydrated.clear();
			}),
		);

		createEffect(() => {
			props.core.invocationReporter = (report) => {
				appendInvocationReport(
					setNodeInvocationLogByKey,
					() => workspaceKey(),
					report,
					(key) => nodeInvocationLogByKey[key],
				);
			};
			onCleanup(() => {
				props.core.invocationReporter = undefined;
				void flushInvocationLogPending();
			});
		});

		onMount(() => {
			const wk = workspaceKey();
			if (wk !== "default") {
				void (async () => {
					await flushInvocationLogPending();
					await migrateInvocationWorkspaceKeys("default", wk).catch((e) =>
						console.error("Invocation default→workspace migrate", e),
					);
					invocationHydrated.clear();
				})();
			}

			const flush = () => void flushInvocationLogPending();
			const onVisibility = () => {
				if (document.visibilityState === "hidden") flush();
			};
			window.addEventListener("pagehide", flush);
			document.addEventListener("visibilitychange", onVisibility);
			return () => {
				window.removeEventListener("pagehide", flush);
				document.removeEventListener("visibilitychange", onVisibility);
				void flushInvocationLogPending();
			};
		});

		onCleanup(() => {
			registerRemoteHistoryActions(null);
		});

		// Follow a user's cursor: auto-switch to their graph even when no graph tab is open.
		// (Camera panning within the current graph is handled per-Graph in Graph.tsx.)
		const lastFollowedGraph = { id: -1 };
		// Effect: opens the graph when follow is activated and cursors already exist.
		createEffect(() => {
			const followId = getFollowUserId();
			if (!followId) {
				lastFollowedGraph.id = -1;
				return;
			}

			const cursors = getRemoteCursors();
			const cursor = cursors.find((c) => c.id === followId);
			if (!cursor || cursor.graphId === lastFollowedGraph.id) return;

			const focusedGroup = mosaicState.groups[mosaicState.focusedIndex];
			if (focusedGroup?.tabs.some((t) => t.id === cursor.graphId)) return;

			const graph = props.core.project.graphs.get(cursor.graphId);
			if (!graph) return;

			lastFollowedGraph.id = cursor.graphId;
			selectGraph(graph);
		});
		// Callback: opens the graph on each new cursor update while following.
		setOnCursorUpdate((cursor) => {
			const followId = getFollowUserId();
			if (!followId || cursor.id !== followId) return;
			if (cursor.graphId === lastFollowedGraph.id) return;

			const focusedGroup = mosaicState.groups[mosaicState.focusedIndex];
			if (focusedGroup?.tabs.some((t) => t.id === cursor.graphId)) return;

			const graph = props.core.project.graphs.get(cursor.graphId);
			if (!graph) return;

			lastFollowedGraph.id = cursor.graphId;
			selectGraph(graph);
		});
		onCleanup(() => setOnCursorUpdate(null));

		function selectGraph(graph: Graph) {
			const graphIndex = mosaicState.groups[
				mosaicState.focusedIndex
			]?.tabs.findIndex((tab) => tab.id === graph.id);

			if (graphIndex === undefined || graphIndex < 0) {
				setMosaicState(
					"groups",
					mosaicState.focusedIndex,
					produce((t) => {
						t.selectedIndex = t.tabs.length;
						t.tabs.push(makeGraphState(graph));
					}),
				);
			} else {
				setMosaicState(
					"groups",
					mosaicState.focusedIndex,
					"selectedIndex",
					graphIndex,
				);
			}
		}

		return {
			...createActionHistory(histActions, save, {
				onCommit(items) {
					if (isRemoteHistoryInboundApply()) return;
					props.broadcastHistoryCommit?.(items);
				},
			}),
			...state,
			get broadcastGraphPositionsLive() {
				return props.broadcastGraphPositionsLive;
			},
			get broadcastCursorPosition() {
				return props.broadcastCursorPosition;
			},
			get onGraphLivePointerSession() {
				return props.onGraphLivePointerSession;
			},
			get core() {
				return props.core;
			},
			save,
			itemSizes: new ReactiveWeakMap<Node | CommentBox, Size>(),
			pinPositions: new ReactiveWeakMap<Pin, XY>(),
			get environment() {
				return props.environment;
			},
			selectGraph,
			graphBounds,
			setGraphBounds,
			invocationWorkspaceKey: workspaceKey,
			getNodeInvocationEntries(graphId: number, nodeId: number) {
				const k = invocationRowKey(workspaceKey(), graphId, nodeId);
				return nodeInvocationLogByKey[k] ?? [];
			},
			hydrateNodeInvocationLog(graphId: number, nodeId: number) {
				return loadInvocationsForNode(
					setNodeInvocationLogByKey,
					() => workspaceKey(),
					graphId,
					nodeId,
					invocationHydrated,
				);
			},
			setNodeInvocationEntries(
				graphId: number,
				nodeId: number,
				entries: StoredNodeInvocation[],
			) {
				const k = invocationRowKey(workspaceKey(), graphId, nodeId);
				setNodeInvocationLogByKey(k, entries);
			},
		};
	},
	null!,
);

export type InterfaceContext = ReturnType<typeof useInterfaceContext>;

export type SchemaMenuOpenState = {
	status: "schemaMenuOpen";
	position: XY;
};

// https://stately.ai/registry/editor/embed/1f1797a0-4d3f-4441-b8c7-292f3ed59008?machineId=62d40a42-0c7f-4c26-aa26-ef61b57f0b1b&mode=Design
export type GraphMouseState =
	| { status: "idle" }
	| SchemaMenuOpenState
	| {
			status: "connectionMoveMode";
			pin: Pin;
			state: { status: "awaitingDragConfirmation" } | { status: "active" };
	  }
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
	  }
	| {
			status: "itemLeftMouseDown";
			item: Node | CommentBox;
			state: { status: "awaitingDragConfirmation" } | { status: "dragging" };
	  }
	| {
			status: "graphLeftMouseDown";
			state: { status: "awaitingDragConfirmation" } | { status: "dragging" };
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

export type GraphTabListState = {
	tabs: Array<GraphState>;
	selectedIndex: number;
};
