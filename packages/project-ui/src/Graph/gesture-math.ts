import type { Point } from "./interaction-state";
import { Viewport } from "./viewport";

// ============ Pointer Drag Calculations ============

/**
 * Check if movement from start to current exceeds the given threshold.
 *
 * @param current - Current pointer position
 * @param start - Starting pointer position
 * @param threshold - Distance threshold in pixels
 * @returns true if the distance exceeds the threshold
 */
export function isThresholdExceeded(
	current: Point,
	start: Point,
	threshold: number,
): boolean {
	const distance = Math.hypot(current.x - start.x, current.y - start.y);
	return distance > threshold;
}

/**
 * Calculate the incremental delta between two positions.
 * Used for tracking frame-by-frame movement.
 *
 * @param current - Current position
 * @param last - Previous position
 * @returns The delta between positions
 */
export function getIncrementalDelta(current: Point, last: Point): Point {
	return { x: current.x - last.x, y: current.y - last.y };
}

/**
 * Calculate the total delta from start to current position.
 *
 * @param current - Current position
 * @param start - Starting position
 * @returns The total delta from start
 */
export function getTotalDelta(current: Point, start: Point): Point {
	return { x: current.x - start.x, y: current.y - start.y };
}

// ============ Two-Pointer Gesture Calculations ============

export type GestureState = {
	/** Cumulative pan delta from gesture start (in screen coordinates) */
	panDelta: Point;
	/** Cumulative scale ratio from gesture start (> 1 = zoom in, < 1 = zoom out) */
	scaleRatio: number;
	/** Current midpoint between the two pointers */
	midpoint: Point;
};

/**
 * Calculate the cumulative gesture state from initial and current pointer positions.
 *
 * This function computes how much the gesture has panned and zoomed relative to
 * the initial state. The results are cumulative, not incremental, which means
 * calling this function multiple times with the same inputs will produce the
 * same outputs (idempotent).
 *
 * @param initial - Initial positions of both pointers when gesture started
 * @param current - Current positions of both pointers
 * @returns The cumulative gesture state
 */
export function calculateGestureState(
	initial: { left: Point; right: Point },
	current: { left: Point; right: Point },
): GestureState {
	const initialMidpoint = Viewport.getMidpoint(initial.left, initial.right);
	const initialDistance = Viewport.getDistance(initial.left, initial.right);

	const currentMidpoint = Viewport.getMidpoint(current.left, current.right);
	const currentDistance = Viewport.getDistance(current.left, current.right);

	// Pan delta is the movement of the midpoint
	// Positive delta means the midpoint moved in positive direction
	// We invert it because moving fingers right should pan the canvas left (reveal content to the right)
	const panDelta = {
		x: initialMidpoint.x - currentMidpoint.x,
		y: initialMidpoint.y - currentMidpoint.y,
	};

	// Scale ratio is how much the distance between fingers has changed
	// > 1 means fingers spread apart (zoom in)
	// < 1 means fingers pinched together (zoom out)
	const scaleRatio =
		initialDistance > 0 && currentDistance > 0
			? currentDistance / initialDistance
			: 1;

	return { panDelta, scaleRatio, midpoint: currentMidpoint };
}

// ============ Long Press Calculations ============

/**
 * Check if pointer movement should cancel a long press.
 *
 * @param current - Current pointer position
 * @param start - Starting pointer position
 * @param threshold - Movement threshold to cancel long press
 * @returns true if the movement exceeds the threshold and should cancel
 */
export function isLongPressCancelled(
	current: Point,
	start: Point,
	threshold: number,
): boolean {
	const diffX = Math.abs(current.x - start.x);
	const diffY = Math.abs(current.y - start.y);
	return diffX > threshold || diffY > threshold;
}

// ============ Wheel Event Calculations ============

export type WheelInputInfo = {
	/** Normalized delta X */
	deltaX: number;
	/** Normalized delta Y */
	deltaY: number;
	/** Whether the input is from a touchpad (vs mouse wheel) */
	isTouchpad: boolean;
};

/**
 * Detect whether a wheel event came from a touchpad or mouse wheel,
 * and normalize the delta values.
 *
 * Touchpads report wheelDeltaY as exactly 3x deltaY, while mouse wheels
 * have different ratios. This heuristic is used to detect the input type.
 *
 * @param deltaX - The deltaX from the wheel event
 * @param deltaY - The deltaY from the wheel event
 * @param wheelDeltaX - The wheelDeltaX property (non-standard, may be undefined)
 * @param wheelDeltaY - The wheelDeltaY property (non-standard, may be undefined)
 * @returns Normalized wheel input info
 */
export function detectWheelInputType(
	deltaX: number,
	deltaY: number,
	wheelDeltaX: number | undefined,
	wheelDeltaY: number | undefined,
): WheelInputInfo {
	// Touchpads report wheelDeltaY as exactly 3x the absolute value of deltaY
	const isTouchpad =
		wheelDeltaY !== undefined && Math.abs(wheelDeltaY) === Math.abs(deltaY) * 3;

	if (isTouchpad && wheelDeltaX !== undefined && wheelDeltaY !== undefined) {
		return {
			deltaX: -wheelDeltaX / 3,
			deltaY: -wheelDeltaY / 3,
			isTouchpad: true,
		};
	}

	return { deltaX, deltaY, isTouchpad: false };
}

/**
 * Calculate the zoom delta from a wheel event.
 *
 * Mouse wheels produce larger delta values than touchpads, so we use
 * different divisors to normalize the zoom speed.
 *
 * @param deltaY - The (normalized) deltaY value
 * @param isTouchpad - Whether the input is from a touchpad
 * @returns The zoom delta to apply to the scale
 */
export function calculateWheelZoomDelta(
	deltaY: number,
	isTouchpad: boolean,
): number {
	// Mouse wheels produce larger deltas, so use a larger divisor
	const isMouseWheel = Math.abs(deltaY) > 50;
	const divisor = isMouseWheel ? 500 : 100;

	// Touchpad and mouse wheel have opposite directions
	// Touchpad: positive deltaY = scroll down = zoom out (we want negative delta)
	// Mouse wheel: positive deltaY = scroll down = zoom in (we want positive delta)
	// Wait, that's backwards. Let me reconsider:
	// Actually the sign handling depends on the context. The original code:
	// delta = ((isTouchpad ? 1 : -1) * deltaY) / divisor
	// So for touchpad, positive deltaY gives positive delta (zoom in)
	// For mouse, positive deltaY gives negative delta (zoom out)
	return ((isTouchpad ? 1 : -1) * deltaY) / divisor;
}
