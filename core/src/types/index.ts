import { AnyType } from "./any";
import { ListType } from "./list";
import { OptionType } from "./option";
import { BoolType, FloatType, IntType, StringType } from "./primitive";

export * from "./list";
export * from "./option";
export * from "./any";
export * from "./primitive";

export type TypeVariant = "primitive" | "list" | "map" | "set" | "option";

export const types = {
  int: () => new IntType(),
  float: () => new FloatType(),
  string: () => new StringType(),
  bool: () => new BoolType(),
  list: <T extends AnyType>(t: T) => new ListType(t),
  option: <T extends AnyType>(t: T) => new OptionType(t),
};
