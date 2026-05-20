import {
	getRemoteShellMode,
	registerWebviewReloadCleanup,
	type OutboundWsBridge,
} from "@macrograph/runtime";
import { Maybe } from "@macrograph/option";

import { requestHostMirrorSync } from "../hostMirror/sync";
import { ReactiveMap } from "@solid-primitives/map";
import { createSignal } from "solid-js";

import {
	canonicalWsUrl,
	sanitizePersistedClients,
	socketEndpointKey,
	type PersistedWsClient,
} from "./wsPersist";

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
	| { state: "disconnected"; retried: boolean; lastError?: string }
	| { state: "connecting"; socket: WebSocket; lastError?: string }
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

function outboundErrorText(msg: unknown): string | null {
	if (typeof msg !== "object" || msg === null) return null;
	if ("Error" in msg && typeof (msg as { Error: unknown }).Error === "string") {
		return (msg as { Error: string }).Error;
	}
	if ("error" in msg && typeof (msg as { error: unknown }).error === "string") {
		return (msg as { error: string }).error;
	}
	return null;
}

function defaultNameFromUrl(url: string): string {
	try {
		return new URL(url).host || url;
	} catch {
		return url;
	}
}

function parsePersisted(raw: string): PersistedWsClient[] {
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

function urlsForSameEndpoint(url: string, websockets: ReactiveMap<string, SocketState>) {
	const key = socketEndpointKey(url);
	if (!key) return [url];
	return [...websockets.keys()].filter((u) => socketEndpointKey(u) === key);
}

export function createCtx(
	outboundWs: OutboundWsBridge | undefined,
	callback: (data: any) => void,
) {
	const websockets = new ReactiveMap<string, SocketState>();
	const wsNames = new ReactiveMap<string, string>();
	const failureCount = new Map<string, number>();
	const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const connectedPollTimers = new Map<string, ReturnType<typeof setInterval>>();
	const outboundUnsubs = new Map<string, () => void>();
	/** Bumps when a newer `addWebsocket` supersedes an in-flight connect for the same URL. */
	const connectGeneration = new Map<string, number>();
	let reloading = false;

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

	function stopConnectedPoll(url: string) {
		const t = connectedPollTimers.get(url);
		if (t !== undefined) {
			clearInterval(t);
			connectedPollTimers.delete(url);
		}
	}

	function markNativeConnected(trimmed: string, stub: WebSocket) {
		if (!websockets.has(trimmed)) return;
		if (websockets.get(trimmed)?.state === "connected") return;
		failureCount.delete(trimmed);
		websockets.set(trimmed, { state: "connected", socket: stub });
		stopConnectedPoll(trimmed);
		void persistSockets();
	}

	async function syncNativeConnectedFromRust(trimmed: string, stub: WebSocket) {
		if (!outboundWs?.isConnected) return;
		try {
			const ok = await outboundWs.isConnected(trimmed);
			if (!websockets.has(trimmed)) return;
			if (ok) {
				markNativeConnected(trimmed, stub);
			} else if (websockets.get(trimmed)?.state === "connected") {
				websockets.set(trimmed, { state: "connecting", socket: stub });
				void persistSockets();
				startConnectedPoll(trimmed, stub);
			}
		} catch {
			/* ignore poll errors */
		}
	}

	function startConnectedPoll(trimmed: string, stub: WebSocket) {
		if (!outboundWs?.isConnected) return;
		stopConnectedPoll(trimmed);
		void syncNativeConnectedFromRust(trimmed, stub);
		connectedPollTimers.set(
			trimmed,
			setInterval(() => {
				void syncNativeConnectedFromRust(trimmed, stub);
			}, 500),
		);
	}

	/** Backoff reconnect; never gives up while the URL remains configured. */
	function scheduleReconnect(url: string) {
		clearReconnectTimer(url);
		if (reloading || !websockets.has(url)) return;
		const n = (failureCount.get(url) ?? 0) + 1;
		failureCount.set(url, n);
		const delay = reconnectDelayMs(n);
		reconnectTimers.set(
			url,
			setTimeout(() => {
				reconnectTimers.delete(url);
				if (reloading || !websockets.has(url)) return;
				// Full setup (incl. rspc subscription); `open()` alone kills the watch stream.
				void addWebsocket(url);
			}, delay),
		);
	}

	function handleNativeOutboundMessage(
		trimmed: string,
		stub: WebSocket,
		msg: unknown,
	) {
		if (isOutboundOpen(msg)) {
			if (!websockets.has(trimmed)) return;
			markNativeConnected(trimmed, stub);
			return;
		}
		const err = outboundErrorText(msg);
		if (err !== null) {
			if (!websockets.has(trimmed)) return;
			// Lagged connect-failure events must not overwrite a live session.
			if (websockets.get(trimmed)?.state === "connected") return;
			websockets.set(trimmed, {
				state: "connecting",
				socket: stub,
				lastError: err,
			});
			startConnectedPoll(trimmed, stub);
			void persistSockets();
			return;
		}
		if (isOutboundClosed(msg)) {
			if (!websockets.has(trimmed)) return;
			websockets.set(trimmed, { state: "connecting", socket: stub });
			startConnectedPoll(trimmed, stub);
			void persistSockets();
			return;
		}
		const text = outboundPayloadText(msg);
		if (text !== null) {
			markNativeConnected(trimmed, stub);
			callback({ ip: trimmed, data: text });
		}
	}

	/** Kill native Rust sessions not in the UI/storage list (including orphan `wss://` variants). */
	async function syncNativeSessions(keepUrls: string[]) {
		if (!outboundWs) return;
		if (outboundWs.pruneExcept) {
			await outboundWs.pruneExcept(keepUrls);
			return;
		}
		if (outboundWs.list) {
			const keep = new Set(keepUrls);
			for (const u of await outboundWs.list()) {
				if (!keep.has(u)) await outboundWs.close(u);
			}
		}
	}

	async function shutdownAll() {
		reloading = true;
		for (const url of [...websockets.keys()]) {
			clearReconnectTimer(url);
			stopConnectedPoll(url);
			outboundUnsubs.get(url)?.();
			outboundUnsubs.delete(url);
			const ws = websockets.get(url);
			if (ws?.state === "connecting" || ws?.state === "connected") {
				ws.socket.close();
			}
			// Keep configured URLs; only drop live connections (never wipe storage on reload).
			websockets.set(url, { state: "disconnected", retried: false });
		}
		if (outboundWs?.closeAll) {
			await outboundWs.closeAll();
		}
	}

	async function teardownUrl(url: string) {
		clearReconnectTimer(url);
		stopConnectedPoll(url);
		failureCount.delete(url);
		outboundUnsubs.get(url)?.();
		outboundUnsubs.delete(url);
		wsNames.delete(url);

		if (outboundWs) {
			await outboundWs.close(url);
		}

		const ws = websockets.get(url);
		if (ws?.state === "connecting" || ws?.state === "connected") {
			ws.socket.close();
		}
		websockets.delete(url);
	}

	async function addWebsocket(url: string, displayName?: string) {
		if (getRemoteShellMode()) return;
		const trimmed = canonicalWsUrl(url);
		if (!trimmed) return;

		const gen = (connectGeneration.get(trimmed) ?? 0) + 1;
		connectGeneration.set(trimmed, gen);
		const superseded = () => connectGeneration.get(trimmed) !== gen;

		// Drop alias keys (e.g. `ws://host:port` vs `ws://host:port/`) so state is not split.
		for (const key of [...websockets.keys()]) {
			if (key !== trimmed && socketEndpointKey(key) === socketEndpointKey(trimmed)) {
				await teardownUrl(key);
			}
		}

		if (displayName !== undefined) {
			const n = displayName.trim() || defaultNameFromUrl(trimmed);
			wsNames.set(trimmed, n);
		} else if (!wsNames.has(trimmed)) {
			wsNames.set(trimmed, defaultNameFromUrl(trimmed));
		}

		clearReconnectTimer(trimmed);
		outboundUnsubs.get(trimmed)?.();
		outboundUnsubs.delete(trimmed);

		if (outboundWs) {
			// `open` also closes same host:port variants in Rust; this clears JS-side state.
			await outboundWs.close(trimmed);
			if (superseded()) return;

			const stub = {
				send: (data: string) => {
					void outboundWs
						.send({ url: trimmed, data })
						.then(() => markNativeConnected(trimmed, stub));
				},
				close: () => {
					void outboundWs.close(trimmed);
				},
			} as WebSocket;

			websockets.set(trimmed, { state: "connecting", socket: stub });
			startConnectedPoll(trimmed, stub);

			const unsub = outboundWs.subscribeMessages(trimmed, (msg) => {
				handleNativeOutboundMessage(trimmed, stub, msg);
			});
			outboundUnsubs.set(trimmed, unsub);

			void outboundWs
				.open(trimmed)
				.then(() => {
					if (superseded()) return;
					return syncNativeConnectedFromRust(trimmed, stub);
				})
				.catch(() => {
					if (superseded() || !websockets.has(trimmed)) return;
					websockets.set(trimmed, {
						state: "disconnected",
						retried: false,
						lastError: "Failed to start outbound client",
					});
					scheduleReconnect(trimmed);
					void persistSockets();
				});

			void persistSockets();
			return;
		}

		const ws = new WebSocket(trimmed);
		websockets.set(trimmed, { state: "connecting", socket: ws });

		ws.onopen = () => {
			failureCount.delete(trimmed);
			websockets.set(trimmed, {
				state: "connected",
				socket: ws,
			});
			requestHostMirrorSync();
		};

		ws.onclose = () => {
			if (!websockets.has(trimmed)) return;
			websockets.set(trimmed, { state: "disconnected", retried: false });
			requestHostMirrorSync();
			scheduleReconnect(trimmed);
		};

		ws.onmessage = (event) => {
			callback({ ip: trimmed, data: event.data });
		};

		void persistSockets();
	}

	async function persistSockets() {
		if (reloading) return;
		const rows = sanitizePersistedClients(
			Array.from(websockets.keys()).map((url) => ({
				url,
				name: wsNames.get(url) ?? defaultNameFromUrl(url),
			})),
		);
		const keepUrls = rows.map((r) => r.url);
		localStorage.setItem(WS_IPS_LOCALSTORAGE, JSON.stringify(rows));

		const allowed = new Set(keepUrls);
		for (const key of [...websockets.keys()]) {
			if (!allowed.has(key)) {
				await teardownUrl(key);
			}
		}
		for (const { url, name } of rows) {
			if (!wsNames.has(url)) wsNames.set(url, name);
		}

		await syncNativeSessions(keepUrls);
		requestHostMirrorSync();
	}

	async function removeWebsocket(url: string) {
		const targets = urlsForSameEndpoint(url, websockets);
		for (const u of targets) {
			await teardownUrl(u);
		}
		await syncNativeSessions([...websockets.keys()]);
		await persistSockets();
	}

	function setDisplayName(url: string, name: string) {
		if (!websockets.has(url)) return;
		const n = name.trim() || defaultNameFromUrl(url);
		wsNames.set(url, n);
		void persistSockets();
	}

	async function changeWebsocketUrl(
		oldUrl: string,
		newUrlRaw: string,
	): Promise<boolean> {
		const newUrl = newUrlRaw.trim();
		if (!websockets.has(oldUrl) || !newUrl) return false;
		if (newUrl === oldUrl) return true;
		if (websockets.has(newUrl)) return false;
		const name = wsNames.get(oldUrl) ?? defaultNameFromUrl(oldUrl);
		await removeWebsocket(oldUrl);
		await addWebsocket(newUrl, name);
		return true;
	}

	async function bootstrapFromStorage() {
		if (getRemoteShellMode()) return;

		if (outboundWs?.closeAll) {
			await outboundWs.closeAll();
		}

		const raw = localStorage.getItem(WS_IPS_LOCALSTORAGE);
		const before = raw ? parsePersisted(raw) : [];
		const rows = sanitizePersistedClients(before);
		if (raw && (rows.length !== before.length || rows.some((r, i) => r.url !== before[i]?.url))) {
			localStorage.setItem(WS_IPS_LOCALSTORAGE, JSON.stringify(rows));
		}

		await syncNativeSessions(rows.map((r) => r.url));

		reloading = false;
		for (const { url, name } of rows) {
			wsNames.set(url, name);
			if (!websockets.has(url)) {
				websockets.set(url, { state: "disconnected", retried: false });
			}
		}
		for (const { url, name } of rows) {
			await addWebsocket(url, name);
		}
	}

	registerWebviewReloadCleanup(() => shutdownAll());
	void bootstrapFromStorage();

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
