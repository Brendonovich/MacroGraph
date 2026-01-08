import { createMutable } from "solid-js/store";

import type { BaseType } from ".";

export class Field<Type extends BaseType = BaseType> {
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
