import * as S from "effect/Schema";

export namespace t {
	export const Int = S.Literal("Int");
	export type Int = typeof Int.Type;

	export const Float = S.Literal("Float");
	export type Float = typeof Float.Type;

	export const String = S.Literal("String");
	export type String = typeof String.Type;

	export const Bool = S.Literal("Bool");
	export type Bool = typeof Bool.Type;

	const Primitive = S.Union(Int, Float, String, Bool);
	type Primitive = typeof Primitive.Type;

	export const MapKey = S.Union(Int, Float, String);
	export type MapKey = typeof MapKey.Type;

	export type Any =
		| Primitive
		| readonly ["List", Any]
		| readonly ["Map", MapKey, Any]
		| readonly ["Option", Any];
	export const AnyConcrete: S.Schema<Any> = S.suspend(() =>
		S.Union(
			Primitive,
			S.Tuple(S.Literal("List"), AnyConcrete),
			S.Tuple(S.Literal("Map"), MapKey, AnyConcrete),
			S.Tuple(S.Literal("Option"), AnyConcrete),
		),
	);
}
