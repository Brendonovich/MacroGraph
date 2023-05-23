import { ListType } from "./list";
import { OptionType } from "./option";
import {
  BasePrimitiveType,
  BoolType,
  FloatType,
  IntType,
  PrimitiveType,
  StringType,
} from "./primitive";
import { Wildcard, WildcardType } from "./wildcard";

export * from "./list";
export * from "./option";
export * from "./any";
export * from "./primitive";
export * from "./wildcard";

export type TypeVariant =
  | "primitive"
  | "list"
  | "map"
  | "set"
  | "option"
  | "wildcard";

export const t = {
  int: () => new IntType(),
  float: () => new FloatType(),
  string: () => new StringType(),
  bool: () => new BoolType(),
  list: <T extends AnyType>(t: T) => new ListType(t),
  option: <T extends AnyType>(t: T) => new OptionType(t),
  wildcard: (w: Wildcard) => new WildcardType(w),
};

export type AnyType = PrimitiveType | ListType | OptionType | WildcardType;

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

  if (aInner instanceof OptionType && bInner instanceof OptionType)
    return typesCanConnect(aInner.inner, bInner.inner);

  return false;
}
