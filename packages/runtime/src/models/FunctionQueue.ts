import { Disposable } from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import { trackDeep } from "@solid-primitives/deep";
import { createEffect, createRoot, getOwner, on, runWithOwner } from "solid-js";
import type { Node } from "./Node";
import { ExecutionContext } from "./Core";
import type { Project } from "./Project";
import { DataOutput } from "./IO";

export const MAX_FUNCTION_QUEUE_ITEMS = 500;

export type FnQueueItem = {
	functionId: number;
	data: Record<string, any>;
	waitingNodeId: number;
	waitingGraphId: number;
	resolve?: (outputs: Record<string, any>) => void;
};

export type FunctionQueueArgs = {
	id: number;
	name: string;
	graphId: number;
	owner: Project;
};

export class FunctionQueue extends Disposable {
	id: number;
	name: string;
	graphId: number;
	owner: Project;

	items: FnQueueItem[] = [];
	/** Items currently executing (shown in UI). */
	running: FnQueueItem[] = [];
	paused: boolean = false;
	processing: boolean = false;
	inFlight: number = 0;

	private runningItems = new Set<FnQueueItem>();

	constructor(args: FunctionQueueArgs) {
		super();

		this.id = args.id;
		this.name = args.name;
		this.graphId = args.graphId;
		this.owner = args.owner;

		const self = createMutable(this);

		const { owner, dispose } = createRoot((dispose) => ({
			owner: getOwner(),
			dispose,
		}));

		this.addDisposeListener(dispose);

		runWithOwner(owner, () => {
			createEffect(
				on(
					() => trackDeep(self.items),
					() => {
						self.owner.emit("modified");
					},
				),
			);
			createEffect(
				on(
					() => trackDeep(self.running),
					() => {
						self.owner.emit("modified");
					},
				),
			);
		});

		return self;
	}

	addItem(item: FnQueueItem): Promise<Record<string, any>> {
		return new Promise((resolve) => {
			item.resolve = resolve;
			const next = [...this.items, item];
			let droppedCount = 0;
			while (next.length > MAX_FUNCTION_QUEUE_ITEMS) {
				const dropped = next.shift();
				droppedCount++;
				if (dropped?.resolve) dropped.resolve({});
			}
			if (droppedCount > 0) {
				this.owner.core.warn(
					`Function queue "${this.name}" dropped ${droppedCount} waiter(s) (max ${MAX_FUNCTION_QUEUE_ITEMS})`,
				);
			}
			this.items = next;
			if (!this.paused) {
				this.scheduleProcessing();
			}
		});
	}

	setPaused(value: boolean) {
		this.paused = value;
		if (!value && this.items.length > 0) {
			this.scheduleProcessing();
		}
	}

	removeItemsForFunction(functionId: number) {
		for (const item of this.items) {
			if (item.functionId === functionId && item.resolve) {
				item.resolve({});
			}
		}
		this.items = this.items.filter((i) => i.functionId !== functionId);
	}

	private claimNextItem(): FnQueueItem | undefined {
		const item = this.items[0];
		if (item === undefined) return undefined;
		this.removeItem(item);
		return item;
	}

	private requeueItem(item: FnQueueItem) {
		this.items = [item, ...this.items];
	}

	advance(node?: Node): boolean {
		if (this.paused) {
			this.owner.core.error("Function queue is paused", node);
			return false;
		}

		const next = this.claimNextItem();
		if (next === undefined) {
			this.owner.core.error("No waiting items to advance", node);
			return false;
		}

		void this.runFunctionItem(next, true);

		return true;
	}

	private maybeScheduleNext() {
		if (this.paused) return;
		if (this.items.length === 0) return;
		if (this.inFlight > 0) return;
		this.scheduleProcessing();
	}

	private processingScheduled = false;
	private deferredProcessing = false;

	resumeDeferredProcessing() {
		if (!this.deferredProcessing) return;
		this.deferredProcessing = false;
		this.scheduleProcessing();
	}

	private scheduleProcessing() {
		if (!this.owner.core.queueProcessingEnabled) {
			this.deferredProcessing = true;
			return;
		}
		if (this.processingScheduled || this.processing) return;
		if (this.items.length === 0 || this.paused) return;
		this.processingScheduled = true;
		queueMicrotask(() => {
			this.processingScheduled = false;
			void this.startProcessing();
		});
	}

	private addRunning(item: FnQueueItem) {
		if (this.runningItems.has(item)) return;
		this.runningItems.add(item);
		this.running = [...this.running, item];
	}

	private removeRunning(item: FnQueueItem) {
		if (!this.runningItems.has(item)) return;
		this.runningItems.delete(item);
		const idx = this.running.indexOf(item);
		if (idx >= 0) {
			this.running = [
				...this.running.slice(0, idx),
				...this.running.slice(idx + 1),
			];
		}
	}

