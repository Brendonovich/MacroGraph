/** Run cleanup before the webview unloads (F5 / Ctrl+R). Rust backends keep running across reload. */

const cleanups = new Set<() => void | Promise<void>>();
let installed = false;

function runCleanups() {
	// Run synchronously so `reloading` flags are set before async close handlers
	// can persist an empty list to localStorage.
	for (const fn of cleanups) {
		try {
			const r = fn();
			if (r && typeof (r as Promise<void>).then === "function") {
				void (r as Promise<void>);
			}
		} catch {
			/* ignore */
		}
	}
}

function install() {
	if (installed || typeof window === "undefined") return;
	installed = true;
	window.addEventListener("pagehide", runCleanups);
}

/** Register teardown for webview reload. Returns unregister. */
export function registerWebviewReloadCleanup(
	fn: () => void | Promise<void>,
): () => void {
	cleanups.add(fn);
	install();
	return () => cleanups.delete(fn);
}
