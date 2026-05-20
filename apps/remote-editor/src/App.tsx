import {
	applyRemoteHistoryItems,
	applySetGraphItemPositionsPerform,
	ConfigDialog,
	KeyboardShortcutsDialog,
	ConnectionsDialog,
	Interface,
	PlatformContext,
	importInvocationLogFromProject,
	parseGraphPositionsEphemeralMessage,
	parseCursorMessage,
	parseNodeExecuteMessage,
	parsePinDragMessage,
	parseSelectionBoxMessage,
	runAsRemoteHistoryInbound,
	stringifyGraphPositionsEphemeralWire,
	stringifyCursorWire,
	stringifyRemoteHistoryWirePayload,
	updateRemoteCursor,
	removeRemoteCursor,
	updateRemotePinDrag,
	removeRemotePinDrag,
	updateRemoteSelectionBox,
	removeRemoteSelectionBox,
	setCursorBroadcastFn,
	setPinDragBroadcastFn,
	setSelectionBoxBroadcastFn,
	setUserList,
	setRemoteSyncDebugLogger,
	type RemoteHistoryWireItem,
	type WireGraphPositionsEphemeral,
} from "@macrograph/interface";
import {
	isRemoteClientLogEnabled,
	remoteInboundError,
	remoteLog,
	remoteWarn,
	summarizeWireBody,
	validateHistoryWireItems,
} from "./remoteClientLog";
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
import { Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
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
	disconnectAllClients: async () => {},
	async sendMessage() {
		return null;
	},
});

const outboundWsStub: OutboundWsBridge = {
	open: async () => {},
	close: async () => {},
	closeAll: async () => {},
	list: async () => [],
	isConnected: async () => false,
	pruneExcept: async () => {},
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
	pkgs.queue.pkg,
	pkgs.customEvents.pkg,
	pkgs.speakerbot.pkg,
	() => pkgs.websocketServer.pkg(wsProviderStub),
	pkgs.midi.pkg,
	pkgs.elevenlabs.pkg,
	pkgs.vtubeStudio.pkg,
	pkgs.voicemod.pkg,
	pkgs.functions.pkg,
	pkgs.script.pkg,
].map((p) => core.registerPackage(p));

function wsUrl() {
	const { protocol, host } = window.location;
	const wsProto = protocol === "https:" ? "wss:" : "ws:";
	return `${wsProto}//${host}/ws`;
}

