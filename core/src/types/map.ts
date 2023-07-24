import { z, ZodType } from "zod";
import { t, TypeVariant, Wildcard } from ".";
import { BaseType } from "./base";

export type MapValue<T> = Map<string, T>;

export class MapType<TValue extends BaseType<any>> extends BaseType<
  Map<string, t.infer<TValue>>
> {
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

  asZodType(): ZodType<Map<string, t.infer<TValue>>> {
    return z.map(z.string(), this.value.asZodType());
  }

  getWildcards(): Wildcard[] {
    return this.getWildcards();
  }

  eq(other: t.Any): boolean {
    return other instanceof t.Map && this.value.eq(other.value);
  }
}
