import type { HistoryActions } from "@macrograph/action-history";
import { batch, createRoot, createSignal } from "solid-js";

export type RemoteHistoryWireItem = { type: string; entry: unknown };

/**
 * Clone for JSON: breaks cycles (e.g. schema → package → core → project) by
 * replacing back-edges with `undefined`, which JSON.stringify omits on object keys.
 */
export function toWireJsonSerializable(value: unknown): unknown {
	const path = new Set<object>();

	function walk(v: unknown): unknown {
		if (v === undefined) return undefined;
		if (v === null) return null;
		const t = typeof v;
		if (t === "string" || t === "number" || t === "boolean") return v;
		if (t === "bigint") return (v as bigint).toString();
		if (t === "function" || t === "symbol") return undefined;
		if (typeof v === "object") {
			if (v instanceof Date) return (v as Date).toISOString();
			if (path.has(v as object)) return undefined;
			path.add(v as object);
			try {
				if (Array.isArray(v)) {
					return v.map((item) => walk(item));
				}
				const out: Record<string, unknown> = {};
				for (const k of Object.keys(v as object)) {
					let child: unknown;
					try {
						child = (v as Record<string, unknown>)[k];
					} catch {
						continue;
					}
					const nv = walk(child);
					if (nv !== undefined) out[k] = nv;
				}
				return out;
			} finally {
				path.delete(v as object);
			}
		}
		return undefined;
	}

	return walk(value);
}

export function stringifyRemoteHistoryWirePayload(payload: unknown): string {
	return JSON.stringify(toWireJsonSerializable(payload));
}

let inboundDepth = 0;

export function isRemoteHistoryInboundApply() {
	return inboundDepth > 0;
}

export function runAsRemoteHistoryInbound<T>(fn: () => T): T {
	inboundDepth += 1;
	try {
		return fn();
	} finally {
		inboundDepth -= 1;
	}
}

let actionsRef: HistoryActions | null = null;

/** Registers perform handlers for the active editor session (cleared on unmount). */
export function registerRemoteHistoryActions(actions: HistoryActions | null) {
	actionsRef = actions;
}

export function applyRemoteHistoryItems(items: RemoteHistoryWireItem[]) {
	const actions = actionsRef;
	if (!actions) {
		console.warn("applyRemoteHistoryItems: no editor session registered");
		return;
	}
	batch(() => {
		for (const it of items) {
			const a = actions[it.type] as { perform: (e: unknown) => unknown } | undefined;
			if (a?.perform) {
				try {
					a.perform(it.entry);
				} catch (e) {
					console.error("applyRemoteHistoryItems", it.type, e);
				}
			} else {
				console.warn("Unknown remote history action:", it.type);
			}
		}
	});
}

/** Same payload shape as `setGraphItemPositions` perform (no `from` required for forward apply). */
export type WireGraphPositionsEphemeral = {
	graphId: number;
	items: Array<{
		itemId: number;
		itemVariant: "node" | "commentBox";
		position: { x: number; y: number };
	}>;
};

/** Live drag frames: mirrors local `execute("setGraphItemPositions", …, { ephemeral: true })` perform path. */
export function applySetGraphItemPositionsPerform(entry: WireGraphPositionsEphemeral) {
	const actions = actionsRef;
	if (!actions) {
		console.warn("applySetGraphItemPositionsPerform: no editor session registered");
		return;
	}
	batch(() => {
		try {
			const act = actions as unknown as {
				setGraphItemPositions: { perform: (e: unknown) => unknown };
			};
			act.setGraphItemPositions.perform(entry);
		} catch (e) {
			console.error("applySetGraphItemPositionsPerform", e);
		}
	});
}

export function stringifyGraphPositionsEphemeralWire(
	graphId: number,
	items: WireGraphPositionsEphemeral["items"],
): string {
	return JSON.stringify(
		toWireJsonSerializable({
			type: "graphPositionsEphemeral",
			graphId,
			items,
		}),
	);
}

function parseWireNumber(n: unknown): number | null {
	if (typeof n === "number" && Number.isFinite(n)) return n;
	if (typeof n === "string" && n.trim() !== "" && Number.isFinite(Number(n))) return Number(n);
	return null;
}

