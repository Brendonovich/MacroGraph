import {
	applyRemoteHistoryItems,
	applySetGraphItemPositionsPerform,
	ConfigDialog,
	ConnectionsDialog,
	Interface,
	PlatformContext,
	importInvocationLogFromProject,
	parseGraphPositionsEphemeralMessage,
	parseCursorMessage,
	parseNodeExecuteMessage,
	runAsRemoteHistoryInbound,
	stringifyGraphPositionsEphemeralWire,
	stringifyCursorWire,
	stringifyRemoteHistoryWirePayload,
	updateRemoteCursor,
	removeRemoteCursor,
	setCursorBroadcastFn,
	setUserList,
	type RemoteHistoryWireItem,
	type WireGraphPositionsEphemeral,
} from "@macrograph/interface";
import type { Platform } from "@macrograph/interface";
import * as pkgs from "@macrograph/packages";
import {
	Core,
	createWsProvider,
	NODE_EMIT,
	setRemoteHostRpcHandler,
	type OutboundWsBridge,
} from "@macrograph/runtime";
import {
	deserializeProject,
	parseJsonWithContext,
	serde,
	type NodeInvocationFileRow,
} from "@macrograph/runtime-serde";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { Toaster } from "solid-sonner";

import "@macrograph/ui/global.css";
import "@macrograph/interface/global.css";
import "./app.css";

const AUTH_STORAGE_KEY = "mg-remote-password";
const REMEMBER_CREDS_KEY = "mg-remote-creds";

const core = new Core({
	remoteShell: true,
	fetch: () =>
		Promise.reject(
			new Error("Remote editor: HTTP/API calls are disabled; they run on the host."),
		),
	oauth: {
		authorize: async () => {
			throw new Error("OAuth is not available in remote editor");
		},
		refresh: async () => {
			throw new Error("OAuth is not available in remote editor");
		},
	},
});

const wsProviderStub = createWsProvider<null>({
	async startServer() {
		return null;
	},
	stopServer: async () => {},
	async sendMessage() {
		return null;
	},
});

const outboundWsStub: OutboundWsBridge = {
	open: async () => {},
	close: async () => {},
	send: async () => {},
	subscribeMessages: () => () => {},
};

const remotePlatform: Platform = {
	clipboard: {
		readText: async () => {
			try {
				return await navigator.clipboard.readText();
			} catch {
				return "";
			}
		},
		writeText: async (text) => {
			try {
				await navigator.clipboard.writeText(text);
			} catch {
				/* ignore */
			}
		},
	},
};

[
	() =>
		pkgs.audio.pkg({
			prepareURL: (url: string) => url,
		}),
	pkgs.discord.pkg,
	() =>
		pkgs.fs.register({
			list: async () => [],
		}),
	pkgs.github.pkg,
	pkgs.goxlr.pkg,
	pkgs.http.pkg,
	pkgs.json.pkg,
	pkgs.keyboard.pkg,
	pkgs.list.pkg,
	pkgs.localStorage.pkg,
	pkgs.logic.pkg,
	pkgs.map.pkg,
	() => pkgs.obs.pkg(),
	() => pkgs.streamdeck.pkg(wsProviderStub),
	pkgs.streamlabs.pkg,
	() => pkgs.shell.pkg(async () => {}),
	pkgs.twitch.pkg,
	pkgs.utils.pkg,
	pkgs.openai.pkg,
	() => pkgs.websocket.pkg({ outboundWs: outboundWsStub }),
	pkgs.variables.pkg,
	pkgs.customEvents.pkg,
	pkgs.speakerbot.pkg,
	() => pkgs.websocketServer.pkg(wsProviderStub),
	pkgs.midi.pkg,
	pkgs.elevenlabs.pkg,
	pkgs.vtubeStudio.pkg,
	pkgs.voicemod.pkg,
	pkgs.functions.pkg,
].map((p) => core.registerPackage(p));

function wsUrl() {
	const { protocol, host } = window.location;
	const wsProto = protocol === "https:" ? "wss:" : "ws:";
	return `${wsProto}//${host}/ws`;
}

type JoinPhase = "form" | "connecting" | "editor" | "reconnecting";

