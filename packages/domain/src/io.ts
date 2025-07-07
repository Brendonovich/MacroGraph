import type { Brand } from "effect";

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
