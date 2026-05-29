import { Disposable, Field, type AnyType, t } from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import { trackDeep } from "@solid-primitives/deep";
import { createEffect, createRoot, getOwner, on, runWithOwner } from "solid-js";
import type { Node } from "./Node";
import { ExecutionContext } from "./Core";
import type { Project } from "./Project";

/** Drop oldest when enqueue exceeds this (chat/WS floods). */
export const MAX_QUEUE_ITEMS = 2000;

export type QueueEntry = {
	id: string;
	data: Record<string, any>;
};

export type QueueArgs = {
	id: number;
	name: string;
	graphId: number;
	owner: Project;
};

type QueueItemRun = {
	entry: QueueEntry;
	iterateFired: boolean;
};

function newQueueEntryId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createQueueEntry(data: Record<string, any>): QueueEntry {
	return { id: newQueueEntryId(), data };
}

/** Normalize persisted or UI values into queue entries. */
export function normalizeQueueEntries(items: any[]): QueueEntry[] {
	return items.map((item) => {
		if (
			item &&
			typeof item === "object" &&
			typeof item.id === "string" &&
			"data" in item &&
			typeof item.data === "object"
		) {
			return item as QueueEntry;
		}
		return createQueueEntry(typeof item === "object" && item !== null ? item : {});
	});
}

export class Queue extends Disposable {
	id: number;
	name: string;
	inputs: Field[] = [];
	outputs: Field[] = [];
	inputIdCounter = 0;
	outputIdCounter = 0;
	graphId: number;
	owner: Project;

	items: QueueEntry[] = [];
	/** Items currently executing (shown in UI). */
	running: QueueEntry[] = [];
	paused: boolean = false;
	processing: boolean = false;
	inFlight: number = 0;

	private runningIds = new Set<string>();
	private activeRuns = new Map<string, QueueItemRun>();

