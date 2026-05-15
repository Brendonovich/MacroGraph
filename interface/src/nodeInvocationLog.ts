import type { NodeInvocationReport } from "@macrograph/runtime";
import type { NodeInvocationFileRow } from "@macrograph/runtime-serde";
import type { SetStoreFunction } from "solid-js/store";

export const MAX_NODE_INVOCATIONS = 10;

const DB_NAME = "macrograph-node-invocation-log";
const DB_VERSION = 2;
const STORE = "nodes";

export type StoredNodeInvocation = {
	id: string;
	startedAt: number;
	durationMs: number;
	ok: boolean;
	graphId: number;
	graphName: string;
	nodeId: number;
	nodeName: string;
	eventData?: unknown;
	inputs: Record<string, unknown>;
	outputs: Record<string, unknown>;
	error?: { message: string; stack?: string };
};

type NodeRow = { key: string; entries: StoredNodeInvocation[] };

export function invocationRowKey(
	workspaceKey: string,
	graphId: number,
	nodeId: number,
) {
	return `${workspaceKey}\x1e${graphId}\x1e${nodeId}`;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
	const u8 = new Uint8Array(buf);
	const chunk = 0x4000;
	let binary = "";
	for (let i = 0; i < u8.length; i += chunk) {
		const sub = u8.subarray(i, i + chunk);
		binary += String.fromCharCode.apply(null, [...sub] as number[]);
	}
	return btoa(binary);
}

/** Full clone for IndexedDB: prefer structured clone; fallback keeps all data JSON-safe. */
function deepCloneForStorage(value: unknown): unknown {
	if (typeof structuredClone === "function") {
		try {
			return structuredClone(value);
		} catch {
			/* fall through */
		}
	}
	return cloneJsonCompatible(value, new WeakMap());
}

type CloneJsonOpts = { undefinedAsSentinel: boolean };

function cloneJsonCompatible(
	value: unknown,
	copies: WeakMap<object, unknown>,
	opts: CloneJsonOpts = { undefinedAsSentinel: true },
): unknown {
	if (value === null) return null;
	const t = typeof value;
	if (t === "undefined")
		return opts.undefinedAsSentinel
			? { __mgStore: "undefined" }
			: undefined;
	if (t === "boolean" || t === "number" || t === "string") return value;
	if (t === "bigint")
		return { __mgStore: "bigint", v: (value as bigint).toString() };
	if (t === "function")
		return { __mgStore: "function", name: (value as () => void).name || "" };
	if (t === "symbol") return { __mgStore: "symbol", v: String(value) };
	if (value instanceof Date) return value.toISOString();
	if (value instanceof Error)
		return {
			__mgStore: "Error",
			name: value.name,
			message: value.message,
			stack: value.stack ?? "",
		};

	if (ArrayBuffer.isView(value)) {
		const view = value as ArrayBufferView;
		const buf = view.buffer.slice(
			view.byteOffset,
			view.byteOffset + view.byteLength,
		);
		return {
			__mgStore: "TypedArray",
			name: value.constructor.name,
			buffer: cloneJsonCompatible(buf, copies, opts),
		};
	}
	if (value instanceof ArrayBuffer) {
		return {
			__mgStore: "ArrayBuffer",
			base64: arrayBufferToBase64(value),
		};
	}

	if (Array.isArray(value)) {
		if (copies.has(value)) return copies.get(value);
		const arr: unknown[] = [];
		copies.set(value, arr);
		for (let i = 0; i < value.length; i++)
			arr.push(cloneJsonCompatible(value[i], copies, opts));
		return arr;
	}

	if (value instanceof Map) {
		return {
			__mgStore: "Map",
			entries: [...value.entries()].map(([k, v]) => [
				cloneJsonCompatible(k, copies, opts),
				cloneJsonCompatible(v, copies, opts),
			]),
		};
	}
	if (value instanceof Set) {
		return {
			__mgStore: "Set",
			values: [...value].map((v) => cloneJsonCompatible(v, copies, opts)),
		};
	}

	if (t === "object") {
		const obj = value as object;
		if (copies.has(obj)) return copies.get(obj);
		const out: Record<string, unknown> = {};
		copies.set(obj, out);
		for (const key of Object.keys(obj as Record<string, unknown>)) {
			try {
				out[key] = cloneJsonCompatible(
					(obj as Record<string, unknown>)[key],
					copies,
					opts,
				);
			} catch {
				out[key] = { __mgStore: "unreadable", key };
			}
		}
		return out;
	}

	return String(value);
}

