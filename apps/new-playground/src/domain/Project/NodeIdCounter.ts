import { NodeId } from "../Node/data";

let nodeCounter = 0 as NodeId;

export function getNextNodeId() {
  return NodeId.make(++nodeCounter);
}
