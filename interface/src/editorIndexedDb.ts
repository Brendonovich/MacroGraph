const DB_NAME = "macrograph-editor";
const DB_VERSION = 1;
const STORE = "kv";

export const EDITOR_IDB_KEYS = {
	project: (workspace: string) => `project:${workspace}`,
	mosaic: (workspace: string) => `mosaic:${workspace}`,
	editorConfig: "settings:editor-config",
	migrationComplete: "meta:migration-from-localstorage-v1",
} as const;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openEditorDb(): Promise<IDBDatabase | null> {
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
			console.warn("macrograph editor IDB upgrade blocked");
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => {
			console.warn("macrograph editor IDB open failed", req.error);
			resolve(null);
		};
	}));
}

export async function editorIdbGet(key: string): Promise<string | null> {
	const db = await openEditorDb();
	if (!db) return null;
	return new Promise((resolve) => {
		const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
		req.onsuccess = () => {
			const row = req.result as { key: string; value: string } | undefined;
			resolve(typeof row?.value === "string" ? row.value : null);
		};
		req.onerror = () => resolve(null);
	});
}

export async function editorIdbSet(key: string, value: string): Promise<void> {
	const db = await openEditorDb();
	if (!db) return;
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error("editor IDB set failed"));
		tx.objectStore(STORE).put({ key, value });
	});
}

export async function editorIdbDelete(key: string): Promise<void> {
	const db = await openEditorDb();
	if (!db) return;
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error("editor IDB delete failed"));
		tx.objectStore(STORE).delete(key);
	});
}

export async function editorIdbHas(key: string): Promise<boolean> {
	return (await editorIdbGet(key)) !== null;
}
