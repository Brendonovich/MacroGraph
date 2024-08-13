import {
	StructField,
	deserializeType,
	deserializeValue,
} from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";
import { batch } from "solid-js";
import { createMutable } from "solid-js/store";

import * as runtime from "@macrograph/runtime";
import type * as serde from "./serde";

export function deserializeProject(
	core: runtime.Core,
	data: serde.Project,
): runtime.Project {
	const project = new runtime.Project({
		core,
	});

	project.disableSave = true;

	project.name = data.name ?? "New Project";

	project.graphIdCounter = data.graphIdCounter;

	project.customTypeIdCounter = data.customTypeIdCounter;

	project.customStructs = new ReactiveMap(
		data.customStructs
			.map((serializedStruct) => {
				const struct = deserializeCustomStruct(project, serializedStruct);

				if (struct === null) return null;

				return [struct.id, struct] as [number, runtime.CustomStruct];
			})
			.filter(Boolean) as [number, runtime.CustomStruct][],
	);

	project.customEventIdCounter = data.customEventIdCounter;

	project.customEvents = new ReactiveMap(
		data.customEvents
			.map((SerializedEvent) => {
				const event = deserializeCustomEvent(project, SerializedEvent);

				if (event === null) return null;

				return [event.id, event] as const;
			})
			.filter(Boolean),
	);

	project.idCounter = data.counter;

	project.resources = new ReactiveMap(
		data.resources
			.map(({ type, entry }) => {
				let resource: runtime.ResourceType<any, any> | undefined;

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
					runtime.ResourceTypeEntry,
				];
			})
			.filter(Boolean),
	);

	project.variables = data.variables.map((v) =>
		deserializeVariable(v, project),
	);

	project.graphs = new ReactiveMap(
		data.graphs
			.map((serializedGraph) => {
				const graph = deserializeGraph(project, serializedGraph);

				if (graph === null) return null;

				return [graph.id, graph] as [number, runtime.Graph];
			})
			.filter(Boolean),
	);

	project.disableSave = false;

	return project;
}

export function deserializeCustomStruct(
	project: runtime.Project,
	data: serde.CustomStruct,
): runtime.CustomStruct {
	const struct = new runtime.CustomStruct({
		project,
		id: data.id,
		name: data.name,
	});

	struct.fieldIdCounter = data.fieldIdCounter;

	batch(() => {
		for (const field of data.fields) {
			deserializeCustomStructField(struct, field);
		}
	});

	return struct;
}

export function deserializeCustomStructField(
	struct: runtime.CustomStruct,
	field: serde.CustomStructField,
) {
	struct.fields[field.id] = Object.assign(
		new StructField(
			field.id,
			deserializeType(field.type, struct.project.getType.bind(struct.project)),
			field.name,
		),
		{ id: field.id },
	);
}

export function deserializeCustomEvent(
	project: runtime.Project,
	data: serde.CustomEvent,
): runtime.CustomEvent {
	const event = new runtime.CustomEvent({
		project,
		id: data.id,
		name: data.name,
	});

	event.fieldIdCounter = data.fieldIdCounter;

	batch(() => {
		event.fields = data.fields.map((field) =>
			deserializeCustomEventField(event, field),
		);
	});

	return event;
}

export function deserializeCustomEventField(
	event: runtime.CustomEvent,
	field: serde.CustomEventField,
) {
	return {
		id: field.id,
		name: field.name,
		type: deserializeType(
			field.type,
			event.project.getType.bind(event.project),
		),
	};
}

export function deserializeVariable(
	data: serde.Variable,
	owner: runtime.Graph | runtime.Project,
): runtime.Variable {
	const project = owner instanceof runtime.Graph ? owner.project : owner;
	const type = deserializeType(data.type, project.getType.bind(project));

	return new runtime.Variable({
		id: data.id,
		name: data.name,
		value: deserializeValue(data.value, type),
		type,
		owner,
	});
}

export function deserializeGraph(
	project: runtime.Project,
	data: serde.Graph,
): runtime.Graph {
	const graph = new runtime.Graph({
		project,
		id: data.id,
		name: data.name,
	});

	graph.idCounter = data.nodeIdCounter;

	graph.variables = data.variables.map((v) => deserializeVariable(v, graph));

	batch(() => {
		graph.nodes = new ReactiveMap(
			Object.entries(data.nodes)
				.map(([idStr, serializedNode]) => {
					const id = Number(idStr);
					const node = deserializeNode(graph, serializedNode);
					if (node === null) return null;
					return [id, node] as const;
				})
				.filter(Boolean),
		);
		graph.commentBoxes = new ReactiveMap(
			data.commentBoxes.map((box) => {
				const id = box.id ?? graph.generateId();
				return [id, new runtime.CommentBox({ ...box, id, graph })];
			}),
		);
		graph.connections = new ReactiveMap();
		deserializeConnections(data.connections, graph.connections);
	});

	batch(() => {
		for (const node of graph.nodes.values()) {
			const nodeData = data.nodes[node.id]!;

			for (const i of node.state.inputs) {
				const defaultValue = nodeData.defaultValues[i.id];

				if (defaultValue === undefined || !(i instanceof runtime.DataInput))
					continue;

				i.defaultValue = defaultValue;
			}
		}
	});

	return graph;
}

export function deserializeConnections(
	connections: Array<serde.Connection>,
	target: runtime.Connections,
	nodeIdMap?: Map<number, number>,
) {
	for (const conn of connections) {
		const fromNode = nodeIdMap?.get(conn.from.node) ?? conn.from.node;
		const toNode = nodeIdMap?.get(conn.to.node) ?? conn.to.node;

		const outRef: runtime.IORef = `${fromNode}:o:${conn.from.output}`;
		const inRef: runtime.IORef = `${toNode}:i:${conn.to.input}`;

		const outConns =
			target.get(outRef) ??
			(() => {
				const array: Array<runtime.IORef> = createMutable([]);
				target.set(outRef, array);
				return array;
			})();

		outConns.push(inRef);
	}
}

export function deserializeNode(
	graph: runtime.Graph,
	data: serde.Node,
): runtime.Node | null {
	const schema = graph.project.core.schema(data.schema.package, data.schema.id);

	if (!schema) return null;

	const node = new runtime.Node({
		id: data.id,
		name: data.name,
		position: data.position,
		schema: schema as any,
		graph,
		properties: Object.entries(data.properties).reduce(
			(acc, [k, v]) =>
				Object.assign(acc, {
					[k]: typeof v === "object" ? runtime.DEFAULT : v,
				}),
			{},
		),
		foldPins: data.foldPins,
	});

	for (const [key, value] of Object.entries(data.defaultValues)) {
		for (const input of node.io.inputs) {
			if (input.id === key && input instanceof runtime.DataInput)
				input.defaultValue = value;
		}
	}

	return node;
}

export function deserializeCommentBox(
	graph: runtime.Graph,
	data: serde.CommentBox,
): runtime.CommentBox {
	return new runtime.CommentBox({
		graph,
		id: data.id ?? graph.generateId(),
		position: data.position,
		size: data.size,
		text: data.text,
		tint: data.tint,
	});
}
