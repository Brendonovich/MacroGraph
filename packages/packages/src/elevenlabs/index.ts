import { Package } from "@macrograph/runtime";

import { createCtx } from "./ctx";
import * as sends from "./sends";

export type Pkg = ReturnType<typeof pkg>;

export function pkg() {
	const ctx = createCtx();

	const pkg = new Package<Event>({
		name: "Elevenlabs",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	sends.register(pkg, ctx);

	return pkg;
}
