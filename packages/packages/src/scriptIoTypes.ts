import { JSONEnum } from "@macrograph/json";
import { SerializedType, t, type AnyType } from "@macrograph/typesystem";
import type * as v from "valibot";

export type SerializedFieldType = v.InferOutput<typeof SerializedType>;

export type IoFieldDef = {
	id: string;
	name: string;
	type: SerializedFieldType;
};

export type IoDefinition = {
	inputs: IoFieldDef[];
	outputs: IoFieldDef[];
};

export { JSONEnum };

export const SCRIPT_IO_PRIMITIVES = [
	t.string(),
	t.int(),
	t.float(),
	t.bool(),
	t.enum(JSONEnum),
] as const;

export const SCRIPT_IO_CONTAINERS = [
	["Option", t.option],
	["List", t.list],
	["Map", t.map],
] as const satisfies Array<[string, (current: AnyType) => AnyType]>;

export function isScriptJsonSerializedType(
	type: SerializedFieldType,
): boolean {
	return (
		typeof type === "object" &&
		type !== null &&
		"variant" in type &&
		type.variant === "enum" &&
		type.enum.variant === "package" &&
		type.enum.package === "JSON" &&
		type.enum.name === "JSON"
	);
}

export function isScriptAllowedSerializedType(type: SerializedFieldType): boolean {
	if (
		type === "string" ||
		type === "int" ||
		type === "float" ||
		type === "bool"
	) {
		return true;
	}

	if (typeof type !== "object" || type === null || !("variant" in type)) {
		return false;
	}

	switch (type.variant) {
		case "enum":
			return isScriptJsonSerializedType(type);
		case "option":
			return isScriptAllowedSerializedType(type.inner);
		case "list":
			return isScriptAllowedSerializedType(type.item);
		case "map":
			return isScriptAllowedSerializedType(type.value);
		case "struct":
			return false;
	}
}

/** Coerce graph types to primitives, JSON, or containers of the same. */
export function normalizeScriptIoType(type: AnyType): AnyType {
	if (type instanceof t.Primitive) return type;
	if (type instanceof t.Enum && type.inner === JSONEnum) return type;
	if (type instanceof t.Option)
		return t.option(normalizeScriptIoType(type.inner));
	if (type instanceof t.List) return t.list(normalizeScriptIoType(type.item));
	if (type instanceof t.Map) return t.map(normalizeScriptIoType(type.value));
	return t.string();
}

export function sanitizeScriptIoFieldType(
	type: SerializedFieldType,
): SerializedFieldType {
	if (isScriptAllowedSerializedType(type)) return type;
	return "string";
}

export function sanitizeScriptIoDefinition(def: IoDefinition): IoDefinition {
	return {
		inputs: def.inputs.map((f) => ({
			...f,
			type: sanitizeScriptIoFieldType(f.type),
		})),
		outputs: def.outputs.map((f) => ({
			...f,
			type: sanitizeScriptIoFieldType(f.type),
		})),
	};
}

export function defaultScriptIoFieldType(): SerializedFieldType {
	return "string";
}

export function isScriptIoFieldDef(field: IoFieldDef): boolean {
	return isScriptAllowedSerializedType(field.type);
}

export function isValidJsIdentifier(name: string) {
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}
