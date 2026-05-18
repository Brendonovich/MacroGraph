import type { Option } from "@macrograph/option";
import {
	DataInput,
	DataOutput,
	getRemoteShellMode,
	Package,
	type Graph,
	type Node,
	type RunCtx,
} from "@macrograph/runtime";
import {
	deserializeType,
	deserializeValue,
	SerializedType,
	serializeValue,
	t,
} from "@macrograph/typesystem";
import type * as v from "valibot";

import {
	type IoDefinition,
	type IoFieldDef,
	type SerializedFieldType,
	isValidJsIdentifier,
	sanitizeScriptIoDefinition,
} from "./scriptIoTypes";
import { scriptLog, scriptLogGroup } from "./scriptDebug";
import { transpileScriptSource } from "./scriptTsValidate";

export type { IoDefinition, IoFieldDef, SerializedFieldType } from "./scriptIoTypes";
export {
	generateScriptTypeDeclarations,
	type ScriptGetTypeFn,
} from "./scriptTsCodegen";
export { scriptDebugEnabled, scriptLog, scriptLogGroup } from "./scriptDebug";
export {
	scriptHasErrors,
	transpileScriptSource,
	validateScriptSource,
	type ScriptDiagnostic,
} from "./scriptTsValidate";

export const DEFAULT_IO_DEFINITION: IoDefinition = {
	inputs: [{ id: "0", name: "A", type: "int" }],
	outputs: [{ id: "0", name: "Result", type: "string" }],
};

export const DEFAULT_IO_DEFINITION_JSON = JSON.stringify(DEFAULT_IO_DEFINITION);

export const DEFAULT_CODE = `// TypeScript — \`inputs\` / \`outputs\` are typed from your pins.
outputs.Result = String(inputs.A ?? inputs["0"]);
`;

/** IO definition for the script editor, with pin types as the source of truth. */
export function ioDefinitionForNode(node: Node): IoDefinition {
	const rawProperty = node.state.properties.ioDefinition;
	const def = parseIoDefinition(rawProperty as string | undefined);

	const pinSync: Record<string, unknown> = {
		"node.id": node.id,
		"ioDefinition property (raw)": rawProperty,
		"typeof property": typeof rawProperty,
	};

	for (const pin of node.state.inputs) {
		if (!(pin instanceof DataInput)) continue;
		const field = def.inputs.find((f) => f.id === pin.id);
		if (!field) {
			pinSync[`input pin ${pin.id}`] = "no matching field in ioDefinition";
			continue;
		}
		const before = field.type;
		try {
			field.type = pin.type.serialize() as SerializedFieldType;
			pinSync[`input ${field.name} (${pin.id})`] = {
				"pin.type": pin.type.toString(),
				"stored before": before,
				"after pin.serialize()": field.type,
			};
		} catch (err) {
			pinSync[`input ${field.name} (${pin.id})`] = {
				"pin.type": pin.type.toString(),
				"stored (kept)": before,
				"serialize error": err instanceof Error ? err.message : String(err),
			};
		}
	}

	for (const pin of node.state.outputs) {
		if (!(pin instanceof DataOutput)) continue;
		const field = def.outputs.find((f) => f.id === pin.id);
		if (!field) {
			pinSync[`output pin ${pin.id}`] = "no matching field in ioDefinition";
			continue;
		}
		const before = field.type;
		try {
			field.type = pin.type.serialize() as SerializedFieldType;
			pinSync[`output ${field.name} (${pin.id})`] = {
				"pin.type": pin.type.toString(),
				"stored before": before,
				"after pin.serialize()": field.type,
			};
		} catch (err) {
			pinSync[`output ${field.name} (${pin.id})`] = {
				"pin.type": pin.type.toString(),
				"stored (kept)": before,
				"serialize error": err instanceof Error ? err.message : String(err),
			};
		}
	}

	const sanitized = sanitizeScriptIoDefinition(def);
	pinSync["final ioDefinition (after sanitize)"] = sanitized;
	scriptLogGroup("ioDefinitionForNode", pinSync);

	return sanitized;
}

