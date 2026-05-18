import {
	applyRemoteHistoryItems,
	applySetGraphItemPositionsPerform,
	exportInvocationLogForGraphs,
	parseGraphPositionsEphemeralMessage,
	parseCursorMessage,
	parsePinDragMessage,
	parseSelectionBoxMessage,
	runAsRemoteHistoryInbound,
	stringifyGraphPositionsEphemeralWire,
	stringifyCursorWire,
	stringifyNodeExecuteWire,
	stringifyRemoteHistoryWirePayload,
	updateRemoteCursor,
	removeRemoteCursor,
	updateRemotePinDrag,
	removeRemotePinDrag,
	updateRemoteSelectionBox,
	removeRemoteSelectionBox,
	setUserList,
	type RemoteHistoryWireItem,
	type WireGraphPositionsEphemeral,
} from "@macrograph/interface";
import {
	collectHostMirrorPayload,
	registerHostMirrorCore,
	scheduleHostMirrorSync,
	setHostMirrorBroadcast,
	type HostMirrorPayload,
} from "@macrograph/packages";
import { NODE_EMIT, rerunNodeFromInvocationSnapshot, type Core } from "@macrograph/runtime";
import {
	serializeProject,
	type NodeInvocationFileRow,
} from "@macrograph/runtime-serde";
import type { Accessor } from "solid-js";
import { createEffect, createSignal, onCleanup } from "solid-js";

import { client } from "./rspc";
import type { RemoteServerMessage } from "./rspc/types";
import { remoteHostSettings } from "./remoteHostSettings";

let _setHostGraphLivePointerSession: ((active: boolean) => void) | null = null;
export function setHostGraphLivePointerSession(active: boolean) {
	_setHostGraphLivePointerSession?.(active);
}

const userNames = new Map<number, string>();

const OBS_PKG_NAME = "OBS Websocket";
const TWITCH_PKG_NAME = "Twitch Events";

function twitchPkg(core: Core) {
	return core.packages.find((p) => p.name === TWITCH_PKG_NAME) as
		| { ctx?: { auth: { enableAccount(id: string): Promise<void>; disableAccount(id: string): void } } }
		| undefined;
}

type ObsHostCtx = {
	instances: Map<
		string,
		| { state: "disconnected" | "connecting"; password: string | null }
		| {
				state: "connected";
				password: string | null;
				obs: {
					call(t: string, d?: unknown): Promise<unknown>;
					callBatch?(
						r: { requestType: string; requestData?: unknown }[],
					): Promise<unknown[]>;
				};
		  }
	>;
};

function isTextMessage(
	msg: RemoteServerMessage,
): msg is { Text: string } & RemoteServerMessage {
	return typeof msg === "object" && msg !== null && "Text" in msg;
}

function getHostObsClient(core: Core, url: string) {
	const obsPkg = core.packages.find((p) => p.name === OBS_PKG_NAME);
	const ctx = obsPkg?.ctx as ObsHostCtx | undefined;
	const inst = ctx?.instances.get(url);
	if (!inst || inst.state !== "connected") {
		throw new Error(`OBS at ${url} is not connected on the host.`);
	}
	return inst.obs;
}

