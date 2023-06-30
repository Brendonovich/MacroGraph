import { BaseType } from "./base";
import { BasePrimitiveType } from "./primitive";
import * as t from "./t";

export * from "./list";
export * from "./option";
export * from "./base";
export * from "./primitive";
export * from "./wildcard";
export * from "./enum";
export * from "./struct";
export * from "./map";
export * as t from "./t";

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

export function typesCanConnect(a: t.Any, b: t.Any): boolean {
  const aInner = a instanceof t.Wildcard ? a.wildcard.value().unwrapOr(a) : a;
  const bInner = b instanceof t.Wildcard ? b.wildcard.value().unwrapOr(b) : b;

  if (aInner instanceof t.Wildcard || bInner instanceof t.Wildcard) return true;

  if (
    aInner instanceof BasePrimitiveType &&
    bInner instanceof BasePrimitiveType
  )
    return aInner.primitiveVariant() === bInner.primitiveVariant();

  if (aInner instanceof t.List && bInner instanceof t.List)
    return typesCanConnect(aInner.inner, bInner.inner);

  if (aInner instanceof t.Map && bInner instanceof t.Map)
    return typesCanConnect(aInner.value, bInner.value);

  if (aInner instanceof t.Option && bInner instanceof t.Option)
    return typesCanConnect(aInner.inner, bInner.inner);

  return false;
}