export function parseIoDefinition(raw: string | undefined): IoDefinition {
	if (!raw) return structuredClone(DEFAULT_IO_DEFINITION);
	try {
		const parsed = JSON.parse(raw) as IoDefinition;
		if (
			!parsed ||
			typeof parsed !== "object" ||
			!Array.isArray(parsed.inputs) ||
			!Array.isArray(parsed.outputs)
		) {
			return structuredClone(DEFAULT_IO_DEFINITION);
		}
		return sanitizeScriptIoDefinition({
			inputs: parsed.inputs.filter(
				(f) => f && typeof f.id === "string" && typeof f.name === "string" && f.type,
			),
			outputs: parsed.outputs.filter(
				(f) => f && typeof f.id === "string" && typeof f.name === "string" && f.type,
			),
		});
	} catch {
		return structuredClone(DEFAULT_IO_DEFINITION);
	}
}

function resolveType(graph: Graph, serialized: SerializedFieldType): t.Any {
	return deserializeType(serialized, graph.project.getType.bind(graph.project));
}

function asArray(raw: unknown): unknown[] {
	if (Array.isArray(raw)) return raw;
	if (raw == null) return [];
	if (typeof (raw as { length?: number })[Symbol.iterator] === "function") {
		return [...(raw as Iterable<unknown>)];
	}
	return [raw];
}

/** Runtime values → JSON-safe values passed into user code. */
function valueForUserCode(raw: unknown, type: t.Any): unknown {
	if (type instanceof t.List) {
		return asArray(raw).map((item) => serializeValue(item, type.item));
	}
	return serializeValue(raw, type);
}

function readScriptInput(
	ctx: RunCtx,
	pin: DataInput<any>,
	type: t.Any,
	field: IoFieldDef,
): unknown {
	const conn = pin.connection as Option<DataOutput<any>>;
	if (conn.isNone()) {
		return valueForUserCode(type.default(), type);
	}

	try {
		return valueForUserCode(ctx.getInput(pin), type);
	} catch (e) {
		const detail = e instanceof Error ? e.message : String(e);
		throw new Error(
			`JavaScript: could not read input '${field.name}' (id: ${field.id}): ${detail}. ` +
				`Connect a source and ensure it runs before this node.`,
		);
	}
}

function failScript(node: Node, graph: Graph, message: string): never {
	graph.project.core.error(message, node);
	throw new Error(message);
}

/** Tracks which output keys the user assigned in script code. */
function createTrackedOutputs() {
	const assigned = new Set<string>();
	const store: Record<string, unknown> = Object.create(null);

	const outputs = new Proxy(store, {
		set(_target, prop, value) {
			if (typeof prop === "string") assigned.add(prop);
			store[prop] = value;
			return true;
		},
		get(_target, prop) {
			if (typeof prop === "string") return store[prop];
		},
	});

	return {
		outputs,
		wasAssigned(field: IoFieldDef) {
			if (assigned.has(field.id)) return true;
			if (isValidJsIdentifier(field.name) && assigned.has(field.name)) return true;
			return false;
		},
		getAssigned(field: IoFieldDef) {
			if (assigned.has(field.id)) return store[field.id];
			if (isValidJsIdentifier(field.name) && assigned.has(field.name)) {
				return store[field.name];
			}
			return undefined;
		},
	};
}

function scriptIo(io: unknown): { inputs: DataInput<any>[]; outputs: DataOutput<any>[] } {
	const wrapped = io as { custom?: { inputs?: DataInput<any>[]; outputs?: DataOutput<any>[] }; inputs?: DataInput<any>[]; outputs?: DataOutput<any>[] };
	if (wrapped.custom?.inputs) return wrapped.custom as { inputs: DataInput<any>[]; outputs: DataOutput<any>[] };
	return wrapped as { inputs: DataInput<any>[]; outputs: DataOutput<any>[] };
}

