import { describe, expect, it } from "vitest";

import {
	calculateGestureState,
	calculateWheelZoomDelta,
	detectWheelInputType,
	getIncrementalDelta,
	getTotalDelta,
	isLongPressCancelled,
	isThresholdExceeded,
} from "../src/Graph/gesture-math";

describe("Pointer Drag Calculations", () => {
	describe("isThresholdExceeded", () => {
		it("returns false when distance is below threshold", () => {
			const result = isThresholdExceeded(
				{ x: 102, y: 101 },
				{ x: 100, y: 100 },
				5,
			);
			expect(result).toBe(false);
		});

		it("returns false when distance equals threshold", () => {
			// Distance of exactly 5 (3-4-5 triangle)
			const result = isThresholdExceeded(
				{ x: 103, y: 104 },
				{ x: 100, y: 100 },
				5,
			);
			expect(result).toBe(false);
		});

		it("returns true when distance exceeds threshold", () => {
			const result = isThresholdExceeded(
				{ x: 110, y: 100 },
				{ x: 100, y: 100 },
				5,
			);
			expect(result).toBe(true);
		});

		it("handles diagonal movement", () => {
			// Diagonal distance of ~14.14 (10 * sqrt(2))
			const result = isThresholdExceeded(
				{ x: 110, y: 110 },
				{ x: 100, y: 100 },
				10,
			);
			expect(result).toBe(true);
		});

		it("handles zero threshold (always exceeded for any movement)", () => {
			const result = isThresholdExceeded(
				{ x: 100.1, y: 100 },
				{ x: 100, y: 100 },
				0,
			);
			expect(result).toBe(true);
		});

		it("returns false for same position with zero threshold", () => {
			const result = isThresholdExceeded(
				{ x: 100, y: 100 },
				{ x: 100, y: 100 },
				0,
			);
			expect(result).toBe(false);
		});
	});

	describe("getIncrementalDelta", () => {
		it("calculates positive delta", () => {
			const result = getIncrementalDelta(
				{ x: 150, y: 120 },
				{ x: 100, y: 100 },
			);
			expect(result).toEqual({ x: 50, y: 20 });
		});

		it("calculates negative delta", () => {
			const result = getIncrementalDelta({ x: 80, y: 90 }, { x: 100, y: 100 });
			expect(result).toEqual({ x: -20, y: -10 });
		});

		it("returns zero delta for same position", () => {
			const result = getIncrementalDelta(
				{ x: 100, y: 100 },
				{ x: 100, y: 100 },
			);
			expect(result).toEqual({ x: 0, y: 0 });
		});

		it("handles mixed positive and negative deltas", () => {
			const result = getIncrementalDelta({ x: 120, y: 80 }, { x: 100, y: 100 });
			expect(result).toEqual({ x: 20, y: -20 });
		});
	});

	describe("getTotalDelta", () => {
		it("calculates delta from start to current", () => {
			const result = getTotalDelta({ x: 200, y: 150 }, { x: 100, y: 100 });
			expect(result).toEqual({ x: 100, y: 50 });
		});

		it("handles negative movement", () => {
			const result = getTotalDelta({ x: 50, y: 75 }, { x: 100, y: 100 });
			expect(result).toEqual({ x: -50, y: -25 });
		});

		it("returns zero for same position", () => {
			const result = getTotalDelta({ x: 100, y: 100 }, { x: 100, y: 100 });
			expect(result).toEqual({ x: 0, y: 0 });
		});
	});
});

