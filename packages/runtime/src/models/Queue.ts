import { Disposable, type t } from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import { trackDeep } from "@solid-primitives/deep";
import { createEffect, createRoot, getOwner, on, runWithOwner } from "solid-js";
import { ExecutionContext } from "./Core";
import type { Project } from "./Project";

export type QueueArgs = {
	id: number;
	name: string;
	itemType: t.Any;
	graphId: number;
	owner: Project;
};

export class Queue extends Disposable {
	id: number;
	name: string;
	itemType: t.Any;
	graphId: number;
	owner: Project;

	items: any[] = [];
	paused: boolean = false;
	concurrent: boolean = false;
	processing: boolean = false;
	iterateFired: boolean = false;

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
			this.startProcessing();
		}
	}

	setPaused(value: boolean) {
		this.paused = value;
		if (!value && this.items.length > 0) {
			this.startProcessing();
		}
	}

	async startProcessing() {
		if (this.processing) return;

		this.processing = true;
		try {
			const graph = this.owner.graphs.get(this.graphId);
			if (!graph) return;

			const startNode = [...graph.nodes.values()].find(
				(n) => n.schema.name === "Queue Start",
			);
			if (!startNode) return;

			const itemOutput = startNode.state.outputs.find((o) => o.id === "item");

			while (this.items.length > 0 && !this.paused) {
				const item = this.items[0];

				const execCtx = new ExecutionContext(startNode);
				if (itemOutput && "type" in itemOutput) execCtx.data.set(itemOutput as any, item);

				const scope = new Map<string, any>();
				execCtx.variableScope = scope;
				for (const v of graph.variables ?? []) {
					scope.set(`graph:${v.id}`, v.type.default());
				}

				this.iterateFired = false;

				if (this.concurrent) {
					this.items.shift();
					execCtx.runAsync({});
				} else {
					await execCtx.runAsync({});
					if (!this.iterateFired) {
						this.owner.core.error(
							`Queue "${this.name}" item completed without reaching Iterate Queue node - check your queue graph logic`,
							startNode,
						);
					}
					this.items.shift();
				}
			}
		} finally {
			this.processing = false;
		}
	}
}
