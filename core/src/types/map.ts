import { z, ZodType } from "zod";
import { t, TypeVariant, Wildcard } from ".";
import { BaseType } from "./base";

export type MapValue<T> = Map<string, T>;

export class MapType<TValue extends BaseType<any>> extends BaseType<
  MapValue<t.infer<TValue>>
> {
  constructor(public value: TValue) {
    super();
  }

  default() {
    return new Map<string, t.infer<TValue>>();
  }

  variant(): TypeVariant {
    return "map";
  }

  toString(): string {
    return `Map<${this.value.toString()}>`;
  }

  asZodType(): ZodType<Map<string, t.infer<TValue>>> {
    return z.map(z.string(), this.value.asZodType());
  }

  getWildcards(): Wildcard[] {
    return this.getWildcards();
  }

  eq(other: t.Any): boolean {
    return other instanceof t.Map && this.value.eq(other.value);
  }

  serialize() {
    return { variant: "map", value: this.value.serialize() };
  }
}
