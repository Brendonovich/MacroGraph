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
import { createContextProvider } from "@solid-primitives/context";
import { ReactiveWeakMap } from "@solid-primitives/map";
import { leading, throttle } from "@solid-primitives/scheduled";
import { makePersisted } from "@solid-primitives/storage";
import {
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	onMount,
} from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";

import { initEditorConfigStorage } from "./ConfigDialog";
import { historyActions } from "./actions";
import { ensureEditorStorageMigrated } from "./projectStorage";
import {
	type GraphViewState,
	type SelectedItemID,
	type TabState,
	coerceGraphScale,
	isGraphEditorTab,
	makeGraphState,
	makeFunctionTab,
	makeFunctionQueueTab,
	makeQueueTab,
	tabGraphKind,
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
	flushInvocationLogPending,
	invocationRowKey,
	loadInvocationsForNode,
	migrateInvocationWorkspaceKeys,
	type StoredNodeInvocation,
} from "./nodeInvocationLog";
import { mosaicDebug } from "./mosaicDebug";
import {
	collectLeafGroupIds,
	createLeafGroup,
	ensureMosaicConsistency,
	setMosaicWorkspaceState,
	findGroupIndex,
	findMosaicGroupWithGraphTab,
	getGroupById,
	isGraphEditorOpenInMosaic,
	leafNode,
	migrateGroupsToV2,
	type MosaicNode,
	type MosaicWorkspaceState,
	type TabListState,
} from "./mosaicLayout";
import {
	loadMosaicJson,
	saveMosaicJson,
	saveProjectToStorage,
} from "./projectStorage";

export type {
	MosaicNode,
	MosaicLeaf,
	MosaicSplit,
	MosaicWorkspaceState,
	TabListState,
	SplitDirection,
	SplitEdge,
} from "./mosaicLayout";

export type Environment = "custom" | "browser";

export type GraphBounds = XY & {
	width: number;
	height: number;
};

let _openTab: ((tab: TabState) => void) | null = null;
export function registerOpenTab(fn: (tab: TabState) => void) { _openTab = fn; }

export function tabKey(tab: TabState) {
	if (tab.type === "graph") return `${tab.graphKind}:${tab.graphId}`;
	if (tab.type === "function") return `function:${tab.functionId}`;
	if (tab.type === "queue") return `queue:${tab.queueId}`;
	if (tab.type === "functionQueue") return `functionQueue:${tab.functionQueueId}`;
	if (tab.type === "package") return `package:${tab.packageName}`;
	return tab.type;
}

function filterTabToProject(tab: TabState, project: Project): TabState | null {
	if (tab.type === "functionQueue") {
		if (
			typeof tab.functionQueueId !== "number" ||
			!project.functionQueues.has(tab.functionQueueId)
		) {
			return null;
		}
		return { type: "functionQueue", functionQueueId: tab.functionQueueId };
	}

	if (!isGraphEditorTab(tab)) return tab;

	const graph = project.getGraphByKind(
		tab.graphKind ?? tabGraphKind(tab),
		tab.graphId,
	);
	if (!graph) return null;

	const selectedItemIds = (tab.selectedItemIds ?? []).filter((sid) => {
		if (sid.type === "node") return graph.nodes.has(sid.id);
		if (sid.type === "commentBox") return graph.commentBoxes.has(sid.id);
		return false;
	});

	const translate = tab.translate ?? { x: 0, y: 0 };
	const scale = coerceGraphScale(tab.scale);

	const view = {
		graphKind: tab.graphKind ?? tabGraphKind(tab),
		graphId: tab.graphId,
		translate: { x: translate.x ?? 0, y: translate.y ?? 0 },
		scale,
		selectedItemIds,
	};

	if (tab.type === "graph") return { type: "graph", ...view };
	if (tab.type === "function") return { type: "function", functionId: tab.functionId, ...view };
	if (tab.type === "queue") return { type: "queue", queueId: tab.queueId, ...view };

	return tab;
}

function defaultMosaicState(): MosaicWorkspaceState {
	const group = createLeafGroup();
	return {
		version: 2,
		root: leafNode(group.id),
		groups: [group],
		focusedGroupId: group.id,
	};
}

function tabKeyFromRaw(raw: unknown, project: Project): string | null {
	if (typeof raw !== "object" || raw === null) return null;
	const record = raw as Record<string, unknown>;
	if (!("type" in record) && "id" in record) {
		return `graph:${record.id}`;
	}
	return tabKeyFromPersistedTab(record, project);
}

