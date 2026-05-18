import ts from "typescript";

import type { ScriptCompletionItem } from "./scriptCompletions";
import { SCRIPT_FILE, buildScriptSources } from "./scriptSource";
import type { ScriptGetTypeFn } from "./scriptTsCodegen";
import type { IoDefinition } from "./scriptIoTypes";

const COMPILER_OPTIONS: ts.CompilerOptions = {
	target: ts.ScriptTarget.ES2022,
	module: ts.ModuleKind.None,
	strict: true,
	noEmit: true,
	skipLibCheck: true,
	noLib: true,
};

function normalizePath(fileName: string) {
	return fileName.replace(/\\/g, "/");
}

function createLanguageServiceHost(
	sources: Record<string, string>,
): ts.LanguageServiceHost {
	const files = new Map<string, string>();
	for (const [name, text] of Object.entries(sources)) {
		files.set(normalizePath(name), text);
	}

	return {
		getCompilationSettings: () => COMPILER_OPTIONS,
		getScriptFileNames: () => [...files.keys()],
		getScriptVersion: (fileName) => {
			const text = files.get(normalizePath(fileName)) ?? "";
			return `${text.length}:${text.slice(0, 64)}`;
		},
		getScriptSnapshot: (fileName) => {
			const text = files.get(normalizePath(fileName));
			return text !== undefined ? ts.ScriptSnapshot.fromString(text) : undefined;
		},
		getCurrentDirectory: () => "/",
		getDefaultLibFileName: () => "/lib.d.ts",
		fileExists: (fileName) => files.has(normalizePath(fileName)),
		readFile: (fileName) => files.get(normalizePath(fileName)),
	};
}

function completionIdentifierStart(source: string, cursor: number): number {
	let from = cursor;
	while (from > 0 && /[\w$]/.test(source[from - 1]!)) {
		from--;
	}
	return from;
}

function kindToCmType(kind: ts.ScriptElementKind): string {
	switch (kind) {
		case ts.ScriptElementKind.memberFunction:
		case ts.ScriptElementKind.method:
		case ts.ScriptElementKind.function:
			return "method";
		case ts.ScriptElementKind.memberVariable:
		case ts.ScriptElementKind.property:
			return "property";
		case ts.ScriptElementKind.constElement:
		case ts.ScriptElementKind.letElement:
		case ts.ScriptElementKind.variableElement:
			return "variable";
		default:
			return "text";
	}
}

function entryInsertText(
	entry: ts.CompletionEntry,
	details: ts.CompletionEntryDetails | undefined,
): string {
	if (entry.insertText) return entry.insertText;
	if (details?.codeDisplay) return entry.name;

	const isCallable =
		entry.kind === ts.ScriptElementKind.method ||
		entry.kind === ts.ScriptElementKind.memberFunction ||
		entry.kind === ts.ScriptElementKind.function ||
		entry.kind === ts.ScriptElementKind.constructSignature;

	if (isCallable && !entry.name.endsWith("()")) {
		return `${entry.name}(`;
	}
	return entry.name;
}

function entryDetail(
	entry: ts.CompletionEntry,
	details: ts.CompletionEntryDetails | undefined,
): string | undefined {
	const fromDetails = details?.displayParts?.map((p) => p.text).join("");
	if (fromDetails) return fromDetails;
	return ts.ScriptElementKind[entry.kind] ?? undefined;
}

export type ScriptTsCompletionResult = {
	from: number;
	to: number;
	items: ScriptCompletionItem[];
};

/** Type-aware completions via the same TS program used for script validation. */
export function getScriptTsCompletions(
	userCode: string,
	cursor: number,
	ioDefinition: IoDefinition,
	getType: ScriptGetTypeFn,
): ScriptTsCompletionResult | null {
	const { sources, userCodeOffset } = buildScriptSources(
		userCode,
		ioDefinition,
		getType,
	);
	const host = createLanguageServiceHost(sources);
	const service = ts.createLanguageService(host, ts.createDocumentRegistry());

	const fullOffset = userCodeOffset + cursor;
	const info = service.getCompletionsAtPosition(
		SCRIPT_FILE,
		fullOffset,
		undefined,
		undefined,
	);
	if (!info?.entries.length) return null;

	const from = completionIdentifierStart(userCode, cursor);
	const to = cursor;

	const items: ScriptCompletionItem[] = [];
	for (const entry of info.entries) {
		if (entry.name.startsWith("__")) continue;

		const details = service.getCompletionEntryDetails(
			SCRIPT_FILE,
			fullOffset,
			entry.name,
			undefined,
			undefined,
			undefined,
			entry.data,
		);

		items.push({
			label: entry.name,
			insert: entryInsertText(entry, details),
			detail: entryDetail(entry, details),
			type: kindToCmType(entry.kind),
		});
	}

	if (!items.length) return null;
	return { from, to, items };
}
