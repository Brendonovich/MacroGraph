import type { CommentBox } from "../models";
import type { Node } from "../models/Node";

export * from "./pins";

export type XY = { x: number; y: number };
export type Size = { width: number; height: number };

export const map = <I, O>(value: I | null, cb: (v: I) => O): O | null => {
	if (value === null) return null;
	return cb(value);
};

export type WsMessage = "Connected" | "Disconnected" | { Text: string };

export interface WsProvider<TServer> {
	startServer(
		port: number,
		cb: (text: [number, WsMessage]) => void,
	): Promise<TServer>;
	stopServer(server: TServer): Promise<void>;
	sendMessage(data: {
		data: string;
		port: number;
		client: number | null;
	}): Promise<null>;
}

export function createWsProvider<T>(p: WsProvider<T>) {
	return p;
}

// Modified from the amazing Tanstack Query library (MIT)
// https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts#L168
export function hashKey<T extends Array<any>>(args: T): string {
	return JSON.stringify(args, (_, val) =>
		isPlainObject(val)
			? Object.keys(val)
					.sort()
					.reduce((result, key) => {
						result[key] = val[key];
						return result;
					}, {} as any)
			: val,
	);
}

function isPlainObject(obj: any): obj is Record<string, any> {
	if (obj === null || typeof obj !== "object") return false;

	const proto = Object.getPrototypeOf(obj);
	return !proto || proto === Object.prototype;
}

export type GetNodeSize = (node: Node) => Size | undefined;

export function getNodesInRect(
	nodes: IterableIterator<Node>,
	rect: DOMRect,
	getNodeSize: GetNodeSize,
	padding = 0,
) {
	const ret = new Set<Node>();

	for (const node of nodes) {
		const nodePosition = node.state.position;

		if (nodePosition.x + padding < rect.x || nodePosition.y + padding < rect.y)
			continue;

		const nodeSize = getNodeSize(node);
		if (!nodeSize) continue;

		if (
			nodePosition.x + nodeSize.width - padding > rect.x + rect.width ||
			nodePosition.y + nodeSize.height - padding > rect.y + rect.height
		)
			continue;

		ret.add(node);
	}

	return ret;
}

export function getCommentBoxesInRect(
	boxes: IterableIterator<CommentBox>,
	rect: DOMRect,
	padding = 0,
) {
	const ret = new Set<CommentBox>();

	for (const box of boxes) {
		const position = box.position;

		if (position.x + padding < rect.x || position.y + padding < rect.y)
			continue;

		if (
			position.x + box.size.x - padding > rect.x + rect.width ||
			position.y + box.size.y - padding > rect.y + rect.height
		)
			continue;

		ret.add(box);
	}

	return ret;
}
