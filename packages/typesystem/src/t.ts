import {
	type AnyType,
	type EnumBase,
	EnumType,
	ListType,
	MapType,
	OptionType,
	type Wildcard,
	WildcardType,
} from ".";
import type { infer } from "./base";
import {
	BasePrimitiveType,
	BoolType,
	FloatType,
	IntType,
	StringType,
} from "./primitive";
import { type StructBase, StructType } from "./struct";

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
const enm = <T extends EnumBase>(t: T) => new EnumType<T>(t);
const struct = <T extends StructBase>(s: T) => new StructType<T>(s);
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
	BasePrimitiveType as Primitive,
};

export type { AnyType as Any, infer };
