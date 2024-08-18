import { createMutable } from "solid-js/store";

import { Field, type TypeVariant, type Wildcard, t } from ".";
import { BaseType } from "./base";

export type EnumVariantFields = Record<string, Field>;

export class EnumVariant<
	Id extends string,
	Fields extends EnumVariantFields | null,
> {
	fieldIdCounter = 0;

	constructor(
		public id: Id,
		public fields: Fields,
		public name?: string,
	) {
		return createMutable(this);
	}

	default() {
		const data = this.fields;

		return data === null
			? { variant: this.id }
			: {
					variant: this.id,
					data: Object.entries(data).reduce(
						(acc, [name, type]) =>
							Object.assign(acc, { [name]: type.default() }),
						{},
					),
				};
	}
}

export type EnumVariants = [
	one: EnumVariant<string, EnumVariantFields | null>,
	...variant: EnumVariant<string, EnumVariantFields | null>[],
];

export class LazyEnumVariants<Variants extends EnumVariants> {
	constructor(public build: () => Variants) {}
}

export abstract class EnumBase<T> {
	source!:
		| { variant: "package"; package: string }
		| { variant: "custom"; id: number };
	abstract name: string;
	abstract variants: EnumVariants;
}

export class Enum<
	Variants extends EnumVariants = any,
	_Type = InferEnumVariant<Variants[number]>,
> extends EnumBase<_Type> {
	constructor(
		public name: string,
		variants: Variants | LazyEnumVariants<Variants>,
	) {
		super();

		if (variants instanceof LazyEnumVariants)
			this._variants = { type: "lazy", variants };
		else this._variants = { type: "resolved", variants };

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

	variant<Id extends EnumVariantOfEnum<this>["id"]>(
		val: InferEnumVariantData<
			Extract<EnumVariantOfEnum<this>, { id: Id }>["fields"]
		> extends null
			? Id
			: [
					Id,
					InferEnumVariantData<
						Extract<EnumVariantOfEnum<this>, { id: Id }>["fields"]
					>,
				],
	): InferEnumVariant<Extract<EnumVariantOfEnum<this>, { id: Id }>> {
		if (Array.isArray(val)) return { variant: val[0], data: val[1] } as any;

		return { variant: val } as any;
	}
}

type EnumVariantOfEnum<E> = E extends Enum<infer Variants>
	? Variants[number]
	: never;

export class EnumBuilder {
	variant<Name extends string>(name: Name): EnumVariant<Name, null>;
	variant<Name extends string, Fields extends Record<string, BaseType>>(
		name: Name,
		fields: Fields,
	): EnumVariant<Name, VariantFieldFromTypes<Fields>>;
	variant<Name extends string, Fields extends Record<string, BaseType>>(
		name: Name,
		fields?: Fields,
	): EnumVariant<Name, VariantFieldFromTypes<Fields>> {
		let _fields: any;

		if (fields) {
			_fields = {};
			for (const [key, value] of Object.entries(fields)) {
				_fields[key] = new Field(key, value);
			}
		}

		return new EnumVariant(name, _fields ?? null) as any;
	}

	lazy<T extends EnumVariants>(fn: () => T) {
		return new LazyEnumVariants(fn);
	}
}

type VariantFieldFromTypes<T extends Record<string, BaseType> | null> =
	T extends Record<string, BaseType> ? { [K in keyof T]: Field<T[K]> } : null;

export class EnumType<TEnum extends EnumBase> extends BaseType<
	InferEnum<TEnum>
> {
	constructor(public inner: TEnum) {
		super();
	}

	default(): any {
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
			v.fields
				? Object.values(v.fields).flatMap((d) => d.type.getWildcards())
				: [],
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

export type InferEnum<E> = E extends EnumBase<infer Type> ? Type : never;

export type InferEnumVariant<V> = V extends EnumVariant<infer Name, infer Data>
	? Data extends null
		? { variant: Name }
		: { variant: Name; data: InferEnumVariantData<Data> }
	: never;

export type InferEnumVariantData<D> = D extends EnumVariantFields
	? { [K in keyof D]: t.infer<D[K]["type"]> }
	: never;
