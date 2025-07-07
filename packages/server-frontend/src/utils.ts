import { Node } from "@macrograph/server-domain";

export type IORef = `${Node.Id}:${"i" | "o"}:${string}`;

export function parseIORef(ioRef: IORef) {
	const [nodeId, type, ...id] = ioRef.split(":");
	return {
		nodeId: Node.Id.make(Number(nodeId)),
		type: type as "i" | "o",
		id: id.join(""),
	};
}

import { isMobile } from "@solid-primitives/platform";

export const isTouchDevice = isMobile || navigator.maxTouchPoints > 0;
