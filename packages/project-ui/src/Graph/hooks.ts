import { createEventListenerMap } from "@solid-primitives/event-listener";
import { createRoot } from "solid-js";

import {
	calculateGestureState,
	calculateWheelZoomDelta,
	detectWheelInputType,
	getIncrementalDelta,
	getTotalDelta,
	isLongPressCancelled,
	isThresholdExceeded,
} from "./gesture-math";
import { MAX_ZOOM, MIN_ZOOM, type Point } from "./interaction-state";
import { Viewport } from "./viewport";

// ============ usePointerDrag ============

export type PointerDragCallbacks = {
	/** Called on each pointer move. Return false to stop tracking. */
	onMove?: (e: PointerEvent, delta: Point) => void | false;
	/** Called when pointer is released */
	onUp?: (e: PointerEvent, delta: Point) => void;
	/** Called when drag is cancelled (e.g., by external cleanup) */
	onCancel?: () => void;
};

export type PointerDragOptions = {
	/** The pointer ID to track (from the initiating event) */
	pointerId: number;
	/** Starting screen position */
	startPosition: Point;
	/** Movement threshold before onMove is called (default: 0) */
	threshold?: number;
	/** Callbacks for drag events */
	callbacks: PointerDragCallbacks;
};

/**
 * Creates a pointer drag tracking session.
 *
 * This sets up window-level event listeners to track pointer movement
 * and automatically cleans up when the pointer is released.
 *
 * @returns A dispose function to manually cancel the drag
 *
 * @example
 * ```ts
 * function handlePointerDown(e: PointerEvent) {
 *   const dispose = createPointerDrag({
 *     pointerId: e.pointerId,
 *     startPosition: { x: e.clientX, y: e.clientY },
 *     callbacks: {
 *       onMove: (e, delta) => {
 *         console.log('Moved by', delta);
 *       },
 *       onUp: (e, delta) => {
 *         console.log('Released at delta', delta);
 *       },
 *     },
 *   });
 * }
 * ```
 */
export function createPointerDrag(options: PointerDragOptions): () => void {
	const { pointerId, startPosition, threshold = 0, callbacks } = options;

	let thresholdPassed = threshold === 0;
	let lastPosition = { ...startPosition };
	let disposed = false;

	const dispose = createRoot((rootDispose) => {
		createEventListenerMap(window, {
			pointermove: (e) => {
				if (disposed || e.pointerId !== pointerId) return;

				const currentPosition = { x: e.clientX, y: e.clientY };

				// Check threshold
				if (!thresholdPassed) {
					if (!isThresholdExceeded(currentPosition, startPosition, threshold)) {
						return;
					}
					thresholdPassed = true;
				}

				const incrementalDelta = getIncrementalDelta(
					currentPosition,
					lastPosition,
				);
				lastPosition = currentPosition;

				// Pass incremental delta for panning, total delta available via closure
				if (callbacks.onMove?.(e, incrementalDelta) === false) {
					disposed = true;
					rootDispose();
				}
			},
			pointerup: (e) => {
				if (disposed || e.pointerId !== pointerId) return;

				const currentPosition = { x: e.clientX, y: e.clientY };
				const delta = getTotalDelta(currentPosition, startPosition);

				callbacks.onUp?.(e, delta);
				disposed = true;
				rootDispose();
			},
		});

		return () => {
			if (!disposed) {
				disposed = true;
				callbacks.onCancel?.();
				rootDispose();
			}
		};
	});

	return dispose;
}

// ============ useWheelHandler ============

export type WheelHandlerOptions = {
	/** Get the current viewport state */
	getViewport: () => Viewport.Viewport;
	/** Get the container bounds */
	getBounds: () => Viewport.Bounds;
	/** Get a custom zoom anchor point (e.g., pan origin during right-click pan) */
	getZoomAnchor?: () => Point | null;
	/** Called when scale changes */
	onScaleChange?: (scale: number) => void;
	/** Called when translate/origin changes */
	onTranslateChange?: (origin: Point) => void;
	/** Min zoom level (default: MIN_ZOOM) */
	minZoom?: number;
	/** Max zoom level (default: MAX_ZOOM) */
	maxZoom?: number;
};

/**
 * Creates a wheel event handler for viewport pan/zoom.
 *
 * Handles:
 * - Trackpad two-finger scroll (pan)
 * - Trackpad pinch-to-zoom
 * - Mouse wheel scroll (pan)
 * - Ctrl+wheel zoom
 * - Custom zoom anchor (e.g., for zooming at cursor during right-click pan)
 *
 * @returns A wheel event handler function
 */