	async startProcessing() {
		if (this.processing) return;
		if (this.paused || this.items.length === 0) return;
		if (this.inFlight > 0) return;

		this.processing = true;
		try {
			const item = this.claimNextItem();
			if (item === undefined) return;
			void this.runFunctionItem(item, true);
		} finally {
			this.processing = false;
		}
	}

	private async runFunctionItem(
		item: FnQueueItem,
		alreadyDequeued = false,
	) {
		if (this.runningItems.has(item)) return;

		if (item.functionId === undefined) {
			if (alreadyDequeued) this.requeueItem(item);
			else this.removeItem(item);
			this.maybeScheduleNext();
			return;
		}

		const fn = this.owner.functions.get(item.functionId);
		if (!fn) {
			if (item.resolve) item.resolve({});
			if (alreadyDequeued) this.requeueItem(item);
			else this.removeItem(item);
			this.maybeScheduleNext();
			return;
		}

		const fnGraph = this.owner.getGraphByKind("function", fn.graphId);
		if (!fnGraph) {
			if (item.resolve) item.resolve({});
			if (alreadyDequeued) this.requeueItem(item);
			else this.removeItem(item);
			this.maybeScheduleNext();
			return;
		}

		const inNode =
			[...fnGraph.nodes.values()].find(
				(n: any) => n.schema.name === "Function Input",
			) ?? [...fnGraph.nodes.values()][0];
		if (!inNode) {
			if (item.resolve) item.resolve({});
			if (alreadyDequeued) this.requeueItem(item);
			else this.removeItem(item);
			this.maybeScheduleNext();
			return;
		}

		if (!alreadyDequeued) this.removeItem(item);
		this.addRunning(item);
		this.inFlight++;

		try {
			const execCtx = new ExecutionContext(inNode);

			const scope = new Map<string, any>();
			execCtx.variableScope = scope;
			for (const v of fnGraph.variables ?? []) {
				scope.set(`graph:${v.id}`, v.type.default());
			}

			for (const [key, value] of Object.entries(item.data ?? {})) {
				for (const n of fnGraph.nodes.values()) {
					if (n.schema.name !== "Function Input") continue;
					const out = n.state.outputs.find((o: any) => o.id === `gin:${key}`);
					if (out) execCtx.data.set(out, value);
				}
			}

			await execCtx.runAsync({});
			await this.finishItem(item, execCtx, fnGraph);
		} finally {
			this.removeRunning(item);
			if (!alreadyDequeued) this.removeItem(item);
			this.inFlight--;

			this.maybeScheduleNext();
		}
	}

	private removeItem(item: FnQueueItem) {
		const idx = this.items.indexOf(item);
		if (idx >= 0) {
			this.items = [
				...this.items.slice(0, idx),
				...this.items.slice(idx + 1),
			];
		}
	}

	private async finishItem(
		item: FnQueueItem,
		execCtx: ExecutionContext,
		fnGraph: import("./Graph").Graph,
	) {
		const outputs: Record<string, any> = {};

		for (const n of fnGraph.nodes.values()) {
			if (n.schema.name !== "Function Output") continue;
			for (const inp of n.state.inputs) {
				const conn = (inp as any).connection?.toNullable?.();
				if (conn) {
					for (const [k, v] of execCtx.data) {
						if (
							(k as any).node?.id === (conn as any).node?.id &&
							(k as any).id === (conn as any).id
						) {
							const fieldId = inp.id.replace("gout:", "");
							outputs[fieldId] = v;
							break;
						}
					}
				}
			}
		}

		if (item.resolve) {
			item.resolve(outputs);
		} else {
			const graph =
				this.owner.getGraphByKind("graph", item.waitingGraphId) ??
				this.owner.getGraphByKind("function", item.waitingGraphId) ??
				this.owner.getGraphByKind("queue", item.waitingGraphId) ??
				this.owner.getGraphByKind("functionQueue", item.waitingGraphId);
			if (graph) {
				const node = graph.nodes.get(item.waitingNodeId);
				if (node) {
					const resumeCtx = new ExecutionContext(node);
					for (const out of node.state.outputs) {
						const fieldId =
							out.id.startsWith("out:") ? out.id.slice(4) : out.id;
						if (out instanceof DataOutput && outputs[fieldId] !== undefined) {
							resumeCtx.data.set(out, outputs[fieldId]);
						}
					}

					const execOutput = node.state.outputs.find((o) => o.id === "exec");
					if (execOutput) {
						await execOutput
							.connection()
							.peekAsync((conn) => resumeCtx.execNode(conn.node));
					}
				}
			}
		}

		const queuePkg = this.owner.core.packages.find(
			(p) => p.name === "Function Queue",
		);
		if (queuePkg) {
			this.owner.core.emitEvent(queuePkg as any, {
				name: `fnIterated:${this.id}`,
				data: { queueId: this.id, functionId: item.functionId },
			});
		}
	}
}
