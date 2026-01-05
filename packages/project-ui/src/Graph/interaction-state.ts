/**
 * Interaction State Machine
 *
 * This module provides the interaction state machine for GraphView.
 * The machine is implemented using XState v5.
 *
 * ## Primary Exports (XState-based)
 *
 * - `interactionMachine` - The XState machine definition
 * - `InteractionSnapshot` - Type for machine snapshots (use with query functions)
 * - `InteractionEvent` - Union type of all events the machine accepts
 * - Query functions: `isPanning`, `getPanOrigin`, `getDraggingIO`, etc.
 *
 * ## Legacy Exports (for backward compatibility)
 *
 * The legacy `InteractionState` type union and `InteractionState.*` constructors
 * are kept for backward compatibility during the migration period. Once
 * GraphView.tsx is fully migrated to use the XState actor, these can be removed.
 */

import type { Graph, IO } from "@macrograph/project-domain";

// ============ Re-exports from XState machine ============

export {
	getAreaSelectionBounds as xstateGetAreaSelectionBounds,
	getDraggingIO as xstateGetDraggingIO,
	getPanOrigin as xstateGetPanOrigin,
	getSelectionDragPositions as xstateGetSelectionDragPositions,
	getTouchPointers,
	getTwoFingerRawScale,
	type InteractionActorRef,
	type InteractionContext,
	type InteractionEvent,
	type InteractionMachine,
	type InteractionSnapshot,
	type InteractionStateValue,
	// Machine
	interactionMachine,
	isAwaitingSingleFinger,
	// Query functions (XState versions) - renamed to avoid conflict with legacy
	isPanning as xstateIsPanning,
	LONG_PRESS_TIMEOUT_MS,
	MAX_ZOOM,
	MIN_ZOOM,
	// Constants
	PAN_THRESHOLD,
	// Types
	type Point,
	TOUCH_MOVE_THRESHOLD,
	type TouchPointer,
} from "./interaction-machine";

// ============ Legacy Types (for backward compatibility during migration) ============

// Import Point type for use in legacy types
import type { Point, TouchPointer } from "./interaction-machine";

/**
 * ## State Transitions (documented for reference)
 *
 * ```
 * IDLE
 *   ├── left-click on canvas ────► AREA_SELECTION
 *   ├── left-click on node ──────► SELECTION_DRAG
 *   ├── left-click on IO pin ────► IO_DRAG
 *   ├── right-click ─────────────► RIGHT_CLICK (pending)
 *   └── touch start ─────────────► TOUCH (awaiting)
 *
 * AREA_SELECTION ──── pointer up ────► IDLE
 * SELECTION_DRAG ──── pointer up ────► IDLE
 * IO_DRAG ─────────── pointer up ────► IDLE
 *
 * RIGHT_CLICK
 *   ├── (pending) ── move > threshold ──► RIGHT_CLICK (panning)
 *   ├── (pending) ── pointer up ─────────► IDLE + open context menu
 *   └── (panning) ── pointer up ─────────► IDLE
 *
 * TOUCH (awaiting, 1 finger)
 *   ├── long-press timeout ──────────────► IDLE + open context menu
 *   ├── move > threshold ────────────────► TOUCH (single-finger-drag)
 *   ├── second finger added ─────────────► ignore (stay in current state)
 *   └── pointer up ──────────────────────► IDLE
 *
 * TOUCH (awaiting, 2 fingers)
 *   ├── either moves > threshold ────────► TOUCH (two-finger-gesture)
 *   ├── third finger added ──────────────► ignore (stay in current state)
 *   └── either pointer up ───────────────► IDLE
 *
 * TOUCH (single-finger-drag)
 *   ├── additional finger added ─────────► ignore (stay in current state)
 *   └── pointer up ──────────────────────► IDLE
 *
 * TOUCH (two-finger-gesture)
 *   ├── additional finger added ─────────► ignore (stay in current state)
 *   └── either pointer up ───────────────► IDLE
 * ```
 */
export type InteractionState =
	| LegacyIdle
	| LegacyAreaSelection
	| LegacySelectionDrag
	| LegacyIODrag
	| LegacyRightClick
	| LegacyTouch;

// ============ Legacy Mouse States ============

/** @deprecated No active interaction - default state */
type LegacyIdle = { type: "idle" };

/** @deprecated Left-click drag on canvas background - selecting nodes in rectangle */
type LegacyAreaSelection = {
	type: "area-selection";
	pointerId: number;
	/** Graph-space position where drag started (anchor point) */
	startGraphPosition: Point;
	/** Screen-relative position of current pointer */
	currentScreenPosition: Point;
};

/** @deprecated Left-click drag on node header - moving selected nodes */
type LegacySelectionDrag = {
	type: "selection-drag";
	pointerId: number;
	/** Graph-space position where drag started */
	startGraphPosition: Point;
	/** Initial graph positions of all dragged items */
	initialPositions: Array<[Graph.ItemRef, Point]>;
	/** Current graph positions (derived from delta + initial) */
	currentPositions: Array<[Graph.ItemRef, Point]>;
};

/** @deprecated Left-click drag on IO pin - creating connections */
type LegacyIODrag = {
	type: "io-drag";
	pointerId: number;
	/** Reference to the IO being dragged from */
	ioRef: IO.RefString;
};

/** @deprecated Right-click interaction - can be context menu or pan */
type LegacyRightClick = {
	type: "right-click";
	pointerId: number;
	startScreenPosition: Point;
	mode: LegacyRightClickMode;
};

type LegacyRightClickMode =
	/** Haven't moved past threshold yet - will become pan or context menu */
	| { type: "pending" }
	/** Moved past threshold - actively panning */
	| {
			type: "panning";
			/** For incremental delta calculation */
			lastMousePosition: Point;
			/**
			 * Current mouse position for wheel zoom anchor.
			 * Updated on each move so wheel zoom follows cursor during pan.
			 */
			panOrigin: Point;
	  };

