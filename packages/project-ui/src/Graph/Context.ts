import type { Graph, IO, Node } from "@macrograph/project-domain";
import type { NullableBounds } from "@solid-primitives/bounds";
import { ReactiveMap } from "@solid-primitives/map";
import { type Accessor, createContext, useContext } from "solid-js";

import { Viewport } from "./viewport";

export type NodeBounds = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export const createGraphContext = (
	bounds: Accessor<Readonly<NullableBounds>>,
	translate: Accessor<{ x: number; y: number } | undefined>,
	scale: Accessor<number>,
	ref: Accessor<HTMLDivElement | null>,
	id: Accessor<Graph.Id>,
	selection: () => Graph.ItemRef[],
) => {
	const ioPositions = new ReactiveMap<IO.RefString, { x: number; y: number }>();
	const nodeBounds = new ReactiveMap<Node.Id, NodeBounds>();

	// Helper to get current viewport state
	const getViewport = (): Viewport.Viewport => ({
		origin: translate() ?? { x: 0, y: 0 },
		scale: scale(),
	});

	// Helper to get bounds (handling nullability)
	const getBounds = (): Viewport.Bounds => ({
		left: bounds().left ?? 0,
		top: bounds().top ?? 0,
	});

	return {
		id,
		ref,
		selection,
		ioPositions,
		nodeBounds,
		get bounds() {
			return bounds();
		},
		get translate() {
			return translate();
		},
		get scale() {
			return scale();
		},
		getScreenPosition(position: Viewport.Point): Viewport.Point {
			return Viewport.canvasToScreen(getViewport(), getBounds(), position);
		},
		getGraphPosition(position: Viewport.Point): Viewport.Point {
			return Viewport.screenToCanvas(getViewport(), getBounds(), position);
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
