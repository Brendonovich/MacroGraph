import { ListType } from "./list";
import { OptionType } from "./option";
import {
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

export const types = {
  int: () => new IntType(),
  float: () => new FloatType(),
  string: () => new StringType(),
  bool: () => new BoolType(),
  list: <T extends AnyType>(t: T) => new ListType(t),
  option: <T extends AnyType>(t: T) => new OptionType(t),
  wildcard: (w: Wildcard) => new WildcardType(w),
};

export type AnyType = PrimitiveType | ListType | OptionType | WildcardType;
