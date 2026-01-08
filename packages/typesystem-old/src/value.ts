import { Maybe, None, type Option } from "@macrograph/option";
import { ReactiveMap } from "@solid-primitives/map";

import {
	type Enum,
	type EnumVariants,
	type Struct,
	type StructFields,
	t,
} from ".";

export function deserializeValue(rawValue: any, type: t.Any): any {
	if (type instanceof t.Primitive) return rawValue;

	if (type instanceof t.List)
		return (rawValue as unknown[]).map((item) =>
			deserializeValue(item, type.item),
		);
	if (type instanceof t.Map) {
		const val = new ReactiveMap<string, any>();

		for (const [key, innerValue] of Object.entries(rawValue)) {
			val.set(key, deserializeValue(innerValue, type.value));
		}

		return val;
	}
	if (type instanceof t.Option) {
		if (rawValue === None) return None;
		return Maybe(rawValue).map((v) => deserializeValue(v, type.inner));
	}
	if (type instanceof t.Enum) {
		const value = rawValue as { variant: string; data?: any };

		return "data" in rawValue
			? {
					variant: rawValue.variant,
					data: Object.fromEntries(
						Object.entries(rawValue.data).map(([key, dataValue]) => {
							const variant = (type.inner as Enum<EnumVariants>).variants.find(
								(v) => v.id === value.variant,
							)!;

							return [
								key,
								deserializeValue(dataValue, variant.fields![key]!.type),
							];
						}),
					),
				}
			: { variant: rawValue.variant };
	}
	if (type instanceof t.Struct) {
		const val: Record<string, any> = {};

		const fields = Object.values((type.struct as Struct<StructFields>).fields);

		for (const field of fields) {
			// https://github.com/Brendonovich/MacroGraph/issues/280#issuecomment-2294793954
			const value = rawValue[field.id] ?? field.type.default();

			val[field.id] = deserializeValue(value, field.type);
		}

		return val;
	}
}

export function serializeValue(rawValue: any, type: t.Any): any {
	const typeOfValue = typeof rawValue;

	switch (typeOfValue) {
		case "string":
		case "number":
		case "boolean":
			return rawValue;
	}

	if (type instanceof t.List)
		return (rawValue as unknown[]).map((item) =>
			serializeValue(item, type.item),
		);
	if (type instanceof t.Map) {
		const val: Record<string, any> = {};

		for (const [key, innerValue] of rawValue as Map<string, any>) {
			val[key] = serializeValue(innerValue, type.value);
		}

		return val;
	}
	if (type instanceof t.Option)
		return (rawValue as Option<any>)
			.map((v) => serializeValue(v, type.inner))
			.toNullable();
	if (type instanceof t.Enum) {
		const value = rawValue as { variant: string; data?: any };

		return "data" in rawValue
			? {
					variant: rawValue.variant,
					data: Object.fromEntries(
						Object.entries(rawValue.data).map(([key, dataValue]) => {
							const variant = (type.inner as Enum<EnumVariants>).variants.find(
								(v) => v.id === value.variant,
							)!;

							return [
								key,
								serializeValue(dataValue, variant.fields![key]!.type),
							];
						}),
					),
				}
			: { variant: rawValue.variant };
	}
	if (type instanceof t.Struct) {
		const val: Record<string, any> = {};

		const fields = Object.values((type.struct as Struct<StructFields>).fields);

		for (const field of fields) {
			// https://github.com/Brendonovich/MacroGraph/issues/280#issuecomment-2294793954
			const value = rawValue[field.id] ?? field.type.default();

			val[field.id] = serializeValue(value, field.type);
		}

		return val;
	}
}