/** Undo `{ __mgStore: "undefined" }` from older IDB / JSON round-trips. */
function stripUndefinedSentinels(value: unknown): unknown {
	if (value === null) return null;
	if (typeof value === "object" && !Array.isArray(value)) {
		const o = value as Record<string, unknown>;
		if (
			Object.keys(o).length === 1 &&
			o.__mgStore === "undefined"
		) {
			return undefined;
		}
		const out: Record<string, unknown> = {};
		for (const k of Object.keys(o)) out[k] = stripUndefinedSentinels(o[k]);
		return out;
	}
	if (Array.isArray(value))
		return value.map((x) => stripUndefinedSentinels(x));
	return value;
}

/** Plain data for IndexedDB `put` — Solid store slices are proxies and fail structured clone. */
function idbCloneEntries(
	entries: StoredNodeInvocation[],
): StoredNodeInvocation[] {
	const plain = cloneJsonCompatible(entries, new WeakMap(), {
		undefinedAsSentinel: false,
	}) as StoredNodeInvocation[];
	return stripUndefinedSentinels(plain) as StoredNodeInvocation[];
}

function serializeFields(
	inputs: Record<string, unknown>,
	outputs: Record<string, unknown>,
	eventData?: unknown,
) {
	const serIn: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(inputs))
		serIn[k] = deepCloneForStorage(v);
	const serOut: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(outputs))
		serOut[k] = deepCloneForStorage(v);
	const ev =
		eventData === undefined ? undefined : deepCloneForStorage(eventData);
	return { inputs: serIn, outputs: serOut, eventData: ev };
}

function toStored(report: NodeInvocationReport): StoredNodeInvocation {
	const { inputs, outputs, eventData } = serializeFields(
		report.inputs,
		report.outputs,
		report.eventData,
	);
	return {
		id:
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `${report.startedAt}-${Math.random().toString(36).slice(2)}`,
		startedAt: report.startedAt,
		durationMs: Math.round(report.durationMs * 1000) / 1000,
		ok: report.ok,
		graphId: report.graphId,
		graphName: report.graphName,
		nodeId: report.nodeId,
		nodeName: report.nodeName,
		eventData,
		inputs,
		outputs,
		error: report.error
			? {
					message: report.error.message,
					stack: report.error.stack ?? "",
				}
			: undefined,
	};
}

function mergeEntries(
	a: StoredNodeInvocation[],
	b: StoredNodeInvocation[],
): StoredNodeInvocation[] {
	const m = new Map<string, StoredNodeInvocation>();
	for (const e of b) m.set(e.id, e);
	for (const e of a) m.set(e.id, e);
	return [...m.values()]
		.sort((x, y) => y.startedAt - x.startedAt)
		.slice(0, MAX_NODE_INVOCATIONS);
}

/**
 * When `projectUrl` was still null, invocations were stored under workspace
 * `"default"`. After a project path is set, move those rows so reloads match
 * the real workspace key.
 */