export type {
	ScriptCompletionContext,
	ScriptCompletionItem,
} from "./scriptCompletions";
export {
	completionsForContext,
	getScriptCompletionContext,
	ioFieldCompletions,
} from "./scriptCompletions";
export { getScriptTsCompletions } from "./scriptTsCompletions";
export type { ScriptTsCompletionResult } from "./scriptTsCompletions";

export async function runUserCode(
	code: string,
	inputs: Record<string, unknown>,
	outputs: Record<string, unknown>,
) {
	// `AsyncFunction` is not always on globalThis in bundled browser builds.
	const fn = new Function(
		"inputs",
		"outputs",
		`"use strict";\nreturn (async () => {\n${code}\n})();`,
	) as (
		inputs: Record<string, unknown>,
		outputs: Record<string, unknown>,
	) => Promise<void>;
	await fn(inputs, outputs);
}

export function pkg() {
	const pkg = new Package({
		name: "Script",
	});

	pkg.createSchema({
		name: "JavaScript",
		type: "exec",
		properties: {
			code: {
				name: "Code",
				type: t.string(),
				default: DEFAULT_CODE,
			},
			ioDefinition: {
				name: "IO Definition",
				type: t.string(),
				default: DEFAULT_IO_DEFINITION_JSON,
			},
		},
		createIO({ io, ctx, properties }) {
			const def = parseIoDefinition(ctx.getProperty(properties.ioDefinition));

			return {
				inputs: def.inputs.map((field) =>
					io.dataInput({
						id: field.id,
						name: field.name,
						type: resolveType(ctx.graph, field.type),
					}),
				),
				outputs: def.outputs.map((field) =>
					io.dataOutput({
						id: field.id,
						name: field.name,
						type: resolveType(ctx.graph, field.type),
					}),
				),
			};
		},
		async run({ ctx, io: ioRaw, properties, graph }) {
			if (!ioRaw || getRemoteShellMode()) return;

			const io = scriptIo(ioRaw);
			const node = io.inputs[0]?.node ?? io.outputs[0]?.node;
			if (!node) return;

			const def = parseIoDefinition(ctx.getProperty(properties.ioDefinition));
			const code = ctx.getProperty(properties.code) ?? "";

			const inputs: Record<string, unknown> = {};
			const { outputs, wasAssigned, getAssigned } = createTrackedOutputs();

			for (const field of def.inputs) {
				const pin = node.input(field.id);
				if (!(pin instanceof DataInput)) continue;
				const type = resolveType(graph, field.type);
				try {
					const value = readScriptInput(ctx, pin, type, field);
					inputs[field.id] = value;
					if (isValidJsIdentifier(field.name)) inputs[field.name] = value;
				} catch (e) {
					const msg = e instanceof Error ? e.message : String(e);
					failScript(node, graph, msg);
				}
			}

			try {
				const js = transpileScriptSource(code);
				await runUserCode(js, inputs, outputs);
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				failScript(node, graph, `JavaScript: ${msg}`);
			}

			for (const field of def.outputs) {
				if (!wasAssigned(field)) continue;

				const pin = node.output(field.id);
				if (!(pin instanceof DataOutput)) continue;
				const type = resolveType(graph, field.type);
				const raw = getAssigned(field);

				try {
					ctx.setOutput(pin, deserializeValue(raw, type));
				} catch (e) {
					const msg = e instanceof Error ? e.message : String(e);
					failScript(
						node,
						graph,
						`JavaScript: could not write output '${field.name}' (id: ${field.id}): ${msg}`,
					);
				}
			}
		},
	});

	return pkg;
}

export function isJavaScriptNode(node: { schema: { package: { name: string }; name: string } }) {
	return node.schema.package.name === "Script" && node.schema.name === "JavaScript";
}
