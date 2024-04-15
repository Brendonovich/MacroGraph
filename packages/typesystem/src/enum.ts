import { createMutable } from "solid-js/store";
// import { z } from "zod";
import { t, TypeVariant, Wildcard } from ".";
import { BaseType } from "./base";

type EnumVariantData = Record<string, BaseType<any>>;

export class EnumVariant<
	Name extends string,
	Data extends EnumVariantData | null,
> {
	constructor(
		public name: Name,
		public data: Data,
	) {
		return createMutable(this);
	}

	default() {
		const data = this.data;

		return data === null
			? {
					variant: this.name,
				}
			: {
					variant: this.name,
					data: Object.entries(data).reduce(
						(acc, [name, type]) => ({ ...acc, [name]: type.default() }),
						{},
					),
				};
	}
}

export type EnumVariants = [
	one: EnumVariant<string, EnumVariantData | null>,
	...variant: EnumVariant<string, EnumVariantData | null>[],
];

export class LazyEnumVariants<Variants extends EnumVariants> {
	constructor(public build: () => Variants) {}
}

export class Enum<
	Variants extends EnumVariants = any,
	_Type = InferEnumVariant<Variants[number]>,
> {
	source!: { variant: "package"; package: string } | { variant: "custom" };

	constructor(
		public name: string,
		variants: Variants | LazyEnumVariants<Variants>,
	) {
		if (variants instanceof LazyEnumVariants) {
			this._variants = {
				type: "lazy",
				variants,
			};
		} else {
			this._variants = {
				type: "resolved",
				variants,
			};
		}

		return createMutable(this);
	}

	_variants:
		| { type: "resolved"; variants: Variants }
		| { type: "lazy"; variants: LazyEnumVariants<Variants> };

	get variants(): Variants {
		let val = this._variants;

		if (val.type === "lazy") {
			this._variants = val = {
				type: "resolved",
				variants: val.variants.build(),
			};
		}

		return val.variants;
	}

	variant<Name extends EnumVariantOfEnum<this>["name"]>(
		val: InferEnumVariantData<
			Extract<EnumVariantOfEnum<this>, { name: Name }>["data"]
		> extends null
			? Name
			: [
					Name,
					InferEnumVariantData<
						Extract<EnumVariantOfEnum<this>, { name: Name }>["data"]
					>,
				],
	): InferEnumVariant<Extract<EnumVariantOfEnum<this>, { name: Name }>> {
		if (Array.isArray(val)) {
			return {
				variant: val[0],
				data: val[1],
			} as any;
		} else
			return {
				variant: val,
			} as any;
	}
}

type EnumVariantOfEnum<E> = E extends Enum<infer Variants>
	? Variants[number]
	: never;

export class EnumBuilder {
	variant<Name extends string>(name: Name): EnumVariant<Name, null>;
	variant<Name extends string, Data extends EnumVariantData>(
		name: Name,
		data: Data,
	): EnumVariant<Name, Data>;
	variant<Name extends string, Data extends EnumVariantData>(
		name: Name,
		data?: Data,
	): EnumVariant<Name, Data> {
		return new EnumVariant(name, data ?? null) as any;
	}

	lazy<T extends EnumVariants>(fn: () => T) {
		return new LazyEnumVariants(fn);
	}
}

export class EnumType<TEnum extends Enum> extends BaseType<InferEnum<TEnum>> {
	constructor(public inner: TEnum) {
		super();
	}

	default() {
		return this.inner.variants[0].default();
	}

	variant(): TypeVariant {
		return "enum";
	}

	toString(): string {
		return `Enum(${this.inner.name})`;
	}

	// asZodType(): z.ZodType<InferEnum<TEnum>> {
	//   return z.union(
	//     (this.inner.variants as EnumVariants).map((v) =>
	//       z.object({
	//         variant: z.literal(v.name),
	//         ...(v.data === null
	//           ? undefined
	//           : {
	//               data: z.object(
	//                 Object.entries(v.data).reduce(
	//                   (acc, [key, value]) => ({
	//                     ...acc,
	//                     [key]: z.lazy(() => value.asZodType()),
	//                   }),
	//                   {}
	//                 )
	//               ),
	//             }),
	//       })
	//     ) as any
	//   );
	// }

	getWildcards(): Wildcard[] {
		return (this.inner.variants as EnumVariants).flatMap((v) =>
			v.data ? Object.values(v.data).flatMap((d) => d.getWildcards()) : [],
		);
	}

	eq(other: t.Any): boolean {
		return other instanceof t.Enum && this.inner === other.inner;
	}

	serialize() {
		return {
			variant: "enum",
			enum: { ...this.inner.source, name: this.inner.name },
		};
	}

	hasUnconnectedWildcard(): boolean {
		return false;
	}
}

export type InferEnum<E extends Enum<any>> = E extends Enum<any, infer Type>
	? Type
	: never;

export type InferEnumVariant<V> = V extends EnumVariant<infer Name, infer Data>
	? Data extends null
		? {
				variant: Name;
			}
		: {
				variant: Name;
				data: InferEnumVariantData<Data>;
			}
	: never;

export type InferEnumVariantData<D> = D extends EnumVariantData
	? {
			[K in keyof D]: t.infer<D[K]>;
		}
	: never;
