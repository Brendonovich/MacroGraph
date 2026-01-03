import { type Core, Package } from "@macrograph/runtime";

import * as chat from "./chat";
import { type Ctx, createCtx } from "./ctx";
import * as eventsub from "./eventSub";
import * as helix from "./helix";
import { TwitchAccount, TwitchChannel } from "./resource";
import { createTypes } from "./types";

export type Pkg = Package<any, Ctx>;

export function pkg(core: Core) {
	const ctx = createCtx(core);

	const pkg = new Package({
		name: "Twitch Events",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	const types = createTypes(pkg);

	helix.register(pkg, ctx.helixClient, types);
	eventsub.register(pkg, ctx, types);
	chat.register(pkg, ctx);

	pkg.registerResourceType(TwitchAccount);
	pkg.registerResourceType(TwitchChannel);

	return pkg;
}