describe("Two-Pointer Gesture Calculations", () => {
	describe("calculateGestureState", () => {
		// Pan tests
		it("calculates zero pan delta when pointers haven't moved", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			const current = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };

			const result = calculateGestureState(initial, current);

			expect(result.panDelta).toEqual({ x: 0, y: 0 });
		});

		it("calculates pan delta when both pointers move together", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			// Both pointers move right by 50 and down by 30
			const current = { left: { x: 150, y: 130 }, right: { x: 250, y: 130 } };

			const result = calculateGestureState(initial, current);

			// Pan delta should be inverted (fingers move right, content pans left)
			expect(result.panDelta).toEqual({ x: -50, y: -30 });
		});

		it("calculates correct pan when only left pointer moves", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			// Left pointer moves right by 20
			const current = { left: { x: 120, y: 100 }, right: { x: 200, y: 100 } };

			const result = calculateGestureState(initial, current);

			// Midpoint moved from (150, 100) to (160, 100), so delta is -10
			expect(result.panDelta.x).toBeCloseTo(-10);
			expect(result.panDelta.y).toBeCloseTo(0);
		});

		it("calculates correct pan when only right pointer moves", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			// Right pointer moves right by 20
			const current = { left: { x: 100, y: 100 }, right: { x: 220, y: 100 } };

			const result = calculateGestureState(initial, current);

			// Midpoint moved from (150, 100) to (160, 100), so delta is -10
			expect(result.panDelta.x).toBeCloseTo(-10);
			expect(result.panDelta.y).toBeCloseTo(0);
		});

		// Scale tests
		it("returns scale ratio of 1 when distance unchanged", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			// Pointers moved but distance is same
			const current = { left: { x: 150, y: 100 }, right: { x: 250, y: 100 } };

			const result = calculateGestureState(initial, current);

			expect(result.scaleRatio).toBeCloseTo(1);
		});

		it("returns scale ratio > 1 when fingers spread apart (zoom in)", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			// Distance increases from 100 to 200
			const current = { left: { x: 50, y: 100 }, right: { x: 250, y: 100 } };

			const result = calculateGestureState(initial, current);

			expect(result.scaleRatio).toBeCloseTo(2);
		});

		it("returns scale ratio < 1 when fingers pinch together (zoom out)", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			// Distance decreases from 100 to 50
			const current = { left: { x: 125, y: 100 }, right: { x: 175, y: 100 } };

			const result = calculateGestureState(initial, current);

			expect(result.scaleRatio).toBeCloseTo(0.5);
		});

		it("handles zero initial distance gracefully", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 100, y: 100 } };
			const current = { left: { x: 50, y: 100 }, right: { x: 150, y: 100 } };

			const result = calculateGestureState(initial, current);

			expect(result.scaleRatio).toBe(1);
		});

		it("handles zero current distance gracefully", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			const current = { left: { x: 150, y: 100 }, right: { x: 150, y: 100 } };

			const result = calculateGestureState(initial, current);

			expect(result.scaleRatio).toBe(1);
		});

		// Midpoint tests
		it("calculates correct midpoint", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			const current = { left: { x: 120, y: 80 }, right: { x: 180, y: 120 } };

			const result = calculateGestureState(initial, current);

			expect(result.midpoint).toEqual({ x: 150, y: 100 });
		});

		it("midpoint updates when one pointer moves", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			// Left pointer moves 40 to the right
			const current = { left: { x: 140, y: 100 }, right: { x: 200, y: 100 } };

			const result = calculateGestureState(initial, current);

			// Midpoint should be at (170, 100)
			expect(result.midpoint).toEqual({ x: 170, y: 100 });
		});

		// Combined gesture tests
		it("handles simultaneous pan and zoom", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			// Both pan right by 50, and spread from 100 to 150 distance
			const current = { left: { x: 125, y: 100 }, right: { x: 275, y: 100 } };

			const result = calculateGestureState(initial, current);

			// Initial midpoint: (150, 100), new midpoint: (200, 100)
			expect(result.panDelta.x).toBeCloseTo(-50);
			// Initial distance: 100, new distance: 150
			expect(result.scaleRatio).toBeCloseTo(1.5);
			expect(result.midpoint).toEqual({ x: 200, y: 100 });
		});

		it("produces idempotent results (multiple calls with same positions)", () => {
			const initial = { left: { x: 100, y: 100 }, right: { x: 200, y: 100 } };
			const current = { left: { x: 120, y: 110 }, right: { x: 220, y: 110 } };

			const result1 = calculateGestureState(initial, current);
			const result2 = calculateGestureState(initial, current);
			const result3 = calculateGestureState(initial, current);

			expect(result1).toEqual(result2);
			expect(result2).toEqual(result3);
		});
	});
});

