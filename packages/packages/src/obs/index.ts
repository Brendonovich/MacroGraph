import { Package } from "@macrograph/runtime";
import type { EventTypes } from "obs-websocket-js";

import * as events from "./events";
import * as requests from "./requests";

import { type Ctx, createCtx } from "./ctx";
import { OBSInstance } from "./resource";

export type Pkg = Package<EventTypes, Ctx>;

export function pkg(): Pkg {
	const ctx = createCtx();

	const pkg = new Package<EventTypes, Ctx>({
		name: "OBS Websocket",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	events.register(pkg);
	requests.register(pkg);

	pkg.registerResourceType(OBSInstance);

	return pkg;
}
