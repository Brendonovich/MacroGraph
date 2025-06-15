import { createContext } from "solid-js";
import { GraphId } from "../../domain/Graph/data";
import { NodeId } from "../../domain/Node/data";
import { useContext } from "solid-js";

export type PresenceClient = {
  name: string;
  colour: string;
  mouse?: { graph: GraphId; x: number; y: number };
  selection?: { graph: GraphId; nodes: NodeId[] };
};

const PresenceContext = createContext<{
  clients: Record<number, PresenceClient>;
}>();

export const PresenceContextProvider = PresenceContext.Provider;

export function usePresenceContext() {
  const ctx = useContext(PresenceContext);
  if (!ctx)
    throw new Error(
      "usePresenceContext must be used within a PresenceContextProvider",
    );

  return ctx;
}
