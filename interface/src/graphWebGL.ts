/** Enable with `?webglGraph=1` or `localStorage.setItem('mg.webglGraph', '1')`. */
export function isWebGLGraphEnabled(): boolean {
	if (typeof globalThis === "undefined") return false;
	const g = globalThis as { __GRAPH_WEBGL__?: boolean };
	if (g.__GRAPH_WEBGL__ === true) return true;
	try {
		if (localStorage.getItem("mg.webglGraph") === "1") return true;
	} catch {
		/* ignore */
	}
	if (typeof location !== "undefined") {
		return new URLSearchParams(location.search).has("webglGraph");
	}
	return false;
}
