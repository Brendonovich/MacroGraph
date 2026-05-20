import { Maybe } from "@macrograph/option";
import {
	getRemoteShellMode,
	registerWebviewReloadCleanup,
	type OnEvent,
	type WsProvider,
} from "@macrograph/runtime";
import { ReactiveMap } from "@solid-primitives/map";
import { ReactiveSet } from "@solid-primitives/set";

import { isWsConnected, isWsDisconnected, wsMessageText } from "./wsMessage";

export const WS_PORTS_LOCALSTORAGE = "wsPorts";

export type ConnectionState = {
	connections: ReactiveSet<number>;
	server: any;
};

export type Ctx = ReturnType<typeof createCtx>;

function readPersistedPorts(): number[] {
	const raw = localStorage.getItem(WS_PORTS_LOCALSTORAGE);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((p): p is number => typeof p === "number");
	} catch {
		return [];
	}
}

export function createCtx(ws: WsProvider<unknown>, onEvent: OnEvent) {
	const websockets = new ReactiveMap<number, ConnectionState>();
	let reloading = false;

	function persistPorts() {
		if (reloading) return;
		localStorage.setItem(
			WS_PORTS_LOCALSTORAGE,
			JSON.stringify(Array.from(websockets.keys())),
		);
	}

	function seedPortsInMap(ports: number[]) {
		for (const port of ports) {
			if (!websockets.has(port)) {
				websockets.set(port, {
					connections: new ReactiveSet(),
					server: undefined,
				});
			}
		}
	}

	/** Clear client slots in the UI and kick sockets; servers/ports stay configured. */
	async function resetAllClients() {
		reloading = true;
		for (const [, entry] of websockets) {
			entry.connections.clear();
		}
		if (ws.disconnectAllClients) {
			await ws.disconnectAllClients();
		}
	}

	async function bootstrapFromStorage() {
		if (getRemoteShellMode()) return;
		const ports = readPersistedPorts();
		seedPortsInMap(ports);
		reloading = false;
		for (const port of ports) {
			await startServer(port);
		}
	}

	registerWebviewReloadCleanup(() => resetAllClients());
	void bootstrapFromStorage();

	async function stopSubscription(port: number) {
		const entry = websockets.get(port);
		if (!entry?.server) return;
		entry.connections.clear();
		await ws.stopServer(entry.server);
		entry.server = undefined;
	}

	async function startServer(port: number) {
		if (getRemoteShellMode()) return;
		if (!websockets.has(port)) {
			websockets.set(port, {
				connections: new ReactiveSet(),
				server: undefined,
			});
		}
		const entry = websockets.get(port)!;
		if (entry.server != null) {
			await stopSubscription(port);
		}

		const server = await ws.startServer(port, ([client, msg]) => {
			const websocketData = websockets.get(port);
			if (!websocketData) return;

			if (isWsConnected(msg)) {
				websocketData.connections.add(client);
				onEvent({
					name: "WSSConnect",
					data: { client, port },
				});
				return;
			}
			if (isWsDisconnected(msg)) {
				websocketData.connections.delete(client);
				onEvent({
					name: "WSSDisconnect",
					data: { client, port },
				});
				return;
			}
			const text = wsMessageText(msg);
			if (text !== null) {
				onEvent({
					name: "wsEvent",
					data: { data: text, client, port },
				});
			}
		});

		entry.server = server;
		persistPorts();
	}

	async function stopServer(port: number) {
		await stopSubscription(port);
		websockets.delete(port);
		persistPorts();
	}

	return { startServer, websockets, stopServer };
}
