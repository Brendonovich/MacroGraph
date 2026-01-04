import type { Graph, IO } from "@macrograph/project-domain";
import {
	type ActorRefFrom,
	assertEvent,
	assign,
	createMachine,
	type SnapshotFrom,
} from "xstate";

// ============ Constants ============

export const PAN_THRESHOLD = 5;
export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 3;
export const TOUCH_MOVE_THRESHOLD = 3;
export const LONG_PRESS_TIMEOUT_MS = 300;

// ============ Types ============

export type Point = { x: number; y: number };

export type TouchPointer = { pointerId: number; start: Point; current: Point };

// ============ Context ============

export type InteractionContext = {
	// Common
	pointerId: number | null;

	// Area selection
	topLeft: Point | null;
	bottomRight: Point | null;

	// Selection drag
	startGraphPosition: Point | null;
	initialPositions: Array<[Graph.ItemRef, Point]>;
	currentPositions: Array<[Graph.ItemRef, Point]>;

	// IO drag
	ioRef: IO.RefString | null;

	// Right-click
	startScreenPosition: Point | null;
	lastMousePosition: Point | null;
	panOrigin: Point | null;

	// Touch
	pointers: TouchPointer[];
	rawScale: number;
};

const initialContext: InteractionContext = {
	pointerId: null,
	topLeft: null,
	bottomRight: null,
	startGraphPosition: null,
	initialPositions: [],
	currentPositions: [],
	ioRef: null,
	startScreenPosition: null,
	lastMousePosition: null,
	panOrigin: null,
	pointers: [],
	rawScale: 1,
};

// ============ Events ============

export type InteractionEvent =
	// Mouse events
	| { type: "LEFT_CLICK_CANVAS"; pointerId: number; screenPosition: Point }
	| {
			type: "LEFT_CLICK_NODE";
			pointerId: number;
			graphPosition: Point;
			initialPositions: Array<[Graph.ItemRef, Point]>;
	  }
	| { type: "LEFT_CLICK_IO"; pointerId: number; ioRef: IO.RefString }
	| { type: "RIGHT_CLICK"; pointerId: number; screenPosition: Point }
	// Pointer movement/release
	| {
			type: "POINTER_MOVE";
			pointerId: number;
			screenPosition: Point;
			graphPosition: Point;
	  }
	| { type: "POINTER_UP"; pointerId: number }
	// Right-click specific
	| {
			type: "PAN_THRESHOLD_EXCEEDED";
			lastMousePosition: Point;
			panOrigin: Point;
	  }
	// Touch events
	| { type: "TOUCH_START"; pointerId: number; position: Point }
	| { type: "SECOND_FINGER_DOWN"; pointerId: number; position: Point }
	| { type: "TOUCH_MOVE"; pointerId: number; position: Point }
	| { type: "START_SINGLE_FINGER_DRAG"; topLeft: Point }
	| { type: "START_TWO_FINGER_GESTURE"; rawScale: number }
	| {
			type: "UPDATE_TWO_FINGER_GESTURE";
			leftCurrent: Point;
			rightCurrent: Point;
	  };

// ============ Machine ============

