import { t } from "@macrograph/typesystem";

import type { Pkg } from ".";

export function createTypes(pkg: Pkg) {
	const Model = pkg.createStruct("Model", (s) => ({
		modelLoaded: s.field("Loaded", t.bool()),
		modelName: s.field("Name", t.string()),
		modelID: s.field("ID", t.string()),
		vtsModelName: s.field("VTS Name", t.string()),
		vtsModelIconName: s.field("VTS Icon Name", t.string()),
	}));

	const Expression = pkg.createStruct("Expression", (s) => ({
		name: s.field("Name", t.string()),
		file: s.field("File", t.string()),
		active: s.field("Active", t.bool()),
	}));

	const Hotkey = pkg.createStruct("Hotkey", (s) => ({
		name: s.field("Name", t.string()),
		id: s.field("ID", t.string()),
		type: s.field("Type", t.string()),
		description: s.field("Description", t.string()),
		file: s.field("File", t.string()),
	}));

	return {
		Model,
		Expression,
		Hotkey,
	};
}

export type Types = ReturnType<typeof createTypes>;
