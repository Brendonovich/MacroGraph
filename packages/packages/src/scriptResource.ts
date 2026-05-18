import { createResourceType } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

import {
	type IoDefinition,
	sanitizeScriptIoDefinition,
} from "./scriptIoTypes";

export const DEFAULT_IO_DEFINITION: IoDefinition = {
	inputs: [{ id: "0", name: "A", type: "int" }],
	outputs: [{ id: "0", name: "Result", type: "string" }],
};

export const DEFAULT_IO_DEFINITION_JSON = JSON.stringify(DEFAULT_IO_DEFINITION);

export const DEFAULT_CODE = `// TypeScript — \`inputs\` / \`outputs\` are typed from your pins.
outputs.Result = String(inputs.A ?? inputs["0"]);
`;

function parseIoDefinition(raw: string | undefined): IoDefinition {
	if (!raw) return structuredClone(DEFAULT_IO_DEFINITION);
	try {
		const parsed = JSON.parse(raw) as IoDefinition;
		if (
			!parsed ||
			typeof parsed !== "object" ||
			!Array.isArray(parsed.inputs) ||
			!Array.isArray(parsed.outputs)
		) {
			return structuredClone(DEFAULT_IO_DEFINITION);
		}
		return sanitizeScriptIoDefinition({
			inputs: parsed.inputs.filter(
				(f) => f && typeof f.id === "string" && typeof f.name === "string" && f.type,
			),
			outputs: parsed.outputs.filter(
				(f) => f && typeof f.id === "string" && typeof f.name === "string" && f.type,
			),
		});
	} catch {
		return structuredClone(DEFAULT_IO_DEFINITION);
	}
}

export type ScriptResourceData = {
	code: string;
	ioDefinition: IoDefinition;
};

export const DEFAULT_SCRIPT_RESOURCE_DATA: ScriptResourceData = {
	code: DEFAULT_CODE,
	ioDefinition: structuredClone(DEFAULT_IO_DEFINITION),
};

export const DEFAULT_SCRIPT_RESOURCE_JSON = JSON.stringify(
	DEFAULT_SCRIPT_RESOURCE_DATA,
);

export const ScriptResource = createResourceType({
	name: "Script",
	type: t.string(),
});

export function isScriptResourceType(type: { name: string; package?: { name: string } }) {
	return type.name === "Script" && type.package?.name === "Script";
}

export function parseScriptResource(raw: string | undefined): ScriptResourceData {
	if (!raw?.trim()) return structuredClone(DEFAULT_SCRIPT_RESOURCE_DATA);
	try {
		const parsed = JSON.parse(raw) as Partial<ScriptResourceData> & {
			ioDefinition?: IoDefinition | string;
		};
		if (!parsed || typeof parsed.code !== "string") {
			return structuredClone(DEFAULT_SCRIPT_RESOURCE_DATA);
		}
		const io =
			typeof parsed.ioDefinition === "string"
				? parseIoDefinition(parsed.ioDefinition)
				: parsed.ioDefinition;
		return {
			code: parsed.code,
			ioDefinition: sanitizeScriptIoDefinition(io ?? DEFAULT_IO_DEFINITION),
		};
	} catch {
		return structuredClone(DEFAULT_SCRIPT_RESOURCE_DATA);
	}
}

export function serializeScriptResource(data: ScriptResourceData): string {
	return JSON.stringify({
		code: data.code,
		ioDefinition: sanitizeScriptIoDefinition(data.ioDefinition),
	});
}
