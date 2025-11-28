import * as S from "effect/Schema";

export namespace t {
	export const Int = S.Literal("Int");
	export type Int = S.Schema.Type<typeof Int>;

	export const Float = S.Literal("Float");
	export type Float = S.Schema.Type<typeof Float>;

	export const String = S.Literal("String");
	export type String = S.Schema.Type<typeof String>;

	export const Bool = S.Literal("Bool");
	export type Bool = S.Schema.Type<typeof Bool>;

	const Primitive = S.Union(Int, Float, String, Bool);
	type Primitive = S.Schema.Type<typeof Primitive>;

	export const MapKey = S.Union(Int, Float, String);
	export type MapKey = S.Schema.Type<typeof MapKey>;

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
