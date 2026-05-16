import { getRemoteShellMode, type OnEvent, type WsProvider } from "@macrograph/runtime";
import { parseJsonWithContext } from "@macrograph/runtime-serde";
import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import * as v from "valibot";

export const SDWS = "SDWS_PORT";

export type ConnectionState =
	| { type: "Stopped" }
	| { type: "Starting" }
	| {
			type: "Running";
			port: number;
			connected(): boolean;
			stop(): Promise<void>;
	  };

/**
 * `createStore` wrapper that doesn't allow partial updates.
 * Makes using discriminated unions actually typesafe
 */
function createADTStore<T extends object>(init: T) {
	return createStore<T>(init) as [T, (arg: T | ((prev: T) => T)) => void];
}

export type Ctx = ReturnType<typeof createCtx>;

const COORDINATES = v.object({
	column: v.number(),
	row: v.number(),
});

const keyEvent = <TEvent extends string>(event: TEvent) =>
	v.object({
		event: v.literal(event),
		payload: v.object({
			coordinates: COORDINATES,
			isInMultiAction: v.boolean(),
			settings: v.object({
				id: v.string(),
				remoteServer: v.string(),
			}),
		}),
	});

const MESSAGE = v.variant("event", [keyEvent("keyDown"), keyEvent("keyUp")]);

export type Message = v.InferOutput<typeof MESSAGE>;

export type Events = {
	[Event in Message["event"]]: Extract<Message, { event: Event }>["payload"];
};

export function createCtx(ws: WsProvider<unknown>, onEvent: OnEvent<Events>) {
	const [state, setState] = createADTStore<ConnectionState>({
		type: "Stopped",
	});

	const [hostMirrorStreamdeck, setHostMirrorStreamdeck] = createSignal<{
		phase: "Stopped" | "Starting" | "Running";
		port: number | null;
		clientConnected: boolean;
	} | null>(null);

	async function startServer(port: number) {
		try {
			setState({ type: "Starting" });

			const [connectedClient, setConnectedClient] = createSignal<null | number>(
				null,
			);
			localStorage.setItem(SDWS, port.toString());

			const server = await ws.startServer(port, ([client, msg]) => {
				if (msg === "Connected" && connectedClient() === null)
					setConnectedClient(client);
				else if (msg === "Disconnected" && client === connectedClient())
					setConnectedClient(null);
				else if (
					typeof msg === "object" &&
					"Text" in msg &&
					client === connectedClient()
				) {
					const parsed = parseJsonWithContext(
						"packages/streamdeck createCtx: WebSocket client message",
						MESSAGE,
						msg.Text,
					);

					onEvent({ name: parsed.event, data: parsed.payload });
				}
			});

			setState({
				type: "Running",
				port,
				connected: () => connectedClient() !== null,
				async stop() {
					await ws.stopServer(server);
					localStorage.removeItem(SDWS);
					setState({ type: "Stopped" });
				},
			});
		} catch {
			setState({ type: "Stopped" });
		}
	}

	if (localStorage.getItem(SDWS) !== null && !getRemoteShellMode())
		startServer(Number(localStorage.getItem(SDWS)));

	return {
		state,
		startServer,
		hostMirrorStreamdeck,
		collectHostMirror() {
			const s = state;
			if (s.type === "Running") {
				return {
					phase: "Running" as const,
					port: s.port,
					clientConnected: s.connected(),
				};
			}
			if (s.type === "Starting") {
				return {
					phase: "Starting" as const,
					port: null,
					clientConnected: false,
				};
			}
			return {
				phase: "Stopped" as const,
				port: null,
				clientConnected: false,
			};
		},
		applyHostMirror(data: unknown) {
			if (!getRemoteShellMode()) return;
			if (!data || typeof data !== "object") {
				setHostMirrorStreamdeck(null);
				return;
			}
			const d = data as {
				phase?: string;
				port?: number | null;
				clientConnected?: boolean;
			};
			const phase =
				d.phase === "Running" || d.phase === "Starting" || d.phase === "Stopped"
					? d.phase
					: "Stopped";
			setHostMirrorStreamdeck({
				phase,
				port: typeof d.port === "number" ? d.port : null,
				clientConnected: Boolean(d.clientConnected),
			});
		},
		clearHostMirror() {
			if (!getRemoteShellMode()) return;
			setHostMirrorStreamdeck(null);
		},
	};
}
