import { Graph, Node } from "@macrograph/server-domain";
import { createContext } from "solid-js";
import { useContext } from "solid-js";

export type PresenceClient = {
  name: string;
  colour: string;
  mouse?: { graph: Graph.Id; x: number; y: number };
  selection?: { graph: Graph.Id; nodes: Node.Id[] };
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
