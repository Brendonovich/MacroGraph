import { createEventListenerMap } from "@solid-primitives/event-listener";
import clsx from "clsx";
import type { Component, JSX } from "solid-js";
import * as Solid from "solid-js";
import { createRoot, onCleanup } from "solid-js";

import type { MosaicLeaf, MosaicNode, MosaicSplit } from "../mosaicLayout";
import { clampRatio } from "../mosaicLayout";
import { beginPaneResize, endPaneResize } from "../paneResizeSession";

function MosaicSplitHandle(props: {
	direction: "horizontal" | "vertical";
	ratio: number;
	path: number[];
	onRatioChange: (path: number[], ratio: number) => void;
	onResizeEnd?: () => void;
}) {
	const [dragging, setDragging] = Solid.createSignal(false);
	const isHorizontal = () => props.direction === "horizontal";

	return (
		<div
			class={clsx(
				"relative shrink-0 z-20",
				isHorizontal() ? "w-px h-full" : "h-px w-full",
				dragging() ? "bg-neutral-500" : "bg-neutral-700",
			)}
		>
			<div
				class={clsx(
					"absolute z-10",
					isHorizontal()
						? "cursor-ew-resize inset-y-0 -inset-x-1"
						: "cursor-ns-resize inset-x-0 -inset-y-1",
				)}
				onPointerDown={(e) => {
					e.stopPropagation();
					if (e.button !== 0) return;

					const parent = e.currentTarget.parentElement?.parentElement;
					if (!parent) return;

					const start = isHorizontal() ? e.clientX : e.clientY;
					const parentSize = isHorizontal()
						? parent.getBoundingClientRect().width
						: parent.getBoundingClientRect().height;
					const startRatio = props.ratio;

					setDragging(true);
					beginPaneResize();

					let raf = 0;
					let pendingRatio: number | null = null;

					const flushRatio = () => {
						raf = 0;
						if (pendingRatio === null) return;
						props.onRatioChange(props.path, pendingRatio);
						pendingRatio = null;
					};

					createRoot((dispose) => {
						onCleanup(() => {
							setDragging(false);
							if (raf) cancelAnimationFrame(raf);
							flushRatio();
							endPaneResize();
							props.onResizeEnd?.();
						});

						createEventListenerMap(window, {
							pointerup: dispose,
							pointermove: (ev) => {
								const current = isHorizontal() ? ev.clientX : ev.clientY;
								const delta = current - start;
								pendingRatio = clampRatio(
									startRatio + delta / Math.max(parentSize, 1),
								);
								if (!raf) {
									raf = requestAnimationFrame(flushRatio);
								}
							},
						});
					});
				}}
			/>
		</div>
	);
}

function MosaicSplitView(props: {
	split: MosaicSplit;
	path: number[];
	Leaf: Component<{ groupId: string }>;
	onSplitRatioChange: (path: number[], ratio: number) => void;
	onSplitResizeEnd?: () => void;
}) {
	const isHorizontal = () => props.split.direction === "horizontal";
	/** Local preview during drag — avoids setMosaicState on every frame. */
	const [liveRatio, setLiveRatio] = Solid.createSignal<number | null>(null);
	const ratio = () => liveRatio() ?? props.split.ratio;
	const firstSize = () => `${ratio() * 100}%`;
	const childPath = (branch: number) => {
		const p = props.path;
		return p.length ? `${p.join(".")}.${branch}` : String(branch);
	};

	const previewRatio = (_path: number[], next: number) => {
		setLiveRatio(next);
	};

	const commitRatio = () => {
		const next = liveRatio();
		if (next !== null) props.onSplitRatioChange(props.path, next);
		setLiveRatio(null);
		props.onSplitResizeEnd?.();
	};

	return (
		<div
			class={clsx(
				"flex flex-1 min-h-0 min-w-0 h-full w-full",
				isHorizontal() ? "flex-row" : "flex-col",
			)}
		>
			<div
				class="min-h-0 min-w-0 overflow-hidden shrink-0"
				style={
					isHorizontal()
						? { width: firstSize() }
						: { height: firstSize() }
				}
			>
				<MosaicLayout
					node={props.split.first}
					pathKey={childPath(0)}
					Leaf={props.Leaf}
					onSplitRatioChange={props.onSplitRatioChange}
					onSplitResizeEnd={props.onSplitResizeEnd}
				/>
			</div>
			<MosaicSplitHandle
				direction={props.split.direction}
				ratio={ratio()}
				path={props.path}
				onRatioChange={previewRatio}
				onResizeEnd={commitRatio}
			/>
			<div class="flex-1 min-h-0 min-w-0 overflow-hidden">
				<MosaicLayout
					node={props.split.second}
					pathKey={childPath(1)}
					Leaf={props.Leaf}
					onSplitRatioChange={props.onSplitRatioChange}
					onSplitResizeEnd={props.onSplitResizeEnd}
				/>
			</div>
		</div>
	);
}

export function MosaicLayout(props: {
	node: MosaicNode;
	pathKey?: string;
	Leaf: Component<{ groupId: string }>;
	onSplitRatioChange: (path: number[], ratio: number) => void;
	onSplitResizeEnd?: () => void;
}) {
	const pathKey = () => props.pathKey ?? "";
	const pathFromKey = (): number[] =>
		pathKey() === ""
			? []
			: pathKey()
					.split(".")
					.map((n) => Number(n));

	return (
		<Solid.Switch>
			<Solid.Match when={props.node.type === "leaf"}>
				<props.Leaf groupId={(props.node as MosaicLeaf).groupId} />
			</Solid.Match>
			<Solid.Match when={props.node.type === "split"}>
				<MosaicSplitView
					split={props.node as MosaicSplit}
					path={pathFromKey()}
					Leaf={props.Leaf}
					onSplitRatioChange={props.onSplitRatioChange}
					onSplitResizeEnd={props.onSplitResizeEnd}
				/>
			</Solid.Match>
		</Solid.Switch>
	);
}
