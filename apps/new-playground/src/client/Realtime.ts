import { createContext, useContext } from "solid-js";

export interface RealtimeState {
  realtimeId: string;
}

const RealtimeContext = createContext<{ state: RealtimeState }>();

export const RealtimeContextProvider = RealtimeContext.Provider;

export function useRealtimeContext() {
  const ctx = useContext(RealtimeContext);
  if (!ctx)
    throw new Error(
      "useRealtimeContext must be used within a RealtimeContextProvider",
    );

  return ctx;
}
