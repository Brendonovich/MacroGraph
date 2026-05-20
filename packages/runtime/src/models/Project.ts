import { Maybe, type Option } from "@macrograph/option";
import type { EnumBase, StructBase } from "@macrograph/typesystem";
import { t } from "@macrograph/typesystem";
import { createEventBus } from "@solid-primitives/event-bus";
import { ReactiveMap } from "@solid-primitives/map";
import "@total-typescript/ts-reset";
import { createMutable } from "solid-js/store";

import type { Core } from "./Core";
import { CustomEnum } from "./CustomEnum";
import { CustomEvent } from "./CustomEvent";
import { CustomStruct } from "./CustomStruct";
import { Graph } from "./Graph";
import { type GraphRef, graphRefKey } from "./graphRef";

export type { GraphRef } from "./graphRef";
export { graphRefKey, graphRefsEqual } from "./graphRef";
import { GraphFunction, type FunctionArgs } from "./Function";
import { resolveResourceSources, type ResourceType } from "./Package";
import { Queue, normalizeQueueEntries, type QueueArgs } from "./Queue";
import { FunctionQueue, type FunctionQueueArgs } from "./FunctionQueue";
import { Variable, type VariableArgs } from "./Variable";

export interface ProjectArgs {
	core: Core;
}

export type ResourceTypeItem = {
	id: number;
	name: string;
} & ({ sourceId: string | null } | { value: string });

export type ResourceTypeEntry = {
	items: Array<ResourceTypeItem>;
	default: number | null;
};

export type ProjectEvent = "modified";

export type GraphKind = "graph" | "function" | "queue" | "functionQueue";

export class Project {
	core: Core;

	graphs = new ReactiveMap<number, Graph>();
	functionGraphs = new ReactiveMap<number, Graph>();
	queueGraphs = new ReactiveMap<number, Graph>();
	functionQueueGraphs = new ReactiveMap<number, Graph>();
	graphOrder: Array<number> = [];
	functionGraphOrder: Array<number> = [];
	queueGraphOrder: Array<number> = [];
	functionQueueGraphOrder: Array<number> = [];

	customEvents = new ReactiveMap<number, CustomEvent>();
	customStructs = new ReactiveMap<number, CustomStruct>();
	customEnums = new ReactiveMap<number, CustomEnum>();
	functions = new ReactiveMap<number, GraphFunction>();
	resources = new ReactiveMap<ResourceType<any, any>, ResourceTypeEntry>();
	variables: Array<Variable> = [];
	queues = new ReactiveMap<number, Queue>();
	functionQueues = new ReactiveMap<number, FunctionQueue>();
	name = "New Project";
	events = createEventBus<ProjectEvent>();

	disableSave = false;

	graphIdCounter = 0;
	functionGraphIdCounter = 0;
	queueGraphIdCounter = 0;
	functionQueueGraphIdCounter = 0;
	customEventIdCounter = 0;
	customTypeIdCounter = 0;
	functionIdCounter = 0;
	queueIdCounter = 0;
	functionQueueIdCounter = 0;
	idCounter = 0;

	constructor(args: ProjectArgs) {
		this.core = args.core;

		return createMutable(this);
	}

	generateGraphId() {
		return this.graphIdCounter++;
	}

	generateCustomEventId() {
		return this.customEventIdCounter++;
	}

	generateCustomTypeId() {
		return this.customTypeIdCounter++;
	}

	// getType(
	// 	variant: "struct",
	// 	data: Extract<
	// 		z.infer<typeof SerializedType>,
	// 		{ variant: "struct" }
	// 	>["struct"],
	// ): Option<Struct>;
	// getType(
	// 	variant: "enum",
	// 	data: Extract<z.infer<typeof SerializedType>, { variant: "enum" }>["enum"],
	// ): Option<Struct>;
	getType<T extends "struct" | "enum">(
		variant: T,
		data:
			| { variant: "package"; package: string; name: string }
			| { variant: "custom"; id: number },
	): Option<StructBase | EnumBase<any>> {
		if (data.variant === "package") {
			const pkg = Maybe(
				this.core.packages.find((p) => p.name === data.package),
			);

			if (variant === "struct")
				return pkg.andThen((pkg) => Maybe(pkg.structs.get(data.name)));
			return pkg.andThen((pkg) => Maybe(pkg.enums.get(data.name)));
		}

		if (variant === "struct") return Maybe(this.customStructs.get(data.id));
		return Maybe(this.customEnums.get(data.id));
	}

	graphMapForKind(kind: GraphKind): ReactiveMap<number, Graph> {
		switch (kind) {
			case "function":
				return this.functionGraphs;
			case "queue":
				return this.queueGraphs;
			case "functionQueue":
				return this.functionQueueGraphs;
			default:
				return this.graphs;
		}
	}

