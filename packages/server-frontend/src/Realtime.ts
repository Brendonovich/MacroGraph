import { createContext, useContext } from "solid-js";

const RealtimeContext = createContext<{ id: () => number }>();

export const RealtimeContextProvider = RealtimeContext.Provider;

export function useRealtimeContext() {
	const ctx = useContext(RealtimeContext);
	if (!ctx)
		throw new Error(
			"useRealtimeContext must be used within a RealtimeContextProvider",
		);

	return ctx;
}
