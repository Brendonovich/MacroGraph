import type { Option } from "@macrograph/option";
import {
	BasePrimitiveType,
	deserializeType,
	EnumType,
	ListType,
	MapType,
	OptionType,
	type AnyType,
} from "@macrograph/typesystem";
import type { EnumBase, EnumVariants, StructBase } from "@macrograph/typesystem";

import type { IoDefinition, IoFieldDef, SerializedFieldType } from "./scriptIoTypes";
import { JSONEnum, isScriptJsonSerializedType, isValidJsIdentifier } from "./scriptIoTypes";

const MG_JSON_TYPE = `type MgJson =
	| null
	| boolean
	| number
	| string
	| MgJson[]
	| { [key: string]: MgJson };`;

export type ScriptGetTypeFn = (
	variant: "struct" | "enum",
	data: any,
) => Option<StructBase | EnumBase<EnumVariants>>;

/** Map persisted pin types to TS types (no project lookup required). */
function serializedToTs(type: SerializedFieldType): string {
	if (type === "string") return "string";
	if (type === "int" || type === "float") return "number";
	if (type === "bool") return "boolean";

	if (typeof type !== "object" || type === null || !("variant" in type)) {
		return "unknown";
	}

	switch (type.variant) {
		case "enum":
			return isScriptJsonSerializedType(type) ? "MgJson" : "unknown";
		case "option":
			return `${serializedToTs(type.inner)} | null | undefined`;
		case "list": {
			const item = "item" in type ? type.item : undefined;
			return item !== undefined ? `${serializedToTs(item)}[]` : "unknown[]";
		}
		case "map": {
			const value = "value" in type ? type.value : undefined;
			return value !== undefined
				? `Record<string, ${serializedToTs(value)}>`
				: "Record<string, unknown>";
		}
		case "struct":
			return "unknown";
		default:
			return "unknown";
	}
}

/** Resolve live types via variant() (avoids instanceof across duplicate bundles). */
function anyTypeToTs(type: AnyType): string {
	switch (type.variant()) {
		case "primitive": {
			if (!(type instanceof BasePrimitiveType)) return "unknown";
			switch (type.primitiveVariant()) {
				case "string":
					return "string";
				case "int":
				case "float":
					return "number";
				case "bool":
					return "boolean";
			}
			break;
		}
		case "list":
			return `${anyTypeToTs((type as ListType<AnyType>).item)}[]`;
		case "map":
			return `Record<string, ${anyTypeToTs((type as MapType<AnyType>).value)}>`;
		case "option":
			return `${anyTypeToTs((type as OptionType<AnyType>).inner)} | null | undefined`;
		case "enum":
			return (type as EnumType<any>).inner === JSONEnum ? "MgJson" : "unknown";
		case "struct":
			return "Record<string, unknown>";
		case "wildcard":
			return "unknown";
	}
	return "unknown";
}

function fieldTypeTs(field: IoFieldDef, getType: ScriptGetTypeFn): string {
	const fromSerialized = serializedToTs(field.type);
	if (fromSerialized !== "unknown") return fromSerialized;

	try {
		const resolved = deserializeType(field.type, getType);
		return anyTypeToTs(resolved);
	} catch {
		return "unknown";
	}
}

function fieldInterface(
	name: string,
	fields: IoFieldDef[],
	writable: boolean,
	getType: ScriptGetTypeFn,
): string {
	const lines: string[] = [];
	const seenNames = new Set<string>();

	for (const field of fields) {
		const tsType = fieldTypeTs(field, getType);
		const optional = writable ? "?" : "";
		const doc = `  /** ${name}: ${field.name} (id: ${field.id}) */`;

		lines.push(doc);

		const named = isValidJsIdentifier(field.name);
		if (named && !seenNames.has(field.name)) {
			seenNames.add(field.name);
			lines.push(`  ${field.name}${optional}: ${tsType};`);
		}
		if (!named || field.name !== field.id) {
			lines.push(`  ${JSON.stringify(field.id)}${optional}: ${tsType};`);
		}
	}

	return `interface ${name} {\n${lines.join("\n")}\n}`;
}

/** Generates ambient declarations for `inputs` and `outputs` used by the script editor. */
export function generateScriptTypeDeclarations(
	def: IoDefinition,
	getType: ScriptGetTypeFn,
): string {
	return [
		MG_JSON_TYPE,
		fieldInterface("MacroGraphInputs", def.inputs, false, getType),
		fieldInterface("MacroGraphOutputs", def.outputs, true, getType),
	].join("\n\n");
}