	getGraphByKind(kind: GraphKind, id: number): Graph | undefined {
		return this.graphMapForKind(kind).get(id);
	}

	setGraphByKind(kind: GraphKind, graph: Graph): void {
		this.graphMapForKind(kind).set(graph.id, graph);
	}

	deleteGraphByKind(kind: GraphKind, id: number): void {
		this.graphMapForKind(kind).delete(id);
	}

	/** @deprecated Use `getGraphByKind(kind, id)` — graph IDs are only unique per kind. */
	graph(id: number, kind: GraphKind) {
		return this.getGraphByKind(kind, id);
	}

	kindOfGraph(graph: Graph): GraphKind {
		return graph.kind;
	}

	graphKind(graphId: number): GraphKind {
		if (this.graphOrder.includes(graphId) && this.graphs.has(graphId)) return "graph";
		if (this.functionGraphOrder.includes(graphId) && this.functionGraphs.has(graphId))
			return "function";
		if (this.queueGraphOrder.includes(graphId) && this.queueGraphs.has(graphId))
			return "queue";
		if (
			this.functionQueueGraphOrder.includes(graphId) &&
			this.functionQueueGraphs.has(graphId)
		)
			return "functionQueue";
		if (this.functionGraphs.has(graphId)) return "function";
		if (this.queueGraphs.has(graphId)) return "queue";
		if (this.functionQueueGraphs.has(graphId)) return "functionQueue";
		if (this.graphs.has(graphId)) return "graph";
		// Fallback when maps are out of sync (e.g. partial rollback / legacy saves)
		if (this.functionGraphOrder.includes(graphId)) return "function";
		if (this.queueGraphOrder.includes(graphId)) return "queue";
		if (this.functionQueueGraphOrder.includes(graphId)) return "functionQueue";
		for (const [, fn] of this.functions) {
			if (fn.graphId === graphId) return "function";
		}
		for (const [, queue] of this.queues) {
			if (queue.graphId === graphId) return "queue";
		}
		for (const [, queue] of this.functionQueues) {
			if (queue.graphId === graphId) return "functionQueue";
		}
		return "graph";
	}

	graphOrderForKind(kind: GraphKind): number[] {
		switch (kind) {
			case "function":
				return this.functionGraphOrder;
			case "queue":
				return this.queueGraphOrder;
			case "functionQueue":
				return this.functionQueueGraphOrder;
			default:
				return this.graphOrder;
		}
	}

	get allGraphOrder(): readonly number[] {
		return [
			...this.graphOrder,
			...this.functionGraphOrder,
			...this.queueGraphOrder,
			...this.functionQueueGraphOrder,
		];
	}

	createGraph(args?: { id?: number; name?: string }) {
		const id = args?.id ?? this.generateGraphId();

		const graph = new Graph({
			name: `Graph ${id}`,
			id,
			kind: "graph",
			project: this,
			...args,
		});

		this.graphs.set(id, graph);
		this.graphOrder.push(id);

		return graph;
	}

	pasteGraph(graph: Graph) {
		this.graphs.set(graph.id, graph);
		this.graphOrder.push(graph.id);

		return graph;
	}

	createCustomEvent(args?: { id?: number }) {
		const id = args?.id ?? this.generateCustomEventId();

		const event = new CustomEvent({
			name: `Event ${id}`,
			id,
			project: this,
		});

		this.customEvents.set(id, event);

		return event;
	}

	createCustomStruct(args?: { id?: number }) {
		const id = args?.id ?? this.generateCustomTypeId();

		const struct = new CustomStruct({
			id,
			project: this,
			name: `Struct ${id}`,
		});

		this.customStructs.set(id, struct);

		return struct;
	}

	createCustomEnum(args?: { id?: number }) {
		const id = args?.id ?? this.generateCustomTypeId();

		const enm = new CustomEnum({
			id,
			project: this,
			name: "New Enum",
		});

		this.customEnums.set(id, enm);

		return enm;
	}

	createFunction(args?: { id?: number; name?: string }) {
		const id = args?.id ?? this.functionIdCounter++;
		const graphId = this.functionGraphIdCounter++;
		const name = args?.name ?? `Function ${id}`;
		const graph = new Graph({
			id: graphId,
			name,
			kind: "function",
			project: this,
		});
		this.functionGraphs.set(graphId, graph);
		this.functionGraphOrder.push(graphId);
		const fn = new GraphFunction({ id, name, graphId, project: this });
		this.functions.set(id, fn);
		return fn;
	}

	resumeDeferredQueues() {
		for (const [, q] of this.queues) {
			q.resumeDeferredProcessing();
		}
		for (const [, q] of this.functionQueues) {
			q.resumeDeferredProcessing();
		}
	}

