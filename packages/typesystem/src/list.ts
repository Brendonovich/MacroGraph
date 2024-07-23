// import { z } from "zod";
import { type TypeVariant, type Wildcard, t } from ".";
import { BaseType } from "./base";

export class ListType<T extends BaseType> extends BaseType<t.infer<T>[]> {
  constructor(public item: T) {
    super();
  }

  default(): t.infer<T>[] {
    return [];
  }

  variant(): TypeVariant {
    return "list";
  }

  toString(): string {
    return `List<${this.item.toString()}>`;
  }

  // asZodType(): z.ZodType<t.infer<T>[]> {
  //   return z.array(this.item.asZodType());
  // }

  getWildcards(): Wildcard[] {
    return this.item.getWildcards();
  }

  eq(other: t.Any): boolean {
    return other instanceof t.List && this.item.eq(other.item);
  }

  serialize() {
    return { variant: "list", item: this.item.serialize() };
  }

  hasUnconnectedWildcard(): boolean {
    return this.item.hasUnconnectedWildcard();
  }
}
