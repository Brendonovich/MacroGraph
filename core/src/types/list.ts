import { z } from "zod";
import { AnyType, TypeVariant, Wildcard } from ".";
import { BaseType } from "./base";

export class ListType<
  T extends BaseType = AnyType,
  TOut = any
> extends BaseType<TOut[]> {
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
}
