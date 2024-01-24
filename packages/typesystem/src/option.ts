import { z } from "zod";
import { None, Option } from "@macrograph/option";

import { t, TypeVariant, Wildcard } from ".";
import { BaseType } from "./base";

export class OptionType<T extends BaseType<any>> extends BaseType<
  Option<t.infer<T>>
> {
  constructor(public inner: T) {
    super();
  }

  default(): Option<t.infer<T>> {
    return None;
  }

  variant(): TypeVariant {
    return this.inner.variant();
  }

  getInner(): T {
    if (this.inner instanceof OptionType) {
      return this.inner.getInner();
    } else return this.inner;
  }

  toString(): string {
    return `Option<${this.inner.toString()}>`;
  }

  asZodType(): z.ZodType<Option<t.infer<T>>> {
    // TODO: needs to validate inner

    return z.instanceof(Option) as any;
  }

  getWildcards(): Wildcard[] {
    return this.getWildcards();
  }

  eq(other: t.Any): boolean {
    return other instanceof t.Option && this.inner.eq(other.inner);
  }

  serialize() {
    return { variant: "option", inner: this.inner.serialize() };
  }

  hasWildcard(): boolean {
    return this.inner.hasWildcard();
  }
}
