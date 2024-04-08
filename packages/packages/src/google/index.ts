import { Core, Package } from "@macrograph/runtime";

import { createCtx } from "./ctx";

export function pkg(core: Core) {
	const pkg = new Package({
		name: "Google",
		ctx: createCtx(core),
		SettingsUI: () => import("./Settings"),
	});

	return pkg;
}