export async function migrateInvocationWorkspaceKeys(
	fromWorkspace: string,
	toWorkspace: string,
): Promise<void> {
	if (fromWorkspace === toWorkspace) return;
	const db = await openDb();
	if (!db) return;

	const fromPrefix = `${fromWorkspace}\x1e`;
	const migrations: Array<{
		oldKey: string;
		newKey: string;
		entries: StoredNodeInvocation[];
	}> = [];

	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const os = tx.objectStore(STORE);
		const req = os.openCursor();
		req.onerror = () => reject(req.error ?? new Error("cursor"));
		req.onsuccess = () => {
			const cursor = req.result;
			if (!cursor) {
				resolve();
				return;
			}
			const row = cursor.value as NodeRow;
			if (
				typeof row?.key === "string" &&
				row.key.startsWith(fromPrefix) &&
				row.entries?.length
			) {
				const suffix = row.key.slice(fromPrefix.length);
				const newKey = `${toWorkspace}\x1e${suffix}`;
				if (newKey !== row.key)
					migrations.push({
						oldKey: row.key,
						newKey,
						entries: row.entries,
					});
			}
			cursor.continue();
		};
	});

	if (migrations.length === 0) return;

	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error("migrate tx"));
		tx.onabort = () =>
			reject(tx.error ?? new Error("migrate tx aborted"));
		const os = tx.objectStore(STORE);
		for (const m of migrations) {
			const gr = os.get(m.newKey);
			gr.onsuccess = () => {
				const existing = gr.result as NodeRow | undefined;
				const merged =
					existing?.entries?.length && m.entries?.length
						? mergeEntries(m.entries, existing.entries)
						: (m.entries?.length ? m.entries : existing?.entries ?? []);
				try {
					if (merged.length)
						os.put({ key: m.newKey, entries: idbCloneEntries(merged) });
					os.delete(m.oldKey);
				} catch (e) {
					console.error("Invocation migrate put failed", m.newKey, e);
				}
			};
			gr.onerror = () => {
				try {
					if (m.entries.length)
						os.put({
							key: m.newKey,
							entries: idbCloneEntries(m.entries),
						});
					os.delete(m.oldKey);
				} catch (e) {
					console.error("Invocation migrate put failed", m.newKey, e);
				}
			};
		}
	});
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
	if (typeof indexedDB === "undefined") return Promise.resolve(null);
	return (dbPromise ??= new Promise((resolve) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE, { keyPath: "key" });
			}
		};
		req.onblocked = () =>
			console.warn("macrograph invocation IDB upgrade blocked");
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => {
			console.warn("IndexedDB open failed", req.error);
			resolve(null);
		};
	}));
}

async function idbGet(key: string): Promise<StoredNodeInvocation[] | undefined> {
	const db = await openDb();
	if (!db) return undefined;
	return new Promise((resolve) => {
		const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
		req.onsuccess = () => {
			const row = req.result as NodeRow | undefined;
			const entries = row?.entries?.map(
				(e) => stripUndefinedSentinels(e) as StoredNodeInvocation,
			);
			resolve(entries);
		};
		req.onerror = () => resolve(undefined);
	});
}

const dirtyKeys = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let latestGetRow: ((key: string) => StoredNodeInvocation[] | undefined) | undefined;

const FLUSH_DEBOUNCE_MS = 250;

async function flushInvocationsToIdb(
	keys: readonly string[],
	getRow: (key: string) => StoredNodeInvocation[] | undefined,
): Promise<void> {
	if (keys.length === 0) return;
	const db = await openDb();
	if (!db) return;

	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction error"));
		tx.onabort = () =>
			reject(tx.error ?? new Error("IndexedDB transaction aborted"));
		const os = tx.objectStore(STORE);
		for (const key of keys) {
			const entries = getRow(key);
			try {
				if (!entries?.length) os.delete(key);
				else
					os.put({
						key,
						entries: idbCloneEntries(entries),
					} satisfies NodeRow);
			} catch (e) {
				console.error("Invocation log put failed", key, e);
			}
		}
	});
}

function scheduleFlush(getRow: (key: string) => StoredNodeInvocation[] | undefined) {
	latestGetRow = getRow;
	if (flushTimer !== undefined) clearTimeout(flushTimer);
	flushTimer = setTimeout(() => {
		flushTimer = undefined;
		const keys = [...dirtyKeys];
		dirtyKeys.clear();
		const snap = latestGetRow;
		if (!snap || keys.length === 0) return;
		void flushInvocationsToIdb(keys, snap).catch((e) =>
			console.error("Invocation log flush failed", e),
		);
	}, FLUSH_DEBOUNCE_MS);
}

/** Wait for any pending debounced write (e.g. before tab close / reload). */
export function flushInvocationLogPending(): Promise<void> {
	if (flushTimer !== undefined) {
		clearTimeout(flushTimer);
		flushTimer = undefined;
	}
	const keys = [...dirtyKeys];
	dirtyKeys.clear();
	const snap = latestGetRow;
	if (!snap || keys.length === 0) return Promise.resolve();
	return flushInvocationsToIdb(keys, snap).catch((e) => {
		console.error("Invocation log flush failed", e);
	});
}

