import type { SerializedFieldType } from "./scriptIoTypes";
import { isScriptJsonSerializedType } from "./scriptIoTypes";
import type { IoDefinition, IoFieldDef } from "./scriptIoTypes";
import { isValidJsIdentifier } from "./scriptIoTypes";

export type ScriptCompletionItem = {
	label: string;
	insert: string;
	detail?: string;
	type?: string;
};

const fn = (label: string, detail: string): ScriptCompletionItem => ({
	label,
	insert: `${label}(`,
	detail,
	type: "method",
});

const PROP = (label: string, detail: string): ScriptCompletionItem => ({
	label,
	insert: label,
	detail,
	type: "property",
});

const STRING_MEMBERS: ScriptCompletionItem[] = [
	fn("includes", "(searchString) => boolean"),
	fn("indexOf", "(searchString) => number"),
	fn("lastIndexOf", "(searchString) => number"),
	fn("slice", "(start?, end?) => string"),
	fn("substring", "(start, end?) => string"),
	fn("split", "(separator) => string[]"),
	fn("replace", "(search, replacement) => string"),
	fn("replaceAll", "(search, replacement) => string"),
	fn("match", "(regexp) => RegExpMatchArray | null"),
	fn("search", "(regexp) => number"),
	fn("startsWith", "(search) => boolean"),
	fn("endsWith", "(search) => boolean"),
	fn("trim", "() => string"),
	fn("toLowerCase", "() => string"),
	fn("toUpperCase", "() => string"),
	PROP("length", "number"),
];

const NUMBER_MEMBERS: ScriptCompletionItem[] = [
	fn("toFixed", "(digits?) => string"),
	fn("toString", "(radix?) => string"),
];

const ARRAY_MEMBERS: ScriptCompletionItem[] = [
	// Search
	fn("indexOf", "(searchElement) => number"),
	fn("lastIndexOf", "(searchElement) => number"),
	fn("includes", "(searchElement) => boolean"),
	fn("find", "(predicate) => T | undefined"),
	fn("findIndex", "(predicate) => number"),
	fn("findLast", "(predicate) => T | undefined"),
	fn("findLastIndex", "(predicate) => number"),
	// Transform
	fn("map", "(callback) => U[]"),
	fn("filter", "(predicate) => T[]"),
	fn("flatMap", "(callback) => U[]"),
	fn("flat", "(depth?) => T[]"),
	fn("reduce", "(callback, initial?) => U"),
	fn("reduceRight", "(callback, initial?) => U"),
	fn("forEach", "(callback) => void"),
	fn("some", "(predicate) => boolean"),
	fn("every", "(predicate) => boolean"),
	// Mutate / copy
	fn("push", "(...items) => number"),
	fn("pop", "() => T | undefined"),
	fn("shift", "() => T | undefined"),
	fn("unshift", "(...items) => number"),
	fn("slice", "(start?, end?) => T[]"),
	fn("splice", "(start, deleteCount?, ...items) => T[]"),
	fn("concat", "(...items) => T[]"),
	fn("join", "(separator?) => string"),
	fn("reverse", "() => this"),
	fn("sort", "(compareFn?) => this"),
	fn("fill", "(value) => this"),
	fn("at", "(index) => T | undefined"),
	fn("with", "(index, value) => T[]"),
	PROP("length", "number"),
];

const RECORD_MEMBERS: ScriptCompletionItem[] = [
	fn("hasOwnProperty", "(key) => boolean"),
	...["keys", "values", "entries"].map((m) =>
		fn(m, `() => iterator`),
	),
];

const JSON_MEMBERS: ScriptCompletionItem[] = [
	...ARRAY_MEMBERS,
	...STRING_MEMBERS,
	...NUMBER_MEMBERS,
	PROP("variant", "string"),
	PROP("data", "object"),
];

function completionsForSerializedType(type: SerializedFieldType): ScriptCompletionItem[] {
	if (type === "string") return STRING_MEMBERS;
	if (type === "int" || type === "float") return NUMBER_MEMBERS;
	if (type === "bool") return [];

	if (typeof type !== "object" || type === null || !("variant" in type)) {
		return [];
	}

	switch (type.variant) {
		case "list":
			return ARRAY_MEMBERS;
		case "map":
			return RECORD_MEMBERS;
		case "option":
			return completionsForSerializedType(type.inner);
		case "enum":
			return isScriptJsonSerializedType(type) ? JSON_MEMBERS : [];
		default:
			return [];
	}
}

