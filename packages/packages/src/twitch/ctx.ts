import type { Core } from "@macrograph/runtime";
import { makePersisted } from "@solid-primitives/storage";
import { createResource } from "solid-js";
import { createStore } from "solid-js/store";
import * as v from "valibot";

import { createAuth } from "./auth";
import { createChat } from "./chat";
import { createEventSub } from "./eventSub";
import { createHelix } from "./helix";

export const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

const PERSISTED_SCHEMA = v.record(
	v.string(),
	// auto connect on setup
	v.object({
		eventsub: v.optional(v.boolean()),
		chat: v.optional(v.boolean()),
	}),
);

export type Persisted = v.InferOutput<typeof PERSISTED_SCHEMA>;
export type PersistedStore = ReturnType<typeof createStore<Persisted>>;

export function createCtx(core: Core) {
	const persisted = makePersisted(
		createStore<v.InferOutput<typeof PERSISTED_SCHEMA>>({}),
		{ name: "packages.twitch" },
	);

	const helixClient = createHelix(core);
	const auth = createAuth(CLIENT_ID, core, helixClient, persisted);
	const eventSub = createEventSub(core, helixClient);
	const chat = createChat();

	const setup = createResource(async () => {
		await Promise.allSettled(Object.keys(persisted[0]).map(auth.enableAccount));

		for (const [id, data] of Object.entries(persisted[0])) {
			const account = auth.accounts.get(id)?.();
			if (!account) return;

			if (data.chat) chat.connectClient(account);
			if (data.eventsub) eventSub.connectSocket(id);
		}
	});

	return {
		core,
		auth,
		helixClient,
		chat,
		eventSub,
		persisted,
		setup,
	};
}

export type Ctx = Awaited<ReturnType<typeof createCtx>>;
