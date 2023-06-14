import { EnumType, EnumVariants } from "./enum";
import { ListType } from "./list";
import { MapType } from "./map";
import { OptionType } from "./option";
import { BasePrimitiveType, PrimitiveType } from "./primitive";
import { StructFields, StructType } from "./struct";
import { WildcardType } from "./wildcard";

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

export type AnyType =
  | PrimitiveType
  | ListType
  | MapType
  | OptionType<AnyType>
  | WildcardType
  | EnumType<EnumVariants>
  | StructType<StructFields>;

export function typesCanConnect(a: AnyType, b: AnyType): boolean {
  const aInner = a instanceof WildcardType ? a.wildcard.value.unwrapOr(a) : a;
  const bInner = b instanceof WildcardType ? b.wildcard.value.unwrapOr(b) : b;

  if (aInner instanceof WildcardType || bInner instanceof WildcardType)
    return true;

  if (
    aInner instanceof BasePrimitiveType &&
    bInner instanceof BasePrimitiveType
  )
    return aInner.primitiveVariant() === bInner.primitiveVariant();

  if (aInner instanceof ListType && bInner instanceof ListType)
    return typesCanConnect(aInner.inner, bInner.inner);

  if (aInner instanceof MapType && bInner instanceof MapType)
    return typesCanConnect(aInner.value, bInner.value);

  if (aInner instanceof OptionType && bInner instanceof OptionType)
    return typesCanConnect(aInner.inner, bInner.inner);

  return false;
}
