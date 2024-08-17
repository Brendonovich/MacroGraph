import { createMutable } from "solid-js/store";
import type { BaseType, t } from ".";

export class Field<Type extends BaseType = t.Any> {
	constructor(
		public id: string,
		public type: Type,
		public name?: string,
	) {
		return createMutable(this);
	}

	default(): any {
		return this.type.default();
	}
}
