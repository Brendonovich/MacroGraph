import { Maybe } from "@macrograph/option";
import { ReactiveMap } from "@solid-primitives/map";

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

export function createCtx(callback: (data: any) => void) {
	const websockets = new ReactiveMap<string, SocketState>();
	const failureCount = new Map<string, number>();
	const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

	function clearReconnectTimer(ip: string) {
		const t = reconnectTimers.get(ip);
		if (t !== undefined) {
			clearTimeout(t);
			reconnectTimers.delete(ip);
		}
	}

	function addWebsocket(ip: string) {
		clearReconnectTimer(ip);

		const ws = new WebSocket(ip);

		websockets.set(ip, { state: "connecting", socket: ws });

		ws.onopen = () => {
			failureCount.delete(ip);
			websockets.set(ip, {
				state: "connected",
				socket: ws,
			});
		};

		ws.onclose = () => {
			if (!websockets.has(ip)) return;

			websockets.set(ip, { state: "disconnected", retried: false });

			const n = (failureCount.get(ip) ?? 0) + 1;
			failureCount.set(ip, n);
			const delay = reconnectDelayMs(n);
			reconnectTimers.set(
				ip,
				setTimeout(() => {
					reconnectTimers.delete(ip);
					if (!websockets.has(ip)) return;
					addWebsocket(ip);
				}, delay),
			);
		};

		ws.onmessage = (event) => {
			callback({ ip, data: event.data });
		};

		persistSockets();
	}

	Maybe(localStorage.getItem(WS_IPS_LOCALSTORAGE))
		.map((v) => JSON.parse(v) as string[])
		.map((sockets) => {
			for (const key of sockets) {
				addWebsocket(key);
			}
		});

	function persistSockets() {
		localStorage.setItem(
			WS_IPS_LOCALSTORAGE,
			JSON.stringify(Array.from(websockets.keys())),
		);
	}

	function removeWebsocket(ip: string) {
		clearReconnectTimer(ip);
		failureCount.delete(ip);

		const ws = websockets.get(ip);

		if (ws?.state === "connecting" || ws?.state === "connected") {
			ws.socket.close();
		}

		websockets.delete(ip);

		persistSockets();
	}

	return { websockets, addWebsocket, removeWebsocket };
}

export type Ctx = ReturnType<typeof createCtx>;