export function appendInvocationReport(
	setLogs: SetStoreFunction<Record<string, StoredNodeInvocation[]>>,
	getWorkspaceKey: () => string,
	report: NodeInvocationReport,
	getRowSnapshot: (key: string) => StoredNodeInvocation[] | undefined,
) {
	const wk = getWorkspaceKey();
	const key = invocationRowKey(wk, report.graphId, report.nodeId);
	let entry: StoredNodeInvocation;
	try {
		entry = toStored(report);
	} catch (e) {
		console.error("Invocation log serialize failed", e);
		return;
	}

	setLogs(
		key,
		(prev: StoredNodeInvocation[] | undefined) =>
			[entry, ...(prev ?? [])].slice(0, MAX_NODE_INVOCATIONS) as StoredNodeInvocation[],
	);

	dirtyKeys.add(key);
	scheduleFlush(getRowSnapshot);
}

export async function loadInvocationsForNode(
	setLogs: SetStoreFunction<Record<string, StoredNodeInvocation[]>>,
	getWorkspaceKey: () => string,
	graphId: number,
	nodeId: number,
	hydrated: Set<string>,
) {
	const key = invocationRowKey(getWorkspaceKey(), graphId, nodeId);
	if (hydrated.has(key)) return;

	const fromDisk = await idbGet(key);
	hydrated.add(key);

	if (!fromDisk?.length) return;

	setLogs(
		key,
		(mem: StoredNodeInvocation[] | undefined) =>
			mergeEntries(mem ?? [], fromDisk),
	);
}

/** Export invocation rows from IDB for all nodes in the given graphs (current workspace). */
export async function exportInvocationLogForGraphs(
	graphIds: ReadonlyArray<number>,
	workspaceKey: string,
): Promise<NodeInvocationFileRow[]> {
	const idSet = new Set(graphIds);
	const db = await openDb();
	if (!db || idSet.size === 0) return [];

	const prefix = `${workspaceKey}\x1e`;
	const out: NodeInvocationFileRow[] = [];

	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const os = tx.objectStore(STORE);
		const req = os.openCursor();
		req.onerror = () => reject(req.error ?? new Error("export cursor"));
		req.onsuccess = () => {
			const cursor = req.result;
			if (!cursor) {
				resolve();
				return;
			}
			const row = cursor.value as NodeRow;
			const key = row.key;
			if (
				typeof key === "string" &&
				key.startsWith(prefix) &&
				row.entries?.length
			) {
				const suffix = key.slice(prefix.length);
				const sep = suffix.indexOf("\x1e");
				if (sep !== -1) {
					const graphId = Number(suffix.slice(0, sep));
					const nodeId = Number(suffix.slice(sep + 1));
					if (idSet.has(graphId)) {
						const raw =
							typeof structuredClone === "function"
								? (structuredClone(row.entries) as StoredNodeInvocation[])
								: (JSON.parse(
										JSON.stringify(row.entries),
									) as StoredNodeInvocation[]);
						const entries = stripUndefinedSentinels(
							raw,
						) as StoredNodeInvocation[];
						out.push({ graphId, nodeId, entries });
					}
				}
			}
			cursor.continue();
		};
	});

	return out;
}

/** Merge file `nodeInvocations` into IndexedDB under the given workspace key. */
export async function importInvocationLogFromProject(
	rows: readonly NodeInvocationFileRow[] | undefined,
	workspaceKey: string,
): Promise<void> {
	if (!rows?.length) return;
	await flushInvocationLogPending();
	const db = await openDb();
	if (!db) return;

	const prepared: NodeRow[] = [];

	for (const r of rows) {
		if (!r.entries?.length) continue;
		const fileEntries = stripUndefinedSentinels(
			r.entries,
		) as StoredNodeInvocation[];
		const key = invocationRowKey(workspaceKey, r.graphId, r.nodeId);
		const existing = await idbGet(key);
		const merged = existing?.length
			? mergeEntries(fileEntries, existing)
			: fileEntries;
		if (merged.length)
			prepared.push({ key, entries: idbCloneEntries(merged) });
	}

	if (!prepared.length) return;

	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error("import tx"));
		tx.onabort = () =>
			reject(tx.error ?? new Error("import tx aborted"));
		const os = tx.objectStore(STORE);
		for (const p of prepared) os.put(p);
	});
}
