import { Disposable, type t } from "@macrograph/typesystem";
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
	value: any;
};

export type QueueArgs = {
	id: number;
	name: string;
	itemType: t.Any;
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

export function createQueueEntry(value: any): QueueEntry {
	return { id: newQueueEntryId(), value };
}

/** Normalize persisted or UI values into queue entries. */
export function normalizeQueueEntries(items: any[]): QueueEntry[] {
	return items.map((item) => {
		if (
			item &&
			typeof item === "object" &&
			typeof item.id === "string" &&
			"value" in item
		) {
			return item as QueueEntry;
		}
		return createQueueEntry(item);
	});
}

export class Queue extends Disposable {
	id: number;
	name: string;
	itemType: t.Any;
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

	addItem(value: any) {
		const next = [...this.items, createQueueEntry(value)];
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

	/** Value of an in-flight item (first active run). */
	getActiveItem(): any | undefined {
		for (const run of this.activeRuns.values()) return run.entry.value;
		return undefined;
	}

	getEntryValue(entryId: string): any | undefined {
		return this.activeRuns.get(entryId)?.entry.value;
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
			if (run.entry.value === item) {
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

		const itemOutput = startNode.state.outputs.find((o) => o.id === "item");

		this.addRunning(entry);
		const run: QueueItemRun = { entry, iterateFired: false };
		this.activeRuns.set(entry.id, run);
		this.inFlight++;

		try {
			const execCtx = new ExecutionContext(startNode);
			execCtx.queueEntryId = entry.id;
			if (itemOutput && "type" in itemOutput)
				execCtx.data.set(itemOutput as any, entry.value);

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
