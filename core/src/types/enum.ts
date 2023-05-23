import { AnyType, TypeVariant } from ".";
import { BaseType } from "./any";

type BaseData = Record<string, AnyType>;
export class EnumVariant<
  Name extends string = string,
  Data extends BaseData | null = null
> {
  constructor(public name: Name, public data: Data) {}
}

export type EnumVariants = [
  one: EnumVariant<any, any>,
  ...rest: EnumVariant<any, any>[]
];

export class Enum<
  Name extends string = string,
  Variants extends EnumVariants = [EnumVariant, ...EnumVariant[]]
> {
  constructor(public name: Name, public variants: Variants) {}
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
    return { name, data } as any;
  }
}

export class EnumType extends BaseType {
  constructor(public inner: Enum) {
    super();
  }

  default() {}

  variant(): TypeVariant {
    return "enum";
  }
}

export type InferEnum<E> = E extends Enum<any, infer Variants>
  ? InferEnumVariantValue<Variants[number]>
  : never;

type Join<T extends object> = { [K in keyof T]: T[K] };

export type InferEnumVariantValue<V> = V extends EnumVariant<
  infer Name,
  infer Data
>
  ? Join<
      {
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
    >
  : never;
