import type { BaseType } from "./base";
import { BasePrimitiveType } from "./primitive";
import * as t from "./t";

export * from "./base";
export * from "./enum";
export * from "./field";
export * from "./list";
export * from "./map";
export * from "./option";
export * from "./primitive";
export * from "./serialized";
export * from "./struct";
export * as t from "./t";
export { Disposable } from "./utils";
export * from "./value";
export * from "./wildcard";

export type TypeVariant =
	| "primitive"
	| "list"
	| "option"
	| "wildcard"
	| "enum"
	| "struct"
	| "map";
// | "set"

export type AnyType = BaseType<any>;

export function typesCanConnect(aRaw: t.Any, bRaw: t.Any): boolean {
	const a =
		aRaw instanceof t.Wildcard ? aRaw.wildcard.value().unwrapOr(aRaw) : aRaw;
	const b =
		bRaw instanceof t.Wildcard ? bRaw.wildcard.value().unwrapOr(bRaw) : bRaw;

	if (a instanceof t.Wildcard || b instanceof t.Wildcard) return true;
	if (a instanceof BasePrimitiveType && b instanceof BasePrimitiveType)
		return a.primitiveVariant() === b.primitiveVariant();
	if (a instanceof t.List && b instanceof t.List)
		return typesCanConnect(a.item, b.item);
	if (a instanceof t.Map && b instanceof t.Map)
		return typesCanConnect(a.value, b.value);
	if (a instanceof t.Option && b instanceof t.Option)
		return typesCanConnect(a.inner, b.inner);
	if (a instanceof t.Struct && b instanceof t.Struct)
		return a.struct === b.struct;
	if (a instanceof t.Enum && b instanceof t.Enum) return a.inner === b.inner;

	return false;
}

export function getOptionDepth(type: t.Any): number {
	if (type instanceof t.Option) {
		return 1 + getOptionDepth(type.inner);
	}

	return 0;
}
