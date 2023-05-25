import {
  AnyType,
  Enum,
  EnumType,
  ListType,
  OptionType,
  Wildcard,
  WildcardType,
} from ".";
import { BoolType, FloatType, IntType, StringType } from "./primitive";
import { Struct, StructType } from "./struct";

const int = () => new IntType();
const float = () => new FloatType();
const string = () => new StringType();
const bool = () => new BoolType();
const list = <T extends AnyType>(t: T) => new ListType(t);
const option = <T extends AnyType>(t: T) => new OptionType(t);
const enm = <E extends Enum>(t: E) => new EnumType(t);
const wildcard = (w: Wildcard) => new WildcardType(w);
const struct = <S extends Struct>(s: S) => new StructType(s);

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
