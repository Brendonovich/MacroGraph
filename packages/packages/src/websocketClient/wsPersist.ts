/** Dedupe and clean `wsServers` localStorage (survives restarts). */

export type PersistedWsClient = { url: string; name: string };

function isPrivateLanHost(hostname: string): boolean {
	return (
		/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) ||
		hostname === "localhost" ||
		hostname === "127.0.0.1"
	);
}

/** One string per logical WS URL so Rust session keys and UI map keys stay aligned. */
export function canonicalWsUrl(raw: string): string {
	const trimmed = raw.trim();
	try {
		const u = new URL(trimmed);
		if (!u.pathname) {
			u.pathname = "/";
		}
		return u.toString();
	} catch {
		return trimmed;
	}
}

/** Stable key for the same logical target (host + port). */
export function socketEndpointKey(url: string): string | null {
	try {
		const u = new URL(url);
		const port =
			u.port ||
			(u.protocol === "wss:" ? "443" : u.protocol === "ws:" ? "80" : "");
		return `${u.hostname.toLowerCase()}:${port}`;
	} catch {
		return null;
	}
}

function preferRow(a: PersistedWsClient, b: PersistedWsClient): PersistedWsClient {
	const aWs = a.url.startsWith("ws://");
	const bWs = b.url.startsWith("ws://");
	if (aWs && !bWs) return a;
	if (bWs && !aWs) return b;
	return a;
}

/**
 * - One entry per host:port
 * - Prefer `ws://` over `wss://`
 * - Drop `wss://` to private LAN hosts (MacroGraph servers are plain ws)
 */
export function sanitizePersistedClients(
	rows: PersistedWsClient[],
): PersistedWsClient[] {
	const byEndpoint = new Map<string, PersistedWsClient>();

	for (const row of rows) {
		const url = canonicalWsUrl(row.url);
		if (!url) continue;

		let host = "";
		try {
			host = new URL(url).hostname;
		} catch {
			continue;
		}

		if (url.startsWith("wss://") && isPrivateLanHost(host)) {
			// MG LAN servers never use TLS — drop stale wss entries.
			continue;
		}

		const key = socketEndpointKey(url);
		if (!key) continue;

		const prev = byEndpoint.get(key);
		byEndpoint.set(key, prev ? preferRow(prev, { ...row, url }) : { ...row, url });
	}

	return [...byEndpoint.values()];
}
