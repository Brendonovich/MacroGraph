import { Disposable } from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import { trackDeep } from "@solid-primitives/deep";
import { createEffect, createRoot, getOwner, on, runWithOwner } from "solid-js";
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
	concurrent: boolean = false;
	processing: boolean = false;
	iterateFired: boolean = false;

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
		return new Promise((resolve, reject) => {
			item.resolve = resolve;
			this.items = [...this.items, item];
			if (!this.paused) {
				this.startProcessing();
			}
		});
	}

	setPaused(value: boolean) {
		this.paused = value;
		if (!value && this.items.length > 0) {
			this.startProcessing();
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

	async startProcessing() {
		if (this.processing) return;

		this.processing = true;
		try {
			while (this.items.length > 0 && !this.paused) {
				const item = this.items[0];
				if (item.functionId === undefined) {
					this.items.shift();
					continue;
				}

				const fn = this.owner.functions.get(item.functionId);
				if (!fn) {
					if (item.resolve) item.resolve({});
					this.items.shift();
					continue;
				}

				const fnGraph = this.owner.graphs.get(fn.graphId);
				if (!fnGraph) {
					if (item.resolve) item.resolve({});
					this.items.shift();
					continue;
				}

				const inNode = [...fnGraph.nodes.values()].find(
					(n: any) => n.schema.name === "Function Input",
				) ?? [...fnGraph.nodes.values()][0];
				if (!inNode) {
					if (item.resolve) item.resolve({});
					this.items.shift();
					continue;
				}

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

				if (this.concurrent) {
					this.items.shift();
					const promise = execCtx.runAsync({});
					promise.then(() => this.finishItem(item, execCtx, fnGraph));
				} else {
					await execCtx.runAsync({});
					this.items.shift();
					await this.finishItem(item, execCtx, fnGraph);
				}
			}
		} finally {
			this.processing = false;
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
			const graph = this.owner.graphs.get(item.waitingGraphId);
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

		this.iterateFired = true;

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