const rpcPending = new Map<
	string,
	{
		resolve: (v: unknown) => void;
		reject: (e: Error) => void;
		t: ReturnType<typeof setTimeout>;
	}
>();

function clearRemoteRpc(reason: string) {
	for (const [, v] of rpcPending) {
		clearTimeout(v.t);
		v.reject(new Error(reason));
	}
	rpcPending.clear();
	setRemoteHostRpcHandler(null);
}

const queryClient = new QueryClient();

export default function App() {
	const [joinPhase, setJoinPhase] = createSignal<JoinPhase>("form");
	const [passwordInput, setPasswordInput] = createSignal(
		typeof sessionStorage !== "undefined"
			? sessionStorage.getItem(AUTH_STORAGE_KEY) ?? ""
			: "",
	);
	const [usernameInput, setUsernameInput] = createSignal("");
	const [authError, setAuthError] = createSignal("");
	const [rememberMe, setRememberMe] = createSignal(
		typeof localStorage !== "undefined"
			? localStorage.getItem(REMEMBER_CREDS_KEY) !== null
			: false,
	);
	let ws: WebSocket | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let autoConnectAttempted = false;

	const [graphLiveFromLocal, setGraphLiveFromLocal] = createSignal(false);

	function loadSavedCreds() {
		if (typeof localStorage === "undefined") return false;
		try {
			const raw = localStorage.getItem(REMEMBER_CREDS_KEY);
			if (!raw) return false;
			const { username, password } = JSON.parse(raw) as { username: string; password: string };
			if (username) setUsernameInput(String(username));
			if (password) setPasswordInput(String(password));
			return true;
		} catch {
			return false;
		}
	}

	const sendWs = (data: string) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;

		try {
			const parsed = JSON.parse(data);
			if (parsed?.type === "project") {
				console.error("[remote-editor] BLOCKED outbound project snapshot!", data);
				return;
			}
		} catch {}

		ws.send(data);
	};

	const broadcastGraphPositionsToHost = (payload: WireGraphPositionsEphemeral) => {
		if (joinPhase() !== "editor") return;
		sendWs(stringifyGraphPositionsEphemeralWire(payload.graphId, payload.items));
	};

	const broadcastHistoryToHost = (items: RemoteHistoryWireItem[]) => {
		if (joinPhase() !== "editor") return;
		sendWs(stringifyRemoteHistoryWirePayload({ type: "actions", items }));
	};

	const cursorId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
	});
	const broadcastCursorToHost = (payload: { graphId: number; position: { x: number; y: number } }) => {
		if (joinPhase() !== "editor") return;
		sendWs(stringifyCursorWire({ id: cursorId, ...payload }));
	};

	createEffect(() => {
		if (joinPhase() === "editor") setCursorBroadcastFn(broadcastCursorToHost);
	});

	onCleanup(() => {
		clearRemoteRpc("Remote editor unloaded.");
		ws?.close();
	});

	const startSession = () => {
		setAuthError("");
		setJoinPhase("connecting");
		setGraphLiveFromLocal(false);
		ws?.close();

		const socket = new WebSocket(wsUrl());
		ws = socket;

		/** Serialize inbound messages so `project` load finishes before applying `actions`. */
		let inboundTail = Promise.resolve();

		socket.addEventListener("open", () => {
			setRemoteHostRpcHandler((req) => {
				if (socket.readyState !== WebSocket.OPEN) {
					return Promise.reject(new Error("WebSocket is not open."));
				}
				const id = crypto.randomUUID();
				return new Promise((resolve, reject) => {
					const t = setTimeout(() => {
						const entry = rpcPending.get(id);
						if (!entry) return;
						rpcPending.delete(id);
						entry.reject(new Error("Remote host RPC timed out."));
					}, 25_000);
					rpcPending.set(id, { resolve, reject, t });
					sendWs(
						JSON.stringify({
							type: "rpcRequest",
							id,
							method: req.method,
							params: req.params,
						}),
					);
				});
			});
			const fallbackId = "xxxx-xxxx-xxxx".replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16));
			sendWs(
				JSON.stringify({
					type: "auth",
					password: passwordInput(),
					username: usernameInput() || `user-${fallbackId}`,
				}),
			);
		});

		const enqueueInbound = (fn: () => void | Promise<void>) => {
			inboundTail = inboundTail.then(fn).catch((err) => {
				console.error("remote-editor inbound", err);
			});
		};

		socket.addEventListener("message", (ev) => {
			if (typeof ev.data !== "string") return;
			let parsed: unknown;
			try {
				parsed = JSON.parse(ev.data);
			} catch {
				return;
			}
			if (typeof parsed !== "object" || parsed === null) return;
			const body = parsed as Record<string, unknown>;
			if (body.type === "authError") {
				clearRemoteRpc("Authentication failed.");
				setAuthError("Wrong password or the host rejected this connection.");
				setJoinPhase("form");
				socket.close();
				return;
			}
			if (body.type === "rpcResponse" && typeof body.id === "string") {
				enqueueInbound(() => {
					const entry = rpcPending.get(body.id as string);
					if (!entry) return;
					rpcPending.delete(body.id as string);
					clearTimeout(entry.t);
					if (body.ok === true) entry.resolve(body.result);
					else {
						entry.reject(
							new Error(
								typeof body.error === "string"
									? body.error
									: "Remote RPC failed.",
							),
						);
					}
				});
				return;
			}
			if (body.type === "actions" && Array.isArray(body.items)) {
				enqueueInbound(() => {
					runAsRemoteHistoryInbound(() =>
						applyRemoteHistoryItems(body.items as RemoteHistoryWireItem[]),
					);
				});
				return;
			}
			if (body.type === "graphPositionsEphemeral") {
				enqueueInbound(() => {
					if (graphLiveFromLocal()) return;
					const live = parseGraphPositionsEphemeralMessage(body);
					if (!live) return;
					runAsRemoteHistoryInbound(() => applySetGraphItemPositionsPerform(live));
				});
				return;
			}
			if (body.type === "cursor") {
				const cursor = parseCursorMessage(body);
				if (cursor) {
					enqueueInbound(() => {
						if (cursor.position.x <= -9999) removeRemoteCursor(cursor.id);
						else updateRemoteCursor(cursor);
					});
				}
				return;
			}
			if (body.type === "nodeExecute") {
				enqueueInbound(() => {
					const msg = parseNodeExecuteMessage(body);
					if (!msg) return;
					const graph = core.project.graphs.get(msg.graphId);
					if (!graph) return;
					const node = graph.nodes.get(msg.nodeId);
					if (!node) return;
					NODE_EMIT.emit(node);
				});
				return;
			}
			if (body.type === "users" && Array.isArray(body.users)) {
				enqueueInbound(() => {
					setUserList((body.users as [string, string][]));
					// Persist username if not set
					if (!usernameInput()) {
						const myEntry = (body.users as [string, string][]).find(([, n]) =>
							n.startsWith("user-")
						);
						if (myEntry) setUsernameInput(myEntry[0]);
					}
				});
				return;
			}
			if (body.type !== "project" || !("project" in body)) return;

			const project = parseJsonWithContext(
				"remote-editor: wire project",
				serde.Project,
				JSON.stringify(body.project),
			);
			enqueueInbound(async () => {
				try {
					await core.load((c) => deserializeProject(c, project));
					await importInvocationLogFromProject(
						(Array.isArray(body.nodeInvocations)
							? body.nodeInvocations
							: []) as NodeInvocationFileRow[],
						"remote",
					);
					pkgs.applyHostMirrorPayloadToCore(core, body.hostMirror);
				} finally {
					try {
						sessionStorage.setItem(AUTH_STORAGE_KEY, passwordInput());
						if (rememberMe()) {
							localStorage.setItem(
								REMEMBER_CREDS_KEY,
								JSON.stringify({
									username: usernameInput(),
									password: passwordInput(),
								}),
							);
						}
					} catch {
						/* ignore */
					}
					setJoinPhase("editor");
					/* Let Solid mount Interface + sync registerRemoteHistoryActions before later queued WS work. */
					await new Promise<void>((r) => queueMicrotask(r));
				}
			});
		});

		const scheduleReconnect = () => {
			if (!rememberMe()) return;
			reconnectTimer = setTimeout(() => {
				if (joinPhase() === "editor" || joinPhase() === "reconnecting") {
					setJoinPhase("reconnecting");
					startSession();
				}
			}, 3000);
		};

		socket.addEventListener("close", () => {
			clearRemoteRpc("Remote connection closed.");
			if (joinPhase() === "connecting") {
				setAuthError((msg) => msg || "Connection closed before the host sent a project.");
				setJoinPhase("form");
			} else {
				scheduleReconnect();
			}
		});

		socket.addEventListener("error", () => {
			clearRemoteRpc("WebSocket error.");
			if (joinPhase() === "connecting") {
				setAuthError("Could not open WebSocket (wrong URL or host offline).");
				setJoinPhase("form");
			} else {
				scheduleReconnect();
			}
		});
	};

	onCleanup(() => {
		if (reconnectTimer) clearTimeout(reconnectTimer);
	});

	// Auto-connect on mount if saved credentials exist
	createEffect(() => {
		if (joinPhase() === "form" && !autoConnectAttempted && loadSavedCreds()) {
			autoConnectAttempted = true;
			startSession();
		}
	});

	return (
		<QueryClientProvider client={queryClient}>
			<Toaster />
			<Show when={joinPhase() === "form"}>
				<div class="w-screen h-screen flex flex-col items-center justify-center text-neutral-300 gap-4 p-6">
					<h1 class="text-xl font-semibold text-white">MacroGraph remote</h1>
					<p class="text-sm text-neutral-400 max-w-md text-center">
						Connect to a remote MacroGraph host.
					</p>
					<form
						class="flex flex-col items-center gap-4 w-full max-w-sm"
						onSubmit={(e) => {
							e.preventDefault();
							startSession();
						}}
					>
						<label class="flex flex-col gap-1 w-full">
							<span class="text-xs text-neutral-500">Username</span>
							<input
								type="text"
								class="bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-white"
								autocomplete="username"
								placeholder="Your display name"
								value={usernameInput()}
								onInput={(e) => setUsernameInput(e.currentTarget.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										startSession();
									}
								}}
							/>
						</label>
						<label class="flex flex-col gap-1 w-full">
							<span class="text-xs text-neutral-500">Password</span>
							<input
								type="password"
								class="bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-white"
								autocomplete="current-password"
								value={passwordInput()}
								onInput={(e) => setPasswordInput(e.currentTarget.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										startSession();
									}
								}}
							/>
						</label>
						<label class="flex flex-row items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={rememberMe()}
								onChange={(e) => {
									setRememberMe(e.currentTarget.checked);
									if (!e.currentTarget.checked) {
										localStorage.removeItem(REMEMBER_CREDS_KEY);
									}
								}}
								class="accent-white"
							/>
							<span class="text-xs text-neutral-400">Remember me</span>
						</label>
						<Show when={authError()}>
							<p class="text-sm text-red-400 max-w-sm text-center">{authError()}</p>
						</Show>
						<button
							type="submit"
							class="rounded bg-white text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-neutral-200"
						>
							Connect
						</button>
					</form>
				</div>
			</Show>

			<Show when={joinPhase() === "connecting" || joinPhase() === "reconnecting"}>
				<div class="w-screen h-screen flex flex-col items-center justify-center text-neutral-300 gap-3">
					<Show when={joinPhase() === "reconnecting"}>
						<span>Connection lost. Reconnecting…</span>
					</Show>
					<Show when={joinPhase() === "connecting"}>
						<span>Connecting…</span>
					</Show>
					<IconSvgSpinners90Ring class="size-10" />
				</div>
			</Show>

			<Show when={joinPhase() === "editor" && core.project}>
				<PlatformContext.Provider value={remotePlatform}>
					<Interface
						core={core}
						environment="browser"
						broadcastHistoryCommit={broadcastHistoryToHost}
						broadcastGraphPositionsLive={broadcastGraphPositionsToHost}
						onGraphLivePointerSession={setGraphLiveFromLocal}
						broadcastCursorPosition={broadcastCursorToHost}
					/>
					<ConnectionsDialog core={core} />
					<ConfigDialog />
				</PlatformContext.Provider>
			</Show>
		</QueryClientProvider>
	);
}
