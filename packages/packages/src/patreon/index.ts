import { type Core, Package } from "@macrograph/runtime";

import { createCtx } from "./ctx";

export function pkg(core: Core) {
	const pkg = new Package({
		name: "Patreon",
		ctx: createCtx(core),
		SettingsUI: () => import("./Settings"),
	});

	return pkg;
}
