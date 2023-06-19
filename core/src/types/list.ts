import { z } from "zod";
import { t, TypeVariant, Wildcard } from ".";
import { BaseType } from "./base";

export class ListType<T extends BaseType = t.Any, TOut = any> extends BaseType<
  TOut[]
> {
  constructor(public inner: T) {
    super();
  }

  default(): any {
    return [];
  }

  variant(): TypeVariant {
    return "list";
  }

  toString(): string {
    return `List<${this.inner.toString()}>`;
  }

  asZodType(): z.ZodType<TOut[]> {
    return z.array(this.inner.asZodType());
  }

  getWildcards(): Wildcard[] {
    return this.inner.getWildcards();
  }

  eq(other: t.Any): boolean {
    return other instanceof t.List && this.inner.eq(other.inner);
  }
}
