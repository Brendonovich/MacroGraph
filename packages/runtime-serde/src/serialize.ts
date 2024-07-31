import type { Option } from "@macrograph/option";
import * as runtime from "@macrograph/runtime";
import {
	type Enum,
	type EnumVariants,
	type Struct,
	type StructFields,
	t,
} from "@macrograph/typesystem";
import type * as v from "valibot";

import type * as serde from "./serde";

export function serializeProject(project: runtime.Project): serde.Project {
	return {
		name: project.name,
		graphIdCounter: project.graphIdCounter,
		graphs: [...project.graphs.values()].map(serializeGraph),
		customEventIdCounter: project.customEventIdCounter,
		customEvents: [...project.customEvents.values()].map(serializeCustomEvent),
		customTypeIdCounter: project.customTypeIdCounter,
		customStructs: [...project.customStructs.values()].map(
			serializeCustomStruct,
		),
		counter: project.idCounter,
		resources: [...project.resources].map(([type, entry]) => ({
			type: {
				pkg: type.package.name,
				name: type.name,
			},
			entry,
		})),
		variables: project.variables.map(serializeVariable),
	};
}

export function serializeGraph(graph: runtime.Graph): serde.Graph {
	return {
		id: graph.id,
		name: graph.name,
		nodeIdCounter: graph.idCounter,
		nodes: Object.fromEntries(
			[...graph.nodes.entries()].map(([id, node]) => [id, serializeNode(node)]),
		),
		commentBoxes: [...graph.commentBoxes.values()].map(serializeCommentBox),
		variables: graph.variables.map(serializeVariable),
		connections: (() => {
			const serialized: Array<v.InferOutput<typeof serde.Connection>> = [];

			for (const [refStr, conns] of graph.connections) {
				const ref = runtime.splitIORef(refStr);

				if (ref.type === "i") continue;

				for (const conn of conns) {
					const connRef = runtime.splitIORef(conn);

					serialized.push({
						from: {
							node: ref.nodeId,
							output: ref.ioId,
						},
						to: {
							node: connRef.nodeId,
							input: connRef.ioId,
						},
					});
				}
			}

			return serialized;
		})(),
	};
}

export function serializeCustomEvent(
	e: runtime.CustomEvent,
): serde.CustomEvent {
	return {
		id: e.id,
		name: e.name,
		fields: e.fields.map((field) => ({
			...field,
			type: field.type.serialize(),
		})),
		fieldIdCounter: e.fieldIdCounter,
	};
}

export function serializeCustomStruct(
	s: runtime.CustomStruct,
): serde.CustomStruct {
	return {
		id: s.id,
		name: s.name,
		fields: Object.values(s.fields).map((field) => ({
			name: field.name,
			id: field.id,
			type: field.type.serialize(),
		})),
		fieldIdCounter: s.fieldIdCounter,
	};
}

export function serializeVariable(v: runtime.Variable): serde.Variable {
	return {
		id: v.id,
		name: v.name,
		value: serializeValue(v.value, v.type),
		type: v.type.serialize(),
	};
}

export function serializeNode(node: runtime.Node): serde.Node {
	return {
		id: node.id,
		name: node.state.name,
		position: node.state.position,
		schema: {
			package: node.schema.package.name,
			id: node.schema.name,
		},
		defaultValues: node.state.inputs.reduce(
			(acc, i) => {
				if (!(i instanceof runtime.DataInput)) return acc;

				acc[i.id] = i.defaultValue;
				return acc;
			},
			{} as Record<string, any>,
		),
		properties: Object.entries(node.state.properties).reduce(
			(acc, [k, v]) => {
				acc[k] = v === runtime.DEFAULT ? { default: true } : v;

				return acc;
			},
			{} as Record<string, any>,
		),
		foldPins: node.state.foldPins,
	};
}

export function serializeCommentBox(box: runtime.CommentBox): serde.CommentBox {
	return {
		id: box.id,
		position: box.position,
		size: box.size,
		text: box.text,
		tint: box.tint,
	};
}

export function serializeValue(rawValue: any, type: t.Any): any {
	const typeOfValue = typeof rawValue;

	switch (typeOfValue) {
		case "string":
		case "number":
		case "boolean":
			return rawValue;
	}

	if (type instanceof t.List)
		return (rawValue as unknown[]).map((item) =>
			serializeValue(item, type.item),
		);
	if (type instanceof t.Map) {
		const val: Record<string, any> = {};

		for (const [key, innerValue] of rawValue as Map<string, any>) {
			val[key] = serializeValue(innerValue, type.value);
		}

		return val;
	}
	if (type instanceof t.Option)
		return (rawValue as Option<any>)
			.map((v) => serializeValue(v, type.inner))
			.toNullable();
	if (type instanceof t.Enum) {
		const value = rawValue as { variant: string; data?: any };

		return "data" in rawValue
			? {
					variant: rawValue.variant,
					data: Object.fromEntries(
						Object.entries(rawValue.data).map(([key, dataValue]) => {
							const variant = (type.inner as Enum<EnumVariants>).variants.find(
								(v) => v.name === value.variant,
							)!;

							return [key, serializeValue(dataValue, variant.data![key]!)];
						}),
					),
				}
			: { variant: rawValue.variant };
	}
	if (type instanceof t.Struct) {
		const val: Record<string, any> = {};

		const fields = Object.values((type.struct as Struct<StructFields>).fields);

		for (const field of fields) {
			const value = rawValue[field.id];
			if (value === undefined)
				throw new Error(`Field ${field.id} not found in data.`);

			val[field.id] = serializeValue(value, field.type);
		}

		return val;
	}
}