	deleteFunction(id: number) {
		const fn = this.functions.get(id);
		if (!fn) return;
		for (const [, q] of this.functionQueues) {
			q.removeItemsForFunction(id);
		}
		const graph = this.functionGraphs.get(fn.graphId);
		if (graph) {
			this.functionGraphOrder = this.functionGraphOrder.filter((gid) => gid !== fn.graphId);
			this.functionGraphs.delete(fn.graphId);
			graph.dispose();
		}
		this.functions.delete(id);
	}

	generateId() {
		return this.idCounter++;
	}

	createResource(args: {
		type: ResourceType<any, any>;
		name: string;
		id?: number;
	}) {
		const id = args.id ?? this.idCounter++;
		const itemBase = {
			id,
			name: args.name,
		};

		let item: ResourceTypeItem;

		if ("sources" in args.type) {
			item = {
				...itemBase,
				sourceId: resolveResourceSources(args.type)[0]?.id ?? null,
			};
		} else {
			item = { ...itemBase, value: args.type.type.default() };
		}

		if (!this.resources.has(args.type)) {
			const entry: ResourceTypeEntry = createMutable({
				items: [item],
				default: item.id,
			});
			this.resources.set(args.type, entry);
			entry.default = id;
		} else {
			const entry = this.resources.get(args.type)!;
			entry.items.push(item);
		}
	}

	createVariable(args: Omit<VariableArgs, "id" | "owner"> & { id?: number }) {
		const id = args.id ?? this.generateId();

		this.variables.push(new Variable({ ...args, id, owner: this }));

		return id;
	}

	setVariableValue(id: number, value: any) {
		const variable = this.variables.find((v) => v.id === id);
		if (variable) variable.value = value;
	}

	removeVariable(id: number) {
		const index = this.variables.findIndex((v) => v.id === id);
		if (index === -1) return;

		const variables = this.variables.splice(index, 1);
		for (const v of variables) {
			v.dispose();
		}
	}

	generateQueueId() {
		return this.queueIdCounter++;
	}

	createQueue(args?: { id?: number; name?: string; itemType?: t.Any }) {
		const id = args?.id ?? this.generateQueueId();
		const graphId = this.queueGraphIdCounter++;
		const name = args?.name ?? `Queue ${id}`;
		const graph = new Graph({
			id: graphId,
			name,
			kind: "queue",
			project: this,
		});
		this.queueGraphs.set(graphId, graph);
		this.queueGraphOrder.push(graphId);
		const queue = new Queue({
			id,
			name,
			itemType: args?.itemType ?? t.string(),
			graphId,
			owner: this,
		});
		this.queues.set(id, queue);
		return queue;
	}

	setQueueValue(id: number, value: any[]) {
		const queue = this.queues.get(id);
		if (queue) queue.items = normalizeQueueEntries(value);
	}

	removeQueue(id: number) {
		const queue = this.queues.get(id);
		if (!queue) return;
		const graph = this.queueGraphs.get(queue.graphId);
		if (graph) {
			this.queueGraphOrder = this.queueGraphOrder.filter((gid) => gid !== queue.graphId);
			this.queueGraphs.delete(queue.graphId);
			graph.dispose();
		}
		this.queues.delete(id);
		queue.dispose();
	}

	generateFunctionQueueId() {
		return this.functionQueueIdCounter++;
	}

	createFunctionQueue(args?: { id?: number; name?: string }) {
		const id = args?.id ?? this.generateFunctionQueueId();
		const graphId = this.functionQueueGraphIdCounter++;
		const name = args?.name ?? `Function Queue ${id}`;
		const graph = new Graph({
			id: graphId,
			name,
			kind: "functionQueue",
			project: this,
		});
		this.functionQueueGraphs.set(graphId, graph);
		this.functionQueueGraphOrder.push(graphId);
		const queue = new FunctionQueue({
			id,
			name,
			graphId,
			owner: this,
		});
		this.functionQueues.set(id, queue);
		return queue;
	}

	setFunctionQueueValue(id: number, items: any[]) {
		const queue = this.functionQueues.get(id);
		if (queue) queue.items = items;
	}

	removeFunctionQueue(id: number) {
		const queue = this.functionQueues.get(id);
		if (!queue) return;
		const graph = this.functionQueueGraphs.get(queue.graphId);
		if (graph) {
			this.functionQueueGraphOrder = this.functionQueueGraphOrder.filter((gid) => gid !== queue.graphId);
			this.functionQueueGraphs.delete(queue.graphId);
			graph.dispose();
		}
		this.functionQueues.delete(id);
		queue.dispose();
	}

	emit(event: ProjectEvent) {
		this.events.emit(event);
	}
}
