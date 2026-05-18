import ts from "typescript";

import { scriptLogGroup } from "./scriptDebug";
import type { ScriptGetTypeFn } from "./scriptTsCodegen";
import { buildScriptSources, SCRIPT_FILE } from "./scriptSource";
import type { IoDefinition } from "./scriptIoTypes";

export type ScriptDiagnostic = {
	message: string;
	line: number;
	column: number;
	severity: "error" | "warning";
};

function normalizePath(fileName: string) {
	return fileName.replace(/\\/g, "/");
}

function createVirtualCompilerHost(
	sources: Record<string, string>,
): ts.CompilerHost {
	const files = new Map<string, string>();
	for (const [name, text] of Object.entries(sources)) {
		files.set(normalizePath(name), text);
	}

	return {
		getSourceFile(fileName, languageVersion) {
			const path = normalizePath(fileName);
			const text = files.get(path);
			if (text === undefined) return undefined;
			return ts.createSourceFile(path, text, languageVersion, true);
		},
		getCurrentDirectory: () => "/",
		getDirectories: () => [],
		fileExists(fileName) {
			return files.has(normalizePath(fileName));
		},
		readFile(fileName) {
			return files.get(normalizePath(fileName));
		},
		writeFile: () => {},
		getCanonicalFileName: (fileName) => normalizePath(fileName),
		useCaseSensitiveFileNames: () => true,
		getNewLine: () => "\n",
		getDefaultLibFileName: () => "/lib.d.ts",
	};
}

function offsetToLineCol(source: string, offset: number) {
	const before = source.slice(0, offset);
	const lines = before.split("\n");
	return {
		line: lines.length,
		column: (lines.at(-1)?.length ?? 0) + 1,
	};
}

function mapDiagnostic(
	d: ts.Diagnostic,
	userSource: string,
	preambleLength: number,
): ScriptDiagnostic | null {
	if (!d.file?.fileName.endsWith("script.ts")) return null;

	const start = d.start ?? 0;
	if (start < preambleLength) return null;

	const offset = start - preambleLength;
	const pos = offsetToLineCol(userSource, offset);
	const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");

	return {
		message,
		line: pos.line,
		column: pos.column,
		severity: d.category === ts.DiagnosticCategory.Error ? "error" : "warning",
	};
}

export function validateScriptSource(
	userCode: string,
	ioDefinition: IoDefinition,
	getType: ScriptGetTypeFn,
): ScriptDiagnostic[] {
	const { sources, userCodeOffset } = buildScriptSources(
		userCode,
		ioDefinition,
		getType,
	);

	const options: ts.CompilerOptions = {
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.None,
		strict: true,
		noEmit: true,
		skipLibCheck: true,
		noLib: true,
	};

	const host = createVirtualCompilerHost(sources);

	const program = ts.createProgram([SCRIPT_FILE, "/lib.d.ts"], options, host);
	const checker = program.getTypeChecker();
	const sourceFile = program.getSourceFile(SCRIPT_FILE);

	let resolvedInputsA: string | undefined;
	if (sourceFile) {
		const visit = (node: ts.Node) => {
			if (
				ts.isPropertyAccessExpression(node) &&
				ts.isIdentifier(node.expression) &&
				node.expression.text === "inputs" &&
				node.name.text === "A"
			) {
				resolvedInputsA = checker.typeToString(checker.getTypeAtLocation(node));
			}
			ts.forEachChild(node, visit);
		};
		visit(sourceFile);
	}

	const diagnostics = [
		...program.getSyntacticDiagnostics(),
		...program.getSemanticDiagnostics(),
	];

	const results: ScriptDiagnostic[] = [];
	for (const d of diagnostics) {
		const mapped = mapDiagnostic(d, userCode, userCodeOffset);
		if (mapped) results.push(mapped);
	}

	scriptLogGroup("validateScriptSource", {
		"userCode (first line)": userCode.split("\n")[0] ?? "",
		userCodeOffset,
		"checker type of inputs.A": resolvedInputsA,
		diagnosticCount: results.length,
		diagnostics: results,
		"all TS diagnostics (incl. lib)": diagnostics.map((d) =>
			ts.flattenDiagnosticMessageText(d.messageText, "\n"),
		),
	});

	return results;
}

export function scriptHasErrors(diags: ScriptDiagnostic[]): boolean {
	return diags.some((d) => d.severity === "error");
}

export function transpileScriptSource(userCode: string): string {
	const result = ts.transpileModule(userCode, {
		compilerOptions: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.ESNext,
		},
	});
	return result.outputText;
}
