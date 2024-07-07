import type { Option } from "@macrograph/option";
import { z } from "zod";

import { type Enum, type Struct, t } from ".";

const SerializedTypeBases = z.union([
	z.literal("int"),
	z.literal("float"),
	z.literal("string"),
	z.literal("bool"),
	z.object({
		variant: z.literal("struct"),
		struct: z
			.discriminatedUnion("variant", [
				z.object({ variant: z.literal("package"), package: z.string() }),
				z.object({ variant: z.literal("custom") }),
			])
			.and(z.object({ name: z.string() })),
	}),
	z.object({
		variant: z.literal("enum"),
		enum: z
			.discriminatedUnion("variant", [
				z.object({ variant: z.literal("package"), package: z.string() }),
				z.object({ variant: z.literal("custom") }),
			])
			.and(z.object({ name: z.string() })),
	}),
]);

type SerializedFieldType =
	| z.infer<typeof SerializedTypeBases>
	| { variant: "option"; inner: SerializedFieldType }
	| { variant: "list"; item: SerializedFieldType }
	| { variant: "map"; value: SerializedFieldType };

export const SerializedType: z.ZodType<SerializedFieldType> =
	SerializedTypeBases.or(
		z.union([
			z.object({
				variant: z.literal("option"),
				inner: z.lazy(() => SerializedType),
			}),
			z.object({
				variant: z.literal("list"),
				item: z.lazy(() => SerializedType),
			}),
			z.object({
				variant: z.literal("map"),
				value: z.lazy(() => SerializedType),
			}),
		]),
	);

export function deserializeType(
	type: z.infer<typeof SerializedType>,
	getType: (variant: "struct" | "enum", data: any) => Option<Struct | Enum>,
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
