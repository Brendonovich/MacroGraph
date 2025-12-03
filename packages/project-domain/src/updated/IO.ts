import * as D from "effect/Data";
import type * as DT from "effect/DateTime";
import type * as O from "effect/Option";
import * as S from "effect/Schema";

import * as Node from "./Node";

export const Id = S.String.pipe(S.brand("IO/Id"));
export type Id = S.Schema.Type<typeof Id>;

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

	export class Int extends S.TaggedClass<Int>()("Int", {}) {}
	export class Float extends S.TaggedClass<Float>()("Float", {}) {}
	export class String extends S.TaggedClass<String>()("String", {}) {}
	export class Bool extends S.TaggedClass<Bool>()("Bool", {}) {}
	export class DateTime extends S.TaggedClass<DateTime>()("DateTime", {}) {}

	export const Primitive = S.Union(Int, Float, String, Bool, DateTime);
	export type Primitive = S.Schema.Type<typeof Primitive>;

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

	export class List<_T extends Any> extends S.TaggedClass<List<any>>()("List", {
		inner: Any,
	}) {}

	export class Option<_T extends Any> extends S.TaggedClass<Option<any>>()(
		"List",
		{ inner: Any },
	) {}

	export type Infer<T> = T extends Int | Float
		? number
		: T extends String
			? string
			: T extends Bool
				? boolean
				: T extends DateTime
					? DT.DateTime
					: T extends Option<infer T>
						? O.Option<Infer<T>>
						: never;

	export namespace Encoded {
		export const Int = S.Literal("I");
		export type Int = S.Schema.Type<typeof Int>;

		export const Float = S.Literal("F");
		export type Float = S.Schema.Type<typeof Float>;

		export const String = S.Literal("S");
		export type String = S.Schema.Type<typeof String>;

		export const Bool = S.Literal("B");
		export type Bool = S.Schema.Type<typeof Bool>;

		export const DateTime = S.Literal("DT");
		export type DateTime = S.Schema.Type<typeof DateTime>;

		export const Primitive = S.Union(Int, Float, String, Bool, DateTime);
		export type Primitive = S.Schema.Type<typeof Primitive>;

		// type InferPrimitive<T extends Primitive> = T extends Int | Float
		// 	? number
		// 	: T extends String
		// 		? string
		// 		: boolean;

		export const MapKey = S.Union(Int, Float, String);
		export type MapKey = S.Schema.Type<typeof MapKey>;

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
	type: T.Any,
}) {}

export const Variant = S.Union(Exec, Data);
export type Variant = S.Schema.Type<typeof Variant>;

export const InputPort = S.Struct({
	id: Id,
	name: S.optional(S.String),
	variant: Variant,
});
export type InputPort = S.Schema.Type<typeof InputPort>;

export const OutputPort = S.Struct({
	id: Id,
	name: S.optional(S.String),
	variant: Variant,
});
export type OutputPort = S.Schema.Type<typeof OutputPort>;

export const NodeIO = S.Struct({
	inputs: S.Array(InputPort),
	outputs: S.Array(OutputPort),
});
export type NodeIO = S.Schema.Type<typeof NodeIO>;

export const PortRef = S.Tuple(Node.Id, S.Literal("In", "Out"), Id);
export type PortRef = S.Schema.Type<typeof PortRef>;

export class PortConections extends S.Class<PortConections>("PortConections")({
	from: PortRef,
	to: S.Array(PortRef),
}) {}
