import type { Graph, IO } from "@macrograph/project-domain";
import type { NullableBounds } from "@solid-primitives/bounds";
import { ReactiveMap } from "@solid-primitives/map";
import { type Accessor, createContext, useContext } from "solid-js";

export const createGraphContext = (
	bounds: Accessor<Readonly<NullableBounds>>,
	translate: Accessor<{ x: number; y: number } | undefined>,
	scale: Accessor<number>,
	ref: Accessor<HTMLDivElement | null>,
	id: Accessor<Graph.Id>,
	selection: () => Graph.ItemRef[],
) => {
	const ioPositions = new ReactiveMap<IO.RefString, { x: number; y: number }>();

	return {
		id,
		ref,
		selection,
		ioPositions,
		get bounds() {
			return bounds();
		},
		get translate() {
			return translate();
		},
		get scale() {
			return scale();
		},
		getScreenPosition(position: { x: number; y: number }) {
			const s = scale();
			const t = translate() ?? { x: 0, y: 0 };
			return {
				x: (position.x - t.x) * s + (bounds().left ?? 0),
				y: (position.y - t.y) * s + (bounds().top ?? 0),
			};
		},
		getGraphPosition(position: { x: number; y: number }) {
			const s = scale();
			const t = translate() ?? { x: 0, y: 0 };
			return {
				x: (position.x - (bounds().left ?? 0) - t.x) / s + t.x,
				y: (position.y - (bounds().top ?? 0) - t.y) / s + t.y,
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
