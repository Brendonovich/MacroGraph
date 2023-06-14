import { createMutable } from "solid-js/store";
import { z } from "zod";
import { AnyType, TypeVariant } from ".";
import { BaseType } from "./base";

type EnumVariantData = Record<string, AnyType>;

export class EnumVariant<
  Name extends string = string,
  Data extends EnumVariantData | null = null
> {
  constructor(public name: Name, public data: Data) {
    return createMutable(this);
  }

  default(): any {
    const data = this.data;

    return data === null
      ? {
          variant: this.name,
        }
      : ({
          variant: this.name,
          data: Object.entries(data).reduce(
            (acc, [name, type]) => ({ ...acc, [name]: type.default() }),
            {}
          ),
        } as any);
  }
}

export type EnumVariants = [
  one: EnumVariant<string, EnumVariantData | null>,
  ...rest: EnumVariant<string, EnumVariantData | null>[]
];

export class LazyEnumVariants<Variants extends EnumVariants = EnumVariants> {
  constructor(public build: () => Variants) {}
}

export class Enum<Variants extends EnumVariants = EnumVariants> {
  constructor(
    public name: string,
    variants: Variants | LazyEnumVariants<Variants>
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
          >
        ]
  ): InferEnumVariant<Extract<EnumVariantOfEnum<this>, { name: Name }>> {
    if (Array.isArray(val)) {
      return {
        variant: val[0],
        data: val[1],
      } as any;
    } else
      return {
        varaint: val,
      } as any;
  }
}

type EnumVariantOfEnum<E> = E extends Enum<infer Variants>
  ? Variants[number]
  : never;

export class EnumBuilder {
  variant<Name extends string>(name: Name): EnumVariant<Name>;
  variant<Name extends string, Data extends EnumVariantData>(
    name: Name,
    data: Data
  ): EnumVariant<Name, Data>;
  variant<Name extends string, Data extends EnumVariantData>(
    name: Name,
    data?: Data
  ): EnumVariant<Name, Data> {
    return new EnumVariant(name, data ?? null) as any;
  }

  lazy<T extends EnumVariants>(fn: () => T) {
    return new LazyEnumVariants(fn);
  }
}

export class EnumType<
  Variants extends EnumVariants = EnumVariants
> extends BaseType<InferEnumVariants<Variants>> {
  constructor(public inner: Enum<Variants>) {
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

  asZodType(): z.ZodType<InferEnumVariants<Variants>> {
    return z.union(
      this.inner.variants.map((v) =>
        z.object({
          variant: z.literal(v.name),
          ...(v.data === null
            ? undefined
            : {
                data: z.object(
                  Object.entries(v.data).reduce(
                    (acc, [key, value]) => ({
                      ...acc,
                      [key]: z.lazy(() => value.asZodType()),
                    }),
                    {}
                  )
                ),
              }),
        })
      ) as any
    );
  }
}

export type InferEnum<E> = E extends Enum<infer Variants>
  ? InferEnumVariants<Variants>
  : never;

export type InferEnumVariants<V> = V extends EnumVariants
  ? InferEnumVariant<V[number]>
  : never;

export type InferEnumVariant<V> = V extends EnumVariant<infer Name, infer Data>
  ? {
      variant: Name;
    } & (Data extends null
      ? {}
      : {
          data: InferEnumVariantData<Data>;
        })
  : never;

export type InferEnumVariantData<D> = D extends EnumVariantData
  ? {
      [K in keyof D]: D[K] extends BaseType<infer TOut> ? TOut : never;
    }
  : never;
