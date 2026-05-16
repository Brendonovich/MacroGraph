import { getRemoteShellMode, type OutboundWsBridge } from "@macrograph/runtime";
import { Maybe } from "@macrograph/option";
import { ReactiveMap } from "@solid-primitives/map";
import { createSignal } from "solid-js";

const MAX_RECONNECT_MS = 30_000;
const BASE_RECONNECT_MS = 1_000;

function reconnectDelayMs(failureCount: number): number {
	return Math.min(
		MAX_RECONNECT_MS,
		BASE_RECONNECT_MS * 2 ** Math.max(0, failureCount - 1),
	);
}

export const WS_IPS_LOCALSTORAGE = "wsServers";

type SocketState =
	| { state: "disconnected"; retried: boolean }
	| { state: "connecting"; socket: WebSocket }
	| { state: "connected"; socket: WebSocket };

function isOutboundText(
	msg: unknown,
): msg is { Text: string } | { text: string } {
	return (
		typeof msg === "object" &&
		msg !== null &&
		("Text" in msg || "text" in msg)
	);
}

function outboundPayloadText(msg: unknown): string | null {
	if (typeof msg === "string") return null;
	if (!isOutboundText(msg)) return null;
	return "Text" in msg
		? (msg as { Text: string }).Text
		: (msg as { text: string }).text;
}

function isOutboundOpen(msg: unknown): boolean {
	return (
		msg === "Open" ||
		msg === "open" ||
		(typeof msg === "object" &&
			msg !== null &&
			("Open" in msg || "open" in msg))
	);
}

function isOutboundClosed(msg: unknown): boolean {
	return (
		msg === "Closed" ||
		msg === "closed" ||
		(typeof msg === "object" &&
			msg !== null &&
			("Closed" in msg || "closed" in msg))
	);
}

function defaultNameFromUrl(url: string): string {
	try {
		return new URL(url).host || url;
	} catch {
		return url;
	}
}

function parsePersisted(raw: string): { url: string; name: string }[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(parsed) || parsed.length === 0) return [];
	if (typeof parsed[0] === "string") {
		return (parsed as string[]).map((url) => ({
			url,
			name: defaultNameFromUrl(url),
		}));
	}
	return (parsed as { url?: unknown; name?: unknown }[])
		.filter(
			(r): r is { url: string; name: string } =>
				typeof r.url === "string" && typeof r.name === "string",
		)
		.map((r) => ({ url: r.url, name: r.name }));
}