// ============ Legacy Touch States ============

/** @deprecated Touch interaction - uses nested state for gesture detection */
type LegacyTouch = { type: "touch"; gesture: LegacyTouchGesture };

type LegacyTouchGesture =
	/** Tracking pointers, waiting to determine gesture type */
	| {
			type: "awaiting";
			pointers: TouchPointer[];
			/**
			 * Long-press context menu timer ID (only for single finger).
			 * Started on first touch, cancelled if:
			 * - pointer moves past threshold (becomes drag)
			 * - second finger added (becomes two-finger gesture)
			 * - pointer lifted before timeout
			 */
			longPressTimerId: number | null;
	  }
	/** Single finger moved past threshold - area selection */
	| {
			type: "single-finger-drag";
			pointer: TouchPointer;
			/** Graph-space position where drag started (anchor point) */
			startGraphPosition: Point;
			/** Screen-relative position of current pointer */
			currentScreenPosition: Point;
	  }
	/** Two fingers - simultaneous pan + pinch-to-zoom */
	| {
			type: "two-finger-gesture";
			left: TouchPointer;
			right: TouchPointer;
			/**
			 * Unclamped scale value to prevent "sticking" at zoom limits.
			 * Actual viewport scale is clamped from this.
			 */
			rawScale: number;
	  };

// ============ Legacy State Constructors ============

/**
 * @deprecated Use XState machine events instead.
 * These constructors are kept for backward compatibility during migration.
 */
export const InteractionState = {
	idle: (): InteractionState => ({ type: "idle" }),

	areaSelection: (
		pointerId: number,
		startGraphPosition: Point,
		currentScreenPosition: Point,
	): InteractionState => ({
		type: "area-selection",
		pointerId,
		startGraphPosition,
		currentScreenPosition,
	}),

	selectionDrag: (
		pointerId: number,
		startGraphPosition: Point,
		initialPositions: Array<[Graph.ItemRef, Point]>,
		currentPositions: Array<[Graph.ItemRef, Point]>,
	): InteractionState => ({
		type: "selection-drag",
		pointerId,
		startGraphPosition,
		initialPositions,
		currentPositions,
	}),

	ioDrag: (pointerId: number, ioRef: IO.RefString): InteractionState => ({
		type: "io-drag",
		pointerId,
		ioRef,
	}),

	rightClickPending: (
		pointerId: number,
		startScreenPosition: Point,
	): InteractionState => ({
		type: "right-click",
		pointerId,
		startScreenPosition,
		mode: { type: "pending" },
	}),

	rightClickPanning: (
		pointerId: number,
		startScreenPosition: Point,
		lastMousePosition: Point,
		panOrigin: Point,
	): InteractionState => ({
		type: "right-click",
		pointerId,
		startScreenPosition,
		mode: { type: "panning", lastMousePosition, panOrigin },
	}),

	touchAwaiting: (
		pointers: TouchPointer[],
		longPressTimerId: number | null,
	): InteractionState => ({
		type: "touch",
		gesture: { type: "awaiting", pointers, longPressTimerId },
	}),

	touchSingleFingerDrag: (
		pointer: TouchPointer,
		startGraphPosition: Point,
		currentScreenPosition: Point,
	): InteractionState => ({
		type: "touch",
		gesture: {
			type: "single-finger-drag",
			pointer,
			startGraphPosition,
			currentScreenPosition,
		},
	}),

	touchTwoFingerGesture: (
		left: TouchPointer,
		right: TouchPointer,
		rawScale: number,
	): InteractionState => ({
		type: "touch",
		gesture: { type: "two-finger-gesture", left, right, rawScale },
	}),
} as const;

// ============ Legacy Query Functions ============
// These work with the legacy InteractionState type and are used by GraphView.tsx
// until it's migrated to use the XState actor directly.

/** Check if we're in a state that should show the grabbing cursor */
export function isPanning(state: InteractionState): boolean {
	return state.type === "right-click" && state.mode.type === "panning";
}

/** Get the pan origin for wheel zoom, if currently right-click panning */
export function getPanOrigin(state: InteractionState): Point | null {
	if (state.type === "right-click" && state.mode.type === "panning") {
		return state.mode.panOrigin;
	}
	return null;
}

/** Get the IO ref being dragged, if in IO drag state */
export function getDraggingIO(state: InteractionState): IO.RefString | null {
	if (state.type === "io-drag") {
		return state.ioRef;
	}
	return null;
}

/** Get area selection bounds if in area selection state (mouse or touch) */
export function getAreaSelectionBounds(
	state: InteractionState,
): { startGraphPosition: Point; currentScreenPosition: Point } | null {
	if (state.type === "area-selection") {
		return {
			startGraphPosition: state.startGraphPosition,
			currentScreenPosition: state.currentScreenPosition,
		};
	}
	if (state.type === "touch" && state.gesture.type === "single-finger-drag") {
		return {
			startGraphPosition: state.gesture.startGraphPosition,
			currentScreenPosition: state.gesture.currentScreenPosition,
		};
	}
	return null;
}

/** Get selection drag positions if currently dragging selection */
export function getSelectionDragPositions(
	state: InteractionState,
): Array<[Graph.ItemRef, Point]> | null {
	if (state.type === "selection-drag") {
		return state.currentPositions;
	}
	return null;
}

/** Get the long-press timer ID if one is active */
export function getLongPressTimerId(state: InteractionState): number | null {
	if (state.type === "touch" && state.gesture.type === "awaiting") {
		return state.gesture.longPressTimerId;
	}
	return null;
}
