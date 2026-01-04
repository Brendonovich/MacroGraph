export namespace Viewport {
	// ============ Types ============

	export type Point = { x: number; y: number };

	/**
	 * Position of the viewport container element on screen.
	 *
	 * This represents where the viewport <div> is positioned in the browser window,
	 * typically obtained from Element.getBoundingClientRect().
	 *
	 * - `left`: Distance in pixels from the left edge of the window/document
	 * - `top`: Distance in pixels from the top edge of the window/document
	 *
	 * Used to convert between absolute screen coordinates (e.g., MouseEvent.clientX/Y)
	 * and viewport-relative coordinates.
	 */
	export type Bounds = { left: number; top: number };

	export type SizedBounds = Bounds & { width: number; height: number };

	// A view of an infinite canvas
	// This could contain width and height, but for modification we only need the origin,
	// so the width/height can be assumed to be infinite from the viewport origin
	export type Viewport = {
		// The canvas coordinate of the top-left corner of the viewport
		origin: Point;
		// The scaling of the viewport contents
		scale: number;
	};

	// ============ Coordinate Conversions ============

	/**
	 * Convert screen coordinates to canvas coordinates.
	 *
	 * @param viewport - Current viewport state
	 * @param bounds - Position of the viewport container on screen (e.g., from getBoundingClientRect())
	 * @param screenPos - Absolute screen coordinates (e.g., MouseEvent.clientX/Y)
	 * @returns Canvas coordinates in the virtual canvas space
	 *
	 * @example
	 * // Convert mouse event to canvas position
	 * const bounds = element.getBoundingClientRect();
	 * const canvasPos = screenToCanvas(
	 *   viewport,
	 *   { left: bounds.left, top: bounds.top },
	 *   { x: event.clientX, y: event.clientY }
	 * );
	 */
	export function screenToCanvas(
		viewport: Viewport,
		bounds: Bounds,
		screenPos: Point,
	): Point {
		return {
			x: (screenPos.x - bounds.left) / viewport.scale + viewport.origin.x,
			y: (screenPos.y - bounds.top) / viewport.scale + viewport.origin.y,
		};
	}

	/**
	 * Convert canvas coordinates to screen coordinates.
	 *
	 * @param viewport - Current viewport state
	 * @param bounds - Position of the viewport container on screen (e.g., from getBoundingClientRect())
	 * @param canvasPos - Canvas coordinates in the virtual canvas space
	 * @returns Absolute screen coordinates (suitable for positioning DOM elements)
	 *
	 * @example
	 * // Position a DOM element at a canvas location
	 * const bounds = element.getBoundingClientRect();
	 * const screenPos = canvasToScreen(
	 *   viewport,
	 *   { left: bounds.left, top: bounds.top },
	 *   { x: 100, y: 200 }
	 * );
	 * overlay.style.left = `${screenPos.x}px`;
	 * overlay.style.top = `${screenPos.y}px`;
	 */
	export function canvasToScreen(
		viewport: Viewport,
		bounds: Bounds,
		canvasPos: Point,
	): Point {
		return {
			x: (canvasPos.x - viewport.origin.x) * viewport.scale + bounds.left,
			y: (canvasPos.y - viewport.origin.y) * viewport.scale + bounds.top,
		};
	}

	/**
	 * Convert canvas coordinates to viewport-relative screen coordinates.
	 *
	 * Unlike canvasToScreen, this does not add bounds offset, making it suitable
	 * for rendering within a canvas or element that's already positioned at the bounds.
	 *
	 * @param viewport - Current viewport state
	 * @param canvasPos - Canvas coordinates in the virtual canvas space
	 * @returns Viewport-relative screen coordinates
	 */
	export function canvasToViewportRelative(
		viewport: Viewport,
		canvasPos: Point,
	): Point {
		return {
			x: (canvasPos.x - viewport.origin.x) * viewport.scale,
			y: (canvasPos.y - viewport.origin.y) * viewport.scale,
		};
	}

	// ============ Viewport Transformations ============

	/**
	 * Zoom the viewport at a cursor position (viewport-relative screen coordinates).
	 * The canvas point under the cursor will remain stationary after the zoom.
	 *
	 * @param viewport - Current viewport state
	 * @param cursor - Cursor position relative to the viewport (screen pos minus bounds)
	 * @param delta - Scale multiplier (e.g., 1.1 for 10% zoom in, 0.9 for 10% zoom out)
	 */
	export function zoomAt(
		viewport: Viewport,
		cursor: Point,
		delta: number,
	): Viewport {
		// Convert cursor from viewport-relative screen coordinates to canvas coordinates
		const canvasX = viewport.origin.x + cursor.x / viewport.scale;
		const canvasY = viewport.origin.y + cursor.y / viewport.scale;

		// Calculate new scale
		const newScale = viewport.scale * delta;

		// Calculate new origin so that the canvas point remains at the same screen position
		return {
			origin: {
				x: canvasX - cursor.x / newScale,
				y: canvasY - cursor.y / newScale,
			},
			scale: newScale,
		};
	}

	/**
	 * Pan the viewport by a delta amount in canvas coordinates.
	 * Positive delta moves the viewport origin (content appears to move opposite direction).
	 *
	 * @param viewport - Current viewport state
	 * @param delta - Amount to add to the origin (in canvas coordinates)
	 */
	export function pan(viewport: Viewport, delta: Point): Viewport {
		return {
			origin: {
				x: viewport.origin.x + delta.x,
				y: viewport.origin.y + delta.y,
			},
			scale: viewport.scale,
		};
	}

	/**
	 * Pan the viewport by a delta amount in screen pixels.
	 * The delta is divided by scale to convert to canvas coordinates.
	 * Use this for mouse/touch drag panning where the delta is in screen space.
	 *
	 * @param viewport - Current viewport state
	 * @param screenDelta - Amount to pan in screen pixels
	 */
	export function panByScreenDelta(
		viewport: Viewport,
		screenDelta: Point,
	): Viewport {
		return {
			origin: {
				x: viewport.origin.x + screenDelta.x / viewport.scale,
				y: viewport.origin.y + screenDelta.y / viewport.scale,
			},
			scale: viewport.scale,
		};
	}

	/**
	 * Clamp a scale value within minimum and maximum bounds.
	 */
	export function clampScale(scale: number, min: number, max: number): number {
		return Math.min(max, Math.max(min, scale));
	}

	/**
	 * Apply simultaneous pan and zoom to the viewport (for two-finger gestures).
	 *
	 * This function handles the case where pan and zoom happen together, ensuring
	 * the pan is applied using the original scale (before zoom) for correct 1:1
	 * screen-space movement.
	 *
	 * @param viewport - Current viewport state
	 * @param screenDelta - Pan amount in screen pixels (measured before zoom)
	 * @param scaleRatio - Zoom multiplier (newScale / oldScale)
	 * @param anchor - Screen-relative point to zoom around (e.g., midpoint between fingers)
	 * @param minZoom - Minimum allowed zoom level
	 * @param maxZoom - Maximum allowed zoom level
	 * @returns New viewport with both pan and zoom applied
	 */
	export function panAndZoom(
		viewport: Viewport,
		screenDelta: Point,
		scaleRatio: number,
		anchor: Point,
		minZoom: number,
		maxZoom: number,
	): Viewport {
		const oldScale = viewport.scale;

		// Apply zoom
		let result = viewport;
		const newScale = clampScale(oldScale * scaleRatio, minZoom, maxZoom);

		if (newScale !== viewport.scale) {
			const actualScaleRatio = newScale / viewport.scale;
			result = zoomAt(result, anchor, actualScaleRatio);
		}

		// Apply pan using the OLD scale for correct screen-space movement
		// (the delta was measured before the zoom occurred)
		if (screenDelta.x !== 0 || screenDelta.y !== 0) {
			result = {
				origin: {
					x: result.origin.x + screenDelta.x / oldScale,
					y: result.origin.y + screenDelta.y / oldScale,
				},
				scale: result.scale,
			};
		}

		return result;
	}

	// ============ Point Utilities ============

	/**
	 * Calculate the midpoint between two points.
	 */
	export function getMidpoint(p1: Point, p2: Point): Point {
		return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
	}

	/**
	 * Calculate the Euclidean distance between two points.
	 */
	export function getDistance(p1: Point, p2: Point): number {
		return Math.hypot(p2.x - p1.x, p2.y - p1.y);
	}

	// ============ Higher-Level Utilities ============

	/**
	 * Center the viewport on a specific canvas point.
	 *
	 * @param viewport - Current viewport state
	 * @param bounds - The viewport container bounds (must include width and height)
	 * @param canvasPoint - The canvas coordinate to center on
	 */
	export function centerOn(
		viewport: Viewport,
		bounds: SizedBounds,
		canvasPoint: Point,
	): Viewport {
		// Calculate the viewport center in screen-relative coordinates
		const halfWidth = bounds.width / 2;
		const halfHeight = bounds.height / 2;

		// New origin such that canvasPoint is at the center of the viewport
		return {
			origin: {
				x: canvasPoint.x - halfWidth / viewport.scale,
				y: canvasPoint.y - halfHeight / viewport.scale,
			},
			scale: viewport.scale,
		};
	}

	/**
	 * Calculate a viewport that fits the given content bounds within the viewport container.
	 * The content will be centered and scaled to fit with optional padding.
	 *
	 * @param viewportBounds - The viewport container bounds
	 * @param contentBounds - The content bounds to fit (x, y, width, height in canvas coords)
	 * @param padding - Optional padding in screen pixels (default: 0)
	 */
	export function fitBounds(
		viewportBounds: SizedBounds,
		contentBounds: { x: number; y: number; width: number; height: number },
		padding = 0,
	): Viewport {
		// Available space after padding
		const availableWidth = viewportBounds.width - padding * 2;
		const availableHeight = viewportBounds.height - padding * 2;

		// Calculate scale to fit content
		const scaleX = availableWidth / contentBounds.width;
		const scaleY = availableHeight / contentBounds.height;
		const scale = Math.min(scaleX, scaleY);

		// Calculate the center of the content in canvas coordinates
		const contentCenterX = contentBounds.x + contentBounds.width / 2;
		const contentCenterY = contentBounds.y + contentBounds.height / 2;

		// Calculate origin such that content center is at viewport center
		const halfWidth = viewportBounds.width / 2;
		const halfHeight = viewportBounds.height / 2;

		return {
			origin: {
				x: contentCenterX - halfWidth / scale,
				y: contentCenterY - halfHeight / scale,
			},
			scale,
		};
	}
}
