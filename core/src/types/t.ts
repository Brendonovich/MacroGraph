import { infer } from "./base";
import {
  AnyType,
  Enum,
  EnumType,
  EnumVariants,
  ListType,
  MapType,
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
const map = <TValue extends AnyType>(v: TValue) => new MapType(v);
const option = <T extends AnyType>(t: T) => new OptionType<T>(t);
const enm = <T extends Enum<any>>(t: T) => new EnumType<T>(t);
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
  map,
};

export {
  ListType as List,
  EnumType as Enum,
  WildcardType as Wildcard,
  OptionType as Option,
  MapType as Map,
  StringType as String,
  IntType as Int,
  FloatType as Float,
  BoolType as Bool,
  StructType as Struct,
};

export type { AnyType as Any, infer };
