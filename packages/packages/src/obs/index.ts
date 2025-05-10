import { Package } from "@macrograph/runtime";
import type { EventTypes } from "obs-websocket-js";

import * as events from "./events";
import * as requests from "./requests";

import { type Ctx, createCtx } from "./ctx";
import { OBSInstance } from "./resource";
import { createTypes } from "./types";

export type Pkg = Package<EventTypes, Ctx>;

export function pkg(): Pkg {
	const ctx = createCtx();

	const pkg = new Package<EventTypes, Ctx>({
		name: "OBS Websocket",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	const types = createTypes(pkg);

	events.register(pkg, types);
	requests.register(pkg, types);

	pkg.registerResourceType(OBSInstance);

	return pkg;
}
