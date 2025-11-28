import { Data, Schema } from "effect";

import type { IO } from "./updated";
import type { T } from "./updated/IO";

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

export class ExecInput extends Data.TaggedClass("ExecInput")<{
	id: IO.Id;
}> {}

export class ExecOutput extends Data.TaggedClass("ExecOutput")<{
	id: IO.Id;
}> {}

export class DataInput<T extends T.Any> extends Data.TaggedClass("DataInput")<{
	id: IO.Id;
	type: T;
}> {}

export class DataOutput<T extends T.Any> extends Data.TaggedClass(
	"DataOutput",
)<{
	id: IO.Id;
	type: T;
}> {}