function parseWirePosition(pos: unknown): { x: number; y: number } | null {
	if (Array.isArray(pos) && pos.length >= 2) {
		const x = parseWireNumber(pos[0]);
		const y = parseWireNumber(pos[1]);
		if (x != null && y != null) return { x, y };
		return null;
	}
	if (typeof pos === "object" && pos !== null) {
		const o = pos as Record<string, unknown>;
		const x = parseWireNumber(o.x);
		const y = parseWireNumber(o.y);
		if (x != null && y != null) return { x, y };
	}
	return null;
}

export type WireCursorPosition = {
	id: string;
	graphId: number;
	position: { x: number; y: number };
};

export type RemoteCursor = WireCursorPosition;

// Module-level cursor state using a Map + version counter for reliable reactivity
const cursorMap = new Map<string, RemoteCursor>();
const [cursorVersion, setCursorVersion] = /*@once*/ createRoot(() => createSignal(0));

// Module-level user list and follow state
const [userListSignal, setUserListSignal] = /*@once*/ createRoot(() => createSignal<[string, string][]>([["host", "Host"]]));
const [followUserIdSignal, setFollowUserIdSignal] = /*@once*/ createRoot(() => createSignal<string | null>(null));

export function getUserList(): [string, string][] {
	return userListSignal();
}

export function setUserList(users: [string, string][]) {
	setUserListSignal(users);
}

export function getFollowUserId(): string | null {
	return followUserIdSignal();
}

export function setFollowUserId(id: string | null) {
	setFollowUserIdSignal(id);
}

export function getRemoteCursors(): RemoteCursor[] {
	cursorVersion();
	return [...cursorMap.values()];
}

export function updateRemoteCursor(cursor: RemoteCursor) {
	cursorMap.set(cursor.id, cursor);
	setCursorVersion((v) => v + 1);
	onCursorUpdate?.(cursor);
}

export function removeRemoteCursor(id: string) {
	if (cursorMap.delete(id)) setCursorVersion((v) => v + 1);
}

// Remote pin drag state — ephemeral wire preview shown on other clients.
export type RemotePinDrag = {
	id: string;
	graphId: number;
	pinNodeId: number;
	pinId: string;
	isOutput: boolean;
	position: { x: number; y: number };
};

const pinDragMap = new Map<string, RemotePinDrag>();
const [pinDragVersion, setPinDragVersion] = /*@once*/ createRoot(() => createSignal(0));

export function getRemotePinDrags(): RemotePinDrag[] {
	pinDragVersion();
	return [...pinDragMap.values()];
}

export function updateRemotePinDrag(drag: RemotePinDrag) {
	pinDragMap.set(drag.id, drag);
	setPinDragVersion((v) => v + 1);
}

export function removeRemotePinDrag(id: string) {
	if (pinDragMap.delete(id)) setPinDragVersion((v) => v + 1);
}

// Remote selection box state — drag-select rectangle shown on other clients.
export type RemoteSelectionBox = {
	id: string;
	graphId: number;
	x: number;
	y: number;
	width: number;
	height: number;
};

const selectionBoxMap = new Map<string, RemoteSelectionBox>();
const [selectionBoxVersion, setSelectionBoxVersion] = /*@once*/ createRoot(() => createSignal(0));

export function getRemoteSelectionBoxes(): RemoteSelectionBox[] {
	selectionBoxVersion();
	return [...selectionBoxMap.values()];
}

export function updateRemoteSelectionBox(box: RemoteSelectionBox) {
	selectionBoxMap.set(box.id, box);
	setSelectionBoxVersion((v) => v + 1);
}

export function removeRemoteSelectionBox(id: string) {
	if (selectionBoxMap.delete(id)) setSelectionBoxVersion((v) => v + 1);
}

let onCursorUpdate: ((cursor: RemoteCursor) => void) | null = null;
export function setOnCursorUpdate(fn: typeof onCursorUpdate) {
	onCursorUpdate = fn;
}

// Broadcast callbacks registered by host/remote editors
let cursorBroadcastFn: ((pos: { graphId: number; position: { x: number; y: number } }) => void) | null = null;
export function setCursorBroadcastFn(fn: typeof cursorBroadcastFn) {
	cursorBroadcastFn = fn;
}

export function broadcastCursorPosition(pos: { graphId: number; position: { x: number; y: number } }) {
	cursorBroadcastFn?.(pos);
}