export const interactionMachine = createMachine(
	{
		id: "interaction",
		initial: "idle",
		context: initialContext,
		states: {
			idle: {
				entry: assign(() => initialContext),
				on: {
					LEFT_CLICK_CANVAS: {
						target: "areaSelection",
						actions: assign(({ event }) => {
							assertEvent(event, "LEFT_CLICK_CANVAS");
							return {
								pointerId: event.pointerId,
								topLeft: event.screenPosition,
								bottomRight: event.screenPosition,
							};
						}),
					},
					LEFT_CLICK_NODE: {
						target: "selectionDrag",
						actions: assign(({ event }) => {
							assertEvent(event, "LEFT_CLICK_NODE");
							return {
								pointerId: event.pointerId,
								startGraphPosition: event.graphPosition,
								initialPositions: event.initialPositions,
								currentPositions: event.initialPositions,
							};
						}),
					},
					LEFT_CLICK_IO: {
						target: "ioDrag",
						actions: assign(({ event }) => {
							assertEvent(event, "LEFT_CLICK_IO");
							return { pointerId: event.pointerId, ioRef: event.ioRef };
						}),
					},
					RIGHT_CLICK: {
						target: "rightClick",
						actions: assign(({ event }) => {
							assertEvent(event, "RIGHT_CLICK");
							return {
								pointerId: event.pointerId,
								startScreenPosition: event.screenPosition,
							};
						}),
					},
					TOUCH_START: {
						target: "touch",
						actions: assign(({ event }) => {
							assertEvent(event, "TOUCH_START");
							return {
								pointerId: event.pointerId,
								pointers: [
									{
										pointerId: event.pointerId,
										start: event.position,
										current: event.position,
									},
								],
							};
						}),
					},
				},
			},

			areaSelection: {
				on: {
					POINTER_MOVE: {
						actions: assign(({ context, event }) => {
							assertEvent(event, "POINTER_MOVE");
							if (event.pointerId !== context.pointerId) return {};
							return { bottomRight: event.screenPosition };
						}),
					},
					POINTER_UP: {
						target: "idle",
						guard: ({ context, event }) =>
							event.pointerId === context.pointerId,
					},
				},
			},

			selectionDrag: {
				on: {
					POINTER_MOVE: {
						actions: assign(({ context, event }) => {
							assertEvent(event, "POINTER_MOVE");
							if (event.pointerId !== context.pointerId) return {};
							if (!context.startGraphPosition) return {};

							const delta = {
								x: event.graphPosition.x - context.startGraphPosition.x,
								y: event.graphPosition.y - context.startGraphPosition.y,
							};

							return {
								currentPositions: context.initialPositions.map(
									([ref, startPosition]) =>
										[
											ref,
											{
												x: startPosition.x + delta.x,
												y: startPosition.y + delta.y,
											},
										] as [Graph.ItemRef, Point],
								),
							};
						}),
					},
					POINTER_UP: {
						target: "idle",
						guard: ({ context, event }) =>
							event.pointerId === context.pointerId,
					},
				},
			},

			ioDrag: {
				on: {
					POINTER_UP: {
						target: "idle",
						guard: ({ context, event }) =>
							event.pointerId === context.pointerId,
					},
				},
			},

			rightClick: {
				initial: "pending",
				states: {
					pending: {
						on: {
							PAN_THRESHOLD_EXCEEDED: {
								target: "panning",
								actions: assign(({ event }) => {
									assertEvent(event, "PAN_THRESHOLD_EXCEEDED");
									return {
										lastMousePosition: event.lastMousePosition,
										panOrigin: event.panOrigin,
									};
								}),
							},
							POINTER_UP: {
								target: "#interaction.idle",
								guard: ({ context, event }) =>
									event.pointerId === context.pointerId,
							},
						},
					},
					panning: {
						on: {
							POINTER_MOVE: {
								actions: assign(({ context, event }) => {
									assertEvent(event, "POINTER_MOVE");
									if (event.pointerId !== context.pointerId) return {};
									return {
										lastMousePosition: event.screenPosition,
										panOrigin: event.screenPosition,
									};
								}),
							},
							POINTER_UP: {
								target: "#interaction.idle",
								guard: ({ context, event }) =>
									event.pointerId === context.pointerId,
							},
						},
					},
				},
			},

			touch: {
				initial: "awaiting",
				states: {
					awaiting: {
						on: {
							SECOND_FINGER_DOWN: {
								actions: assign(({ context, event }) => {
									assertEvent(event, "SECOND_FINGER_DOWN");
									return {
										pointers: [
											...context.pointers,
											{
												pointerId: event.pointerId,
												start: event.position,
												current: event.position,
											},
										],
									};
								}),
							},
							TOUCH_MOVE: {
								actions: assign(({ context, event }) => {
									assertEvent(event, "TOUCH_MOVE");
									return {
										pointers: context.pointers.map((p) =>
											p.pointerId === event.pointerId
												? { ...p, current: event.position }
												: p,
										),
									};
								}),
							},
							START_SINGLE_FINGER_DRAG: {
								target: "singleFingerDrag",
								guard: ({ context }) => context.pointers.length === 1,
								actions: assign(({ context, event }) => {
									assertEvent(event, "START_SINGLE_FINGER_DRAG");
									const pointer = context.pointers[0];
									if (!pointer) return {};
									return {
										pointerId: pointer.pointerId,
										topLeft: event.topLeft,
										bottomRight: event.topLeft,
									};
								}),
							},
							START_TWO_FINGER_GESTURE: {
								target: "twoFingerGesture",
								guard: ({ context }) => context.pointers.length === 2,
								actions: assign(({ event }) => {
									assertEvent(event, "START_TWO_FINGER_GESTURE");
									return { rawScale: event.rawScale };
								}),
							},
							POINTER_UP: { target: "#interaction.idle" },
						},
						after: {
							[LONG_PRESS_TIMEOUT_MS]: {
								target: "#interaction.idle",
								guard: ({ context }) => context.pointers.length === 1,
								// Note: The actual context menu opening will be handled
								// by subscribing to the transition in GraphView.tsx
								// This allows the side effect to remain external to the machine
							},
						},
					},

					singleFingerDrag: {
						on: {
							TOUCH_MOVE: {
								actions: assign(({ context, event }) => {
									assertEvent(event, "TOUCH_MOVE");
									const pointer = context.pointers[0];
									if (!pointer || event.pointerId !== pointer.pointerId)
										return {};
									return {
										bottomRight: event.position,
										pointers: [{ ...pointer, current: event.position }],
									};
								}),
							},
							POINTER_UP: { target: "#interaction.idle" },
						},
					},

					twoFingerGesture: {
						on: {
							UPDATE_TWO_FINGER_GESTURE: {
								actions: assign(({ context, event }) => {
									assertEvent(event, "UPDATE_TWO_FINGER_GESTURE");
									const [left, right] = context.pointers;
									if (!left || !right) return {};
									return {
										pointers: [
											{ ...left, current: event.leftCurrent },
											{ ...right, current: event.rightCurrent },
										],
									};
								}),
							},
							POINTER_UP: { target: "#interaction.idle" },
						},
					},
				},
			},
		},
	},
	{
		// Actions and guards can be added here for future use
		// when moving side effects into the machine
	},
);

