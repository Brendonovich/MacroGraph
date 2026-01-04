import { describe, expect, it } from "vitest";

import { Viewport } from "../src/Graph/viewport";

describe("Viewport", () => {
	describe("screenToCanvas", () => {
		it("returns offset screen position when origin is (0,0) and scale is 1", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 1 };
			const bounds: Viewport.Bounds = { left: 100, top: 50 };
			const result = Viewport.screenToCanvas(viewport, bounds, {
				x: 200,
				y: 150,
			});
			expect(result).toEqual({ x: 100, y: 100 });
		});

		it("offsets by origin", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 50, y: 25 },
				scale: 1,
			};
			const bounds: Viewport.Bounds = { left: 0, top: 0 };
			const result = Viewport.screenToCanvas(viewport, bounds, {
				x: 100,
				y: 100,
			});
			expect(result).toEqual({ x: 150, y: 125 });
		});

		it("accounts for scale", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 2 };
			const bounds: Viewport.Bounds = { left: 0, top: 0 };
			const result = Viewport.screenToCanvas(viewport, bounds, {
				x: 100,
				y: 100,
			});
			expect(result).toEqual({ x: 50, y: 50 });
		});

		it("combines origin offset and scale", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 100, y: 100 },
				scale: 2,
			};
			const bounds: Viewport.Bounds = { left: 50, top: 50 };
			// Screen (150, 150) -> relative to bounds (100, 100) -> divided by scale (50, 50) -> plus origin (150, 150)
			const result = Viewport.screenToCanvas(viewport, bounds, {
				x: 150,
				y: 150,
			});
			expect(result).toEqual({ x: 150, y: 150 });
		});
	});

	describe("canvasToScreen", () => {
		it("returns offset canvas position when origin is (0,0) and scale is 1", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 1 };
			const bounds: Viewport.Bounds = { left: 100, top: 50 };
			const result = Viewport.canvasToScreen(viewport, bounds, {
				x: 100,
				y: 100,
			});
			expect(result).toEqual({ x: 200, y: 150 });
		});

		it("offsets by origin", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 50, y: 25 },
				scale: 1,
			};
			const bounds: Viewport.Bounds = { left: 0, top: 0 };
			const result = Viewport.canvasToScreen(viewport, bounds, {
				x: 150,
				y: 125,
			});
			expect(result).toEqual({ x: 100, y: 100 });
		});

		it("accounts for scale", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 2 };
			const bounds: Viewport.Bounds = { left: 0, top: 0 };
			const result = Viewport.canvasToScreen(viewport, bounds, {
				x: 50,
				y: 50,
			});
			expect(result).toEqual({ x: 100, y: 100 });
		});

		it("round-trips with screenToCanvas", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 75, y: 120 },
				scale: 1.5,
			};
			const bounds: Viewport.Bounds = { left: 200, top: 100 };
			const screenPos = { x: 500, y: 400 };

			const canvasPos = Viewport.screenToCanvas(viewport, bounds, screenPos);
			const roundTrip = Viewport.canvasToScreen(viewport, bounds, canvasPos);

			expect(roundTrip.x).toBeCloseTo(screenPos.x);
			expect(roundTrip.y).toBeCloseTo(screenPos.y);
		});
	});

	describe("zoomAt", () => {
		it("zooms in at origin", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 1 };
			const result = Viewport.zoomAt(viewport, { x: 0, y: 0 }, 2);
			expect(result.scale).toBeCloseTo(2);
			expect(result.origin).toEqual({ x: 0, y: 0 });
		});

		it("zooms in at cursor position", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 1 };
			const result = Viewport.zoomAt(viewport, { x: 100, y: 100 }, 2);
			expect(result.scale).toBeCloseTo(2);
			expect(result.origin).toEqual({ x: 50, y: 50 });
		});

		it("zooms out at cursor position", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 2 };
			const result = Viewport.zoomAt(viewport, { x: 100, y: 100 }, 0.5);
			expect(result.scale).toBeCloseTo(1);
			// At scale 2, cursor (100, 100) maps to canvas (50, 50)
			// After zoom to scale 1, canvas (50, 50) should still be at cursor (100, 100)
			// So origin should be 50 - 100/1 = -50
			expect(result.origin.x).toBeCloseTo(-50);
			expect(result.origin.y).toBeCloseTo(-50);
		});

		it("preserves canvas point under cursor after zoom", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 30, y: 40 },
				scale: 1.5,
			};
			const cursor = { x: 200, y: 150 };

			// Calculate canvas point under cursor before zoom
			const canvasPointBefore = {
				x: viewport.origin.x + cursor.x / viewport.scale,
				y: viewport.origin.y + cursor.y / viewport.scale,
			};

			const result = Viewport.zoomAt(viewport, cursor, 1.25);

			// Calculate canvas point under cursor after zoom
			const canvasPointAfter = {
				x: result.origin.x + cursor.x / result.scale,
				y: result.origin.y + cursor.y / result.scale,
			};

			expect(canvasPointAfter.x).toBeCloseTo(canvasPointBefore.x);
			expect(canvasPointAfter.y).toBeCloseTo(canvasPointBefore.y);
		});
	});

	describe("pan", () => {
		it("translates origin by positive delta", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 100, y: 100 },
				scale: 1,
			};
			const result = Viewport.pan(viewport, { x: 50, y: 30 });
			expect(result.origin).toEqual({ x: 150, y: 130 });
			expect(result.scale).toBe(1);
		});

		it("translates origin by negative delta", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 100, y: 100 },
				scale: 2,
			};
			const result = Viewport.pan(viewport, { x: -30, y: -20 });
			expect(result.origin).toEqual({ x: 70, y: 80 });
			expect(result.scale).toBe(2);
		});
	});

	describe("panByScreenDelta", () => {
		it("translates origin accounting for scale", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 100, y: 100 },
				scale: 2,
			};
			// 100 screen pixels at scale 2 = 50 canvas units
			const result = Viewport.panByScreenDelta(viewport, { x: 100, y: 100 });
			expect(result.origin).toEqual({ x: 150, y: 150 });
			expect(result.scale).toBe(2);
		});

		it("pans more when zoomed out", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 0, y: 0 },
				scale: 0.5,
			};
			// 100 screen pixels at scale 0.5 = 200 canvas units
			const result = Viewport.panByScreenDelta(viewport, { x: 100, y: 100 });
			expect(result.origin).toEqual({ x: 200, y: 200 });
		});

		it("matches pan when scale is 1", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 50, y: 50 },
				scale: 1,
			};
			const delta = { x: 30, y: 40 };
			const panResult = Viewport.pan(viewport, delta);
			const panByScreenResult = Viewport.panByScreenDelta(viewport, delta);
			expect(panByScreenResult.origin).toEqual(panResult.origin);
		});
	});

	describe("clampScale", () => {
		it("returns scale when within bounds", () => {
			expect(Viewport.clampScale(1.5, 0.1, 5)).toBe(1.5);
		});

		it("clamps to minimum when below", () => {
			expect(Viewport.clampScale(0.05, 0.1, 5)).toBe(0.1);
		});

		it("clamps to maximum when above", () => {
			expect(Viewport.clampScale(10, 0.1, 5)).toBe(5);
		});

		it("handles edge cases at boundaries", () => {
			expect(Viewport.clampScale(0.1, 0.1, 5)).toBe(0.1);
			expect(Viewport.clampScale(5, 0.1, 5)).toBe(5);
		});
	});

	describe("centerOn", () => {
		it("centers viewport on canvas point", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 1 };
			const bounds: Viewport.SizedBounds = {
				left: 0,
				top: 0,
				width: 800,
				height: 600,
			};
			const result = Viewport.centerOn(viewport, bounds, { x: 500, y: 300 });

			// Canvas point (500, 300) should be at the center of the viewport
			// Center of viewport in screen coords is (400, 300)
			// At scale 1, origin should be such that canvas (500, 300) maps to screen center
			// canvasToScreen: (canvasPos - origin) * scale + bounds.left = screenPos
			// (500 - origin.x) * 1 + 0 = 400 -> origin.x = 100
			// (300 - origin.y) * 1 + 0 = 300 -> origin.y = 0
			expect(result.origin).toEqual({ x: 100, y: 0 });
			expect(result.scale).toBe(1);
		});

		it("works with scaled viewport", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 2 };
			const bounds: Viewport.SizedBounds = {
				left: 0,
				top: 0,
				width: 800,
				height: 600,
			};
			const result = Viewport.centerOn(viewport, bounds, { x: 500, y: 300 });

			// At scale 2, viewport center (400, 300) in screen coords covers less canvas area
			// halfWidth / scale = 400 / 2 = 200 canvas units from center
			// origin.x = 500 - 200 = 300
			// origin.y = 300 - 150 = 150
			expect(result.origin).toEqual({ x: 300, y: 150 });
			expect(result.scale).toBe(2);
		});

		it("preserves scale", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 100, y: 100 },
				scale: 0.75,
			};
			const bounds: Viewport.SizedBounds = {
				left: 50,
				top: 50,
				width: 400,
				height: 300,
			};
			const result = Viewport.centerOn(viewport, bounds, { x: 0, y: 0 });
			expect(result.scale).toBe(0.75);
		});
	});

	describe("getMidpoint", () => {
		it("calculates midpoint of two points", () => {
			const result = Viewport.getMidpoint({ x: 0, y: 0 }, { x: 100, y: 100 });
			expect(result).toEqual({ x: 50, y: 50 });
		});

		it("handles negative coordinates", () => {
			const result = Viewport.getMidpoint(
				{ x: -100, y: -50 },
				{ x: 100, y: 50 },
			);
			expect(result).toEqual({ x: 0, y: 0 });
		});

		it("handles same point", () => {
			const result = Viewport.getMidpoint({ x: 75, y: 25 }, { x: 75, y: 25 });
			expect(result).toEqual({ x: 75, y: 25 });
		});

		it("handles decimal values", () => {
			const result = Viewport.getMidpoint({ x: 0, y: 0 }, { x: 1, y: 1 });
			expect(result).toEqual({ x: 0.5, y: 0.5 });
		});
	});

	describe("getDistance", () => {
		it("calculates distance between two points", () => {
			const result = Viewport.getDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
			expect(result).toBe(5);
		});

		it("handles same point (zero distance)", () => {
			const result = Viewport.getDistance({ x: 50, y: 50 }, { x: 50, y: 50 });
			expect(result).toBe(0);
		});

		it("handles negative coordinates", () => {
			const result = Viewport.getDistance({ x: -3, y: -4 }, { x: 0, y: 0 });
			expect(result).toBe(5);
		});

		it("is symmetric", () => {
			const p1 = { x: 10, y: 20 };
			const p2 = { x: 50, y: 80 };
			expect(Viewport.getDistance(p1, p2)).toBe(Viewport.getDistance(p2, p1));
		});

		it("handles horizontal distance", () => {
			const result = Viewport.getDistance({ x: 0, y: 5 }, { x: 100, y: 5 });
			expect(result).toBe(100);
		});

		it("handles vertical distance", () => {
			const result = Viewport.getDistance({ x: 5, y: 0 }, { x: 5, y: 100 });
			expect(result).toBe(100);
		});
	});

	describe("panAndZoom", () => {
		const minZoom = 0.1;
		const maxZoom = 5;

		it("applies pan only when scale ratio is 1", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 100, y: 100 },
				scale: 1,
			};
			const result = Viewport.panAndZoom(
				viewport,
				{ x: 50, y: 30 },
				1,
				{ x: 0, y: 0 },
				minZoom,
				maxZoom,
			);

			// Pan of (50, 30) at scale 1 should add (50, 30) to origin
			expect(result.origin.x).toBeCloseTo(150);
			expect(result.origin.y).toBeCloseTo(130);
			expect(result.scale).toBeCloseTo(1);
		});

		it("applies zoom only when pan delta is zero", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 1 };
			const anchor = { x: 100, y: 100 };
			const result = Viewport.panAndZoom(
				viewport,
				{ x: 0, y: 0 },
				2,
				anchor,
				minZoom,
				maxZoom,
			);

			expect(result.scale).toBeCloseTo(2);
			// Zooming at (100, 100) with factor 2 should adjust origin
			expect(result.origin.x).toBeCloseTo(50);
			expect(result.origin.y).toBeCloseTo(50);
		});

		it("applies both pan and zoom simultaneously", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 1 };
			const anchor = { x: 100, y: 100 };
			const result = Viewport.panAndZoom(
				viewport,
				{ x: 20, y: 20 },
				1.5,
				anchor,
				minZoom,
				maxZoom,
			);

			expect(result.scale).toBeCloseTo(1.5);
			// Should apply zoom first, then pan using OLD scale
		});

		it("clamps scale to minimum bound", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 0, y: 0 },
				scale: 0.2,
			};
			const result = Viewport.panAndZoom(
				viewport,
				{ x: 0, y: 0 },
				0.1, // Would result in 0.02, below min
				{ x: 0, y: 0 },
				minZoom,
				maxZoom,
			);

			expect(result.scale).toBeCloseTo(minZoom);
		});

		it("clamps scale to maximum bound", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 4 };
			const result = Viewport.panAndZoom(
				viewport,
				{ x: 0, y: 0 },
				2, // Would result in 8, above max
				{ x: 0, y: 0 },
				minZoom,
				maxZoom,
			);

			expect(result.scale).toBeCloseTo(maxZoom);
		});

		it("uses old scale for pan calculation", () => {
			const viewport: Viewport.Viewport = { origin: { x: 0, y: 0 }, scale: 2 };
			// Pan delta of 100 screen pixels at scale 2 = 50 canvas units
			const result = Viewport.panAndZoom(
				viewport,
				{ x: 100, y: 0 },
				1, // No zoom
				{ x: 0, y: 0 },
				minZoom,
				maxZoom,
			);

			expect(result.origin.x).toBeCloseTo(50);
			expect(result.scale).toBeCloseTo(2);
		});

		it("preserves anchor point during zoom", () => {
			const viewport: Viewport.Viewport = {
				origin: { x: 50, y: 50 },
				scale: 1,
			};
			const anchor = { x: 200, y: 150 };

			// Calculate canvas point at anchor before zoom
			const canvasBefore = {
				x: viewport.origin.x + anchor.x / viewport.scale,
				y: viewport.origin.y + anchor.y / viewport.scale,
			};

			const result = Viewport.panAndZoom(
				viewport,
				{ x: 0, y: 0 },
				1.5,
				anchor,
				minZoom,
				maxZoom,
			);

			// Calculate canvas point at anchor after zoom
			const canvasAfter = {
				x: result.origin.x + anchor.x / result.scale,
				y: result.origin.y + anchor.y / result.scale,
			};

			expect(canvasAfter.x).toBeCloseTo(canvasBefore.x);
			expect(canvasAfter.y).toBeCloseTo(canvasBefore.y);
		});
	});

	describe("fitBounds", () => {
		it("fits content within viewport", () => {
			const viewportBounds: Viewport.SizedBounds = {
				left: 0,
				top: 0,
				width: 800,
				height: 600,
			};
			const contentBounds = { x: 0, y: 0, width: 400, height: 300 };

			const result = Viewport.fitBounds(viewportBounds, contentBounds);

			// Content aspect ratio matches viewport aspect ratio (4:3)
			// Scale should be 800/400 = 2 or 600/300 = 2
			expect(result.scale).toBeCloseTo(2);

			// Content should be centered
			// Content center is at canvas (200, 150)
			// At scale 2, viewport center (400, 300) should map to canvas center
			// origin = contentCenter - halfViewport / scale = (200, 150) - (400/2, 300/2) / 2 = (200 - 200, 150 - 150) = (0, 0)
			// Wait, let me recalculate:
			// origin.x = contentCenterX - halfWidth / scale = 200 - 400 / 2 = 200 - 200 = 0
			// origin.y = contentCenterY - halfHeight / scale = 150 - 300 / 2 = 150 - 150 = 0
			expect(result.origin.x).toBeCloseTo(0);
			expect(result.origin.y).toBeCloseTo(0);
		});

		it("respects padding", () => {
			const viewportBounds: Viewport.SizedBounds = {
				left: 0,
				top: 0,
				width: 800,
				height: 600,
			};
			const contentBounds = { x: 0, y: 0, width: 400, height: 300 };
			const padding = 100;

			const result = Viewport.fitBounds(viewportBounds, contentBounds, padding);

			// Available space: 800 - 200 = 600 width, 600 - 200 = 400 height
			// Scale: min(600/400, 400/300) = min(1.5, 1.333) = 1.333...
			expect(result.scale).toBeCloseTo(4 / 3);
		});

		it("maintains aspect ratio by using smaller scale", () => {
			const viewportBounds: Viewport.SizedBounds = {
				left: 0,
				top: 0,
				width: 800,
				height: 400,
			};
			const contentBounds = { x: 0, y: 0, width: 200, height: 200 };

			const result = Viewport.fitBounds(viewportBounds, contentBounds);

			// Scale: min(800/200, 400/200) = min(4, 2) = 2
			expect(result.scale).toBeCloseTo(2);
		});

		it("handles content with offset", () => {
			const viewportBounds: Viewport.SizedBounds = {
				left: 0,
				top: 0,
				width: 400,
				height: 400,
			};
			const contentBounds = { x: 100, y: 100, width: 200, height: 200 };

			const result = Viewport.fitBounds(viewportBounds, contentBounds);

			// Scale: min(400/200, 400/200) = 2
			expect(result.scale).toBeCloseTo(2);

			// Content center is at (100 + 100, 100 + 100) = (200, 200)
			// origin = (200, 200) - (200, 200) / 2 = (200 - 100, 200 - 100) = (100, 100)
			expect(result.origin.x).toBeCloseTo(100);
			expect(result.origin.y).toBeCloseTo(100);
		});
	});
});