describe("Long Press Calculations", () => {
	describe("isLongPressCancelled", () => {
		it("returns false when within threshold", () => {
			const result = isLongPressCancelled(
				{ x: 101, y: 102 },
				{ x: 100, y: 100 },
				3,
			);
			expect(result).toBe(false);
		});

		it("returns true when x exceeds threshold", () => {
			const result = isLongPressCancelled(
				{ x: 105, y: 100 },
				{ x: 100, y: 100 },
				3,
			);
			expect(result).toBe(true);
		});

		it("returns true when y exceeds threshold", () => {
			const result = isLongPressCancelled(
				{ x: 100, y: 105 },
				{ x: 100, y: 100 },
				3,
			);
			expect(result).toBe(true);
		});

		it("returns true when both exceed threshold", () => {
			const result = isLongPressCancelled(
				{ x: 110, y: 110 },
				{ x: 100, y: 100 },
				3,
			);
			expect(result).toBe(true);
		});

		it("handles negative movement", () => {
			const result = isLongPressCancelled(
				{ x: 95, y: 100 },
				{ x: 100, y: 100 },
				3,
			);
			expect(result).toBe(true);
		});

		it("returns false at exactly threshold", () => {
			const result = isLongPressCancelled(
				{ x: 103, y: 100 },
				{ x: 100, y: 100 },
				3,
			);
			expect(result).toBe(false);
		});
	});
});

describe("Wheel Event Calculations", () => {
	describe("detectWheelInputType", () => {
		it("detects mouse wheel (no wheelDeltaY)", () => {
			const result = detectWheelInputType(0, 100, undefined, undefined);

			expect(result.isTouchpad).toBe(false);
			expect(result.deltaX).toBe(0);
			expect(result.deltaY).toBe(100);
		});

		it("detects mouse wheel (ratio not 3:1)", () => {
			// Mouse wheel typically has different ratio
			const result = detectWheelInputType(0, 100, 0, 240);

			expect(result.isTouchpad).toBe(false);
			expect(result.deltaX).toBe(0);
			expect(result.deltaY).toBe(100);
		});

		it("detects touchpad (3:1 ratio)", () => {
			// Touchpad: wheelDeltaY = -deltaY * 3
			const result = detectWheelInputType(10, 30, -30, -90);

			expect(result.isTouchpad).toBe(true);
		});

		it("normalizes touchpad deltas", () => {
			// Touchpad with wheelDeltaX = -30, wheelDeltaY = -90
			const result = detectWheelInputType(10, 30, -30, -90);

			// Normalized: -wheelDeltaX/3 = 10, -wheelDeltaY/3 = 30
			expect(result.deltaX).toBe(10);
			expect(result.deltaY).toBe(30);
		});

		it("handles negative touchpad deltas", () => {
			const result = detectWheelInputType(-20, -60, 60, 180);

			expect(result.isTouchpad).toBe(true);
			expect(result.deltaX).toBe(-20);
			expect(result.deltaY).toBe(-60);
		});
	});

	describe("calculateWheelZoomDelta", () => {
		it("calculates zoom delta for touchpad (positive deltaY = zoom in)", () => {
			const result = calculateWheelZoomDelta(50, true);

			// Touchpad: delta = (1 * 50) / 100 = 0.5
			expect(result).toBeCloseTo(0.5);
		});

		it("calculates zoom delta for mouse wheel (positive deltaY = zoom out)", () => {
			const result = calculateWheelZoomDelta(50, false);

			// Mouse wheel with small delta: delta = (-1 * 50) / 100 = -0.5
			expect(result).toBeCloseTo(-0.5);
		});

		it("uses larger divisor for mouse wheel with large delta", () => {
			const result = calculateWheelZoomDelta(100, false);

			// Mouse wheel with large delta (> 50): delta = (-1 * 100) / 500 = -0.2
			expect(result).toBeCloseTo(-0.2);
		});

		it("uses smaller divisor for touchpad with small delta", () => {
			const result = calculateWheelZoomDelta(20, true);

			// Touchpad with small delta: delta = (1 * 20) / 100 = 0.2
			expect(result).toBeCloseTo(0.2);
		});

		it("handles negative deltaY", () => {
			const resultTouchpad = calculateWheelZoomDelta(-30, true);
			const resultMouse = calculateWheelZoomDelta(-30, false);

			// Touchpad: (1 * -30) / 100 = -0.3
			expect(resultTouchpad).toBeCloseTo(-0.3);
			// Mouse: (-1 * -30) / 100 = 0.3
			expect(resultMouse).toBeCloseTo(0.3);
		});

		it("returns zero for zero deltaY", () => {
			expect(calculateWheelZoomDelta(0, true)).toBeCloseTo(0);
			expect(calculateWheelZoomDelta(0, false)).toBeCloseTo(0);
		});
	});
});
