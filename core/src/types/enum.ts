import { createMutable } from "solid-js/store";
import { AnyType, TypeVariant } from ".";
import { BaseType } from "./any";

type BaseData = Record<string, AnyType>;

export class EnumVariant<
  Name extends string = string,
  Data extends BaseData | null = any
> {
  constructor(public name: Name, public data: Data) {
    return createMutable(this);
  }

  defaultValue(): InferEnumVariant<EnumVariant<Name, Data>> {
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
  one: EnumVariant<string, any>,
  ...rest: EnumVariant<string, any>[]
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

    // return createMutable(this);
  }

  _variants:
    | { type: "resolved"; variants: Variants }
    | { type: "lazy"; variants: LazyEnumVariants<Variants> };

  get variants() {
    let val = this._variants;

    if (val.type === "lazy") {
      this._variants = val = {
        type: "resolved",
        variants: val.variants.build(),
      };
    }

    return val.variants;
  }
}

export class EnumBuilder {
  variant<Name extends string>(name: Name): EnumVariant<Name>;
  variant<Name extends string, Data extends BaseData>(
    name: Name,
    data: Data
  ): EnumVariant<Name, Data>;
  variant<Name extends string, Data extends BaseData>(
    name: Name,
    data?: Data
  ): EnumVariant<Name, Data> {
    return new EnumVariant(name, data ?? null) as any;
  }

  lazy<T extends EnumVariants>(fn: () => T) {
    return new LazyEnumVariants(fn);
  }
}

export class EnumType<E extends Enum = Enum> extends BaseType {
  constructor(public inner: E) {
    super();
  }

  default() {
    return this.inner.variants[0].defaultValue();
  }

  variant(): TypeVariant {
    return "enum";
  }

  toString(): string {
    return `Enum(${this.inner.name})`;
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
          data: {
            [K in keyof Data]: Data[K] extends BaseType<infer TOut>
              ? TOut
              : never;
          };
        })
  : never;