async function handleRemoteRpcRequest(opts: {
	core: Core;
	clientId: number;
	id: string;
	method: string;
	params: unknown;
	workspaceKey: string;
}) {
	const { core, clientId, id, method, params, workspaceKey } = opts;
	const port = remoteHostSettings.port;

	const reply = (payload: Record<string, unknown>) => {
		void client.mutation([
			"remoteHost.send",
			{ port, client: clientId, data: JSON.stringify(payload) },
		]);
	};

	try {
		let result: unknown;
		if (method === "obs.call") {
			const p = params as {
				url?: string;
				requestType?: string;
				requestData?: unknown;
			};
			if (typeof p.url !== "string" || typeof p.requestType !== "string") {
				throw new Error("Invalid obs.call params.");
			}
			const obs = getHostObsClient(core, p.url);
			result = await obs.call(p.requestType, p.requestData);
		} else if (method === "obs.callBatch") {
			const p = params as {
				url?: string;
				requests?: { requestType: string; requestData?: unknown }[];
			};
			if (typeof p.url !== "string" || !Array.isArray(p.requests)) {
				throw new Error("Invalid obs.callBatch params.");
			}
			const obs = getHostObsClient(core, p.url);
			if (!obs.callBatch) {
				throw new Error("OBS client on host does not support callBatch.");
			}
			result = await obs.callBatch(p.requests);
		} else if (method === "rerunNode") {
			const p = params as { graphId?: number; nodeId?: number; inputs?: Record<string, unknown>; eventData?: unknown };
			if (typeof p.graphId !== "number" || typeof p.nodeId !== "number") {
				throw new Error("Invalid rerunNode params.");
			}
			const graph = core.project.graphs.get(p.graphId);
			if (!graph) throw new Error(`Graph ${p.graphId} not found`);
			const node = graph.nodes.get(p.nodeId);
			if (!node) throw new Error(`Node ${p.nodeId} not found`);
			await rerunNodeFromInvocationSnapshot(node, {
				inputs: p.inputs ?? {},
				eventData: p.eventData,
			});
			result = undefined;
		} else if (method === "getNodeInvocations") {
			const p = params as { graphId?: number; nodeId?: number };
			if (typeof p.graphId !== "number" || typeof p.nodeId !== "number") {
				throw new Error("Invalid getNodeInvocations params.");
			}
			const rows = await exportInvocationLogForGraphs(
				[p.graphId],
				workspaceKey,
			).catch((): NodeInvocationFileRow[] => []);
			const match = rows.find((r) => r.nodeId === p.nodeId);
			result = { entries: match?.entries ?? [] };
		} else if (method === "twitch.enableAccount") {
			const p = params as { credentialId?: string };
			if (typeof p.credentialId !== "string") {
				throw new Error("Invalid twitch.enableAccount params.");
			}
			const twitch = twitchPkg(core);
			if (!twitch?.ctx) throw new Error("Twitch package is not loaded on the host.");
			await twitch.ctx.auth.enableAccount(p.credentialId);
			scheduleHostMirrorSync(core);
			result = undefined;
		} else if (method === "twitch.disableAccount") {
			const p = params as { credentialId?: string };
			if (typeof p.credentialId !== "string") {
				throw new Error("Invalid twitch.disableAccount params.");
			}
			const twitch = twitchPkg(core);
			if (!twitch?.ctx) throw new Error("Twitch package is not loaded on the host.");
			twitch.ctx.auth.disableAccount(p.credentialId);
			scheduleHostMirrorSync(core);
			result = undefined;
		} else {
			throw new Error(`Unknown RPC method: ${method}`);
		}
		reply({ type: "rpcResponse", id, ok: true, result });
	} catch (e) {
		reply({
			type: "rpcResponse",
			id,
			ok: false,
			error: e instanceof Error ? e.message : String(e),
		});
	}
}

/** Broadcast live drag frames from the host editor to all remote clients. */
export function broadcastRemoteHostGraphPositionsLive(
	payload: WireGraphPositionsEphemeral,
	exceptClientId: number | null = null,
) {
	if (!remoteHostSettings.enabled) return;
	const port = remoteHostSettings.port;
	const data = stringifyGraphPositionsEphemeralWire(payload.graphId, payload.items);
	void client.mutation([
		"remoteHost.send",
		{
			port,
			client: null,
			except_client: exceptClientId ?? undefined,
			data,
		},
	]);
}

function broadcastUserList(port: number) {
	const users: [string, string][] = [["host", "Host"]];
	for (const [, name] of userNames) users.push([name, name]);
	setUserList(users);
	void client.mutation([
		"remoteHost.send",
		{ port, client: null, data: JSON.stringify({ type: "users", users }) },
	]);
}

// Batches incoming viewer cursor relays and flushes them together each rAF frame
const pendingCursorRelays = new Map<number, string>();
let cursorRelayRaf: number | null = null;

function flushCursorRelays() {
	cursorRelayRaf = null;
	const port = remoteHostSettings.port;
	for (const [exceptClient, data] of pendingCursorRelays) {
		void client.mutation([
			"remoteHost.send",
			{ port, client: null, except_client: exceptClient, data },
		]);
	}
	pendingCursorRelays.clear();
}

/** Broadcast host cursor position to all remote clients. */
export function broadcastRemoteHostCursorPosition(payload: { graphId: number; position: { x: number; y: number }; viewportCenter?: { x: number; y: number } }) {
	if (!remoteHostSettings.enabled) return;
	const port = remoteHostSettings.port;
	const data = stringifyCursorWire({ id: "host", ...payload });
	void client.mutation([
		"remoteHost.send",
		{ port, client: null, data },
	]);
}

/** Broadcast host pin drag to all remote clients. */
export function broadcastRemoteHostPinDrag(drag: import("@macrograph/interface").RemotePinDrag) {
	if (!remoteHostSettings.enabled) return;
	const port = remoteHostSettings.port;
	void client.mutation([
		"remoteHost.send",
		{ port, client: null, data: JSON.stringify({ type: "pinDrag", ...drag, id: "host" }) },
	]);
}

