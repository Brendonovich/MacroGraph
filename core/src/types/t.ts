import {
  AnyType,
  Enum,
  EnumType,
  EnumVariants,
  ListType,
  OptionType,
  Wildcard,
  WildcardType,
} from ".";
import { BoolType, FloatType, IntType, StringType } from "./primitive";
import { Struct, StructFields, StructType } from "./struct";

const int = () => new IntType();
const float = () => new FloatType();
const string = () => new StringType();
const bool = () => new BoolType();
const list = <T extends AnyType>(t: T) => new ListType<T>(t);
const option = <T extends AnyType>(t: T) => new OptionType<T>(t);
const enm = <V extends EnumVariants>(t: Enum<V>) => new EnumType<V>(t);
const wildcard = (w: Wildcard) => new WildcardType(w);
const struct = <F extends StructFields>(s: Struct<F>) => new StructType<F>(s);

export {
  int,
  float,
  string,
  bool,
  list,
  option,
  enm as enum,
  wildcard,
  struct,
};

export type {
  ListType as List,
  EnumType as Enum,
  AnyType as Any,
  WildcardType as Wildcard,
  OptionType as Option,
};
