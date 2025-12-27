import type { IO } from "@macrograph/project-domain";
import type { NullableBounds } from "@solid-primitives/bounds";
import { ReactiveMap } from "@solid-primitives/map";
import { type Accessor, createContext, useContext } from "solid-js";

export const createGraphContext = (
	bounds: Accessor<Readonly<NullableBounds>>,
	translate: Accessor<{ x: number; y: number } | undefined>,
) => {
	const ioPositions = new ReactiveMap<IO.RefString, { x: number; y: number }>();

	return {
		ioPositions,
		get bounds() {
			return bounds();
		},
		get translate() {
			return translate();
		},
		getScreenPosition(position: { x: number; y: number }) {
			return {
				x: position.x + (bounds().left ?? 0) + (translate()?.x ?? 0),
				y: position.y + (bounds().top ?? 0) + (translate()?.y ?? 0),
			};
		},
		getGraphPosition(position: { x: number; y: number }) {
			return {
				x: position.x - (bounds().left ?? 0) + (translate()?.x ?? 0),
				y: position.y - (bounds().top ?? 0) + (translate()?.y ?? 0),
			};
		},
	};
};

export const GraphContext =
	createContext<ReturnType<typeof createGraphContext>>();

export function useGraphContext() {
	const ctx = useContext(GraphContext);
	if (!ctx)
		throw new Error(
			"useGraphContext must be used within a GraphContextProvider",
		);
	return ctx;
}
