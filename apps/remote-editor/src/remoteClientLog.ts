/** Remote editor debug logging. `remoteLog`/`remoteWarn` are no-ops; errors always use `console.error`. */

const LS_KEY = "macrograph.remoteDebug";

let enabled =
	typeof localStorage !== "undefined" &&
	localStorage.getItem(LS_KEY) === "1";

if (typeof window !== "undefined") {
	const params = new URLSearchParams(window.location.search);
	if (params.get("remoteDebug") === "1") {
		enabled = true;
		try {
			localStorage.setItem(LS_KEY, "1");
		} catch {
			/* ignore */
		}
	}
}

export function isRemoteClientLogEnabled(): boolean {
	return enabled;
}

export function setRemoteClientLogEnabled(on: boolean) {
	enabled = on;
	try {
		if (on) localStorage.setItem(LS_KEY, "1");
		else localStorage.removeItem(LS_KEY);
	} catch {
		/* ignore */
	}
}

export function remoteLog(_message: string, _data?: unknown) {}

export function remoteWarn(_message: string, _data?: unknown) {}

function tag(): string {
	return `[remote-editor ${new Date().toISOString().slice(11, 23)}]`;
}

/** Always logged — inbound handler errors that break sync. */
export function remoteInboundError(
	messageType: string,
	err: unknown,
	context?: Record<string, unknown>,
) {
	const detail = {
		messageType,
		error: err instanceof Error ? err.message : String(err),
		stack: err instanceof Error ? err.stack : undefined,
		...context,
	};
	console.error(tag(), "inbound error", detail);
	if (enabled && err instanceof Error) console.error(err);
}

export function summarizeWireBody(body: Record<string, unknown>): Record<string, unknown> {
	const type = body.type;
	const summary: Record<string, unknown> = { type };

	if (type === "actions" && "items" in body) {
		const items = body.items;
		summary.itemsIsArray = Array.isArray(items);
		summary.itemCount = Array.isArray(items) ? items.length : undefined;
		if (Array.isArray(items)) {
			summary.actionTypes = items.map((it) =>
				typeof it === "object" && it !== null && "type" in it
					? String((it as { type: unknown }).type)
					: typeof it,
			);
			summary.actionEntryHints = items.map((it) =>
				summarizeHistoryEntry(it),
			);
		}
	}

	if (type === "graphPositionsEphemeral") {
		summary.graphKind = body.graphKind;
		summary.graphId = body.graphId;
		summary.itemsIsArray = Array.isArray(body.items);
		summary.itemCount = Array.isArray(body.items) ? body.items.length : undefined;
	}

	if (type === "cursor") {
		summary.id = body.id;
		summary.graphKind = body.graphKind;
		summary.graphId = body.graphId;
	}

	if (type === "users") {
		summary.usersIsArray = Array.isArray(body.users);
		summary.userCount = Array.isArray(body.users) ? body.users.length : undefined;
	}

	if (type === "project" || type === "projectMetadata") {
		summary.hasProject = "project" in body;
		summary.hasNodeInvocations = Array.isArray(body.nodeInvocations);
		summary.hasHostMirror = "hostMirror" in body;
	}

	return summary;
}

function summarizeHistoryEntry(it: unknown): Record<string, unknown> {
	if (typeof it !== "object" || it === null) return { kind: typeof it };
	const wire = it as { type?: unknown; entry?: unknown };
	const hint: Record<string, unknown> = {
		type: wire.type,
	};
	const entry = wire.entry;
	if (typeof entry !== "object" || entry === null) {
		hint.entryKind = typeof entry;
		return hint;
	}
	const e = entry as Record<string, unknown>;
	hint.graphKind = e.graphKind;
	hint.graphId = e.graphId;
	if ("items" in e) {
		hint.itemsIsArray = Array.isArray(e.items);
		hint.itemsLength = Array.isArray(e.items) ? e.items.length : undefined;
	}
	if ("selection" in e) {
		hint.selectionIsArray = Array.isArray(e.selection);
		hint.selectionLength = Array.isArray(e.selection)
			? e.selection.length
			: undefined;
	}
	if ("prev" in e) {
		hint.prevIsArray = Array.isArray(e.prev);
	}
	if ("nodes" in e) {
		hint.nodesIsArray = Array.isArray(e.nodes);
	}
	return hint;
}

export function validateHistoryWireItems(
	items: unknown,
): { ok: true; items: unknown[] } | { ok: false; reason: string } {
	if (!Array.isArray(items)) {
		return { ok: false, reason: `items is ${typeof items}, expected array` };
	}
	for (let i = 0; i < items.length; i++) {
		const it = items[i];
		if (typeof it !== "object" || it === null) {
			return { ok: false, reason: `items[${i}] is not an object` };
		}
		const wire = it as { type?: unknown; entry?: unknown };
		if (typeof wire.type !== "string") {
			return { ok: false, reason: `items[${i}].type is not a string` };
		}
		const bad = findNonIterableFields(wire.type, wire.entry);
		if (bad) {
			return {
				ok: false,
				reason: `items[${i}] (${wire.type}): ${bad}`,
			};
		}
	}
	return { ok: true, items };
}

function findNonIterableFields(
	actionType: string,
	entry: unknown,
): string | null {
	if (typeof entry !== "object" || entry === null) return null;
	const e = entry as Record<string, unknown>;

	const arrayFields: string[] = [];
	switch (actionType) {
		case "setGraphItemPositions":
			arrayFields.push("items");
			break;
		case "setGraphSelection":
			arrayFields.push("selection", "prev");
			break;
		case "deleteGraphItems":
		case "createGraphItems":
			arrayFields.push("nodes", "connections", "commentBoxes");
			break;
		default:
			break;
	}

	for (const field of arrayFields) {
		if (!(field in e)) continue;
		const v = e[field];
		if (v != null && !Array.isArray(v)) {
			return `${field} is ${typeof v} (not array)`;
		}
	}
	return null;
}
