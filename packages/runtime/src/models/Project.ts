import { Maybe, type Option } from "@macrograph/option";
import type { EnumBase, StructBase } from "@macrograph/typesystem";
import { createEventBus } from "@solid-primitives/event-bus";
import { ReactiveMap } from "@solid-primitives/map";
import "@total-typescript/ts-reset";
import { createMutable } from "solid-js/store";

import type { Core } from "./Core";
import { CustomEnum } from "./CustomEnum";
import { CustomEvent } from "./CustomEvent";
import { CustomStruct } from "./CustomStruct";
import { Graph } from "./Graph";
import type { ResourceType } from "./Package";
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

export class Project {
	core: Core;

	graphs = new ReactiveMap<number, Graph>();
	graphOrder: Array<number> = [];

	customEvents = new ReactiveMap<number, CustomEvent>();
	customStructs = new ReactiveMap<number, CustomStruct>();
	customEnums = new ReactiveMap<number, CustomEnum>();
	resources = new ReactiveMap<ResourceType<any, any>, ResourceTypeEntry>();
	variables: Array<Variable> = [];
	name = "New Project";
	events = createEventBus<ProjectEvent>();

	disableSave = false;

	graphIdCounter = 0;
	customEventIdCounter = 0;
	customTypeIdCounter = 0;
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

	graph(id: number) {
		return this.graphs.get(id);
	}

	createGraph(args?: { id?: number; name?: string }) {
		const id = args?.id ?? this.generateGraphId();

		const graph = new Graph({
			name: `Graph ${id}`,
			id,
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
				sourceId: args.type.sources(args.type.package)[0]?.id ?? null,
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

	emit(event: ProjectEvent) {
		this.events.emit(event);
	}
}
