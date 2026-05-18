import type { Project } from "@macrograph/runtime";
import {
	type NodeInvocationFileRow,
	parseJsonWithContext,
	serde,
	serializeProject,
} from "@macrograph/runtime-serde";

import {
	EDITOR_IDB_KEYS,
	editorIdbGet,
	editorIdbHas,
	editorIdbSet,
} from "./editorIndexedDb";
import { exportInvocationLogForGraphs } from "./nodeInvocationLog";

/** @deprecated Legacy localStorage key — used only for one-time migration. */
export const PROJECT_LOCAL_STORAGE_KEY = "project";
/** @deprecated Legacy localStorage key — used only for one-time migration. */
export const LEGACY_PROJECT_ROOT_KEY = "project-root";

export const MOSAIC_LS_PREFIX = "macrograph-editor-mosaic-";

const SHARDED_KEY_PREFIXES = [
	"project-graph-",
	"project-function-graph-",
	"project-queue-graph-",
	"project-function-queue-graph-",
	"project-queue-",
	"project-variable-",
] as const;

const DEFAULT_WORKSPACE = "default";

export function mosaicStorageKey(workspaceSegment: string) {
	return EDITOR_IDB_KEYS.mosaic(workspaceSegment);
}

/** Remove legacy sharded project keys from localStorage after IDB migration. */
export function removeShardedProjectKeys(storage: Storage = localStorage) {
	if (typeof storage === "undefined") return;
	for (const key of Object.keys(storage)) {
		if (SHARDED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
			storage.removeItem(key);
		}
		if (key.startsWith(MOSAIC_LS_PREFIX)) {
			storage.removeItem(key);
		}
	}
	storage.removeItem(LEGACY_PROJECT_ROOT_KEY);
	storage.removeItem(PROJECT_LOCAL_STORAGE_KEY);
	storage.removeItem("editor-config");
}

export async function loadProjectJson(
	workspaceKey: string,
): Promise<string | null> {
	const key = workspaceKey || DEFAULT_WORKSPACE;
	const fromIdb = await editorIdbGet(EDITOR_IDB_KEYS.project(key));
	if (fromIdb) return fromIdb;
	if (key !== DEFAULT_WORKSPACE) {
		return editorIdbGet(EDITOR_IDB_KEYS.project(DEFAULT_WORKSPACE));
	}
	return null;
}

export async function saveProjectJson(
	workspaceKey: string,
	json: string,
): Promise<void> {
	await editorIdbSet(
		EDITOR_IDB_KEYS.project(workspaceKey || DEFAULT_WORKSPACE),
		json,
	);
}

/** Persist the full project blob to IndexedDB (replaces localStorage autosave). */
export async function saveProjectToStorage(
	project: Project,
	workspaceKey: string,
): Promise<void> {
	const serialized = serializeProject(project);
	const nodeInvocations = await exportInvocationLogForGraphs(
		project.allGraphOrder as number[],
		workspaceKey || DEFAULT_WORKSPACE,
	).catch((): NodeInvocationFileRow[] => []);

	const json = JSON.stringify({ ...serialized, nodeInvocations });
	await saveProjectJson(workspaceKey, json);

	if (typeof localStorage !== "undefined") {
		removeShardedProjectKeys();
	}
}

/** @deprecated Use `saveProjectToStorage`. */
export const saveProjectToLocalStorage = saveProjectToStorage;

