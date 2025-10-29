import type { Brand } from "effect";
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

export type IOId = string & Brand.Brand<"IOId">;

export class ExecInputRef {
	constructor(public id: string) {}
}

export class ExecOutputRef {
	constructor(public id: IOId) {}
}

export class DataInputRef<T> {
	constructor(
		public id: IOId,
		public type: T,
	) {}
}

export class DataOutputRef<T> {
	constructor(
		public id: string,
		public type: T,
	) {}
}
