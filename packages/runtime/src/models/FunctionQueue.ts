import { Disposable } from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import { trackDeep } from "@solid-primitives/deep";
import { createEffect, createRoot, getOwner, on, runWithOwner } from "solid-js";
import type { Node } from "./Node";
import { ExecutionContext } from "./Core";
import type { Project } from "./Project";
import { DataOutput } from "./IO";

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
	paused: boolean = false;
	processing: boolean = false;
	inFlight: number = 0;

	private runningItems = new Set<FnQueueItem>();
	private drainWaiters: Array<() => void> = [];

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
		});

		return self;
	}

	addItem(item: FnQueueItem): Promise<Record<string, any>> {
		return new Promise((resolve) => {
			item.resolve = resolve;
			this.items = [...this.items, item];
			if (!this.paused) {
				void this.startProcessing();
			}
		});
	}

	setPaused(value: boolean) {
		this.paused = value;
		if (!value && this.items.length > 0) {
			void this.startProcessing();
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

	advance(node?: Node): boolean {
		if (this.paused) {
			this.owner.core.error("Function queue is paused", node);
			return false;
		}

		const next = this.items.find((item) => !this.runningItems.has(item));
		if (!next) {
			this.owner.core.error("No waiting items to advance", node);
			return false;
		}

		void this.runFunctionItem(next);

		if (!this.processing && this.items.length > 0 && !this.paused) {
			void this.startProcessing();
		}

		return true;
	}

	private async drainInFlight() {
		if (this.inFlight === 0) return;
		await new Promise<void>((resolve) => {
			this.drainWaiters.push(resolve);
		});
	}

	private notifyDrain() {
		if (this.inFlight === 0) {
			const waiters = this.drainWaiters;
			this.drainWaiters = [];
			for (const resolve of waiters) resolve();
		}
	}

	async startProcessing() {
		if (this.processing) return;

		this.processing = true;
		try {
			while (this.items.length > 0 && !this.paused) {
				if (this.inFlight > 0) {
					await this.drainInFlight();
				}

				const item = this.items[0];
				if (!item || this.runningItems.has(item)) {
					if (this.inFlight > 0) await this.drainInFlight();
					if (this.items.length === 0 || this.paused) break;
					const head = this.items[0];
					if (!head || this.runningItems.has(head)) break;
					continue;
				}

				await this.runFunctionItem(item);
			}
		} finally {
			this.processing = false;
			if (this.items.length > 0 && !this.paused && this.inFlight === 0) {
				void this.startProcessing();
			}
		}
	}

	private async runFunctionItem(item: FnQueueItem) {
		if (this.runningItems.has(item)) return;

		if (item.functionId === undefined) {
			this.removeItem(item);
			return;
		}

		const fn = this.owner.functions.get(item.functionId);
		if (!fn) {
			if (item.resolve) item.resolve({});
			this.removeItem(item);
			return;
		}

		const fnGraph = this.owner.getGraphByKind("function", fn.graphId);
		if (!fnGraph) {
			if (item.resolve) item.resolve({});
			this.removeItem(item);
			return;
		}

		const inNode =
			[...fnGraph.nodes.values()].find(
				(n: any) => n.schema.name === "Function Input",
			) ?? [...fnGraph.nodes.values()][0];
		if (!inNode) {
			if (item.resolve) item.resolve({});
			this.removeItem(item);
			return;
		}

		this.runningItems.add(item);
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
			this.runningItems.delete(item);
			this.removeItem(item);
			this.inFlight--;
			this.notifyDrain();

			if (!this.processing && this.items.length > 0 && !this.paused) {
				void this.startProcessing();
			}
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
