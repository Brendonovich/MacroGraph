import { Maybe } from "@macrograph/option";
import { ReactiveMap } from "@solid-primitives/map";

export const WS_IPS_LOCALSTORAGE = "wsServers";

type SocketState =
	| { state: "disconnected"; retried: boolean }
	| { state: "connecting" }
	| { state: "connected"; socket: WebSocket };

export function createCtx(callback: (data: any) => void) {
	const websockets = new ReactiveMap<string, SocketState>();

	function addWebsocket(ip: string, retryOnFail = true) {
		websockets.set(ip, { state: "connecting" });

		const ws = new WebSocket(ip);

		ws.onopen = () => {
			websockets.set(ip, {
				state: "connected",
				socket: ws,
			});
		};

		ws.onclose = () => {
			const state = websockets.get(ip);
			if (!state) return;

			websockets.set(ip, { state: "disconnected", retried: false });

			if (state.state === "connected" && retryOnFail) addWebsocket(ip, false);
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
		const ws = websockets.get(ip);

		if (ws && ws.state === "connected") {
			ws.socket.close();
		}

		websockets.delete(ip);

		persistSockets();
	}

	return { websockets, addWebsocket, removeWebsocket };
}

export type Ctx = ReturnType<typeof createCtx>;