export function createWheelHandler(options: WheelHandlerOptions) {
	const {
		getViewport,
		getBounds,
		getZoomAnchor,
		onScaleChange,
		onTranslateChange,
		minZoom = MIN_ZOOM,
		maxZoom = MAX_ZOOM,
	} = options;

	function handleZoom(delta: number, screenOrigin: Point) {
		const viewport = getViewport();
		const b = getBounds();

		const newScale = Viewport.clampScale(
			viewport.scale + delta,
			minZoom,
			maxZoom,
		);

		if (Math.abs(newScale - viewport.scale) < 0.001) return;

		const zoomDelta = newScale / viewport.scale;
		const cursor = { x: screenOrigin.x - b.left, y: screenOrigin.y - b.top };
		const newViewport = Viewport.zoomAt(viewport, cursor, zoomDelta);

		onScaleChange?.(newViewport.scale);
		onTranslateChange?.(newViewport.origin);
	}

	return (e: WheelEvent) => {
		e.preventDefault();

		const wheelInfo = detectWheelInputType(
			e.deltaX,
			e.deltaY,
			(e as any).wheelDeltaX,
			(e as any).wheelDeltaY,
		);

		// Check for custom zoom anchor (e.g., during right-click pan)
		const zoomAnchor = getZoomAnchor?.();
		if (zoomAnchor) {
			const delta = calculateWheelZoomDelta(
				wheelInfo.deltaY,
				wheelInfo.isTouchpad,
			);
			handleZoom(delta, zoomAnchor);
			return;
		}

		// Ctrl+wheel = zoom at cursor
		if (e.ctrlKey) {
			const delta = calculateWheelZoomDelta(
				wheelInfo.deltaY,
				wheelInfo.isTouchpad,
			);
			handleZoom(delta, { x: e.clientX, y: e.clientY });
		} else {
			// Regular scroll = pan
			const newViewport = Viewport.panByScreenDelta(getViewport(), {
				x: wheelInfo.deltaX,
				y: wheelInfo.deltaY,
			});
			onTranslateChange?.(newViewport.origin);
		}
	};
}

// ============ useTwoPointerGesture ============

export type TwoPointerGestureCallbacks = {
	/** Called on each gesture update with cumulative pan delta and scale ratio from gesture start */
	onGestureMove?: (
		cumulativePanDelta: Point,
		cumulativeScaleRatio: number,
		midpoint: Point,
	) => void;
	/** Called when gesture ends - provides the pointer ID that was released */
	onGestureEnd?: (releasedPointerId: number) => void;
};

export type TwoPointerGestureOptions = {
	left: { pointerId: number; position: Point };
	right: { pointerId: number; position: Point };
	callbacks: TwoPointerGestureCallbacks;
};

/**
 * Creates a two-pointer gesture tracking session (pinch-to-zoom + pan).
 *
 * @returns A dispose function to manually cancel the gesture
 */
export function createTwoPointerGesture(
	options: TwoPointerGestureOptions,
): () => void {
	const { left, right, callbacks } = options;

	// Mutable current positions
	const leftCurrent = { ...left.position };
	const rightCurrent = { ...right.position };
	let disposed = false;

	// Store initial positions for cumulative gesture calculations.
	// This prevents double-panning when both pointers fire move events,
	// since the consumer applies cumulative deltas to the initial viewport state.
	const initial = { left: left.position, right: right.position };

	const dispose = createRoot((rootDispose) => {
		createEventListenerMap(window, {
			pointerup: (e) => {
				if (disposed) return;
				if (e.pointerId === left.pointerId || e.pointerId === right.pointerId) {
					callbacks.onGestureEnd?.(e.pointerId);
					disposed = true;
					rootDispose();
				}
			},

			pointermove: (e) => {
				if (disposed) return;
				if (e.pointerId !== left.pointerId && e.pointerId !== right.pointerId) {
					return;
				}

				// Update the pointer that moved
				if (e.pointerId === left.pointerId) {
					leftCurrent.x = e.clientX;
					leftCurrent.y = e.clientY;
				} else {
					rightCurrent.x = e.clientX;
					rightCurrent.y = e.clientY;
				}

				// Calculate cumulative gesture state from initial positions
				const gestureState = calculateGestureState(initial, {
					left: leftCurrent,
					right: rightCurrent,
				});

				callbacks.onGestureMove?.(
					gestureState.panDelta,
					gestureState.scaleRatio,
					gestureState.midpoint,
				);
			},
		});

		return () => {
			if (!disposed) {
				disposed = true;
				rootDispose();
			}
		};
	});

	return dispose;
}

// ============ useLongPress ============

export type LongPressOptions = {
	/** Timeout in milliseconds (default: 300) */
	timeout?: number;
	/** Movement threshold to cancel long press (default: 3) */
	moveThreshold?: number;
	/** Called when long press is triggered */
	onLongPress: (e: PointerEvent) => void;
	/** Called when long press is cancelled (moved or released early) */
	onCancel?: () => void;
};

/**
 * Creates a long-press detection session.
 *
 * Tracks a pointer and fires onLongPress after the timeout if the pointer
 * hasn't moved beyond the threshold or been released.
 *
 * @returns Object with dispose function and a way to check if triggered
 */
export function createLongPress(
	downEvent: PointerEvent,
	options: LongPressOptions,
): { dispose: () => void; triggered: () => boolean } {
	const { timeout = 300, moveThreshold = 3, onLongPress, onCancel } = options;

	const startPos = { x: downEvent.clientX, y: downEvent.clientY };
	let triggered = false;
	let disposed = false;

	const timerId = window.setTimeout(() => {
		if (!disposed) {
			triggered = true;
			onLongPress(downEvent);
		}
	}, timeout);

	const dispose = createRoot((rootDispose) => {
		createEventListenerMap(window, {
			pointermove: (e) => {
				if (disposed || e.pointerId !== downEvent.pointerId) return;

				const currentPos = { x: e.clientX, y: e.clientY };
				if (isLongPressCancelled(currentPos, startPos, moveThreshold)) {
					clearTimeout(timerId);
					onCancel?.();
					disposed = true;
					rootDispose();
				}
			},
			pointerup: (e) => {
				if (disposed || e.pointerId !== downEvent.pointerId) return;

				clearTimeout(timerId);
				if (!triggered) {
					onCancel?.();
				}
				disposed = true;
				rootDispose();
			},
		});

		return () => {
			if (!disposed) {
				clearTimeout(timerId);
				disposed = true;
				rootDispose();
			}
		};
	});

	return { dispose, triggered: () => triggered };
}
