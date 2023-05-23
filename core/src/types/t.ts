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

const int = () => new IntType();
const float = () => new FloatType();
const string = () => new StringType();
const bool = () => new BoolType();
const list = <T extends AnyType>(t: T) => new ListType(t);
const option = <T extends AnyType>(t: T) => new OptionType(t);
const enm = <E extends Enum>(t: E) => new EnumType(t);
const wildcard = (w: Wildcard) => new WildcardType(w);

export { int, float, string, bool, list, option, enm as enum, wildcard };

export type {
  ListType as List,
  EnumType as Enum,
  AnyType as Any,
  WildcardType as Wildcard,
  OptionType as Option,
};
