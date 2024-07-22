import { Maybe, type Option } from "@macrograph/option";
import type { Enum, SerializedType, StructBase } from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";
import "@total-typescript/ts-reset";
import { createMutable } from "solid-js/store";
import type { z } from "zod";

import type { Core } from "./Core";
import { CustomEvent } from "./CustomEvent";
import { CustomStruct } from "./CustomStruct";
import { Graph } from "./Graph";
import type { ResourceType } from "./Package";
import { Variable, type VariableArgs } from "./Variable";
import type { SerializedProject } from "./serialized";

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

export class Project {
	core: Core;
	graphs = new ReactiveMap<number, Graph>();
	customEvents = new ReactiveMap<number, CustomEvent>();
	customStructs = new ReactiveMap<number, CustomStruct>();
	resources = new ReactiveMap<ResourceType<any, any>, ResourceTypeEntry>();
	variables: Array<Variable> = [];
	name = "New Project";

	private disableSave = false;

	private graphIdCounter = 0;
	private customEventIdCounter = 0;
	private customTypeIdCounter = 0;
	private idCounter = 0;

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
			| Extract<z.infer<typeof SerializedType>, { variant: "struct" }>["struct"]
			| Extract<z.infer<typeof SerializedType>, { variant: "enum" }>["enum"],
	): Option<StructBase | Enum> {
		if (data.variant === "package") {
			console.log(this.core);
			const pkg = Maybe(
				this.core.packages.find((p) => p.name === data.package),
			);

			if (variant === "struct")
				return pkg.andThen((pkg) => Maybe(pkg.structs.get(data.name)));
			return pkg.andThen((pkg) => Maybe(pkg.enums.get(data.name)));
		}

		if (variant === "struct") return Maybe(this.customStructs.get(data.id));
		throw new Error();
	}

	createGraph(args?: { name?: string }) {
		const id = this.generateGraphId();

		const graph = new Graph({
			name: `Graph ${id}`,
			id,
			project: this,
			...args,
		});

		this.graphs.set(id, graph);

		return graph;
	}

	createCustomEvent() {
		const id = this.generateCustomEventId();

		const event = new CustomEvent({
			name: `Event ${id}`,
			id,
			project: this,
		});

		this.customEvents.set(id, event);

		this.core.project.save();

		return event;
	}

	createCustomStruct() {
		const id = this.generateCustomTypeId();

		const struct = new CustomStruct({
			id,
			project: this,
			name: `Struct ${id}`,
		});

		this.customStructs.set(id, struct);

		this.core.project.save();

		return struct;
	}

	generateId() {
		return this.idCounter++;
	}

	createResource(args: { type: ResourceType<any, any>; name: string }) {
		const id = this.idCounter++;
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

	createVariable(args: Omit<VariableArgs, "id" | "owner">) {
		const id = this.generateId();

		this.variables.push(new Variable({ ...args, id, owner: this }));

		this.save();

		return id;
	}

	setVariableValue(id: number, value: any) {
		const variable = this.variables.find((v) => v.id === id);
		if (variable) variable.value = value;

		this.save();
	}

	removeVariable(id: number) {
		const index = this.variables.findIndex((v) => v.id === id);
		if (index === -1) return;

		const variables = this.variables.splice(index, 1);
		for (const v of variables) {
			v.dispose();
		}
	}

	serialize(): z.infer<typeof SerializedProject> {
		return {
			name: this.name,
			graphIdCounter: this.graphIdCounter,
			graphs: [...this.graphs.values()].map((g) => g.serialize()),
			customEventIdCounter: this.customEventIdCounter,
			customEvents: [...this.customEvents.values()].map((e) => e.serialize()),
			customTypeIdCounter: this.customTypeIdCounter,
			customStructs: [...this.customStructs.values()].map((s) => s.serialize()),
			counter: this.idCounter,
			resources: [...this.resources].map(([type, entry]) => ({
				type: {
					pkg: type.package.name,
					name: type.name,
				},
				entry,
			})),
			variables: this.variables.map((v) => v.serialize()),
		};
	}

	static deserialize(core: Core, data: z.infer<typeof SerializedProject>) {
		const project = new Project({
			core,
		});

		project.disableSave = true;

		project.name = data.name ?? "New Project";

		project.graphIdCounter = data.graphIdCounter;

		project.customTypeIdCounter = data.customTypeIdCounter;

		project.customStructs = new ReactiveMap(
			data.customStructs
				.map((serializedStruct) => {
					const struct = CustomStruct.deserialize(project, serializedStruct);

					if (struct === null) return null;

					return [struct.id, struct] as [number, CustomStruct];
				})
				.filter(Boolean) as [number, CustomStruct][],
		);

		project.customEventIdCounter = data.customEventIdCounter;

		project.customEvents = new ReactiveMap(
			data.customEvents
				.map((SerializedEvent) => {
					const event = CustomEvent.deserialize(project, SerializedEvent);

					if (event === null) return null;

					return [event.id, event] as [number, CustomEvent];
				})
				.filter(Boolean) as [number, CustomEvent][],
		);

		project.idCounter = data.counter;

		project.resources = new ReactiveMap(
			data.resources
				.map(({ type, entry }) => {
					let resource: ResourceType<any, any> | undefined;

					for (const r of core.packages.find((p) => p.name === type.pkg)
						?.resources ?? []) {
						if (r.name === type.name) {
							resource = r;
							break;
						}
					}
					if (!resource) return;

					return [resource, createMutable(entry)] satisfies [
						any,
						ResourceTypeEntry,
					];
				})
				.filter(Boolean),
		);

		project.variables = data.variables.map((v) =>
			Variable.deserialize(v, project),
		);

		project.graphs = new ReactiveMap(
			data.graphs
				.map((serializedGraph) => {
					const graph = Graph.deserialize(project, serializedGraph);

					if (graph === null) return null;

					return [graph.id, graph] as [number, Graph];
				})
				.filter(Boolean) as [number, Graph][],
		);

		project.disableSave = false;

		return project;
	}

	save() {
		if (!this.disableSave)
			localStorage.setItem("project", JSON.stringify(this.serialize()));
	}
}
