import { infer } from "./base";
import {
  AnyType,
  Enum,
  EnumType,
  ListType,
  MapType,
  OptionType,
  Wildcard,
  WildcardType,
} from ".";
import { BoolType, FloatType, IntType, StringType } from "./primitive";
import { Struct, StructType } from "./struct";

const INT = new IntType();
const FLOAT = new FloatType();
const STRING = new StringType();
const BOOL = new BoolType();

const int = () => INT;
const float = () => FLOAT;
const string = () => STRING;
const bool = () => BOOL;
const list = <T extends AnyType>(t: T) => new ListType<T>(t);
const map = <TValue extends AnyType>(v: TValue) => new MapType(v);
const option = <T extends AnyType>(t: T) => new OptionType<T>(t);
const enm = <T extends Enum<any>>(t: T) => new EnumType<T>(t);
const struct = <T extends Struct<any>>(s: T) => new StructType<T>(s);
const wildcard = (w: Wildcard) => new WildcardType(w);

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
