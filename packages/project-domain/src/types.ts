import { Schema } from "effect";

export const Position = Schema.Struct({
	x: Schema.Number,
	y: Schema.Number,
}).pipe(Schema.mutable);
export type Position = Schema.Schema.Type<typeof Position>;

export const SchemaRef = Schema.Struct({
	pkgId: Schema.String,
	schemaId: Schema.String,
}).pipe(Schema.mutable);
export type SchemaRef = Schema.Schema.Type<typeof SchemaRef>;

export const SchemaType = Schema.Literal("base", "exec", "pure", "event");
export type SchemaType = Schema.Schema.Type<typeof SchemaType>;

const SchemaMeta = Schema.Struct({
	id: Schema.String,
	name: Schema.optional(Schema.String),
	type: SchemaType,
}).pipe(Schema.mutable);
export type SchemaMeta = Schema.Schema.Type<typeof SchemaMeta>;

export const PackageMeta = Schema.Struct({
	name: Schema.String,
	schemas: Schema.Record({ key: Schema.String, value: SchemaMeta }),
});
export type PackageMeta = Schema.Schema.Type<typeof PackageMeta>;