type JoinPhase = "form" | "connecting" | "editor" | "reconnecting" | "failed";

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
	let socketGeneration = 0;
	let autoConnectAttempted = false;
	const reconnectState = { attempts: 0, startTime: 0, maxTime: 60_000 };
	const [editorSessionActive, setEditorSessionActive] = createSignal(false);
	const [projectReady, setProjectReady] = createSignal(false);

	const [graphLiveFromLocal, setGraphLiveFromLocal] = createSignal(false);

	onMount(() => {
		if (isRemoteClientLogEnabled()) {
			remoteLog(
				"Remote client debug logging enabled (macrograph.remoteDebug=1 or ?remoteDebug=1)",
			);
		}
		setRemoteSyncDebugLogger((level, message, data) => {
			if (level === "log") remoteLog(message, data);
			else if (level === "warn") remoteWarn(message, data);
			else remoteInboundError("sync", new Error(String(message)), data as Record<string, unknown>);
		});
		onCleanup(() => setRemoteSyncDebugLogger(null));
	});

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
		sendWs(stringifyGraphPositionsEphemeralWire(payload, payload.items));
	};

	const broadcastHistoryToHost = (items: RemoteHistoryWireItem[]) => {
		if (joinPhase() !== "editor") return;
		sendWs(stringifyRemoteHistoryWirePayload({ type: "actions", items }));
	};

	const cursorId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
	});
	const broadcastCursorToHost = (
		payload: import("@macrograph/interface").WireCursorPosition,
	) => {
		if (joinPhase() !== "editor") return;
		sendWs(stringifyCursorWire({ id: cursorId, ...payload }));
	};

	const broadcastPinDragToHost = (drag: import("@macrograph/interface").RemotePinDrag) => {
		if (joinPhase() !== "editor") return;
		sendWs(JSON.stringify({ type: "pinDrag", ...drag }));
	};

	const broadcastSelectionBoxToHost = (box: import("@macrograph/interface").RemoteSelectionBox) => {
		if (joinPhase() !== "editor") return;
		sendWs(JSON.stringify({ type: "selectionBox", ...box }));
	};

	createEffect(() => {
		if (joinPhase() === "editor") {
			setCursorBroadcastFn(broadcastCursorToHost);
			setPinDragBroadcastFn(broadcastPinDragToHost);
			setSelectionBoxBroadcastFn(broadcastSelectionBoxToHost);
		}
	});

	function clearReconnectTimer() {
		if (reconnectTimer !== null) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
	}

	function resetReconnectState() {
		reconnectState.attempts = 0;
		reconnectState.startTime = 0;
		clearReconnectTimer();
	}

	function scheduleReconnect() {
		const phase = joinPhase();
		if (phase === "form" || phase === "failed") return;
		if (reconnectTimer !== null) return;

		if (reconnectState.startTime === 0) reconnectState.startTime = Date.now();
		const elapsed = Date.now() - reconnectState.startTime;
		if (elapsed > reconnectState.maxTime) {
			setJoinPhase("failed");
			return;
		}

		const delay = Math.min(
			1000 * Math.pow(2, reconnectState.attempts),
			10_000,
		);
		reconnectState.attempts += 1;
		setJoinPhase("reconnecting");

		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			openWebSocket({ reconnect: true });
		}, delay);
	}

	function openWebSocket(opts: { reconnect?: boolean } = {}) {
		setAuthError("");
		clearReconnectTimer();
		if (!opts.reconnect) {
			resetReconnectState();
			setJoinPhase("connecting");
			setEditorSessionActive(false);
			setProjectReady(false);
		} else {
			setJoinPhase("reconnecting");
		}
		setGraphLiveFromLocal(false);

		const gen = ++socketGeneration;
		try {
			ws?.close();
		} catch {
			/* ignore */
		}
		ws = null;

		const socket = new WebSocket(wsUrl());
		ws = socket;

		/** Serialize inbound messages so `project` load finishes before applying `actions`. */
		let inboundTail = Promise.resolve();

		socket.addEventListener("open", () => {
			if (gen !== socketGeneration) return;
			setRemoteHostRpcHandler((req) => {
				if (socket.readyState !== WebSocket.OPEN) {
					return Promise.reject(new Error("WebSocket is not open."));
				}
				const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

		const enqueueInbound = (
			messageType: string,
			fn: () => void | Promise<void>,
			context?: Record<string, unknown>,
		) => {
			inboundTail = inboundTail.then(fn).catch((err) => {
				remoteInboundError(messageType, err, context);
			});
		};

		socket.addEventListener("message", (ev) => {
			if (gen !== socketGeneration) return;
			if (typeof ev.data !== "string") return;
			let parsed: unknown;
			try {
				parsed = JSON.parse(ev.data);
			} catch {
				return;
			}
			if (typeof parsed !== "object" || parsed === null) return;
			const body = parsed as Record<string, unknown>;
			remoteLog(
				`inbound message: ${typeof body.type === "string" ? body.type : "(no type)"}`,
				summarizeWireBody(body),
			);

			if (body.type === "authError") {
				clearRemoteRpc("Authentication failed.");
				resetReconnectState();
				setEditorSessionActive(false);
				setProjectReady(false);
				setAuthError("Wrong password or the host rejected this connection.");
				setJoinPhase("form");
				socket.close();
				return;
			}
			if (body.type === "rpcResponse" && typeof body.id === "string") {
				enqueueInbound("rpcResponse", () => {
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
			if (body.type === "actions") {
				if (!Array.isArray(body.items)) {
					remoteWarn("actions: items is not an array", {
						itemsType: typeof body.items,
						items: body.items,
					});
					return;
				}
				const validated = validateHistoryWireItems(body.items);
				if (!validated.ok) {
					remoteWarn(`actions: validation failed — ${validated.reason}`, {
						summary: summarizeWireBody(body),
					});
				}
				enqueueInbound(
					"actions",
					() => {
						runAsRemoteHistoryInbound(() =>
							applyRemoteHistoryItems(
								body.items as RemoteHistoryWireItem[],
							),
						);
					},
					{ summary: summarizeWireBody(body) },
				);
				return;
			}
			if (body.type === "graphPositionsEphemeral") {
				enqueueInbound(
					"graphPositionsEphemeral",
					() => {
						if (graphLiveFromLocal()) {
							remoteLog("graphPositionsEphemeral skipped (local drag active)");
							return;
						}
						const live = parseGraphPositionsEphemeralMessage(body);
						if (!live) {
							remoteWarn("graphPositionsEphemeral: parse failed", body);
							return;
						}
						runAsRemoteHistoryInbound(() =>
							applySetGraphItemPositionsPerform(live),
						);
					},
					{ summary: summarizeWireBody(body) },
				);
				return;
			}
			if (body.type === "cursor") {
				const cursor = parseCursorMessage(body);
				if (!cursor) {
					remoteWarn("cursor: parse failed", summarizeWireBody(body));
					return;
				}
				enqueueInbound("cursor", () => {
					if (cursor.position.x <= -9999) removeRemoteCursor(cursor.id);
					else updateRemoteCursor(cursor);
				});
				return;
			}
			if (body.type === "pinDrag") {
				const drag = parsePinDragMessage(body);
				if (!drag) {
					remoteWarn("pinDrag: parse failed", summarizeWireBody(body));
					return;
				}
				enqueueInbound("pinDrag", () => {
					if (drag.position.x <= -99999) removeRemotePinDrag(drag.id);
					else updateRemotePinDrag(drag);
				});
				return;
			}
			if (body.type === "selectionBox") {
				const box = parseSelectionBoxMessage(body);
				if (!box) {
					remoteWarn("selectionBox: parse failed", summarizeWireBody(body));
					return;
				}
				enqueueInbound("selectionBox", () => {
					if (box.width <= 0 && box.height <= 0)
						removeRemoteSelectionBox(box.id);
					else updateRemoteSelectionBox(box);
				});
				return;
			}
			if (body.type === "nodeExecute") {
				enqueueInbound("nodeExecute", () => {
					const msg = parseNodeExecuteMessage(body);
					if (!msg) return;
					const graph = core.project.getGraphByKind(
						msg.graphKind,
						msg.graphId,
					);
					if (!graph) return;
					const node = graph.nodes.get(msg.nodeId);
					if (!node) return;
					NODE_EMIT.emit(node);
				});
				return;
			}
			if (body.type === "users") {
				if (!Array.isArray(body.users)) {
					remoteWarn("users: not an array", { users: body.users });
					return;
				}
				enqueueInbound("users", () => {
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
			if (body.type === "project" && "project" in body) {
				const project = parseJsonWithContext(
					"remote-editor: wire project",
					serde.Project,
					JSON.stringify(body.project),
				);
				enqueueInbound("project", async () => {
					try {
						remoteLog("project: loading");
						await core.load((c) => deserializeProject(c, project));
						if (Array.isArray(body.nodeInvocations))
							await importInvocationLogFromProject(
								body.nodeInvocations as NodeInvocationFileRow[],
								"remote",
							);
						if (body.hostMirror)
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
						resetReconnectState();
						setEditorSessionActive(true);
						setJoinPhase("editor");
						setProjectReady(true);
						/* Let Solid mount Interface + sync registerRemoteHistoryActions before later queued WS work. */
						await new Promise<void>((r) => queueMicrotask(r));
					}
				});
				return;
			}

			// Second message with metadata (invocations, host mirror) for snappier load.
			if (body.type === "projectMetadata") {
				enqueueInbound("projectMetadata", async () => {
					if (Array.isArray(body.nodeInvocations))
						await importInvocationLogFromProject(
							body.nodeInvocations as NodeInvocationFileRow[],
							"remote",
						);
					if (body.hostMirror)
						pkgs.applyHostMirrorPayloadToCore(core, body.hostMirror);
					setProjectReady(true);
				});
				return;
			}

			if (body.type === "hostMirror" && body.hostMirror) {
				enqueueInbound("hostMirror", () => {
					pkgs.applyHostMirrorPayloadToCore(core, body.hostMirror);
				});
				return;
			}

			remoteWarn("inbound: unhandled message type", summarizeWireBody(body));
		});

		socket.addEventListener("close", () => {
			if (gen !== socketGeneration) return;
			ws = null;
			clearRemoteRpc("Remote connection closed.");
			if (joinPhase() === "form") return;

			if (!editorSessionActive()) {
				setAuthError((msg) =>
					msg || "Connection closed before the host sent a project.",
				);
				resetReconnectState();
				setJoinPhase("form");
				return;
			}
			scheduleReconnect();
		});

		socket.addEventListener("error", () => {
			if (gen !== socketGeneration) return;
			clearRemoteRpc("WebSocket error.");
			// `close` always follows; reconnect is handled there to avoid double scheduling.
		});
	}

	const startSession = () => openWebSocket();

	onCleanup(() => {
		clearRemoteRpc("Remote editor unloaded.");
		clearReconnectTimer();
		socketGeneration += 1;
		try {
			ws?.close();
		} catch {
			/* ignore */
		}
		ws = null;
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

			<Show
				when={
					!editorSessionActive() &&
					(joinPhase() === "connecting" || joinPhase() === "reconnecting")
				}
			>
				<div class="w-screen h-screen flex flex-col items-center justify-center text-neutral-300 gap-3">
					<IconSvgSpinners90Ring class="size-10" />
					<span>Connecting…</span>
				</div>
			</Show>

			<Show when={joinPhase() === "failed"}>
				<div class="w-screen h-screen flex flex-col items-center justify-center text-neutral-300 gap-4 p-6">
					<span class="text-3xl">⚠</span>
					<span class="text-lg font-medium">Connection lost</span>
					<p class="text-sm text-neutral-500 max-w-sm text-center">
						Could not reconnect to the host after 60 seconds. The host may
						have gone offline or the network is unreachable.
					</p>
					<button
						type="button"
						class="rounded bg-white text-neutral-900 px-4 py-2 text-sm font-medium hover:bg-neutral-200"
						onClick={() => {
							resetReconnectState();
							setEditorSessionActive(false);
							setProjectReady(false);
							setJoinPhase("form");
						}}
					>
						Back to login
					</button>
				</div>
			</Show>

			<Show
				when={
					editorSessionActive() &&
					joinPhase() !== "failed" &&
					joinPhase() !== "form" &&
					core.project
				}
			>
				<div class="relative w-screen h-screen">
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
						<KeyboardShortcutsDialog />
						<ConfigDialog />
					</PlatformContext.Provider>
					<Show when={!projectReady()}>
						<div class="absolute inset-0 z-50 flex items-center justify-center bg-neutral-950/60">
							<IconSvgSpinners90Ring class="size-10" />
						</div>
					</Show>
					<Show when={joinPhase() === "reconnecting"}>
						<div class="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-neutral-950/70 text-neutral-300">
							<IconSvgSpinners90Ring class="size-10" />
							<span>Connection lost. Reconnecting…</span>
							<span class="text-xs text-neutral-500">
								Attempt {reconnectState.attempts}
							</span>
						</div>
					</Show>
				</div>
			</Show>
		</QueryClientProvider>
	);
}