	constructor(args: QueueArgs) {
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
					() => trackDeep(self.inputs),
					() => {
						self.owner.emit("modified");
					},
				),
			);
			createEffect(
				on(
					() => trackDeep(self.outputs),
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

	createInput(args?: { id?: string; name?: string; type?: AnyType }) {
		const id = args?.id ?? (this.inputIdCounter++).toString();
		this.inputs.push(new Field(id, args?.type ?? t.string(), args?.name ?? `Input ${id}`));
	}

	createOutput(args?: { id?: string; name?: string; type?: AnyType }) {
		const id = args?.id ?? (this.outputIdCounter++).toString();
		this.outputs.push(new Field(id, args?.type ?? t.string(), args?.name ?? `Output ${id}`));
	}

	deleteInput(id: string) {
		const idx = this.inputs.findIndex((f) => f.id === id);
		if (idx >= 0) this.inputs.splice(idx, 1);
	}

	deleteOutput(id: string) {
		const idx = this.outputs.findIndex((f) => f.id === id);
		if (idx >= 0) this.outputs.splice(idx, 1);
	}

	addItem(data: Record<string, any>) {
		const next = [...this.items, createQueueEntry(data)];
		if (next.length > MAX_QUEUE_ITEMS) {
			this.items = next.slice(next.length - MAX_QUEUE_ITEMS);
			this.owner.core.warn(
				`Queue "${this.name}" dropped oldest items (max ${MAX_QUEUE_ITEMS})`,
			);
		} else {
			this.items = next;
		}
		if (!this.paused) {
			this.scheduleProcessing();
		}
	}

	setPaused(value: boolean) {
		this.paused = value;
		if (!value && this.items.length > 0) {
			this.scheduleProcessing();
		}
	}

	/** Data of an in-flight item (first active run). */
	getActiveItem(): Record<string, any> | undefined {
		for (const run of this.activeRuns.values()) return run.entry.data;
		return undefined;
	}

	getEntryValue(entryId: string): Record<string, any> | undefined {
		return this.activeRuns.get(entryId)?.entry.data;
	}

	/** Mark the entry identified by exec context as iterated. */
	completeEntry(entryId: string) {
		const run = this.activeRuns.get(entryId);
		if (run) run.iterateFired = true;
	}

	/** @deprecated Prefer {@link completeEntry} with the run's entry id. */
	completeItem(item?: any) {
		if (typeof item === "string") {
			this.completeEntry(item);
			return;
		}
		if (item === undefined) {
			const first = this.activeRuns.values().next().value;
			if (first) first.iterateFired = true;
			return;
		}
		for (const [id, run] of this.activeRuns) {
			if (run.entry.data === item) {
				run.iterateFired = true;
				return;
			}
		}
	}

	private addRunning(entry: QueueEntry) {
		if (this.runningIds.has(entry.id)) return;
		this.runningIds.add(entry.id);
		this.running = [...this.running, entry];
	}

	private removeRunning(entry: QueueEntry) {
		if (!this.runningIds.has(entry.id)) return;
		this.runningIds.delete(entry.id);
		const idx = this.running.findIndex((e) => e.id === entry.id);
		if (idx >= 0) {
			this.running = [
				...this.running.slice(0, idx),
				...this.running.slice(idx + 1),
			];
		}
	}

	private removeEntryFromWaiting(entry: QueueEntry) {
		const idx = this.items.findIndex((e) => e.id === entry.id);
		if (idx >= 0) {
			this.items = [
				...this.items.slice(0, idx),
				...this.items.slice(idx + 1),
			];
		}
	}

	private claimNextEntry(): QueueEntry | undefined {
		const entry = this.items[0];
		if (entry === undefined) return undefined;
		this.removeEntryFromWaiting(entry);
		return entry;
	}

	private requeueEntry(entry: QueueEntry) {
		this.items = [entry, ...this.items];
	}

	advance(node?: Node): boolean {
		if (this.paused) {
			this.owner.core.error("Queue is paused", node);
			return false;
		}

		const next = this.claimNextEntry();
		if (next === undefined) {
			this.owner.core.error("No waiting items to advance", node);
			return false;
		}

		void this.runQueueEntry(next, true);

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

	async startProcessing() {
		if (this.processing) return;
		if (this.paused || this.items.length === 0) return;
		if (this.inFlight > 0) return;

		this.processing = true;
		try {
			const entry = this.claimNextEntry();
			if (entry === undefined) return;
			void this.runQueueEntry(entry, true);
		} finally {
			this.processing = false;
		}
	}

	private async runQueueEntry(
		entry: QueueEntry,
		alreadyDequeued = false,
	): Promise<void> {
		if (this.runningIds.has(entry.id)) {
			if (alreadyDequeued) this.requeueEntry(entry);
			return;
		}

		if (!alreadyDequeued) {
			if (this.items.findIndex((e) => e.id === entry.id) < 0) return;
			this.removeEntryFromWaiting(entry);
		}

		const graph = this.owner.getGraphByKind("queue", this.graphId);
		if (!graph) {
			this.requeueEntry(entry);
			this.owner.core.error(
				`Queue "${this.name}": queue graph not found`,
			);
			this.maybeScheduleNext();
			return;
		}

		const startNode = [...graph.nodes.values()].find(
			(n) => n.schema.name === "Queue Start",
		);
		if (!startNode) {
			this.requeueEntry(entry);
			this.owner.core.error(
				`Queue "${this.name}": missing Queue Start node`,
			);
			this.maybeScheduleNext();
			return;
		}

		this.addRunning(entry);
		const run: QueueItemRun = { entry, iterateFired: false };
		this.activeRuns.set(entry.id, run);
		this.inFlight++;

		try {
			const execCtx = new ExecutionContext(startNode);
			execCtx.queueEntryId = entry.id;

			for (const input of this.inputs) {
				const output = startNode.state.outputs.find(
					(o) => o.id === `in:${input.id}`,
				);
				if (output && "type" in output) {
					execCtx.data.set(output as any, entry.data[input.id]);
				}
			}

			const scope = new Map<string, any>();
			execCtx.variableScope = scope;
			for (const v of graph.variables ?? []) {
				scope.set(`graph:${v.id}`, v.type.default());
			}

			await execCtx.runAsync({});
		} finally {
			this.removeRunning(entry);
			this.activeRuns.delete(entry.id);
			this.inFlight--;

			if (!run.iterateFired) {
				this.owner.core.error(
					`Queue "${this.name}" item completed without the Iterate Queue exec input firing - wire exec into Iterate Queue`,
					startNode,
				);
			}

			this.maybeScheduleNext();
		}
	}
}
