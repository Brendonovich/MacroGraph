import type { Option } from "@macrograph/option";
import * as v from "valibot";

import {
	type Enum,
	type EnumBase,
	type EnumVariants,
	type Struct,
	type StructBase,
	t,
} from ".";

const SerializedTypeBases = v.union([
	v.literal("int"),
	v.literal("float"),
	v.literal("string"),
	v.literal("bool"),
	v.object({
		variant: v.literal("struct"),
		struct: v.variant("variant", [
			v.object({
				variant: v.literal("package"),
				package: v.string(),
				name: v.string(),
			}),
			v.object({ variant: v.literal("custom"), id: v.number() }),
		]),
	}),
	v.object({
		variant: v.literal("enum"),
		enum: v.variant("variant", [
			v.object({
				variant: v.literal("package"),
				package: v.string(),
				name: v.string(),
			}),
			v.object({ variant: v.literal("custom"), id: v.number() }),
		]),
	}),
]);

type SerializedFieldType =
	| v.InferOutput<typeof SerializedTypeBases>
	| { variant: "option"; inner: SerializedFieldType }
	| { variant: "list"; item: SerializedFieldType }
	| { variant: "map"; value: SerializedFieldType };

export const SerializedType: v.BaseSchema<any, SerializedFieldType, any> =
	v.union([
		SerializedTypeBases,
		v.object({
			variant: v.literal("option"),
			inner: v.lazy(() => SerializedType),
		}),
		v.object({
			variant: v.literal("list"),
			item: v.lazy(() => SerializedType),
		}),
		v.object({
			variant: v.literal("map"),
			value: v.lazy(() => SerializedType),
		}),
	]);

export function deserializeType(
	type: v.InferOutput<typeof SerializedType>,
	getType: (
		variant: "struct" | "enum",
		data: any,
	) => Option<StructBase | EnumBase<EnumVariants>>,
): t.Any {
	switch (type) {
		case "string":
			return t.string();
		case "float":
			return t.float();
		case "int":
			return t.int();
		case "bool":
			return t.bool();
	}

	switch (type.variant) {
		case "option":
			return t.option(deserializeType(type.inner, getType));
		case "list":
			return t.list(deserializeType(type.item, getType));
		case "map":
			return t.map(deserializeType(type.value, getType));
		case "struct":
			return t.struct(
				getType("struct", type.struct).expect("Struct not found!") as Struct,
			);
		case "enum":
			return t.enum(
				getType("enum", type.enum).expect("Enum not found!") as Enum,
			);
	}
}