export function filterCompletions(
	items: ScriptCompletionItem[],
	prefix: string,
): ScriptCompletionItem[] {
	const lower = prefix.toLowerCase();
	if (!lower) return items;
	return items.filter((item) => item.label.toLowerCase().startsWith(lower));
}

export type IoFieldsCompletionContext = {
	kind: "io-fields";
	ioKind: "inputs" | "outputs";
	prefix: string;
	replaceFrom: number;
	replaceTo: number;
};

export type TypedMemberCompletionContext = {
	kind: "typed-member";
	field: IoFieldDef;
	prefix: string;
	replaceFrom: number;
	replaceTo: number;
};

export type GlobalNamespaceCompletionContext = {
	kind: "global";
	namespace: string;
	prefix: string;
	replaceFrom: number;
	replaceTo: number;
};

export type LocalVarCompletionContext = {
	kind: "local-var";
	type: SerializedFieldType;
	prefix: string;
	replaceFrom: number;
	replaceTo: number;
};

export type ScriptCompletionContext =
	| IoFieldsCompletionContext
	| TypedMemberCompletionContext
	| GlobalNamespaceCompletionContext
	| LocalVarCompletionContext;

const ARRAY_CALLBACK_METHODS = new Set([
	"filter",
	"map",
	"forEach",
	"find",
	"findIndex",
	"findLast",
	"findLastIndex",
	"some",
	"every",
	"flatMap",
]);

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listElementSerializedType(
	type: SerializedFieldType,
): SerializedFieldType | null {
	if (typeof type !== "object" || type === null || !("variant" in type)) {
		return null;
	}
	if (type.variant === "list" && "item" in type) {
		return type.item;
	}
	if (type.variant === "option" && "inner" in type) {
		return listElementSerializedType(type.inner);
	}
	return null;
}

function tsAnnotationToSerialized(ts: string): SerializedFieldType | null {
	const t = ts.trim().replace(/\s+/g, " ");
	if (t === "string") return "string";
	if (t === "number") return "float";
	if (t === "boolean" || t === "bool") return "bool";
	if (t === "MgJson") {
		return {
			variant: "enum",
			enum: { variant: "package", package: "JSON", name: "JSON" },
		} as SerializedFieldType;
	}
	const listMatch = /^(.+)\[\]$/.exec(t);
	if (listMatch) {
		const inner = tsAnnotationToSerialized(listMatch[1]!);
		return inner ? ({ variant: "list", item: inner } as SerializedFieldType) : null;
	}
	const recordMatch = /^Record<string,\s*(.+)>$/.exec(t);
	if (recordMatch) {
		const inner = tsAnnotationToSerialized(recordMatch[1]!);
		return inner ? ({ variant: "map", value: inner } as SerializedFieldType) : null;
	}
	return null;
}

function arrowParamSlice(before: string): { slice: string; parenStart: number } | null {
	const arrowIdx = before.lastIndexOf("=>");
	if (arrowIdx === -1) return null;

	let depth = 0;
	let parenStart = -1;
	for (let i = arrowIdx - 1; i >= 0; i--) {
		const ch = before[i];
		if (ch === ")") depth++;
		else if (ch === "(") {
			if (depth === 0) {
				parenStart = i;
				break;
			}
			depth--;
		}
	}
	if (parenStart === -1) return null;

	return { slice: before.slice(parenStart + 1, arrowIdx), parenStart };
}

function paramTypeFromSlice(slice: string, varName: string): string | null {
	const re = new RegExp(`(?:^|[,(])\\s*${escapeRegex(varName)}\\s*:\\s*([^,)]+)`);
	const m = slice.match(re);
	return m ? m[1]!.trim() : null;
}

