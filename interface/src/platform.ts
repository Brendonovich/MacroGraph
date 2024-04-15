import { useContext } from "solid-js";
import { createContext } from "solid-js";

export interface Platform {
	projectPersistence?: {
		saveProject(saveAs?: boolean): Promise<void>;
		loadProject(): Promise<void>;
		url: string | null;
	};
}

export const PlatformContext = createContext<Platform | null>(null);

export function usePlatform() {
	const ctx = useContext(PlatformContext);

	if (!ctx) throw new Error("PlatformContext not mounted");

	return ctx;
}
