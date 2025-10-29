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

const SchemaMeta = Schema.Struct({
	id: Schema.String,
	name: Schema.optional(Schema.String),
	type: Schema.Literal("exec", "pure", "event"),
}).pipe(Schema.mutable);
export type SchemaMeta = Schema.Schema.Type<typeof SchemaMeta>;

export const PackageMeta = Schema.Struct({
	schemas: Schema.Record({ key: Schema.String, value: SchemaMeta }),
});
export type PackageMeta = Schema.Schema.Type<typeof PackageMeta>;