function isFirstParam(slice: string, varName: string): boolean {
	const m = slice.match(/^\s*(?:async\s+)?\(?\s*([a-zA-Z_$][\w$]*)/);
	return m?.[1] === varName;
}

function inferFromArrayCallback(
	before: string,
	parenStart: number,
	varName: string,
	def: IoDefinition,
): SerializedFieldType | null {
	const prefix = before.slice(0, parenStart).trimEnd();
	const m = prefix.match(
		/(inputs|outputs)\.(?:([a-zA-Z_$][\w$]*)|\["([^"]+)"\])\s*\.\s*(\w+)\s*$/,
	);
	if (!m || !ARRAY_CALLBACK_METHODS.has(m[4]!)) return null;

	const ioKind = m[1] as "inputs" | "outputs";
	const fields = ioKind === "inputs" ? def.inputs : def.outputs;
	const field = findField(fields, m[2], m[3]);
	if (!field) return null;

	const slice = arrowParamSlice(before)?.slice;
	if (!slice || !isFirstParam(slice, varName)) return null;

	return listElementSerializedType(field.type);
}

function resolveLocalVariableType(
	before: string,
	varName: string,
	def: IoDefinition,
): SerializedFieldType | null {
	const arrow = arrowParamSlice(before);
	if (!arrow) return null;

	const explicit = paramTypeFromSlice(arrow.slice, varName);
	if (explicit) {
		return tsAnnotationToSerialized(explicit);
	}

	return inferFromArrayCallback(before, arrow.parenStart, varName, def);
}

const MATH_MEMBERS: ScriptCompletionItem[] = [
	PROP("PI", "number"),
	PROP("E", "number"),
	PROP("LN2", "number"),
	PROP("LN10", "number"),
	fn("abs", "(x) => number"),
	fn("acos", "(x) => number"),
	fn("asin", "(x) => number"),
	fn("atan", "(x) => number"),
	fn("atan2", "(y, x) => number"),
	fn("ceil", "(x) => number"),
	fn("cos", "(x) => number"),
	fn("exp", "(x) => number"),
	fn("floor", "(x) => number"),
	fn("log", "(x) => number"),
	fn("log10", "(x) => number"),
	fn("log2", "(x) => number"),
	fn("max", "(...values) => number"),
	fn("min", "(...values) => number"),
	fn("pow", "(base, exp) => number"),
	fn("random", "() => number"),
	fn("round", "(x) => number"),
	fn("sign", "(x) => number"),
	fn("sin", "(x) => number"),
	fn("sqrt", "(x) => number"),
	fn("tan", "(x) => number"),
	fn("trunc", "(x) => number"),
	fn("hypot", "(...values) => number"),
	fn("imul", "(a, b) => number"),
];

const STRING_STATIC: ScriptCompletionItem[] = [
	fn("fromCharCode", "(...codes) => string"),
	fn("fromCodePoint", "(...codePoints) => string"),
	PROP("raw", "template strings"),
];

const NUMBER_STATIC: ScriptCompletionItem[] = [
	PROP("MAX_VALUE", "number"),
	PROP("MIN_VALUE", "number"),
	PROP("EPSILON", "number"),
	PROP("NaN", "number"),
	PROP("NEGATIVE_INFINITY", "number"),
	PROP("POSITIVE_INFINITY", "number"),
	fn("isFinite", "(value) => boolean"),
	fn("isInteger", "(value) => boolean"),
	fn("isNaN", "(value) => boolean"),
	fn("isSafeInteger", "(value) => boolean"),
	fn("parseFloat", "(string) => number"),
	fn("parseInt", "(string, radix?) => number"),
];

const OBJECT_STATIC: ScriptCompletionItem[] = [
	fn("assign", "(target, ...sources) => object"),
	fn("create", "(proto) => object"),
	fn("defineProperty", "(obj, key, descriptor) => object"),
	fn("entries", "(obj) => [string, unknown][]"),
	fn("freeze", "(obj) => object"),
	fn("fromEntries", "(entries) => object"),
	fn("keys", "(obj) => string[]"),
	fn("values", "(obj) => unknown[]"),
	fn("hasOwn", "(obj, key) => boolean"),
];

const JSON_STATIC: ScriptCompletionItem[] = [
	fn("parse", "(text) => unknown"),
	fn("stringify", "(value, replacer?, space?) => string"),
];

const ARRAY_STATIC: ScriptCompletionItem[] = [
	fn("isArray", "(value) => boolean"),
	fn("from", "(arrayLike) => unknown[]"),
	fn("of", "(...items) => unknown[]"),
];

const DATE_STATIC: ScriptCompletionItem[] = [
	fn("now", "() => number"),
	fn("parse", "(dateString) => number"),
	fn("UTC", "(year, month, ...) => number"),
];

const CONSOLE_STATIC: ScriptCompletionItem[] = [
	fn("log", "(...args) => void"),
	fn("warn", "(...args) => void"),
	fn("error", "(...args) => void"),
	fn("info", "(...args) => void"),
	fn("debug", "(...args) => void"),
];

const GLOBAL_NAMESPACES: Record<string, ScriptCompletionItem[]> = {
	Math: MATH_MEMBERS,
	String: STRING_STATIC,
	Number: NUMBER_STATIC,
	Object: OBJECT_STATIC,
	JSON: JSON_STATIC,
	Array: ARRAY_STATIC,
	Date: DATE_STATIC,
	console: CONSOLE_STATIC,
};

function findField(
	fields: IoFieldDef[],
	name: string | undefined,
	id: string | undefined,
): IoFieldDef | undefined {
	if (id !== undefined) return fields.find((f) => f.id === id);
	if (name) {
		return fields.find((f) => f.name === name || f.id === name);
	}
	return undefined;
}

/** Completion context for `inputs.` / `outputs.` / `inputs.A.` etc. */
export function getScriptCompletionContext(
	source: string,
	cursor: number,
	def: IoDefinition,
): ScriptCompletionContext | null {
	const before = source.slice(0, cursor);

	const globalMatch = before.match(
		/(?:^|[^\w$])(Math|String|Number|Object|JSON|Array|Date|console)\.([a-zA-Z_$]*)$/,
	);
	if (globalMatch) {
		const namespace = globalMatch[1]!;
		const prefix = globalMatch[2] ?? "";
		if (GLOBAL_NAMESPACES[namespace]) {
			return {
				kind: "global",
				namespace,
				prefix,
				replaceFrom: cursor - prefix.length,
				replaceTo: cursor,
			};
		}
	}

	const typedMatch = before.match(
		/(?:^|[^\w$])(inputs|outputs)\.(?:([a-zA-Z_$][\w$]*)|\["([^"]+)"\])\.([a-zA-Z_$]*)$/,
	);
	if (typedMatch) {
		const ioKind = typedMatch[1] as "inputs" | "outputs";
		const fieldName = typedMatch[2];
		const fieldId = typedMatch[3];
		const prefix = typedMatch[4] ?? "";
		const fields = ioKind === "inputs" ? def.inputs : def.outputs;
		const field = findField(fields, fieldName, fieldId);
		if (!field) return null;

		return {
			kind: "typed-member",
			field,
			prefix,
			replaceFrom: cursor - prefix.length,
			replaceTo: cursor,
		};
	}

	const localMatch = before.match(
		/(?:^|[^\w$])([a-zA-Z_$][\w$]*)\.([a-zA-Z_$]*)$/,
	);
	if (localMatch) {
		const varName = localMatch[1]!;
		if (varName !== "inputs" && varName !== "outputs") {
			const prefix = localMatch[2] ?? "";
			const type = resolveLocalVariableType(before, varName, def);
			if (type) {
				return {
					kind: "local-var",
					type,
					prefix,
					replaceFrom: cursor - prefix.length,
					replaceTo: cursor,
				};
			}
		}
	}

	const ioMatch = before.match(/(?:^|[^\w$])(inputs|outputs)\.([a-zA-Z0-9_$]*)$/);
	if (!ioMatch) return null;

	const ioKind = ioMatch[1] as "inputs" | "outputs";
	const prefix = ioMatch[2] ?? "";

	return {
		kind: "io-fields",
		ioKind,
		prefix,
		replaceFrom: cursor - prefix.length,
		replaceTo: cursor,
	};
}

export function completionsForContext(
	ctx: ScriptCompletionContext,
	def: IoDefinition,
): ScriptCompletionItem[] {
	if (ctx.kind === "io-fields") {
		const fields = ctx.ioKind === "inputs" ? def.inputs : def.outputs;
		return filterCompletions(ioFieldCompletions(fields), ctx.prefix);
	}

	if (ctx.kind === "global") {
		const items = GLOBAL_NAMESPACES[ctx.namespace] ?? [];
		return filterCompletions(items, ctx.prefix);
	}

	if (ctx.kind === "local-var") {
		return filterCompletions(
			completionsForSerializedType(ctx.type),
			ctx.prefix,
		);
	}

	return filterCompletions(
		completionsForSerializedType(ctx.field.type),
		ctx.prefix,
	);
}

/** Pin names for `inputs.` / `outputs.` */
export function ioFieldCompletions(fields: IoFieldDef[]): ScriptCompletionItem[] {
	const items: ScriptCompletionItem[] = [];
	const seen = new Set<string>();

	const add = (item: ScriptCompletionItem) => {
		if (seen.has(item.insert)) return;
		seen.add(item.insert);
		items.push(item);
	};

	for (const field of fields) {
		const bracket = `["${field.id}"]`;

		if (isValidJsIdentifier(field.name)) {
			add({
				label: field.name,
				insert: field.name,
				detail: `id: ${field.id}`,
				type: "property",
			});
		}

		add({
			label: bracket,
			insert: bracket,
			detail: field.name,
			type: "property",
		});
	}

	return items;
}
