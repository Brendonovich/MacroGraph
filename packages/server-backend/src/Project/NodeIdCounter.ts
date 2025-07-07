import { Node } from "@macrograph/server-domain";

let nodeCounter = Node.Id.make(0);

export function getNextNodeId() {
	return Node.Id.make(++nodeCounter);
}
