/**
 * Minimal TS lib for in-browser script validation (no default lib / no Node types).
 * Kept in one place so array/string builtins stay complete for the code editor.
 */
export const SCRIPT_MINIMAL_LIB = `
interface StringConstructor {
	(value?: unknown): string;
	fromCharCode(...codes: number[]): string;
	fromCodePoint(...codePoints: number[]): string;
}
declare const String: StringConstructor;

interface NumberConstructor {
	(value?: unknown): number;
	readonly MAX_VALUE: number;
	readonly MIN_VALUE: number;
	readonly EPSILON: number;
	readonly NaN: number;
	readonly NEGATIVE_INFINITY: number;
	readonly POSITIVE_INFINITY: number;
	isFinite(value: unknown): boolean;
	isInteger(value: unknown): boolean;
	isNaN(value: unknown): boolean;
	isSafeInteger(value: unknown): boolean;
	parseFloat(string: string): number;
	parseInt(string: string, radix?: number): number;
}
declare const Number: NumberConstructor;

declare function Boolean(value?: unknown): boolean;
declare function parseInt(string: string, radix?: number): number;
declare function parseFloat(string: string): number;
declare function isNaN(number: number): boolean;
declare function isFinite(number: number): boolean;
declare function isArray(value: unknown): value is unknown[];

interface PromiseLike<T> {
	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): PromiseLike<TResult1 | TResult2>;
}
interface Promise<T> extends PromiseLike<T> {}
interface PromiseConstructor {
	new <T>(
		executor: (resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
	): Promise<T>;
	resolve<T>(value: T): Promise<T>;
	reject(reason?: unknown): Promise<never>;
}
declare const Promise: PromiseConstructor;

declare function setTimeout(handler: () => void, timeout?: number): number;
declare function clearTimeout(handle: number): void;

declare const console: {
	log(...args: unknown[]): void;
	warn(...args: unknown[]): void;
	error(...args: unknown[]): void;
	info(...args: unknown[]): void;
	debug(...args: unknown[]): void;
};

declare namespace Math {
	const PI: number;
	const E: number;
	const LN2: number;
	const LN10: number;
	function abs(x: number): number;
	function acos(x: number): number;
	function asin(x: number): number;
	function atan(x: number): number;
	function atan2(y: number, x: number): number;
	function ceil(x: number): number;
	function cos(x: number): number;
	function exp(x: number): number;
	function floor(x: number): number;
	function log(x: number): number;
	function log10(x: number): number;
	function log2(x: number): number;
	function max(...values: number[]): number;
	function min(...values: number[]): number;
	function pow(base: number, exp: number): number;
	function random(): number;
	function round(x: number): number;
	function sign(x: number): number;
	function sin(x: number): number;
	function sqrt(x: number): number;
	function tan(x: number): number;
	function trunc(x: number): number;
	function hypot(...values: number[]): number;
	function imul(a: number, b: number): number;
}

declare namespace JSON {
	function parse(text: string): unknown;
	function stringify(value: unknown, replacer?: unknown, space?: number | string): string;
}

declare namespace Object {
	function assign<T extends object>(target: T, ...sources: object[]): T;
	function create(proto: object | null): object;
	function entries(obj: object): [string, unknown][];
	function fromEntries(entries: Iterable<readonly [PropertyKey, unknown]>): object;
	function keys(obj: object): string[];
	function values(obj: object): unknown[];
	function hasOwn(obj: object, key: PropertyKey): boolean;
}

declare namespace Array {
	function isArray(value: unknown): value is unknown[];
	function from<T>(arrayLike: ArrayLike<T>): T[];
	function of<T>(...items: T[]): T[];
}

declare namespace Date {
	function now(): number;
	function parse(dateString: string): number;
	function UTC(
		year: number,
		monthIndex: number,
		date?: number,
		hours?: number,
		minutes?: number,
		seconds?: number,
		ms?: number,
	): number;
}

interface IteratorResult<T> {
	done: boolean;
	value: T;
}
interface Iterator<T> {
	next(): IteratorResult<T>;
}
interface Iterable<T> {
	[Symbol.iterator](): Iterator<T>;
}

interface ConcatArray<T> {
	readonly length: number;
	readonly [n: number]: T;
	join(separator?: string): string;
	slice(start?: number, end?: number): T[];
}

/** Mutable array — matches standard JS/TS Array surface used in scripts. */
interface Array<T> extends Iterable<T> {
	readonly length: number;
	readonly [n: number]: T;

	// Core
	toString(): string;
	toLocaleString(): string;
	at(index: number): T | undefined;
	with(index: number, value: T): T[];

	// Mutate
	push(...items: T[]): number;
	pop(): T | undefined;
	shift(): T | undefined;
	unshift(...items: T[]): number;
	splice(start: number, deleteCount?: number): T[];
	reverse(): T[];
	sort(compareFn?: (a: T, b: T) => number): this;
	fill(value: T, start?: number, end?: number): this;
	copyWithin(target: number, start: number, end?: number): this;

	// Combine / split
	concat(...items: (T | ConcatArray<T>)[]): T[];
	slice(start?: number, end?: number): T[];
	join(separator?: string): string;
	flat<A, D extends number = 1>(this: A, depth?: D): FlatArray<A, D>[];

	// Search
	indexOf(searchElement: T, fromIndex?: number): number;
	lastIndexOf(searchElement: T, fromIndex?: number): number;
	includes(searchElement: T, fromIndex?: number): boolean;
	find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
	findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number;
	findLast(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
	findLastIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number;

	// Iterate / transform
	forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void;
	map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];
	filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[];
	filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
	flatMap<U, This = undefined>(
		callback: (this: This, value: T, index: number, array: T[]) => U | ReadonlyArray<U>,
		thisArg?: This,
	): U[];
	reduce(
		callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T,
	): T;
	reduce(
		callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T,
		initialValue: T,
	): T;
	reduce<U>(
		callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U,
		initialValue: U,
	): U;
	reduceRight(
		callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T,
	): T;
	reduceRight(
		callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T,
		initialValue: T,
	): T;
	reduceRight<U>(
		callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U,
		initialValue: U,
	): U;

	// Test
	some(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
	every(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;

	// Immutable copies (ES2023)
	toReversed(): T[];
	toSorted(compareFn?: (a: T, b: T) => number): T[];
	toSpliced(start: number, deleteCount: number, ...items: T[]): T[];
	toSpliced(start: number, deleteCount?: number): T[];

	// Iterators
	entries(): IterableIterator<[number, T]>;
	keys(): IterableIterator<number>;
	values(): IterableIterator<T>;
}

/** Read-only array view */
interface ReadonlyArray<T> extends Iterable<T> {
	readonly length: number;
	readonly [n: number]: T;

	toString(): string;
	toLocaleString(): string;
	at(index: number): T | undefined;

	join(separator?: string): string;
	slice(start?: number, end?: number): T[];
	concat(...items: (T | ConcatArray<T>)[]): T[];
	includes(searchElement: T, fromIndex?: number): boolean;
	indexOf(searchElement: T, fromIndex?: number): number;
	lastIndexOf(searchElement: T, fromIndex?: number): number;

	find(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): T | undefined;
	findIndex(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): number;
	findLast(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): T | undefined;
	findLastIndex(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): number;

	forEach(callbackfn: (value: T, index: number, array: readonly T[]) => void, thisArg?: any): void;
	map<U>(callbackfn: (value: T, index: number, array: readonly T[]) => U, thisArg?: any): U[];
	filter(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): T[];
	flatMap<U, This = undefined>(
		callback: (this: This, value: T, index: number, array: readonly T[]) => U | ReadonlyArray<U>,
		thisArg?: This,
	): U[];

	reduce(
		callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T,
	): T;
	reduce<U>(
		callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U,
		initialValue: U,
	): U;
	reduceRight(
		callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T,
	): T;
	reduceRight<U>(
		callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U,
		initialValue: U,
	): U;

	some(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
	every(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;

	entries(): IterableIterator<[number, T]>;
	keys(): IterableIterator<number>;
	values(): IterableIterator<T>;
}

interface IterableIterator<T> extends Iterator<T> {
	[Symbol.iterator](): IterableIterator<T>;
}

type FlatArray<Arr, Depth extends number> = Arr extends ReadonlyArray<infer InnerArr>
	? Depth extends 0
		? Arr
		: FlatArray<InnerArr, [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20][Depth]>
	: Arr;

declare const Symbol: {
	readonly iterator: unique symbol;
};

// String helpers often used alongside arrays in scripts
interface String {
	readonly length: number;
	charAt(pos: number): string;
	charCodeAt(index: number): number;
	concat(...strings: string[]): string;
	slice(start?: number, end?: number): string;
	substring(start: number, end?: number): string;
	toLowerCase(): string;
	toUpperCase(): string;
	trim(): string;
	trimStart(): string;
	trimEnd(): string;
	split(separator: string | RegExp, limit?: number): string[];
	includes(searchString: string, position?: number): boolean;
	indexOf(searchString: string, position?: number): number;
	lastIndexOf(searchString: string, position?: number): number;
	startsWith(searchString: string, position?: number): boolean;
	endsWith(searchString: string, endPosition?: number): boolean;
	replace(searchValue: string | RegExp, replaceValue: string): string;
	replaceAll(searchValue: string | RegExp, replaceValue: string): string;
	match(regexp: string | RegExp): RegExpMatchArray | null;
	matchAll(regexp: RegExp): IterableIterator<RegExpMatchArray>;
	search(regexp: string | RegExp): number;
}

interface RegExpMatchArray extends ReadonlyArray<string> {
	readonly index?: number;
	readonly input?: string;
}

interface Number {
	toString(radix?: number): string;
	toFixed(fractionDigits?: number): string;
}
`;
