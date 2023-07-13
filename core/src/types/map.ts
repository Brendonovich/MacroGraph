import { z, ZodType } from "zod";
import { t, TypeVariant, Wildcard } from ".";
import { BaseType } from "./base";

export type MapValue<T> = Map<string, T>;

export class MapType<
  TValue extends t.Any = t.Any,
  TValueOut = any
> extends BaseType<MapValue<TValueOut>> {
  constructor(public value: TValue) {
    super();
  }

  default(): any {
    return new Map();
  }

  variant(): TypeVariant {
    return "map";
  }

  toString(): string {
    return `Map<${this.value.toString()}>`;
  }

  asZodType(): ZodType<Map<string, TValueOut>> {
    return z.map(z.string(), this.value.asZodType());
  }

  getWildcards(): Wildcard[] {
    return this.getWildcards();
  }

  eq(other: t.Any): boolean {
    return other instanceof t.Map && this.value.eq(other.value);
  }
}
