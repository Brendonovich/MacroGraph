import { type Core, Package } from "@macrograph/runtime";
import { makePersisted } from "@solid-primitives/storage";
import { createResource } from "solid-js";
import { createStore } from "solid-js/store";
import * as v from "valibot";

import * as api from "./api";
import { createApi } from "./api";
import { createAuth } from "./auth";
import * as gateway from "./gateway";
import { createGateway } from "./gateway";
import { DiscordAccount, DiscordBot } from "./resource";

export type Pkg = Package<any, Ctx>;

const PERSISTED_SCHEMA = v.object({
	bots: v.record(
		v.string(),
		v.object({ token: v.string(), gateway: v.optional(v.boolean()) }),
	),
	users: v.array(v.string()),
});

export type Persisted = v.InferOutput<typeof PERSISTED_SCHEMA>;
export type PersistedStore = ReturnType<typeof createStore<Persisted>>;

function createCtx(core: Core) {
	const persisted = makePersisted(
		createStore<v.InferOutput<typeof PERSISTED_SCHEMA>>({
			bots: {},
			users: [],
		}),
		{ name: "packages.discord" },
	);

	const api = createApi(core);
	const auth = createAuth(core, api, persisted);
	const gateway = createGateway(persisted);

	const setupUsers = () => {
		return Promise.allSettled(persisted[0].users.map(auth.enableAccount));
	};
	const setupBots = async () => {
		await Promise.allSettled(
			Object.values(persisted[0].bots).map(({ token }) => auth.addBot(token)),
		);

		for (const [id, data] of Object.entries(persisted[0].bots)) {
			const bot = auth.bots.get(id)?.();
			if (!bot) return;

			if (data.gateway) gateway.connectSocket(bot);
		}
	};

	const setup = createResource(async () => {
		await Promise.allSettled([setupUsers(), setupBots()]);
	});

	return { api, auth, core, gateway, setup };
}

export type Ctx = ReturnType<typeof createCtx>;

export function pkg(core: Core) {
	const ctx = createCtx(core);

	const pkg = new Package<any>({
		name: "Discord",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	gateway.register(pkg, ctx);
	api.register(pkg, ctx, core);

	pkg.registerResourceType(DiscordAccount);
	pkg.registerResourceType(DiscordBot);

	return pkg;
}
