import {
	safeParse,
	type BaseIssue,
	type BaseSchema,
	type InferOutput,
} from "valibot";

function formatPath(path: unknown): string {
	if (!Array.isArray(path) || path.length === 0) return "(root)";
	return path
		.map((seg) => {
			if (seg && typeof seg === "object" && "key" in seg)
				return String((seg as { key: unknown }).key);
			return "?";
		})
		.join(".");
}

function formatIssue(issue: BaseIssue<unknown>): string {
	const path = formatPath(issue.path);
	const base = issue.message ?? issue.kind ?? "validation issue";
	const extras: string[] = [];
	if ("expected" in issue && issue.expected !== undefined)
		extras.push(`expected=${String(issue.expected)}`);
	if ("received" in issue && issue.received !== undefined)
		extras.push(`received=${String(issue.received)}`);
	if ("input" in issue && issue.input !== undefined) {
		const ip = preview(issue.input, 160);
		if (ip) extras.push(`input=${ip}`);
	}
	const suffix = extras.length ? ` (${extras.join(", ")})` : "";
	return `${path}: ${base}${suffix}`;
}

function preview(data: unknown, max = 600): string {
	try {
		if (data === undefined) return "undefined";
		if (typeof data === "string")
			return data.length > max ? `${data.slice(0, max)}…` : data;
		const s = JSON.stringify(data);
		return s.length > max ? `${s.slice(0, max)}…` : s;
	} catch {
		const s = String(data);
		return s.length > max ? `${s.slice(0, max)}…` : s;
	}
}

/**
 * Like `v.parse`, but on failure throws an `Error` whose message lists every
 * Valibot issue, a short input preview, and a stack that points at the caller
 * (not this helper).
 */
export function parseWithContext<TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(
	label: string,
	schema: TSchema,
	data: unknown,
): InferOutput<TSchema> {
	const parsed = safeParse(schema, data);
	if (parsed.success) return parsed.output;

	const lines = parsed.issues.map((i) => formatIssue(i));
	const body = [
		`Valibot validation failed — ${label}`,
		`Issues (${lines.length}):`,
		...lines.map((l) => `  • ${l}`),
		"",
		"Parsed input preview:",
		preview(data, 1200),
	].join("\n");

	const err = new Error(body);
	const capture = (
		Error as unknown as { captureStackTrace?: (e: Error, fn: unknown) => void }
	).captureStackTrace;
	capture?.(err, parseWithContext);
	Object.assign(err, { issues: parsed.issues, label });
	throw err;
}

/** `JSON.parse` then {@link parseWithContext}; JSON errors include label and a text preview. */
export function parseJsonWithContext<TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(
	label: string,
	schema: TSchema,
	jsonText: string,
): InferOutput<TSchema> {
	let data: unknown;
	try {
		data = JSON.parse(jsonText);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		const err = new Error(
			`JSON.parse failed — ${label}\n${msg}\nText preview: ${preview(jsonText, 240)}`,
		);
		const capture = (
			Error as unknown as { captureStackTrace?: (e: Error, fn: unknown) => void }
		).captureStackTrace;
		capture?.(err, parseJsonWithContext);
		Object.assign(err, { label });
		throw err;
	}
	return parseWithContext(label, schema, data);
}
