import { Dialog } from "@kobalte/core";
import { createEventListener } from "@solid-primitives/event-listener";
import type { Graph, Node } from "@macrograph/runtime";
import clsx from "clsx";
import { For, batch, createEffect, createMemo, createSignal, on } from "solid-js";
import { produce } from "solid-js/store";

import { useInterfaceContext } from "../../context";
import { filterWithTokenisedSearch, tokeniseString } from "../../util";

/** Keep in sync with `components/Graph/Graph.tsx` zoom clamps. */
const GRAPH_MAX_ZOOM_IN = 2.5;
const GRAPH_MAX_ZOOM_OUT = 5;
const GRAPH_MIN_SCALE = 1 / GRAPH_MAX_ZOOM_OUT;

type Row = {
	graphId: number;
	nodeId: number;
	graphName: string;
	displayName: string;
	schemaQualified: string;
};

function createControl() {
	const [root, setRoot] = createSignal<HTMLDivElement>();
	const [open, setOpen] = createSignal(false);
	const [input, setInput] = createSignal("");

	const control = {
		get root() {
			const r = root();
			if (!r) throw new Error("Root not set");
			return r;
		},
		setRoot,
		open,
		setOpen,
		show() {
			batch(() => {
				setOpen(true);
				setInput("");
			});
			queueMicrotask(() => {
				control.input().focus();
				control.setActive(control.actions()[0]);
			});
		},
		hide() {
			control.input().blur();
			setOpen(false);
		},
		input() {
			return control.root.querySelector("input") as HTMLInputElement;
		},
		inputValue: input,
		setInput,
		actions() {
			return [
				...(control.root.querySelectorAll("[data-element='action']") ?? []),
			];
		},
		active() {
			return root()?.querySelector("[data-element='action'].active") as
				| HTMLElement
				| undefined;
		},
		setActive(el?: Element) {
			if (!el) return;

			const current = control.active();
			if (current) current.classList.remove("active");

			el.classList.add("active");

			const index = control.actions().indexOf(el);
			if (index === 0) {
				el.scrollIntoView({ block: "end" });
				return;
			}

			el.scrollIntoView({ block: "nearest" });
		},
		move(direction: -1 | 1) {
			const current = control.active();
			const all = control.actions();
			if (all.length === 0) return;
			if (!current) {
				control.setActive(all[0]);
				return;
			}
			const index = all.indexOf(current);
			const next = all[index + direction];
			control.setActive(next ?? all[direction === 1 ? 0 : all.length - 1]);
		},
		next() {
			return control.move(1);
		},
		back() {
			return control.move(-1);
		},
	};

	return control;
}

