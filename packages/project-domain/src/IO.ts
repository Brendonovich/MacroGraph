import * as D from "effect/Data";
import type * as DT from "effect/DateTime";
import type * as O from "effect/Option";
import * as S from "effect/Schema";

import type { IO } from ".";
import * as Node from "./Node";

export const Id = S.String.pipe(S.brand("IO/Id"));
export type Id = typeof Id.Type;

export type RefString = `${Node.Id}:${"i" | "o"}:${Id}`;

export function parseRef(ioRef: RefString) {
	const [nodeId, type, ...id] = ioRef.split(":");
	return {
		nodeId: Node.Id.make(Number(nodeId)),
		type: type as "i" | "o",
		id: Id.make(id.join("")),
	};
}

export class NotFound extends S.TaggedError<NotFound>()("IO.NotFound", {
	id: Id,
}) {}

export namespace T {
	namespace Data {
		export class Int extends D.TaggedClass("Int") {}
		export class Float extends D.TaggedClass("Float") {}
		export class Bool extends D.TaggedClass("Bool") {}
		export class String extends D.TaggedClass("String") {}

		export type Primitive = Int | Float | Bool | String;

		export class Option<T extends Primitive> extends D.TaggedClass("List")<{
			inner: T;
		}> {}

		export class List<T extends Primitive> extends D.TaggedClass("List")<{
			inner: T;
		}> {}
	}

	export type Any =
		| Int
		| Float
		| String
		| Bool
		| DateTime
		// | Wildcard
		| List<Any>
		| Option<Any>;
	export const Any: S.Schema<Any> = S.suspend(() =>
		S.Union(Int, Float, String, Bool, DateTime, /*Wildcard,*/ List, Option),
	);

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

	export type Infer_<T extends Type_<any>> = T extends Type_<infer O>
		? O
		: never;

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

	export class Int extends S.TaggedClass<Int>()("Int", {}) {}
	export class Float extends S.TaggedClass<Float>()("Float", {}) {}
	export class String extends S.TaggedClass<String>()("String", {}) {}
	export class Bool extends S.TaggedClass<Bool>()("Bool", {}) {}
	export class DateTime extends S.TaggedClass<DateTime>()("DateTime", {}) {}

	export const Primitive = S.Union(Int, Float, String, Bool, DateTime);
	export type Primitive = typeof Primitive.Type;

	export const primaryTypeOf = (t: Any): Primitive => {
		switch (t._tag) {
			case "Int":
			case "Bool":
			case "DateTime":
			case "Float":
			case "String":
				return t;
			case "List":
				return primaryTypeOf(t.inner);
		}
	};

	// export class Wildcard extends S.TaggedClass<Wildcard>()("Wildcard", {}) {}

	export class List<_T> extends S.TaggedClass<List<any>>()("List", {
		inner: Any,
	}) {}

	export class Option<_T> extends S.TaggedClass<Option<any>>()("List", {
		inner: Any,
	}) {}

	export type InferPrimitive<T> = T extends Int | Float
		? number
		: T extends String
			? string
			: T extends Bool
				? boolean
				: T extends DateTime
					? DT.DateTime
					: never;

	export type Infer<T> = T extends Primitive
		? InferPrimitive<T>
		: T extends Option<infer T>
			? O.Option<Infer<T>>
			: never;

	export namespace Encoded {
		export const Int = S.Literal("I");
		export type Int = typeof Int.Type;

		export const Float = S.Literal("F");
		export type Float = typeof Float.Type;

		export const String = S.Literal("S");
		export type String = typeof String.Type;

		export const Bool = S.Literal("B");
		export type Bool = typeof Bool.Type;

		export const DateTime = S.Literal("DT");
		export type DateTime = typeof DateTime.Type;

		export const Primitive = S.Union(Int, Float, String, Bool, DateTime);
		export type Primitive = typeof Primitive.Type;

		// type InferPrimitive<T extends Primitive> = T extends Int | Float
		// 	? number
		// 	: T extends String
		// 		? string
		// 		: boolean;

		export const MapKey = S.Union(Int, Float, String);
		export type MapKey = typeof MapKey.Type;

		export type Any = Primitive | Option<any> | List<any> | Map<MapKey, any>;
		export const Any: S.Schema<Any> = S.suspend(() =>
			S.Union(Primitive, Option, List, Map),
		);

		export const Option = S.Tuple(S.Literal("O"), Any);
		export type Option<T extends Any> = readonly ["O", T];

		export const List = S.Tuple(S.Literal("L"), Any);
		export type List<T extends Any> = readonly ["L", T];

		export const Map = S.Tuple(S.Literal("M"), MapKey, Any);
		export type Map<K extends MapKey, V extends Any> = readonly ["M", K, V];

		// export type Infer<T extends Any> = T extends Primitive
		// 	? InferPrimitive<T>
		// 	: T extends Option<infer T>
		// 		? O.Option<Infer<T>>
		// 		: T extends List<infer T>
		// 			? Array<Infer<T>>
		// 			: T extends Map<infer K, infer V>
		// 				? Record<K, V>
		// 				: never;
	}
}

export class Exec extends S.TaggedClass<Exec>()("Exec", {}) {}
export class Data extends S.TaggedClass<Data>()("Data", {
	type: T.AnySchema_,
}) {}

export const Variant = S.Union(Exec, Data);
export type Variant = typeof Variant.Type;

export const InputPort = S.Struct({
	id: Id,
	name: S.optional(S.String),
	variant: Variant,
});
export type InputPort = typeof InputPort.Type;

export const OutputPort = S.Struct({
	id: Id,
	name: S.optional(S.String),
	variant: Variant,
});
export type OutputPort = typeof OutputPort.Type;

export const NodeIO = S.Struct({
	inputs: S.Array(InputPort),
	outputs: S.Array(OutputPort),
});
export type NodeIO = typeof NodeIO.Type;

export const PortRef = S.Tuple(Node.Id, S.Literal("In", "Out"), Id);
export type PortRef = typeof PortRef.Type;

export class PortConections extends S.Class<PortConections>("PortConections")({
	from: PortRef,
	to: S.Array(PortRef),
}) {}

export class ExecInput extends D.TaggedClass("ExecInput")<{ id: IO.Id }> {}

export class ExecOutput extends D.TaggedClass("ExecOutput")<{ id: IO.Id }> {}

export class DataInput<T extends T.Type_<any>> extends D.TaggedClass(
	"DataInput",
)<{ id: IO.Id; type: T }> {}

export class DataOutput<T extends T.Type_<any>> extends D.TaggedClass(
	"DataOutput",
)<{ id: IO.Id; type: T }> {}