function tabKeyFromPersistedTab(
	raw: Record<string, unknown>,
	project: Project,
): string | null {
	if (typeof raw.type !== "string") return null;
	if (raw.type === "functionQueue") {
		if (typeof raw.functionQueueId !== "number") return null;
		return `functionQueue:${raw.functionQueueId}`;
	}
	if (raw.type === "package" && typeof raw.packageName === "string") {
		return `package:${raw.packageName}`;
	}
	if (raw.type === "settings") return "settings";
	if (raw.type === "function" && typeof raw.functionId === "number") {
		const graphId =
			typeof raw.graphId === "number"
				? raw.graphId
				: project.functions.get(raw.functionId)?.graphId;
		if (graphId === undefined) return null;
		return `function:${raw.functionId}`;
	}
	if (raw.type === "queue" && typeof raw.queueId === "number") {
		return `queue:${raw.queueId}`;
	}
	if (typeof raw.graphId === "number") {
		const graphKind =
			typeof raw.graphKind === "string"
				? raw.graphKind
				: raw.type === "graph"
					? "graph"
					: null;
		if (!graphKind) return null;
		return `${graphKind}:${raw.graphId}`;
	}
	return null;
}

function resolveSelectedIndex(
	tabs: TabState[],
	selectedIndexRaw: unknown,
	selectedTabKeyRaw: unknown,
	fallbackTabKey: string | null,
): number {
	if (!tabs.length) return 0;

	const selectedTabKey =
		typeof selectedTabKeyRaw === "string"
			? selectedTabKeyRaw
			: fallbackTabKey;

	if (selectedTabKey) {
		const idx = tabs.findIndex((t) => tabKey(t) === selectedTabKey);
		if (idx >= 0) return idx;
	}

	if (typeof selectedIndexRaw === "number" && selectedIndexRaw >= 0) {
		return Math.min(selectedIndexRaw, tabs.length - 1);
	}

	return 0;
}

function parseGroupTabs(
	g: unknown,
	project: Project,
): TabListState {
	if (typeof g !== "object" || g === null || !("tabs" in g)) {
		const empty = createLeafGroup();
		return empty;
	}
	const groupRecord = g as {
		id?: unknown;
		tabs: unknown;
		selectedIndex?: unknown;
		selectedTabKey?: unknown;
	};
	const tabsRaw = groupRecord.tabs;
	const selectedIndexRaw = groupRecord.selectedIndex;
	const selectedTabKeyRaw = groupRecord.selectedTabKey;
	if (!Array.isArray(tabsRaw)) {
		const empty = createLeafGroup();
		if (typeof groupRecord.id === "string") empty.id = groupRecord.id;
		return empty;
	}

	const fallbackTabKey =
		typeof selectedIndexRaw === "number" &&
		selectedIndexRaw >= 0 &&
		tabsRaw[selectedIndexRaw] != null
			? tabKeyFromRaw(tabsRaw[selectedIndexRaw], project)
			: null;

	const tabs = tabsRaw
		.filter((t): t is TabState =>
			typeof t === "object" && t !== null && ("type" in t || "id" in t),
		)
		.map((t) => {
			const rawTab = t as Record<string, unknown>;
			if (!("type" in rawTab) && "id" in rawTab) {
				const old = rawTab as unknown as {
					id: number;
					translate?: XY;
					scale?: number;
					selectedItemIds?: SelectedItemID[];
				};
				const migrated: TabState = {
					type: "graph",
					graphKind: "graph",
					graphId: old.id,
					translate: old.translate ?? { x: 0, y: 0 },
					scale: coerceGraphScale(old.scale),
					selectedItemIds: old.selectedItemIds ?? [],
				};
				return filterTabToProject(migrated, project);
			}
			return filterTabToProject(t as TabState, project);
		})
		.filter((t): t is TabState => t !== null);

	const selectedIndex = resolveSelectedIndex(
		tabs,
		selectedIndexRaw,
		selectedTabKeyRaw,
		fallbackTabKey,
	);

	const selectedTabKey = tabs[selectedIndex]
		? tabKey(tabs[selectedIndex])
		: undefined;

	const group: TabListState = {
		id: typeof groupRecord.id === "string" ? groupRecord.id : createLeafGroup().id,
		tabs,
		selectedIndex: tabs.length ? selectedIndex : 0,
		selectedTabKey,
	};
	return group;
}

