import { Schema as S } from "effect";

export const SchemaRef = S.Struct({
  pkgId: S.String,
  schemaId: S.String,
});
export type SchemaRef = S.Schema.Type<typeof SchemaRef>;
