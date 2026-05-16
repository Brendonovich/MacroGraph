import { getRemoteShellMode, type Core } from "@macrograph/runtime";
import { makePersisted } from "@solid-primitives/storage";
import { createResource } from "solid-js";
import { createStore } from "solid-js/store";
import * as v from "valibot";

import { createAuth } from "./auth";
import { createEventSub } from "./eventSub";
import { createHelix } from "./helix";

export const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

const PERSISTED_SCHEMA = v.record(v.string(), v.any());

export type Persisted = v.InferOutput<typeof PERSISTED_SCHEMA>;
export type PersistedStore = ReturnType<typeof createStore<Persisted>>;

export function createCtx(core: Core) {
	const persisted = makePersisted(
		createStore<v.InferOutput<typeof PERSISTED_SCHEMA>>({}),
		{ name: "packages.twitch" },
	);

	const helixClient = createHelix(core);
	const eventSub = createEventSub(core, helixClient, () => true);
	const auth = createAuth(
		CLIENT_ID, core, helixClient, persisted,
		(userId) => eventSub.connectSocket(userId),
		(userId) => eventSub.disconnectSocket(userId),
	);

	const setup = createResource(async () => {
		if (getRemoteShellMode()) return;
		await Promise.allSettled(Object.keys(persisted[0]).map(auth.enableAccount));
	});

	return {
		core,
		auth,
		helixClient,
		eventSub,
		setup,
	};
}

export type Ctx = Awaited<ReturnType<typeof createCtx>>;
