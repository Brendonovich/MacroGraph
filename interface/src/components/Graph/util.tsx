import { type Node, type XY, getNodesInRect } from "@macrograph/runtime";
import {
	type AnyType,
	BasePrimitiveType,
	type PrimitiveVariant,
	t,
} from "@macrograph/typesystem";

import { createEventListenerMap } from "@solid-primitives/event-listener";
import { createRoot } from "solid-js";
import { createStore, produce } from "solid-js/store";
import type { InterfaceContext } from "../../context";
import { isCtrlEvent } from "../../util";
import type { GraphContext, SelectedItemID } from "./Context";

export const GRID_SIZE = 25;
export const SHIFT_MULTIPLIER = 6;

const PrimitiveVariantColours: Record<PrimitiveVariant, string> = {
	bool: "#DC2626",
	string: "#DA5697",
	int: "#30F3DB",
	float: "#00AE75",
};

export const colour = (type: AnyType): string => {
	if (type instanceof BasePrimitiveType)
		return PrimitiveVariantColours[type.primitiveVariant()];

	if (type instanceof t.List) return colour(type.item);
	if (type instanceof t.Option) return colour(type.inner);
	if (type instanceof t.Map) return colour(type.value);

	if (type instanceof t.Enum) return "#1B4DFF";
	if (type instanceof t.Struct) return "#FACC15";

	if (type instanceof t.Wildcard) {
		const value = type.wildcard.value();

		if (value.isSome()) return colour(value.unwrap());
		return "white";
	}

	throw new Error();
};

export function handleSelectableItemMouseDown(
	e: MouseEvent,
	graph: GraphContext,
	interfaceCtx: InterfaceContext,
	onSelected: () => void,
	id: SelectedItemID,
) {
	e.stopPropagation();

	if (e.button !== 0) return;

	if (graph.state.selectedItemIds.length === 0) onSelected();

	const [graphState, setGraphState] = createStore(graph.state);
	const index = graphState.selectedItemIds.findIndex(
		(s) => s.type === id.type && s.id === id.id,
	);

	const isSelected = index !== -1;

	if (isCtrlEvent(e)) {
		if (!isSelected)
			setGraphState(
				produce((state) => {
					state.selectedItemIds.push(id);
				}),
			);
	} else if (!isSelected) onSelected();

	const nodePositions = new Map<Node, XY>();

	const downPosition = graph.toGraphSpace({
		x: e.clientX,
		y: e.clientY,
	});

	const selectedItemPositions = new Map<SelectedItemID, XY>();
	for (const selectedItemId of graph.state.selectedItemIds) {
		if (selectedItemId.type === "node") {
			const node = graph.model().nodes.get(selectedItemId.id);
			if (!node) continue;

			selectedItemPositions.set(selectedItemId, {
				...node.state.position,
			});
		} else {
			const box = graph.model().commentBoxes.get(selectedItemId.id);
			if (!box) continue;

			selectedItemPositions.set(selectedItemId, {
				...box.position,
			});

			const nodes = getNodesInRect(
				graph.model().nodes.values(),
				new DOMRect(box.position.x, box.position.y, box.size.x, box.size.y),
				(node) => interfaceCtx.nodeSizes.get(node),
			);
			for (const node of nodes) {
				nodePositions.set(node, { ...node.state.position });
			}
		}
	}

	let didDrag = false;

	createRoot((dispose) => {
		createEventListenerMap(window, {
			mouseup: (e) => {
				dispose();

				if (!didDrag) {
					if (isCtrlEvent(e)) {
						if (isSelected) {
							const [graphState, setGraphState] = createStore(graph.state);
							const index = graphState.selectedItemIds.findIndex(
								(s) => s.type === id.type && s.id === id.id,
							);

							setGraphState(
								produce((state) => {
									if (index !== -1) {
										state.selectedItemIds.splice(index, 1);
									}
								}),
							);
						}
					} else onSelected();
				}

				interfaceCtx.save();
			},
			mousemove: (e) => {
				didDrag = true;

				const mousePosition = graph.toGraphSpace({
					x: e.clientX,
					y: e.clientY,
				});

				const delta = {
					x: mousePosition.x - downPosition.x,
					y: mousePosition.y - downPosition.y,
				};

				if (!e.shiftKey) {
					delta.x = Math.round(delta.x / GRID_SIZE) * GRID_SIZE;
					delta.y = Math.round(delta.y / GRID_SIZE) * GRID_SIZE;
				}

				for (const [node, startPosition] of nodePositions) {
					node.setPosition({
						x: startPosition.x + delta.x,
						y: startPosition.y + delta.y,
					});
				}

				for (const selectedItemId of graph.state.selectedItemIds) {
					const startPosition = selectedItemPositions.get(selectedItemId);
					if (!startPosition) continue;

					if (selectedItemId.type === "node") {
						const node = graph.model().nodes.get(selectedItemId.id);
						if (!node) continue;

						const newPosition = {
							x: startPosition.x + delta.x,
							y: startPosition.y + delta.y,
						};

						node.setPosition(newPosition);
					} else {
						const box = graph.model().commentBoxes.get(selectedItemId.id);
						if (!box) continue;

						const newPosition = {
							x: startPosition.x + delta.x,
							y: startPosition.y + delta.y,
						};

						box.position = newPosition;
					}
				}
			},
		});
	});
}
