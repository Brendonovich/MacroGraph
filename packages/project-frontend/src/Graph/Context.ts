import type { NullableBounds } from "@solid-primitives/bounds";
import { createContextProvider } from "@solid-primitives/context";

const [GraphContextProvider, _useGraphContext] = createContextProvider(
	(props: {
		bounds: Readonly<NullableBounds>;
		translate?: { x: number; y: number };
	}) => {
		return {
			get bounds() {
				return props.bounds;
			},
			get translate() {
				return props.translate;
			},
			getScreenPosition(position: { x: number; y: number }) {
				return {
					x: position.x + (props.bounds.left ?? 0) + (props.translate?.x ?? 0),
					y: position.y + (props.bounds.top ?? 0) + (props.translate?.y ?? 0),
				};
			},
			getGraphPosition(position: { x: number; y: number }) {
				return {
					x: position.x - (props.bounds.left ?? 0) + (props.translate?.x ?? 0),
					y: position.y - (props.bounds.top ?? 0) + (props.translate?.y ?? 0),
				};
			},
		};
	},
);

export { GraphContextProvider };

export function useGraphContext() {
	const ctx = _useGraphContext();
	if (!ctx)
		throw new Error(
			"useGraphContext must be used within a GraphContextProvider",
		);
	return ctx;
}