function parseMosaicJson(
	raw: string | null,
	project: Project,
): MosaicWorkspaceState {
	const defaultState = defaultMosaicState();
	if (!raw) {
		mosaicDebug("parseMosaicJson:empty-raw", { using: "defaultState" });
		return structuredClone(defaultState);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return structuredClone(defaultState);
	}

	if (typeof parsed !== "object" || parsed === null || !("groups" in parsed)) {
		return structuredClone(defaultState);
	}

	const p = parsed as {
		version?: unknown;
		groups: unknown;
		focusedIndex?: unknown;
		focusedGroupId?: unknown;
		root?: unknown;
	};

	if (!Array.isArray(p.groups)) {
		return structuredClone(defaultState);
	}

	const groups: Array<TabListState> = p.groups.map((g) => {
		return parseGroupTabs(g, project);
	});

	if (!groups.length) return structuredClone(defaultState);

	if (p.version === 2 && p.root && typeof p.root === "object") {
		const focusedGroupId =
			typeof p.focusedGroupId === "string" &&
			groups.some((g) => g.id === p.focusedGroupId)
				? p.focusedGroupId
				: groups[0]!.id;
		const state = {
			version: 2 as const,
			root: p.root as MosaicNode,
			groups,
			focusedGroupId,
		};
		mosaicDebug("parseMosaicJson:v2", {
			focusedGroupId,
			groupIds: groups.map((g) => g.id),
			rootLeafIds: collectLeafGroupIds(state.root),
			tabCounts: groups.map((g) => g.tabs.length),
			root: JSON.stringify(state.root),
		});
		return ensureMosaicConsistency(state);
	}

	const focusedIndex =
		typeof p.focusedIndex === "number"
			? Math.min(Math.max(0, p.focusedIndex), groups.length - 1)
			: 0;

	const migrated = migrateGroupsToV2(groups, focusedIndex);
	mosaicDebug("parseMosaicJson:v1-migrate", {
		focusedIndex,
		focusedGroupId: migrated.focusedGroupId,
		groupIds: migrated.groups.map((g) => g.id),
		rootLeafIds: collectLeafGroupIds(migrated.root),
		tabCounts: migrated.groups.map((g) => g.tabs.length),
	});
	return migrated;
}