/** Broadcast host selection box to all remote clients. */
export function broadcastRemoteHostSelectionBox(box: import("@macrograph/interface").RemoteSelectionBox) {
	if (!remoteHostSettings.enabled) return;
	const port = remoteHostSettings.port;
	void client.mutation([
		"remoteHost.send",
		{ port, client: null, data: JSON.stringify({ type: "selectionBox", ...box, id: "host" }) },
	]);
}

function broadcastHostMirrorToRemotes(hostMirror: HostMirrorPayload) {
	if (!remoteHostSettings.enabled) return;
	const port = remoteHostSettings.port;
	void client.mutation([
		"remoteHost.send",
		{
			port,
			client: null,
			data: JSON.stringify({ type: "hostMirror", hostMirror }),
		},
	]);
}

/** Broadcast committed editor actions from the host desktop to all remote clients. */
export function broadcastRemoteHostHistoryActions(items: RemoteHistoryWireItem[]) {
	if (!remoteHostSettings.enabled) return;
	const port = remoteHostSettings.port;
	const data = stringifyRemoteHistoryWirePayload({ type: "actions", items });
	void client.mutation([
		"remoteHost.send",
		{ port, client: null, data },
	]);
}

export function installRemoteHostBridge(opts: {
	core: Core;
	projectUrl: Accessor<string | null>;
}) {
	const [hostGraphLiveFromLocal, setHostGraphLiveFromLocal] = createSignal(false);
	_setHostGraphLivePointerSession = setHostGraphLiveFromLocal;

	let subscription: (() => void) | undefined;
	let prevEnabled = false;
	let prevPort = 37564;

	const ensureSubscription = () => {
		const enabled = remoteHostSettings.enabled;
		const port = remoteHostSettings.port;

		if (subscription && prevEnabled === enabled && prevPort === port) return;
		if (subscription) {
			subscription();
			subscription = undefined;
		}
		prevEnabled = enabled;
		prevPort = port;

		if (!enabled) {
			setHostMirrorBroadcast(null);
			registerHostMirrorCore(null);
			return;
		}

		registerHostMirrorCore(opts.core);
		setHostMirrorBroadcast(broadcastHostMirrorToRemotes);

		const sendSnapshot = (clientId: number | null) => {
			// Send the project immediately so the remote client can start loading.
			const project = serializeProject(opts.core.project);
			void client.mutation([
				"remoteHost.send",
				{
					port,
					client: clientId,
					data: JSON.stringify({ type: "project", project }),
				},
			]);
			// Then collect async metadata (invocations, host mirror) and update.
			void (async () => {
				const [nodeInvocations, hostMirror] = await Promise.all([
					exportInvocationLogForGraphs(
						opts.core.project.allGraphOrder as number[],
						opts.projectUrl() ?? "default",
					).catch((): NodeInvocationFileRow[] => []),
					collectHostMirrorPayload(opts.core).catch(
						(): HostMirrorPayload => ({ v: 2, credentials: [], twitchUsers: [], twitchPersisted: {}, slices: [] }),
					),
				]);
				await client.mutation([
					"remoteHost.send",
					{
						port,
						client: clientId,
						data: JSON.stringify({ type: "projectMetadata", project, nodeInvocations, hostMirror }),
					},
				]);
			})();
		};

		broadcastUserList(port);

		const u = client.addSubscription(["remoteHost.server", port], {
			onData([clientId, msg]: [number, RemoteServerMessage]) {
				if (msg === "Connected") {
					sendSnapshot(clientId);
					return;
				}
				if (typeof msg === "object" && msg !== null && "ConnectedWithUser" in msg) {
					const username = (msg as { ConnectedWithUser: { username: string } }).ConnectedWithUser.username;
					userNames.set(clientId, username);
					sendSnapshot(clientId);
					broadcastUserList(port);
					return;
				}
				if (msg === "Disconnected") {
					userNames.delete(clientId);
					broadcastUserList(port);
					return;
				}
				if (!isTextMessage(msg)) return;

				let parsed: unknown;
				try {
					parsed = JSON.parse(msg.Text);
				} catch {
					return;
				}
				if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) {
					return;
				}
				const wireType = (parsed as { type: string }).type;

				if (wireType === "rpcRequest") {
					const body = parsed as {
						type: string;
						id?: unknown;
						method?: unknown;
						params?: unknown;
					};
					if (
						typeof body.id === "string" &&
						typeof body.method === "string" &&
						"params" in body
					) {
					void handleRemoteRpcRequest({
						core: opts.core,
						clientId,
						id: body.id,
						method: body.method,
						params: body.params,
						workspaceKey: opts.projectUrl() ?? "default",
					});
					}
					return;
				}

				if (wireType === "actions") {
					const body = parsed as { items?: unknown };
					if (!Array.isArray(body.items)) return;
					const items = body.items as RemoteHistoryWireItem[];
					runAsRemoteHistoryInbound(() => applyRemoteHistoryItems(items));
					const relayPort = port;
					const relayData = stringifyRemoteHistoryWirePayload({
						type: "actions",
						items,
					});
					void client.mutation([
						"remoteHost.send",
						{
							port: relayPort,
							client: null,
							except_client: clientId,
							data: relayData,
						},
					]);
					return;
				}

				if (wireType === "graphPositionsEphemeral") {
					const body = parsed as Record<string, unknown>;
					const live = parseGraphPositionsEphemeralMessage(body);
					if (!live) return;
					if (hostGraphLiveFromLocal()) return;
					runAsRemoteHistoryInbound(() => applySetGraphItemPositionsPerform(live));
					const relayPort = port;
					const relayData = stringifyGraphPositionsEphemeralWire(
						live.graphId,
						live.items,
					);
					void client.mutation([
						"remoteHost.send",
						{
							port: relayPort,
							client: null,
							except_client: clientId,
							data: relayData,
						},
					]);
					return;
				}

				if (wireType === "cursor") {
					const body = parsed as Record<string, unknown>;
					const cursor = parseCursorMessage(body);
					if (!cursor) {
						console.warn("remoteHostBridge: failed to parse cursor", body);
						return;
					}
					const name = userNames.get(clientId) ?? `client-${clientId}`;
					const relayCursor = { ...cursor, id: name };
					if (relayCursor.position.x <= -9999) removeRemoteCursor(relayCursor.id);
					else updateRemoteCursor(relayCursor);
					pendingCursorRelays.set(clientId, JSON.stringify({ ...body, id: name }));
					if (cursorRelayRaf === null) {
						cursorRelayRaf = requestAnimationFrame(flushCursorRelays);
					}
					return;
				}

				if (wireType === "pinDrag") {
					const body = parsed as Record<string, unknown>;
					const drag = parsePinDragMessage(body);
					if (!drag) return;
					const name = userNames.get(clientId) ?? `client-${clientId}`;
					const relayDrag = { ...drag, id: name };
					if (relayDrag.position.x <= -99999) removeRemotePinDrag(relayDrag.id);
					else updateRemotePinDrag(relayDrag);
					void client.mutation([
						"remoteHost.send",
						{
							port,
							client: null,
							except_client: clientId,
							data: JSON.stringify({ type: "pinDrag", ...relayDrag }),
						},
					]);
					return;
				}

				if (wireType === "selectionBox") {
					const body = parsed as Record<string, unknown>;
					const box = parseSelectionBoxMessage(body);
					if (!box) return;
					const name = userNames.get(clientId) ?? `client-${clientId}`;
					const relayBox = { ...box, id: name };
					if (relayBox.width <= 0 && relayBox.height <= 0) removeRemoteSelectionBox(relayBox.id);
					else updateRemoteSelectionBox(relayBox);
					void client.mutation([
						"remoteHost.send",
						{
							port,
							client: null,
							except_client: clientId,
							data: JSON.stringify({ type: "selectionBox", ...relayBox }),
						},
					]);
					return;
				}

				console.warn("remoteHostBridge: unknown message type", wireType);
			},
		});

		subscription = u;
	};

	createEffect(() => {
		const raw = remoteHostSettings.password?.trim() ?? "";
		const pwd = raw === "" ? null : raw;
		void client.mutation(["remoteHost.setPassword", pwd]);
	});

	createEffect(() => {
		remoteHostSettings.enabled;
		remoteHostSettings.port;
		ensureSubscription();
	});

	let cleanupNodeEmit: (() => void) | undefined;
	createEffect(() => {
		if (!remoteHostSettings.enabled) return;
		cleanupNodeEmit = NODE_EMIT.onAny((node) => {
			const port = remoteHostSettings.port;
			const data = stringifyNodeExecuteWire(node.graph.id, node.id);
			void client.mutation([
				"remoteHost.send",
				{ port, client: null, data },
			]);
		});
		onCleanup(() => cleanupNodeEmit?.());
	});

	onCleanup(() => {
		subscription?.();
		cleanupNodeEmit?.();
	});
}
