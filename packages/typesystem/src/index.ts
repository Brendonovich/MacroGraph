import * as DT from "effect/DateTime";
import * as O from "effect/Option";
import * as S from "effect/Schema";

const TypeId = Symbol("TypeId");

export interface Type_<O> {
	readonly [TypeId]: O;
}
const Type_ = <TTag extends string>(
	tag: TTag,
): (new <O, D extends Record<string, any> | void = void>(
	data: D,
) => Readonly<
	Type_<O> & { readonly _tag: TTag } & (D extends void
			? Record<string, never>
			: D)
>) => {
	return class {
		readonly [TypeId] = null!;
		readonly _tag = tag;

		constructor(data: any) {
			if (data) Object.assign(this, data);
		}
	} as any;
};

export class Int_ extends Type_("Int")<number> {}
export class Float_ extends Type_("Float")<number> {}
export class String_ extends Type_("String")<string> {}
export class Bool_ extends Type_("Bool")<boolean> {}
export class DateTime_ extends Type_("DateTime")<DT.DateTime> {}

export type Primitive_ = Int_ | Float_ | String_ | Bool_ | DateTime_;

export class List_<T extends Type_<any>> extends Type_("List")<
	Array<Infer_<T>>,
	{ item: T }
> {}

export class Option_<T extends Type_<any>> extends Type_("Option")<
	O.Option<Infer_<T>>,
	{ inner: T }
> {}

export type Any_ =
	| Int_
	| Float_
	| String_
	| Bool_
	| DateTime_
	| List_<Any_>
	| Option_<Any_>;

export const primaryTypeOf_ = (t: Any_): Primitive_ => {
	switch (t._tag) {
		case "Int":
		case "Bool":
		case "DateTime":
		case "Float":
		case "String":
			return t;
		case "List":
			return primaryTypeOf_(t.item);
		case "Option":
			return primaryTypeOf_(t.inner);
	}
};

export type Infer_<T extends Type_<any>> = T extends Type_<infer O> ? O : never;

type AnySchema_ =
	| "I"
	| "F"
	| "S"
	| "B"
	| "DT"
	| readonly ["L", AnySchema_]
	| readonly ["O", AnySchema_];
export const AnySchema_: S.Schema<AnySchema_> = S.Union(
	S.Literal("I", "F", "S", "B", "DT"),
	S.Tuple(
		S.Literal("L"),
		S.suspend(() => AnySchema_),
	),
	S.Tuple(
		S.Literal("O"),
		S.suspend(() => AnySchema_),
	),
);

export const default_ = (t: Any_) => {
	switch (t._tag) {
		case "Int":
		case "Float":
			return 0;
		case "Bool":
			return false;
		case "String":
			return "";
		case "DateTime":
			return DT.unsafeMake(0);
		case "List":
			return [];
		case "Option":
			return O.none();
	}
};

export const serialize = (t: Any_): AnySchema_ => {
	switch (t._tag) {
		case "Int":
			return "I";
		case "Bool":
			return "B";
		case "Float":
			return "F";
		case "String":
			return "S";
		case "DateTime":
			return "DT";
		case "List":
			return ["L", serialize(t.item)];
		case "Option":
			return ["O", serialize(t.inner)];
	}
};

export const deserialize = (t: AnySchema_): Any_ => {
	if (typeof t === "string") {
		switch (t) {
			case "I":
				return new Int_();
			case "B":
				return new Bool_();
			case "F":
				return new Float_();
			case "S":
				return new String_();
			case "DT":
				return new DateTime_();
		}
	}

	switch (t[0]) {
		case "L":
			return new List_({ item: deserialize(t[1]) });
		case "O":
			return new Option_({ inner: deserialize(t[1]) });
	}
};