let pinDragBroadcastFn: ((drag: RemotePinDrag) => void) | null = null;
export function setPinDragBroadcastFn(fn: typeof pinDragBroadcastFn) {
	pinDragBroadcastFn = fn;
}

export function broadcastPinDrag(drag: RemotePinDrag) {
	pinDragBroadcastFn?.(drag);
}

let selectionBoxBroadcastFn: ((box: RemoteSelectionBox) => void) | null = null;
export function setSelectionBoxBroadcastFn(fn: typeof selectionBoxBroadcastFn) {
	selectionBoxBroadcastFn = fn;
}

export function broadcastSelectionBox(box: RemoteSelectionBox) {
	selectionBoxBroadcastFn?.(box);
}

export function stringifyCursorWire(payload: WireCursorPosition): string {
	return JSON.stringify(
		toWireJsonSerializable({
			type: "cursor",
			...payload,
		}),
	);
}

export function parseCursorMessage(
	body: Record<string, unknown>,
): WireCursorPosition | null {
	if (body.type !== "cursor") return null;
	const id = typeof body.id === "string" ? body.id : null;
	if (!id) return null;
	const graphId = parseWireNumber(body.graphId);
	if (graphId == null) return null;
	const position = parseWirePosition(body.position);
	if (!position) return null;
	return { id, graphId, position };
}

export function stringifyNodeExecuteWire(graphId: number, nodeId: number): string {
	return JSON.stringify({ type: "nodeExecute", graphId, nodeId });
}

export function parseNodeExecuteMessage(
	body: Record<string, unknown>,
): { graphId: number; nodeId: number } | null {
	if (body.type !== "nodeExecute") return null;
	const graphId = parseWireNumber(body.graphId);
	const nodeId = parseWireNumber(body.nodeId);
	if (graphId == null || nodeId == null) return null;
	return { graphId, nodeId };
}

export function parseGraphPositionsEphemeralMessage(
	body: Record<string, unknown>,
): WireGraphPositionsEphemeral | null {
	if (body.type !== "graphPositionsEphemeral") return null;
	const graphId = parseWireNumber(body.graphId);
	if (graphId == null || !Array.isArray(body.items)) return null;
	const items: WireGraphPositionsEphemeral["items"] = [];
	for (const raw of body.items) {
		if (typeof raw !== "object" || raw === null) return null;
		const it = raw as Record<string, unknown>;
		const itemId = parseWireNumber(it.itemId);
		if (itemId == null) return null;
		if (it.itemVariant !== "node" && it.itemVariant !== "commentBox") return null;
		const position = parseWirePosition(it.position);
		if (!position) return null;
		items.push({
			itemId,
			itemVariant: it.itemVariant,
			position,
		});
	}
	return { graphId, items };
}

export function stringifyPinDragWire(payload: RemotePinDrag): string {
	return JSON.stringify(
		toWireJsonSerializable({ type: "pinDrag", ...payload }),
	);
}

export function parsePinDragMessage(
	body: Record<string, unknown>,
): RemotePinDrag | null {
	if (body.type !== "pinDrag") return null;
	const id = typeof body.id === "string" ? body.id : null;
	if (!id) return null;
	const graphId = parseWireNumber(body.graphId);
	const pinNodeId = parseWireNumber(body.pinNodeId);
	const pinId = typeof body.pinId === "string" ? body.pinId : null;
	const isOutput = body.isOutput === true;
	const position = parseWirePosition(body.position);
	if (graphId == null || pinNodeId == null || !pinId || !position) return null;
	return { id, graphId, pinNodeId, pinId, isOutput, position };
}

export function stringifySelectionBoxWire(payload: RemoteSelectionBox): string {
	return JSON.stringify(
		toWireJsonSerializable({ type: "selectionBox", ...payload }),
	);
}

export function parseSelectionBoxMessage(
	body: Record<string, unknown>,
): RemoteSelectionBox | null {
	if (body.type !== "selectionBox") return null;
	const id = typeof body.id === "string" ? body.id : null;
	if (!id) return null;
	const graphId = parseWireNumber(body.graphId);
	const x = parseWireNumber(body.x);
	const y = parseWireNumber(body.y);
	const width = parseWireNumber(body.width);
	const height = parseWireNumber(body.height);
	if (graphId == null || x == null || y == null || width == null || height == null)
		return null;
	return { id, graphId, x, y, width, height };
}
