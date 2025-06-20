import { NodeId } from "../domain/Node/data";

export type IORef = `${NodeId}:${"i" | "o"}:${string}`;

export function parseIORef(ioRef: IORef) {
  const [nodeId, type, ...id] = ioRef.split(":");
  return {
    nodeId: NodeId.make(Number(nodeId)),
    type: type as "i" | "o",
    id: id.join(""),
  };
}
