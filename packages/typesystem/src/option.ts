import { None, Option } from "@macrograph/option";
import * as v from "valibot";

import { type TypeVariant, type Wildcard, t } from ".";
import { BaseType } from "./base";

export class OptionType<T extends BaseType<any>> extends BaseType<
	Option<t.infer<T>>
> {
	constructor(public inner: T) {
		super();
	}

	default(): Option<t.infer<T>> {
		return None;
	}

	variant(): TypeVariant {
		return this.inner.variant();
	}

	getInner(): T {
		if (this.inner instanceof OptionType) return this.inner.getInner();

		return this.inner;
	}

	toString(): string {
		return `Option<${this.inner.toString()}>`;
	}

	asZodType() {
		// TODO: needs to validate inner

		return v.instance(Option<t.infer<T>>);
	}

	getWildcards(): Wildcard[] {
		return this.getWildcards();
	}

	eq(other: t.Any): boolean {
		return other instanceof t.Option && this.inner.eq(other.inner);
	}

	serialize() {
		return { variant: "option", inner: this.inner.serialize() };
	}

	hasUnconnectedWildcard(): boolean {
		return this.inner.hasUnconnectedWildcard();
	}
}
