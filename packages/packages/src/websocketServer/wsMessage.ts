/** Normalize rspc/WebSocket server messages (unit variants may be strings or objects). */

export function isWsConnected(msg: unknown): boolean {
	return (
		msg === "Connected" ||
		(typeof msg === "object" &&
			msg !== null &&
			"Connected" in msg &&
			(msg as { Connected?: unknown }).Connected === null)
	);
}

export function isWsDisconnected(msg: unknown): boolean {
	return (
		msg === "Disconnected" ||
		(typeof msg === "object" &&
			msg !== null &&
			"Disconnected" in msg &&
			(msg as { Disconnected?: unknown }).Disconnected === null)
	);
}

export function wsMessageText(msg: unknown): string | null {
	if (typeof msg !== "object" || msg === null) return null;
	if ("Text" in msg && typeof (msg as { Text: unknown }).Text === "string") {
		return (msg as { Text: string }).Text;
	}
	if ("text" in msg && typeof (msg as { text: unknown }).text === "string") {
		return (msg as { text: string }).text;
	}
	return null;
}