export function NodeSearchDialog() {
	const control = createControl();
	const ctx = useInterfaceContext();

	createEventListener(window, "keydown", (e) => {
		if (e.code === "KeyF" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
			e.preventDefault();
			if (control.open()) control.hide();
			else control.show();
		}
	});

	createEventListener(window, "keydown", (e) => {
		if (!control.open()) return;

		if (e.key === "ArrowUp") {
			e.preventDefault();
			control.back();
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			control.next();
		} else if (e.key === "Enter") {
			e.preventDefault();
			e.stopImmediatePropagation();
			const current = control.active();
			if (current) current.click();
		} else if (e.key === "Escape") {
			e.preventDefault();
			control.hide();
		}
	});

	const indexedRows = createMemo(() => {
		const project = ctx.core.project;
		const pairs: Array<readonly [string[], Row]> = [];

		for (const id of project.graphOrder) {
			const graph = project.graph(id);
			if (!graph) continue;

			for (const node of graph.nodes.values()) {
				const graphName = graph.name;
				const displayName = node.state.name;
				const schemaQualified = `${node.schema.package.name}/${node.schema.name}`;
				const raw = `${graphName} ${displayName} ${schemaQualified}`;
				const row: Row = {
					graphId: graph.id,
					nodeId: node.id,
					graphName,
					displayName,
					schemaQualified,
				};
				pairs.push([tokeniseString(raw), row]);
			}
		}

		return pairs;
	});

	const tokenisedSearch = createMemo(() => tokeniseString(control.inputValue()));

	const filteredRows = createMemo(() =>
		filterWithTokenisedSearch(tokenisedSearch, indexedRows()),
	);

	createEffect(
		on(filteredRows, () => {
			if (!control.open()) return;
			queueMicrotask(() => control.setActive(control.actions()[0]));
		}),
	);

	function frameNodeInActiveTab(graph: Graph, node: Node) {
		const maxAttempts = 16;

		const tryApply = (attempt: number) => {
			const { width: vw, height: vh } = ctx.graphBounds;
			if (vw <= 0 || vh <= 0) {
				if (attempt < maxAttempts)
					requestAnimationFrame(() => tryApply(attempt + 1));
				return;
			}

			const measured = ctx.itemSizes.get(node);
			const hasMeasured =
				measured !== undefined &&
				measured.width > 0 &&
				measured.height > 0;
			if (!hasMeasured && attempt < maxAttempts) {
				requestAnimationFrame(() => tryApply(attempt + 1));
				return;
			}

			const nw = hasMeasured ? measured!.width : 280;
			const nh = hasMeasured ? measured!.height : 120;

			const nx = node.state.position.x;
			const ny = node.state.position.y;
			const cx = nx + nw / 2;
			const cy = ny + nh / 2;

			const margin = 0.82;
			const scaleFit = Math.min((vw * margin) / nw, (vh * margin) / nh);
			const scale = Math.min(
				GRAPH_MAX_ZOOM_IN,
				Math.max(GRAPH_MIN_SCALE, scaleFit),
			);

			const groupIndex = ctx.mosaicState.focusedIndex;
			const tabIndex = ctx.mosaicState.groups[groupIndex]?.tabs.findIndex(
				(t) => t.id === graph.id,
			);
			if (tabIndex === undefined || tabIndex < 0) return;

			ctx.setMosaicState(
				"groups",
				groupIndex,
				"tabs",
				tabIndex,
				produce((tab) => {
					tab.scale = scale;
					tab.translate = {
						x: cx - vw / (2 * scale),
						y: cy - vh / (2 * scale),
					};
				}),
			);
		};

		requestAnimationFrame(() => {
			requestAnimationFrame(() => tryApply(0));
		});
	}

	function goToRow(row: Row) {
		const graph = ctx.core.project.graph(row.graphId);
		if (!graph) return;

		const node = graph.nodes.get(row.nodeId);
		if (!node) return;

		ctx.selectGraph(graph);
		ctx.execute("setGraphSelection", {
			graphId: graph.id,
			selection: [{ type: "node", id: node.id }],
		});
		frameNodeInActiveTab(graph, node);
		control.hide();
	}

	return (
		<Dialog.Root open={control.open()} onOpenChange={control.setOpen}>
			<Dialog.Portal>
				<div class="fixed inset-0 z-100 flex flex-col items-center overflow-hidden pt-48 px-8">
					<Dialog.Overlay class="absolute inset-0 bg-black/50" />
					<Dialog.Content<"div">
						ref={control.setRoot}
						style={{ "box-shadow": "rgba(0, 0, 0, 0.5) 0px 16px 70px" }}
						class={clsx(
							"relative max-w-2xl w-full backdrop-blur-md bg-black/80 min-h-[24rem] max-h-[32rem] rounded-lg shadow-2xl overflow-hidden flex flex-col divide-y divide-neutral-800 outline-none duration-75",
							"ui-expanded:animate-in ui-expanded:fade-in-0 ui-expanded:zoom-in-[0.98]",
							"ui-not-expanded:animate-out ui-not-expanded:fade-out-0 ui-not-expanded:zoom-out-[0.98]",
						)}
						onInteractOutside={() => control.hide()}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								const current = control.active();
								if (current) current.click();
							} else {
								return;
							}

							e.stopPropagation();
						}}
					>
						<Dialog.Title class="sr-only">Search nodes</Dialog.Title>
						<input
							placeholder="Search nodes by label or schema (e.g. package name)…"
							type="text"
							class="w-full p-4 bg-transparent border-none text-white text-lg placeholder:text-white/40"
							value={control.inputValue()}
							onInput={(e) => control.setInput(e.currentTarget.value)}
						/>
						<div class="w-full flex-1 p-2 space-y-1 text-sm text-white overflow-y-auto">
							<For each={filteredRows()}>
								{(row) => (
									<li
										class="px-4 py-2 rounded flex flex-col gap-0.5 [&.active]:bg-neutral-900 cursor-pointer"
										onMouseOver={(e) => e.currentTarget.focus()}
										onFocus={(e) => {
											const target = e.currentTarget;
											setTimeout(() => control.setActive(target), 0);
										}}
										onClick={() => goToRow(row)}
										onKeyPress={(e) => {
											if (e.key === "Enter") e.currentTarget.click();
										}}
										data-element="action"
										tabIndex={0}
									>
										<div class="text-neutral-400 text-xs">{row.graphName}</div>
										<div class="font-medium">{row.displayName}</div>
										<div class="text-neutral-500 text-xs">{row.schemaQualified}</div>
									</li>
								)}
							</For>
						</div>
						<div class="px-4 py-2 text-neutral-500 text-xs border-t border-neutral-800">
							Ctrl+Shift+F to toggle · arrows to move · enter to open
						</div>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
