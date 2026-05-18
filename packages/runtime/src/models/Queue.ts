import { Disposable, type t } from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import { trackDeep } from "@solid-primitives/deep";
import { createEffect, createRoot, getOwner, on, runWithOwner } from "solid-js";
import type { Node } from "./Node";
import { ExecutionContext } from "./Core";
import type { Project } from "./Project";

export type QueueArgs = {
	id: number;
	name: string;
	itemType: t.Any;
	graphId: number;
	owner: Project;
};

type QueueItemRun = {
	item: any;
	iterateFired: boolean;
};

export class Queue extends Disposable {
	id: number;
	name: string;
	itemType: t.Any;
	graphId: number;
	owner: Project;

	items: any[] = [];
	paused: boolean = false;
	processing: boolean = false;
	inFlight: number = 0;

	private runningItems = new Set<any>();
	private activeRuns = new Map<any, QueueItemRun>();
	private drainWaiters: Array<() => void> = [];

	constructor(args: QueueArgs) {
		super();

		this.id = args.id;
		this.name = args.name;
		this.itemType = args.itemType;
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
					() => self.itemType,
					() => {
						self.owner.emit("modified");
					},
				),
			);
		});

		return self;
	}

	addItem(value: any) {
		this.items = [...this.items, value];
		if (!this.paused) {
			void this.startProcessing();
		}
	}

	setPaused(value: boolean) {
		this.paused = value;
		if (!value && this.items.length > 0) {
			void this.startProcessing();
		}
	}

	completeItem(item: any) {
		const run = this.activeRuns.get(item);
		if (run) run.iterateFired = true;

		const idx = this.items.indexOf(item);
		if (idx >= 0) {
			this.items = [
				...this.items.slice(0, idx),
				...this.items.slice(idx + 1),
			];
		}
	}

	advance(node?: Node): boolean {
		if (this.paused) {
			this.owner.core.error("Queue is paused", node);
			return false;
		}

		const next = this.items.find((item) => !this.runningItems.has(item));
		if (!next) {
			this.owner.core.error("No waiting items to advance", node);
			return false;
		}

		void this.runQueueItem(next);

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
			const graph = this.owner.getGraphByKind("queue", this.graphId);
			if (!graph) return;

			const startNode = [...graph.nodes.values()].find(
				(n) => n.schema.name === "Queue Start",
			);
			if (!startNode) return;

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

				await this.runQueueItem(item);
			}
		} finally {
			this.processing = false;
			if (this.items.length > 0 && !this.paused && this.inFlight === 0) {
				void this.startProcessing();
			}
		}
	}

	private async runQueueItem(item: any) {
		if (this.runningItems.has(item)) return;

		const graph = this.owner.getGraphByKind("queue", this.graphId);
		if (!graph) return;

		const startNode = [...graph.nodes.values()].find(
			(n) => n.schema.name === "Queue Start",
		);
		if (!startNode) return;

		const itemOutput = startNode.state.outputs.find((o) => o.id === "item");

		const run: QueueItemRun = { item, iterateFired: false };
		this.activeRuns.set(item, run);
		this.runningItems.add(item);
		this.inFlight++;

		try {
			const execCtx = new ExecutionContext(startNode);
			if (itemOutput && "type" in itemOutput)
				execCtx.data.set(itemOutput as any, item);

			const scope = new Map<string, any>();
			execCtx.variableScope = scope;
			for (const v of graph.variables ?? []) {
				scope.set(`graph:${v.id}`, v.type.default());
			}

			await execCtx.runAsync({});

			if (!run.iterateFired) {
				this.owner.core.error(
					`Queue "${this.name}" item completed without reaching Iterate Queue node - check your queue graph logic`,
					startNode,
				);
			}
		} finally {
			this.runningItems.delete(item);
			this.activeRuns.delete(item);
			this.inFlight--;
			this.notifyDrain();

			if (!this.processing && this.items.length > 0 && !this.paused) {
				void this.startProcessing();
			}
		}
	}
}
