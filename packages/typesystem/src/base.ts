import type { TypeVariant, t, Wildcard } from ".";

export abstract class BaseType<TOut = any> {
	_type(): TOut {
		throw new Error("don't actually call this!");
	}

	abstract default(): TOut;
	abstract variant(): TypeVariant;
	abstract toString(): string;
	// abstract asZodType(): ZodType<TOut>;
	abstract getWildcards(): Wildcard[];
	abstract eq(other: t.Any): boolean;
	abstract serialize(): any;
	abstract hasUnconnectedWildcard(): boolean;
}

export type infer<T extends BaseType<any>> = ReturnType<T["_type"]>;
