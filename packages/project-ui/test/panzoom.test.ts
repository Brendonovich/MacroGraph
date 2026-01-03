import { describe, expect, it } from "vitest";

import { Viewport } from "../src/Graph/panzoom";

describe("zoomAt", () => {
	it("zooms in to origin", () => {
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
});
