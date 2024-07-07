import {
	type BaseType,
	type Enum,
	type EnumVariants,
	type MapValue,
	type Struct,
	t,
} from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";

import { JSONEnum, type JSONValue } from "./type";

/**
 * Runtime Value -> JSON
 */
export function toJSON(type: t.Int | t.Float, value: number): JSONValue;
export function toJSON(type: t.String, value: string): JSONValue;
export function toJSON(type: t.Bool, value: boolean): JSONValue;
export function toJSON<T extends BaseType>(
	type: t.Option<T>,
	value: t.infer<t.Option<T>>,
): JSONValue;
export function toJSON<T extends BaseType>(
	type: t.List<T>,
	value: t.infer<t.List<T>>,
): JSONValue;
export function toJSON<T extends BaseType>(
	type: t.Map<T>,
	value: t.infer<t.Map<T>>,
): JSONValue;
export function toJSON<T extends Enum>(
	type: t.Enum<T>,
	value: t.infer<t.Enum<T>>,
): JSONValue;
export function toJSON<T extends Struct>(
	type: t.Struct<T>,
	value: t.infer<t.Struct<T>>,
): JSONValue;
export function toJSON(type: t.Wildcard, value: t.infer<t.Wildcard>): JSONValue;
export function toJSON(type: t.Any, value: any): JSONValue | null;
export function toJSON(type: t.Any, value: any): JSONValue | null {
	if (type instanceof t.Wildcard) {
		return toJSON(
			type.wildcard.value().expect("Wildcard value not found!"),
			value,
		);
	}
	if (type instanceof t.Enum && type.inner === JSONEnum) {
		return value;
	}
	if (type instanceof t.Option) {
		if (value.isNone()) return JSONEnum.variant("Null");
		return toJSON(type.inner, value.unwrap());
	}
	if (type instanceof t.Int || type instanceof t.Float)
		return JSONEnum.variant(["Number", { value }]);
	if (type instanceof t.String) return JSONEnum.variant(["String", { value }]);
	if (type instanceof t.Bool) return JSONEnum.variant(["Bool", { value }]);
	if (type instanceof t.List)
		return JSONEnum.variant([
			"List",
			{ value: value.map((v: any) => toJSON(type.item, v)) },
		]);
	if (type instanceof t.Map) {
		const newValue: MapValue<any> = new ReactiveMap();

		for (const [k, v] of value) {
			newValue.set(k, toJSON(type.value, v));
		}

		return JSONEnum.variant(["Map", { value: newValue }]);
	}
	if (type instanceof t.Enum) {
		const enm: Enum = type.inner;
		const variant = (enm.variants as EnumVariants).find(
			(v) => v.name === value.variant,
		)!;

		return JSONEnum.variant([
			"Map",
			{
				value: new ReactiveMap(
					Object.entries({
						variant: JSONEnum.variant(["String", { value: value.variant }]),
						...(value.data
							? {
									data: JSONEnum.variant([
										"Map",
										{
											value: new ReactiveMap(
												Object.entries(value.data).map(([name, value]) => {
													return [name, toJSON(variant.data![name]!, value)!];
												}),
											),
										},
									]),
								}
							: undefined),
					}),
				),
			},
		]);
	}
	if (type instanceof t.Struct) {
		const struct: Struct = type.struct;

		return JSONEnum.variant([
			"Map",
			{
				value: new ReactiveMap(
					Object.entries(value).map(([name, value]) => {
						return [name, toJSON(struct.fields[name]!.type, value)!];
					}),
				),
			},
		]);
	}
	return null;
}

/**
 * JS Value -> JSON
 */
export function jsToJSON(value: any): JSONValue | null {
	if (Array.isArray(value)) {
		return JSONEnum.variant([
			"List",
			{ value: value.map((v) => jsToJSON(v)!) },
		]);
	}
	// else if (value instanceof Map) {
	//   return JSON.variant([
	//     "Map",
	//     {
	//       value: new Map(
	//         [...value.entries()].map(([key, value]) => [key, jsToJSON(value)])
	//       ),
	//     },
	//   ]);
	// }
	if (value === null) {
		return JSONEnum.variant("Null");
	}

	switch (typeof value) {
		case "number":
			return JSONEnum.variant(["Number", { value }]);
		case "string":
			return JSONEnum.variant(["String", { value }]);
		case "object":
			return JSONEnum.variant([
				"Map",
				{
					value: new ReactiveMap(
						Object.entries(value).map(([key, value]) => [
							key,
							jsToJSON(value)!,
						]),
					),
				},
			]);
		case "boolean":
			return JSONEnum.variant(["Bool", { value }]);
	}

	return null;
}

/**
 * JSON -> JS Value
 */
export function jsonToJS(value: JSONValue): any {
	switch (value.variant) {
		case "Null":
			return null;
		case "Number":
		case "String":
		case "Bool":
			return value.data.value;
		case "List":
			return value.data.value.map((v: any) => jsonToJS(v));
		case "Map":
			return [...value.data.value.entries()].reduce((acc, [key, value]) => {
				acc[key] = jsonToJS(value as any);
				return acc;
			}, {} as any);
	}
}
