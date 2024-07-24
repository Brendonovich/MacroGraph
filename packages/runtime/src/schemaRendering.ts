import {
	type BaseType,
	type Enum,
	type StructBase,
	t,
} from "@macrograph/typesystem";
import {
	Core,
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	Graph,
	IOBuilder,
	Node,
	type Pin,
	Project,
	type Schema,
	ScopeInput,
	ScopeOutput,
} from "./models";

export type RenderedType =
	| "string"
	| "int"
	| "float"
	| "bool"
	| "wildcard"
	| { type: "struct"; package: string; name: string }
	| { type: "enum"; package: string; name: string };

export type RenderedIO = { id: string; name?: string } & (
	| { variant: "exec" }
	| { variant: "data"; type: RenderedType }
	| { variant: "scope" }
);

export interface RenderedSchema {
	name: string;
	type: string;
	inputs: Array<RenderedIO>;
	outputs: Array<RenderedIO>;
}

export function renderSchema(
	schema: Schema<any, any, any>,
): RenderedSchema | undefined {
	const graph = new Graph({
		id: 0,
		name: "",
		project: new Project({ core: new Core() }),
	});

	const node = new Node({
		id: 0,
		graph,
		schema,
		position: { x: 0, y: 0 },
	});

	const io = new IOBuilder(node);

	try {
		schema.createIO({
			io,
			properties: schema.properties ?? {},
			ctx: {
				getProperty: (p) => node.getProperty(p) as any,
				graph,
			},
		});
	} catch {}

	return {
		name: schema.name,
		type: schema.type,
		inputs: io.inputs.map(renderIO).filter((d) => d !== undefined),
		outputs: io.outputs.map(renderIO).filter((d) => d !== undefined),
	};
}

export function renderIO(io: Pin): RenderedIO | undefined {
	if (io instanceof ExecInput || io instanceof ExecOutput) {
		return {
			id: io.id,
			name: io.name,
			variant: "exec",
		};
	}

	if (io instanceof DataInput || io instanceof DataOutput) {
		const type = renderType(io.type);
		if (!type) return;

		return {
			id: io.id,
			name: io.name,
			variant: "data",
			type,
		};
	}

	if (io instanceof ScopeInput || io instanceof ScopeOutput) {
		return {
			id: io.id,
			name: io.name,
			variant: "scope",
		};
	}
}

export function renderType(type: BaseType): RenderedType | undefined {
	if (type instanceof t.String) return "string";
	if (type instanceof t.Int) return "int";
	if (type instanceof t.Float) return "float";
	if (type instanceof t.Bool) return "bool";
	if (type instanceof t.Wildcard) return "wildcard";
	if (type instanceof t.Struct) {
		const struct = type.struct as StructBase;
		if (struct.source.variant === "package")
			return {
				type: "struct",
				package: struct.source.package,
				name: struct.name,
			};
	}
	if (type instanceof t.Enum) {
		const struct = type.inner as Enum;
		if (struct.source.variant === "package")
			return {
				type: "enum",
				package: struct.source.package,
				name: struct.name,
			};
	}
}

export function renderedTypesCompatible(
	a: RenderedType,
	b: RenderedType,
): boolean {
	if (a === "wildcard" || b === "wildcard") return true;
	if (typeof a !== typeof b) return false;
	if (typeof a === "string" && typeof b === "string") return a === b;

	if (typeof a === "object" && typeof b === "object") {
		if (a.type === "struct" && b.type === "struct")
			return a.package === b.package && a.name === b.name;
		if (a.type === "enum" && b.type === "enum")
			return a.package === b.package && a.name === b.name;
	}

	return false;
}
