import {
	generateScriptTypeDeclarations,
	type ScriptGetTypeFn,
} from "./scriptTsCodegen";
import type { IoDefinition } from "./scriptIoTypes";
import { SCRIPT_MINIMAL_LIB } from "./scriptMinimalLib";

export const SCRIPT_FILE = "/script.ts";

export const WRAPPER_PREFIX =
	"function __mgScript(inputs: MacroGraphInputs, outputs: MacroGraphOutputs) {\n";
export const WRAPPER_SUFFIX = "\n}\n";

export function buildScriptSources(
	userCode: string,
	ioDefinition: IoDefinition,
	getType: ScriptGetTypeFn,
) {
	const typeDecls = generateScriptTypeDeclarations(ioDefinition, getType);
	const fullSource = `${typeDecls}\n${WRAPPER_PREFIX}${userCode}${WRAPPER_SUFFIX}`;
	const userCodeOffset = typeDecls.length + 1 + WRAPPER_PREFIX.length;

	return {
		sources: {
			[SCRIPT_FILE]: fullSource,
			"/lib.d.ts": SCRIPT_MINIMAL_LIB,
		},
		userCodeOffset,
	};
}
