import { z } from "zod";
import { t, TypeVariant, Wildcard } from ".";
import { BaseType } from "./base";

export class ListType<T extends BaseType = t.Any, TOut = any> extends BaseType<
  TOut[]
> {
  constructor(public item: T) {
    super();
  }

  default(): any {
    return [];
  }

  variant(): TypeVariant {
    return "list";
  }

  toString(): string {
    return `List<${this.item.toString()}>`;
  }

  asZodType(): z.ZodType<TOut[]> {
    return z.array(this.item.asZodType());
  }

  getWildcards(): Wildcard[] {
    return this.item.getWildcards();
  }

  eq(other: t.Any): boolean {
    return other instanceof t.List && this.item.eq(other.item);
  }
}
