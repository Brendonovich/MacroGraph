import { Package } from "@macrograph/runtime";

import { createCtx } from "./ctx";
import { requests } from "./requests";
import { VTubeStudioInstance } from "./resource";

export type Pkg = ReturnType<typeof pkg>;
export function pkg() {
	const ctx = createCtx();

	const pkg = new Package({
		name: "VTube Studio",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	pkg.registerResourceType(VTubeStudioInstance);

	requests(pkg);

	return pkg;
}
