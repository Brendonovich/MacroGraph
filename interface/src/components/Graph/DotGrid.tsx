import type { XY } from "@macrograph/runtime";
import { createEffect, createSignal, onCleanup, Show } from "solid-js";

import { isPaneResizing, onPaneResizeEnd } from "../../paneResizeSession";
import { trackDotGridDraw } from "../../graphPerf";
import { useGraphContext } from "./Context";
import { GRID_SIZE } from "./util";

/** Fixed dot opacity (not user-configurable). */
const DOT_GRID_OPACITY = 0.07;

/** Hide grid when dots would be closer than this on screen (avoids moiré). */
const MIN_SCREEN_PITCH = 6;

/** Matches Graph zoom limits: 0.2 → 1.6 (1:8, ×2 steps) */
export const MIN_ZOOM_SCALE = 0.2;
export const MAX_ZOOM_SCALE = 1.6;

/** Min zoom-out (most zoomed out) */
export const MIN_ZOOM_DOT_PX = 2;
export const MIN_ZOOM_SPACING_MULT = 8;

/** Max zoom-in (most zoomed in) */
export const MAX_ZOOM_DOT_PX = 2;
export const MAX_ZOOM_SPACING_MULT = 1;

interface Props {
	active?: boolean;
	width: () => number;
	height: () => number;
}

const SPACING_STEPS = [1, 2, 4, 8] as const;

/** Log-space so each ×2 zoom step (0.2 → 0.4 → 0.8 → 1.6) gets even progress. */
function zoomT(scale: number) {
	const s = Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, scale));
	return (
		(Math.log(s) - Math.log(MIN_ZOOM_SCALE)) /
		(Math.log(MAX_ZOOM_SCALE) - Math.log(MIN_ZOOM_SCALE))
	);
}

function lerpZoom(scale: number, atMinZoom: number, atMaxZoom: number) {
	return Math.round(atMinZoom + (atMaxZoom - atMinZoom) * zoomT(scale));
}

function lerpSpacingMult(scale: number) {
	const lerped =
		MIN_ZOOM_SPACING_MULT +
		(MAX_ZOOM_SPACING_MULT - MIN_ZOOM_SPACING_MULT) * zoomT(scale);
	return SPACING_STEPS.reduce((best, step) =>
		Math.abs(step - lerped) < Math.abs(best - lerped) ? step : best,
	);
}

export function dotGridParams(scale: number) {
	return {
		dotPx: lerpZoom(scale, MIN_ZOOM_DOT_PX, MAX_ZOOM_DOT_PX),
		spacingMult: lerpSpacingMult(scale),
	};
}

function drawDotGrid(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	translate: XY,
	scale: number,
	dotPx: number,
	spacingMult: number,
) {
	const graphStep = GRID_SIZE * spacingMult;
	const pitch = graphStep * scale;
	if (pitch < MIN_SCREEN_PITCH) return;

	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = `rgba(255, 255, 255, ${DOT_GRID_OPACITY})`;

	const graphRight = translate.x + width / scale;
	const graphBottom = translate.y + height / scale;

	const startX = Math.floor(translate.x / graphStep) * graphStep;
	const startY = Math.floor(translate.y / graphStep) * graphStep;
	const half = (dotPx - 1) / 2;

	for (let gx = startX; gx <= graphRight; gx += graphStep) {
		for (let gy = startY; gy <= graphBottom; gy += graphStep) {
			const sx = Math.round((gx - translate.x) * scale);
			const sy = Math.round((gy - translate.y) * scale);
			const x = Math.round(sx - half);
			const y = Math.round(sy - half);
			if (x + dotPx > 0 && y + dotPx > 0 && x < width && y < height) {
				ctx.fillRect(x, y, dotPx, dotPx);
			}
		}
	}
}

export function DotGrid(props: Props) {
	const graphCtx = useGraphContext();
	const active = () => props.active !== false;
	const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement>();
	const [paintEpoch, setPaintEpoch] = createSignal(0);

	onCleanup(onPaneResizeEnd(() => setPaintEpoch((n) => n + 1)));

	const visible = () => {
		const { spacingMult } = dotGridParams(graphCtx.state.scale);
		return GRID_SIZE * spacingMult * graphCtx.state.scale >= MIN_SCREEN_PITCH;
	};

	createEffect(() => {
		paintEpoch();
		active();
		if (!active() || isPaneResizing()) return;

		const canvas = canvasRef();
		const width = props.width();
		const height = props.height();
		const scale = graphCtx.state.scale;
		const translate = graphCtx.state.translate;
		if (!canvas || !visible() || width === 0 || height === 0) return;

		let raf = 0;
		raf = requestAnimationFrame(() => {
			const dpr = window.devicePixelRatio || 1;
			canvas.width = Math.round(width * dpr);
			canvas.height = Math.round(height * dpr);
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;

			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			const { dotPx, spacingMult } = dotGridParams(scale);

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const drawStart = performance.now();
			drawDotGrid(ctx, width, height, translate, scale, dotPx, spacingMult);
			trackDotGridDraw(performance.now() - drawStart);
		});

		return () => {
			if (raf) cancelAnimationFrame(raf);
		};
	});

	return (
		<Show when={visible()}>
			<canvas
				ref={setCanvasRef}
				class="absolute inset-0 pointer-events-none"
				aria-hidden="true"
			/>
		</Show>
	);
}