function assembleLegacyProjectFromLocalStorage(): string | null {
	if (typeof localStorage === "undefined") return null;

	let savedProjectRoot = localStorage.getItem(LEGACY_PROJECT_ROOT_KEY);
	if (!savedProjectRoot) return null;

	try {
		const parsed = JSON.parse(savedProjectRoot) as Record<string, unknown>;
		const graphKeys: Record<string, string> = {
			functionGraphs: "project-function-graph-",
			queueGraphs: "project-queue-graph-",
			functionQueueGraphs: "project-function-queue-graph-",
		};
		for (const [key, prefix] of Object.entries(graphKeys)) {
			const arr = parsed[key];
			if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "object") {
				for (const g of arr as Array<Record<string, unknown>>) {
					localStorage.setItem(`${prefix}${g.id}`, JSON.stringify(g));
				}
				parsed[key] = (arr as Array<Record<string, unknown>>).map((g) => g.id);
				localStorage.setItem(LEGACY_PROJECT_ROOT_KEY, JSON.stringify(parsed));
				savedProjectRoot = JSON.stringify(parsed);
			}
		}
	} catch {
		/* ignore */
	}

	let serializedProjectRoot: serde.ProjectRoot;
	try {
		serializedProjectRoot = parseJsonWithContext(
			"projectStorage: legacy project-root",
			serde.ProjectRoot,
			savedProjectRoot,
		);
	} catch {
		return null;
	}

	const graphs: serde.Graph[] = [];
	for (const graphId of serializedProjectRoot.graphs) {
		const data = localStorage.getItem(`project-graph-${graphId}`);
		if (!data) return null;
		graphs.push(
			parseJsonWithContext(
				`projectStorage: project-graph-${graphId}`,
				serde.Graph,
				data,
			),
		);
	}

	const variables: serde.Variable[] = [];
	for (const variableId of serializedProjectRoot.variables) {
		const data = localStorage.getItem(`project-variable-${variableId}`);
		if (!data) return null;
		variables.push(
			parseJsonWithContext(
				`projectStorage: project-variable-${variableId}`,
				serde.Variable,
				data,
			),
		);
	}

	const queues: serde.Queue[] = [];
	for (const queueId of serializedProjectRoot.queues ?? []) {
		const data = localStorage.getItem(`project-queue-${queueId}`);
		if (!data) return null;
		queues.push(
			parseJsonWithContext(
				`projectStorage: project-queue-${queueId}`,
				serde.Queue,
				data,
			),
		);
	}

	const root = serializedProjectRoot as serde.ProjectRoot & {
		functionGraphs?: number[];
		queueGraphs?: number[];
		functionQueueGraphs?: number[];
	};

	const loadGraphShard = (
		prefix: string,
		ids: number[] | undefined,
	): serde.Graph[] => {
		const out: serde.Graph[] = [];
		for (const graphId of ids ?? []) {
			const data = localStorage.getItem(`${prefix}${graphId}`);
			if (!data) continue;
			out.push(
				parseJsonWithContext(
					`projectStorage: ${prefix}${graphId}`,
					serde.Graph,
					data,
				),
			);
		}
		return out;
	};

	const merged = {
		...root,
		graphs,
		functionGraphs: loadGraphShard(
			"project-function-graph-",
			root.functionGraphs,
		),
		queueGraphs: loadGraphShard("project-queue-graph-", root.queueGraphs),
		functionQueueGraphs: loadGraphShard(
			"project-function-queue-graph-",
			root.functionQueueGraphs,
		),
		variables,
		queues,
	};

	return JSON.stringify(merged);
}

/**
 * One-time migration: copy editor data from localStorage into IndexedDB, then clear LS keys.
 * Safe to call multiple times.
 */
export async function ensureEditorStorageMigrated(): Promise<void> {
	if (await editorIdbHas(EDITOR_IDB_KEYS.migrationComplete)) return;

	if (typeof localStorage !== "undefined") {
		const unified = localStorage.getItem(PROJECT_LOCAL_STORAGE_KEY);
		if (unified) {
			await saveProjectJson(DEFAULT_WORKSPACE, unified);
		} else {
			const legacy = assembleLegacyProjectFromLocalStorage();
			if (legacy) await saveProjectJson(DEFAULT_WORKSPACE, legacy);
		}

		for (const key of Object.keys(localStorage)) {
			if (!key.startsWith(MOSAIC_LS_PREFIX)) continue;
			const segment = decodeURIComponent(key.slice(MOSAIC_LS_PREFIX.length));
			const raw = localStorage.getItem(key);
			if (raw) await editorIdbSet(EDITOR_IDB_KEYS.mosaic(segment), raw);
		}

		const editorConfig = localStorage.getItem("editor-config");
		if (editorConfig) {
			await editorIdbSet(EDITOR_IDB_KEYS.editorConfig, editorConfig);
		}

		removeShardedProjectKeys();
	}

	await editorIdbSet(EDITOR_IDB_KEYS.migrationComplete, "1");
}

export async function loadMosaicJson(workspaceKey: string): Promise<string | null> {
	return editorIdbGet(mosaicStorageKey(workspaceKey));
}

export async function saveMosaicJson(
	workspaceKey: string,
	json: string,
): Promise<void> {
	await editorIdbSet(mosaicStorageKey(workspaceKey), json);
}

export async function loadEditorConfigJson(): Promise<string | null> {
	return editorIdbGet(EDITOR_IDB_KEYS.editorConfig);
}

export async function saveEditorConfigJson(json: string): Promise<void> {
	await editorIdbSet(EDITOR_IDB_KEYS.editorConfig, json);
}
