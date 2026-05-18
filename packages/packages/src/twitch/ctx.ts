import { getRemoteShellMode, type Core } from "@macrograph/runtime";
import { makePersisted } from "@solid-primitives/storage";
import { createResource, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import * as v from "valibot";

import { scheduleHostMirrorSync } from "../hostMirror/sync";
import { createAuth } from "./auth";
import { createEventSub } from "./eventSub";
import { createHelix } from "./helix";

export type TwitchHostMirrorRow = {
	credentialId: string;
	sessionStatus: "idle" | "connecting" | "live";
};

export const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

const PERSISTED_SCHEMA = v.record(v.string(), v.any());

export type Persisted = v.InferOutput<typeof PERSISTED_SCHEMA>;
export type PersistedStore = ReturnType<typeof createStore<Persisted>>;

export function createCtx(core: Core) {
	const persisted = makePersisted(
		createStore<v.InferOutput<typeof PERSISTED_SCHEMA>>({}),
		{ name: "packages.twitch" },
	);

	const [hostMirrorTwitch, setHostMirrorTwitch] = createSignal<TwitchHostMirrorRow[]>([]);

	const helixClient = createHelix(core);
	const eventSub = createEventSub(
		core,
		helixClient,
		() => true,
		() => scheduleHostMirrorSync(core),
	);
	const auth = createAuth(
		CLIENT_ID,
		core,
		helixClient,
		persisted,
		(userId) => {
			eventSub.connectSocket(userId);
			scheduleHostMirrorSync(core);
		},
		(userId) => {
			eventSub.disconnectSocket(userId);
			scheduleHostMirrorSync(core);
		},
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
		hostMirrorTwitch,
		collectHostMirror() {
			const rows: TwitchHostMirrorRow[] = [];
			for (const credentialId of auth.accounts.keys()) {
				rows.push({
					credentialId,
					sessionStatus: eventSub.sessions.get(credentialId)?.status ?? "idle",
				});
			}
			return { rows };
		},
		applyHostMirror(data: unknown) {
			if (!getRemoteShellMode()) return;
			if (!data || typeof data !== "object") {
				setHostMirrorTwitch([]);
				return;
			}
			const rows = (data as { rows?: unknown }).rows;
			if (!Array.isArray(rows)) {
				setHostMirrorTwitch([]);
				return;
			}
			setHostMirrorTwitch(
				rows.filter(
					(r): r is TwitchHostMirrorRow =>
						typeof r === "object" &&
						r !== null &&
						typeof (r as TwitchHostMirrorRow).credentialId === "string" &&
						((r as TwitchHostMirrorRow).sessionStatus === "idle" ||
							(r as TwitchHostMirrorRow).sessionStatus === "connecting" ||
							(r as TwitchHostMirrorRow).sessionStatus === "live"),
				),
			);
		},
		clearHostMirror() {
			if (!getRemoteShellMode()) return;
			setHostMirrorTwitch([]);
		},
	};
}

export type Ctx = Awaited<ReturnType<typeof createCtx>>;
