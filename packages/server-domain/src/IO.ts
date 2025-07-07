import { Schema } from "effect";

export const Shape = Schema.Union(
  Schema.Struct({ variant: Schema.Literal("exec") }),
  Schema.Struct({
    variant: Schema.Literal("data"),
    data: Schema.Literal("string", "bool", "float", "int"),
  }),
);
export type Shape = Schema.Schema.Type<typeof Shape>;

export const Variant = Schema.Literal("exec", "data");
export type Variant = Schema.Schema.Type<typeof Variant>;