export function createCtx(
	outboundWs: OutboundWsBridge | undefined,
	callback: (data: any) => void,
) {
	const websockets = new ReactiveMap<string, SocketState>();
	const wsNames = new ReactiveMap<string, string>();
	const failureCount = new Map<string, number>();
	const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const outboundUnsubs = new Map<string, () => void>();

	const [hostMirrorWs, setHostMirrorWs] = createSignal<
		Array<{ url: string; name: string; state: string }>
	>([]);

	function clearReconnectTimer(ip: string) {
		const t = reconnectTimers.get(ip);
		if (t !== undefined) {
			clearTimeout(t);
			reconnectTimers.delete(ip);
		}
	}

	function addWebsocket(url: string, displayName?: string) {
		if (getRemoteShellMode()) return;
		if (displayName !== undefined) {
			const n = displayName.trim() || defaultNameFromUrl(url);
			wsNames.set(url, n);
		} else if (!wsNames.has(url)) {
			wsNames.set(url, defaultNameFromUrl(url));
		}

		clearReconnectTimer(url);
		outboundUnsubs.get(url)?.();
		outboundUnsubs.delete(url);

		if (outboundWs) {
			const stub = {
				send: (data: string) => {
					void outboundWs.send({ url, data });
				},
				close: () => {
					void outboundWs.close(url);
				},
			} as WebSocket;

			websockets.set(url, { state: "connecting", socket: stub });

			void outboundWs
				.open(url)
				.then(() => {
					const unsub = outboundWs.subscribeMessages(url, (msg) => {
						if (isOutboundOpen(msg)) {
							if (!websockets.has(url)) return;
							failureCount.delete(url);
							websockets.set(url, { state: "connected", socket: stub });
							persistSockets();
							return;
						}
						if (isOutboundClosed(msg)) {
							if (!websockets.has(url)) return;
							websockets.set(url, { state: "connecting", socket: stub });
							persistSockets();
							return;
						}
						const text = outboundPayloadText(msg);
						if (text !== null) {
							callback({ ip: url, data: text });
						}
					});
					outboundUnsubs.set(url, unsub);
					persistSockets();
				})
				.catch(() => {
					websockets.delete(url);
					persistSockets();
				});

			persistSockets();
			return;
		}

		const ws = new WebSocket(url);

		websockets.set(url, { state: "connecting", socket: ws });

		ws.onopen = () => {
			failureCount.delete(url);
			websockets.set(url, {
				state: "connected",
				socket: ws,
			});
		};

		ws.onclose = () => {
			if (!websockets.has(url)) return;

			websockets.set(url, { state: "disconnected", retried: false });

			const n = (failureCount.get(url) ?? 0) + 1;
			failureCount.set(url, n);
			const delay = reconnectDelayMs(n);
			reconnectTimers.set(
				url,
				setTimeout(() => {
					reconnectTimers.delete(url);
					if (!websockets.has(url)) return;
					addWebsocket(url);
				}, delay),
			);
		};

		ws.onmessage = (event) => {
			callback({ ip: url, data: event.data });
		};

		persistSockets();
	}

	Maybe(localStorage.getItem(WS_IPS_LOCALSTORAGE))
		.map(parsePersisted)
		.map((rows) => {
			if (getRemoteShellMode()) return;
			for (const { url, name } of rows) {
				wsNames.set(url, name);
				addWebsocket(url);
			}
		});

	function persistSockets() {
		const rows = Array.from(websockets.keys()).map((url) => ({
			url,
			name: wsNames.get(url) ?? defaultNameFromUrl(url),
		}));
		localStorage.setItem(WS_IPS_LOCALSTORAGE, JSON.stringify(rows));
	}

	function removeWebsocket(url: string) {
		clearReconnectTimer(url);
		failureCount.delete(url);
		outboundUnsubs.get(url)?.();
		outboundUnsubs.delete(url);
		wsNames.delete(url);

		if (outboundWs) {
			void outboundWs.close(url);
		}

		const ws = websockets.get(url);

		if (ws?.state === "connecting" || ws?.state === "connected") {
			ws.socket.close();
		}

		websockets.delete(url);

		persistSockets();
	}

	function setDisplayName(url: string, name: string) {
		if (!websockets.has(url)) return;
		const n = name.trim() || defaultNameFromUrl(url);
		wsNames.set(url, n);
		persistSockets();
	}

	/** Close old outbound socket and open the new URL (same display name). Returns false if the URL is invalid or already in use. */
	function changeWebsocketUrl(oldUrl: string, newUrlRaw: string): boolean {
		const newUrl = newUrlRaw.trim();
		if (!websockets.has(oldUrl) || !newUrl) return false;
		if (newUrl === oldUrl) return true;
		if (websockets.has(newUrl)) return false;
		const name = wsNames.get(oldUrl) ?? defaultNameFromUrl(oldUrl);
		removeWebsocket(oldUrl);
		addWebsocket(newUrl, name);
		return true;
	}

	return {
		websockets,
		wsNames,
		hostMirrorWs,
		addWebsocket,
		removeWebsocket,
		setDisplayName,
		changeWebsocketUrl,
		collectHostMirror() {
			return [...websockets.entries()].map(([url, sock]) => ({
				url,
				name: wsNames.get(url) ?? defaultNameFromUrl(url),
				state: sock.state,
			}));
		},
		applyHostMirror(data: unknown) {
			if (!getRemoteShellMode()) return;
			if (!Array.isArray(data)) {
				setHostMirrorWs([]);
				return;
			}
			setHostMirrorWs(
				data.filter(
					(r): r is { url: string; name: string; state: string } =>
						typeof r === "object" &&
						r !== null &&
						typeof (r as { url?: unknown }).url === "string" &&
						typeof (r as { name?: unknown }).name === "string" &&
						typeof (r as { state?: unknown }).state === "string",
				),
			);
		},
		clearHostMirror() {
			if (!getRemoteShellMode()) return;
			setHostMirrorWs([]);
		},
	};
}

export type Ctx = ReturnType<typeof createCtx>;
