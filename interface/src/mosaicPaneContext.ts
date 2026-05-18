import { createContextProvider } from "@solid-primitives/context";
import type { Setter } from "solid-js";

export const [MosaicPaneProvider, useMosaicPane] = createContextProvider(
	(props: { setHoveredGroupId: Setter<string | null> }) => props,
);