async function loadMosaicForWorkspace(
	workspaceKey: string,
	project: Project,
): Promise<MosaicWorkspaceState> {
	const raw = await loadMosaicJson(workspaceKey);
	return parseMosaicJson(raw, project);
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
		createStore<TabState[]>([]);
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
			broadcastCursorPosition?: (payload: import("./remoteHistorySync").WireCursorPosition) => void;
		}) => {
		const workspaceKey = createMemo(() => {
			const k = props.mosaicWorkspaceKey?.();
			return k != null && k !== "" ? String(k) : "default";
		});

		let previousWorkspaceSegment = workspaceKey();

		const state = createEditorState(defaultMosaicState());
		const [mosaicHydrated, setMosaicHydrated] = createSignal(false);
		let loadedWorkspaceKey: string | null = null;

		const { mosaicState, setMosaicState } = state;

		createEffect(() => {
			const groupIds = mosaicState.groups.map((g) => g.id);
			if (!groupIds.length) return;
			if (groupIds.includes(mosaicState.focusedGroupId)) return;
			setMosaicState("focusedGroupId", groupIds[0]!);
		});

		const histActions = historyActions(props.core, state);
		/** Must be sync: remote WS handlers can run in the same microtask as `core.load` finishing, before `onMount`. */
		registerRemoteHistoryActions(histActions);

		async function hydrateMosaicForKey(key: string) {
			setMosaicHydrated(false);
			const loaded = await loadMosaicForWorkspace(key, props.core.project);
			const m = ensureMosaicConsistency(loaded);
			setMosaicWorkspaceState(setMosaicState, m);
			loadedWorkspaceKey = key;
			setMosaicHydrated(true);
		}

		onMount(() => {
			const flush = () => persistMosaicLayoutNow("pagehide");
			window.addEventListener("pagehide", flush);
			onCleanup(() => window.removeEventListener("pagehide", flush));

			void (async () => {
				await ensureEditorStorageMigrated();
				await initEditorConfigStorage();
				await hydrateMosaicForKey(workspaceKey());
			})();
		});

		createEffect(
			on(workspaceKey, (k) => {
				if (!mosaicHydrated() || k === loadedWorkspaceKey) return;
				void hydrateMosaicForKey(k);
			}),
		);

		function buildMosaicPersistPayload(): MosaicWorkspaceState {
			const normalized = ensureMosaicConsistency(mosaicState);
			const payload: MosaicWorkspaceState = {
				version: 2,
				root: normalized.root,
				focusedGroupId: normalized.focusedGroupId,
				groups: normalized.groups.map((g) => {
					const selectedIndex = Math.min(
						Math.max(0, g.selectedIndex),
						Math.max(0, g.tabs.length - 1),
					);
					const selectedTab = g.tabs[selectedIndex];
					return {
						id: g.id,
						tabs: g.tabs.map((t) => ({ ...t })),
						selectedIndex: g.tabs.length ? selectedIndex : 0,
						selectedTabKey: selectedTab ? tabKey(selectedTab) : undefined,
					};
				}),
			};
			return JSON.parse(JSON.stringify(payload)) as MosaicWorkspaceState;
		}

		function persistMosaicLayoutNow(_reason: string) {
			const k = workspaceKey();
			if (!mosaicHydrated() || k !== loadedWorkspaceKey) {
				return;
			}
			const payload = buildMosaicPersistPayload();
			void saveMosaicJson(k, JSON.stringify(payload)).catch((err) => {
				console.warn("Failed to persist mosaic layout", err);
			});
		}

		const persistMosaicLayoutThrottled = throttle(
			() => persistMosaicLayoutNow("layout-throttled"),
			100,
		);

		const mosaicSelectionSig = createMemo(() =>
			mosaicState.groups
				.map((g) => `${g.selectedIndex}:${g.selectedTabKey ?? ""}`)
				.join("|"),
		);

		createEffect(
			on(mosaicSelectionSig, () => {
				if (!mosaicHydrated()) return;
				if (workspaceKey() !== loadedWorkspaceKey) return;
				persistMosaicLayoutNow("selection-effect");
			}),
		);

		createEffect(() => {
			if (!mosaicHydrated()) return;
			if (workspaceKey() !== loadedWorkspaceKey) return;
			const _groups = JSON.stringify(mosaicState.groups);
			void _groups;
			persistMosaicLayoutThrottled();
		});

		const save = leading(
			throttle,
			() => {
				void (async () => {
					if (props.core.project.disableSave) return;

					await saveProjectToStorage(
						props.core.project,
						workspaceKey(),
					);
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

		// Follow a user's cursor: focus the pane/tab showing their graph (multi-pane aware).
		// Camera panning within the current graph is handled per-Graph in Graph.tsx.
		const lastFollowedGraph = { kind: "graph" as const, id: -1 };

		function focusFollowedGraph(graphKind: import("@macrograph/runtime").GraphKind, graphId: number) {
			const existing = findMosaicGroupWithGraphTab(
				mosaicState.groups,
				graphKind,
				graphId,
			);
			if (existing) {
				const gi = findGroupIndex(mosaicState.groups, existing.groupId);
				if (gi < 0) return;
				const tab = mosaicState.groups[gi]?.tabs[existing.tabIndex];
				setMosaicState("focusedGroupId", existing.groupId);
				setMosaicState("groups", gi, "selectedIndex", existing.tabIndex);
				setMosaicState(
					"groups",
					gi,
					"selectedTabKey",
					tab ? tabKey(tab) : undefined,
				);
				return;
			}

			const graph = props.core.project.getGraphByKind(graphKind, graphId);
			if (!graph) return;
			selectGraph(graph);
		}

		// Effect: opens the graph when follow is activated and cursors already exist.
		createEffect(() => {
			const followId = getFollowUserId();
			if (!followId) {
				lastFollowedGraph.kind = "graph";
				lastFollowedGraph.id = -1;
				return;
			}

			const cursors = getRemoteCursors();
			const cursor = cursors.find((c) => c.id === followId);
			if (
				!cursor ||
				(cursor.graphKind === lastFollowedGraph.kind &&
					cursor.graphId === lastFollowedGraph.id)
			)
				return;

			if (
				isGraphEditorOpenInMosaic(
					mosaicState.groups,
					cursor.graphKind,
					cursor.graphId,
				)
			) {
				focusFollowedGraph(cursor.graphKind, cursor.graphId);
				lastFollowedGraph.kind = cursor.graphKind;
				lastFollowedGraph.id = cursor.graphId;
				return;
			}

			lastFollowedGraph.kind = cursor.graphKind;
			lastFollowedGraph.id = cursor.graphId;
			focusFollowedGraph(cursor.graphKind, cursor.graphId);
		});
		// Callback: opens the graph on each new cursor update while following.
		setOnCursorUpdate((cursor) => {
			const followId = getFollowUserId();
			if (!followId || cursor.id !== followId) return;
			if (
				cursor.graphKind === lastFollowedGraph.kind &&
				cursor.graphId === lastFollowedGraph.id
			)
				return;

			focusFollowedGraph(cursor.graphKind, cursor.graphId);
			lastFollowedGraph.kind = cursor.graphKind;
			lastFollowedGraph.id = cursor.graphId;
		});
		onCleanup(() => setOnCursorUpdate(null));

		function openTab(tab: TabState, targetGroupId?: string) {
			const key = tabKey(tab);
			const groupId = targetGroupId ?? mosaicState.focusedGroupId;
			if (targetGroupId && targetGroupId !== mosaicState.focusedGroupId) {
				setMosaicState("focusedGroupId", targetGroupId);
			}
			const groupIdx = findGroupIndex(mosaicState.groups, groupId);
			mosaicDebug("openTab", {
				tabKey: key,
				focusedGroupId: mosaicState.focusedGroupId,
				groupIdx,
				groupIds: mosaicState.groups.map((g) => g.id),
				rootLeafIds: collectLeafGroupIds(mosaicState.root),
			});
			if (groupIdx < 0) return;

			const idx = mosaicState.groups[groupIdx]?.tabs.findIndex(
				(t) => tabKey(t) === key,
			);

			if (idx === undefined || idx < 0) {
				setMosaicState(
					"groups",
					groupIdx,
					produce((t) => {
						t.selectedIndex = t.tabs.length;
						t.tabs.push(tab);
						t.selectedTabKey = key;
					}),
				);
			} else {
				setMosaicState(
					"groups",
					groupIdx,
					produce((t) => {
						t.selectedIndex = idx;
						t.selectedTabKey = key;
					}),
				);
			}
		}

		registerOpenTab(openTab);

		function openGraph(graph: Graph) {
			if (graph.kind === "function") {
				for (const [, fn] of props.core.project.functions) {
					if (fn.graphId === graph.id) {
						openTab(makeFunctionTab(fn));
						return;
					}
				}
			}
			if (graph.kind === "queue") {
				for (const [, queue] of props.core.project.queues) {
					if (queue.graphId === graph.id) {
						openTab(makeQueueTab(queue));
						return;
					}
				}
			}
			openTab(makeGraphState(graph));
		}

		function selectGraph(graph: Graph) {
			openGraph(graph);
		}

		function selectGraphInGroup(groupId: string, graph: Graph) {
			if (graph.kind === "function") {
				for (const [, fn] of props.core.project.functions) {
					if (fn.graphId === graph.id) {
						openTab(makeFunctionTab(fn), groupId);
						return;
					}
				}
			}
			if (graph.kind === "queue") {
				for (const [, queue] of props.core.project.queues) {
					if (queue.graphId === graph.id) {
						openTab(makeQueueTab(queue), groupId);
						return;
					}
				}
			}
			openTab(makeGraphState(graph), groupId);
		}

		function selectFunction(fn: { id: number; graphId: number }) {
			openTab(makeFunctionTab(fn));
		}

		function selectQueue(queue: { id: number; graphId: number }) {
			openTab(makeQueueTab(queue));
		}

		function selectFunctionQueue(queue: { id: number }) {
			openTab(makeFunctionQueueTab(queue));
		}

		function selectPackage(pkg: { name: string }) {
			openTab({ type: "package", packageName: pkg.name });
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
			mosaicWorkspaceKey: workspaceKey,
			mosaicHydrated,
			setMosaicWorkspaceState: (next: MosaicWorkspaceState) =>
				setMosaicWorkspaceState(setMosaicState, next),
			persistMosaicLayoutNow,
			selectGraph,
			selectGraphInGroup,
			selectFunction,
			selectQueue,
			selectFunctionQueue,
			selectPackage,
			graphBounds,
			setGraphBounds,
			invocationWorkspaceKey: workspaceKey,
			getNodeInvocationEntries(ref: import("@macrograph/runtime").GraphRef, nodeId: number) {
				const k = invocationRowKey(workspaceKey(), ref, nodeId);
				return nodeInvocationLogByKey[k] ?? [];
			},
			hydrateNodeInvocationLog(ref: import("@macrograph/runtime").GraphRef, nodeId: number) {
				return loadInvocationsForNode(
					setNodeInvocationLogByKey,
					() => workspaceKey(),
					ref,
					nodeId,
					invocationHydrated,
				);
			},
			setNodeInvocationEntries(
				ref: import("@macrograph/runtime").GraphRef,
				nodeId: number,
				entries: StoredNodeInvocation[],
			) {
				const k = invocationRowKey(workspaceKey(), ref, nodeId);
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
	graphKind: import("@macrograph/runtime").GraphKind;
	graphId: number;
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


