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

export const IOId = Schema.String.pipe(Schema.brand("IOId"));
export type IOId = Schema.Schema.Type<typeof IOId>;

export class ExecInputRef {
	constructor(
		public id: string,
		public options?: { name?: string },
	) {}
}

export class ExecOutputRef {
	constructor(
		public id: IOId,
		public options?: { name?: string },
	) {}
}

export class DataInputRef<T> {
	constructor(
		public id: IOId,
		public type: T,
		public options?: { name?: string },
	) {}
}

export class DataOutputRef<T> {
	constructor(
		public id: string,
		public type: T,
		public options?: { name?: string },
	) {}
}
