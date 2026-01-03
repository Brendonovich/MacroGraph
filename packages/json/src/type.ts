import { createEnum } from "@macrograph/runtime";
import {
	type Enum,
	type EnumBuilder,
	type EnumVariant,
	type EnumVariants,
	type Field,
	type InferEnumVariant,
	t,
} from "@macrograph/typesystem";
import type { ReactiveMap } from "@solid-primitives/map";

const JSONLiteralVariants = (e: EnumBuilder) =>
	[
		e.variant("Null"),
		e.variant("Bool", { value: t.bool() }),
		e.variant("Number", { value: t.float() }),
		e.variant("String", { value: t.string() }),
	] satisfies EnumVariants;

type JSONLiteralVariantTypes = ReturnType<typeof JSONLiteralVariants>;
type JSONLiteralValue = InferEnumVariant<JSONLiteralVariantTypes[number]>;
export type JSONValue =
	| JSONLiteralValue
	| { variant: "List"; data: { value: JSONValue[] } }
	| { variant: "Map"; data: { value: ReactiveMap<string, JSONValue> } };

type JSONVariantTypes = [
	...JSONLiteralVariantTypes,
	EnumVariant<"List", { value: Field<t.List<t.Enum<Enum<JSONVariantTypes>>>> }>,
	EnumVariant<"Map", { value: Field<t.Map<t.Enum<Enum<JSONVariantTypes>>>> }>,
];

export const JSONEnum = createEnum<JSONVariantTypes>("JSON", (e) =>
	e.lazy(() => [
		...JSONLiteralVariants(e),
		e.variant("List", { value: t.list(t.enum(JSONEnum)) }),
		e.variant("Map", { value: t.map(t.enum(JSONEnum)) }),
	]),
) as Enum<JSONVariantTypes>;
