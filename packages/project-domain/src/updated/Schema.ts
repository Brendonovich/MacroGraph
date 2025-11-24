import * as S from "effect/Schema";

import * as Package from "./Package.ts";

export const Id = S.String.pipe(S.brand("Schema.Id"));
export type Id = S.Schema.Type<typeof Id>;

export const Ref = S.Struct({ pkg: Package.Id, id: Id });
export type Ref = S.Schema.Type<typeof Ref>;

export const Type = S.Literal("base", "exec", "pure", "event");
export type Type = S.Schema.Type<typeof Type>;

export class NotFound extends S.TaggedError<NotFound>()(
	"Schema/NotFound",
	Ref.fields,
) {}

export class InvalidPropertyValue extends S.TaggedError<InvalidPropertyValue>()(
	"InvalidPropertyValue",
	{ property: S.String },
) {}
