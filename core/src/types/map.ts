import { z, ZodType } from "zod";
import { t, TypeVariant } from ".";
import { BaseType } from "./base";

export class MapType<
  TValue extends t.Any = t.Any,
  TValueOut = any
> extends BaseType<Map<string, TValueOut>> {
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
}
