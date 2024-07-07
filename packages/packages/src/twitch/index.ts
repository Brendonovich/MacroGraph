import { type Core, Package } from "@macrograph/runtime";

import * as chat from "./chat";
import * as eventsub from "./eventSub";
import * as helix from "./helix";

import { type Ctx, createCtx } from "./ctx";
import { TwitchAccount, TwitchChannel } from "./resource";

export type Pkg = Package<any, Ctx>;

export function pkg(core: Core) {
	const ctx = createCtx(core);

	const pkg = new Package({
		name: "Twitch Events",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	helix.register(pkg, ctx.helixClient);
	eventsub.register(pkg, ctx);
	chat.register(pkg, ctx);

	pkg.registerResourceType(TwitchAccount);
	pkg.registerResourceType(TwitchChannel);

	return pkg;
}