// ============ Type Exports ============

export type InteractionMachine = typeof interactionMachine;
export type InteractionSnapshot = SnapshotFrom<typeof interactionMachine>;
export type InteractionActorRef = ActorRefFrom<typeof interactionMachine>;

// ============ State Value Types ============

/**
 * Possible state values for the interaction machine.
 * Use with `snapshot.matches(...)` for type-safe state checks.
 */
export type InteractionStateValue =
	| "idle"
	| "areaSelection"
	| "selectionDrag"
	| "ioDrag"
	| "rightClick"
	| { rightClick: "pending" }
	| { rightClick: "panning" }
	| "touch"
	| { touch: "awaiting" }
	| { touch: "singleFingerDrag" }
	| { touch: "twoFingerGesture" };

// ============ Query Functions ============

/** Check if we're in a state that should show the grabbing cursor */
export function isPanning(snapshot: InteractionSnapshot): boolean {
	return snapshot.matches({ rightClick: "panning" });
}

/** Get the pan origin for wheel zoom, if currently right-click panning */
export function getPanOrigin(snapshot: InteractionSnapshot): Point | null {
	if (snapshot.matches({ rightClick: "panning" })) {
		return snapshot.context.panOrigin;
	}
	return null;
}

/** Get the IO ref being dragged, if in IO drag state */
export function getDraggingIO(
	snapshot: InteractionSnapshot,
): IO.RefString | null {
	if (snapshot.matches("ioDrag")) {
		return snapshot.context.ioRef;
	}
	return null;
}

/** Get area selection bounds if in area selection state (mouse or touch) */
export function getAreaSelectionBounds(
	snapshot: InteractionSnapshot,
): { topLeft: Point; bottomRight: Point } | null {
	if (snapshot.matches("areaSelection")) {
		const { topLeft, bottomRight } = snapshot.context;
		if (topLeft && bottomRight) {
			return { topLeft, bottomRight };
		}
	}
	if (snapshot.matches({ touch: "singleFingerDrag" })) {
		const { topLeft, bottomRight } = snapshot.context;
		if (topLeft && bottomRight) {
			return { topLeft, bottomRight };
		}
	}
	return null;
}

/** Get selection drag positions if currently dragging selection */
export function getSelectionDragPositions(
	snapshot: InteractionSnapshot,
): Array<[Graph.ItemRef, Point]> | null {
	if (snapshot.matches("selectionDrag")) {
		return snapshot.context.currentPositions;
	}
	return null;
}

/** Get all touch pointers if in touch awaiting state */
export function getTouchPointers(
	snapshot: InteractionSnapshot,
): TouchPointer[] | null {
	if (snapshot.matches({ touch: "awaiting" })) {
		return snapshot.context.pointers;
	}
	return null;
}

/** Check if in touch awaiting state with single finger (for long-press detection) */
export function isAwaitingSingleFinger(snapshot: InteractionSnapshot): boolean {
	return (
		snapshot.matches({ touch: "awaiting" }) &&
		snapshot.context.pointers.length === 1
	);
}

/** Get the two-finger gesture raw scale value */
export function getTwoFingerRawScale(
	snapshot: InteractionSnapshot,
): number | null {
	if (snapshot.matches({ touch: "twoFingerGesture" })) {
		return snapshot.context.rawScale;
	}
	return null;
}
