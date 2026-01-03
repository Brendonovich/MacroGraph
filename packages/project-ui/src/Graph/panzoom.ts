export namespace Viewport {
	// A view of an infinite canvas
	// This could contain width and height, but for modification we only need the origin,
	// so the width/height can be assumed to be infinite from the viewport origin
	export type Viewport = {
		// The canvas coordinate of the top-left corner of the viewport
		origin: { x: number; y: number };
		// The scaling of the viewport contents
		scale: number;
	};

	export function zoomAt(
		viewport: Viewport,
		cursor: { x: number; y: number },
		delta: number,
	): Viewport {
		// Convert cursor from screen coordinates to canvas coordinates
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
}
