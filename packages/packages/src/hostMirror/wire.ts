import type { Core, Package } from "@macrograph/runtime";
import { batch } from "solid-js";
import * as v from "valibot";

import type { Account } from "../twitch/auth";
import type { Ctx as TwitchCtx, PersistedStore } from "../twitch/ctx";
import {
	applyIntegrationSlices,
	clearIntegrationSlices,
	collectIntegrationSlices,
} from "./integrationSlices";

const TWITCH_USER_SUMMARY = v.object({
	id: v.string(),
	login: v.string(),
	display_name: v.string(),
});

const TWITCH_PERSISTED_ROW = v.object({
	eventsub: v.optional(v.boolean()),
	chat: v.optional(v.boolean()),
});

const CREDENTIAL_ROW = v.object({
	provider: v.string(),
	id: v.string(),
	displayName: v.nullable(v.string()),
});

export const HOST_MIRROR_PAYLOAD_SCHEMA = v.union([
	v.object({
		v: v.literal(1),
		credentials: v.array(CREDENTIAL_ROW),
		twitchUsers: v.array(TWITCH_USER_SUMMARY),
		twitchPersisted: v.record(v.string(), TWITCH_PERSISTED_ROW),
	}),
	v.object({
		v: v.literal(2),
		credentials: v.array(CREDENTIAL_ROW),
		twitchUsers: v.array(TWITCH_USER_SUMMARY),
		twitchPersisted: v.record(v.string(), TWITCH_PERSISTED_ROW),
		slices: v.optional(v.record(v.string(), v.any()), {}),
	}),
]);

export type HostMirrorPayload = {
	v: 2;
	credentials: v.InferOutput<typeof CREDENTIAL_ROW>[];
	twitchUsers: v.InferOutput<typeof TWITCH_USER_SUMMARY>[];
	twitchPersisted: Record<string, v.InferOutput<typeof TWITCH_PERSISTED_ROW>>;
	slices: Record<string, unknown>;
};

function twitchPkg(core: Core): Package<any, TwitchCtx> | undefined {
	return core.packages.find((p) => p.name === "Twitch Events") as
		| Package<any, TwitchCtx>
		| undefined;
}

function normalizeHostMirror(
	raw: v.InferOutput<typeof HOST_MIRROR_PAYLOAD_SCHEMA>,
): HostMirrorPayload {
	if (raw.v === 1) {
		return {
			v: 2,
			credentials: raw.credentials,
			twitchUsers: raw.twitchUsers,
			twitchPersisted: raw.twitchPersisted,
			slices: {},
		};
	}
	return {
		v: 2,
		credentials: raw.credentials,
		twitchUsers: raw.twitchUsers,
		twitchPersisted: raw.twitchPersisted,
		slices: raw.slices ?? {},
	};
}

export const HOST_MIRROR_PAYLOAD = HOST_MIRROR_PAYLOAD_SCHEMA;

export async function collectHostMirrorPayload(core: Core): Promise<HostMirrorPayload> {
	const creds = await core.getCredentials();
	const credentials = creds.map((c) => ({
		provider: c.provider,
		id: c.id,
		displayName: c.displayName,
	}));

	const pkg = twitchPkg(core);
	if (!pkg) {
		const slices = await collectIntegrationSlices(core);
		return {
			v: 2,
			credentials,
			twitchUsers: [],
			twitchPersisted: {},
			slices,
		};
	}

	const { helixClient, persisted } = pkg.ctx!;
	const twitchUsers: v.InferOutput<typeof TWITCH_USER_SUMMARY>[] = [];

	for (const c of creds.filter((x) => x.provider === "twitch")) {
		try {
			const cred = await core.getCredential("twitch", c.id);
			if (!cred) continue;
			try {
				const data = await helixClient
					.call("GET /users", cred, {})
					.then(({ data }) => v.parse(TWITCH_USER_SUMMARY, data[0]));
				twitchUsers.push(data);
			} catch {
				twitchUsers.push({
					id: c.id,
					login: c.id,
					display_name: c.displayName ?? c.id,
				});
			}
		} catch {
			twitchUsers.push({
				id: c.id,
				login: c.id,
				display_name: c.displayName ?? c.id,
			});
		}
	}

	const slices = await collectIntegrationSlices(core);

	return {
		v: 2,
		credentials,
		twitchUsers,
		twitchPersisted: Object.fromEntries(
			Object.entries(persisted[0] ?? {}).filter(
				(e): e is [string, { eventsub?: boolean; chat?: boolean }] =>
					e[1] != null && typeof e[1] === "object" && !Array.isArray(e[1]),
			),
		),
		slices,
	};
}

function normalizeTwitchPersisted(
	raw: Record<string, v.InferOutput<typeof TWITCH_PERSISTED_ROW>>,
): Record<string, v.InferOutput<typeof TWITCH_PERSISTED_ROW>> {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
	const out: Record<string, v.InferOutput<typeof TWITCH_PERSISTED_ROW>> = {};
	for (const [id, row] of Object.entries(raw)) {
		if (row && typeof row === "object" && !Array.isArray(row)) {
			out[id] = {
				...(typeof row.eventsub === "boolean" ? { eventsub: row.eventsub } : {}),
				...(typeof row.chat === "boolean" ? { chat: row.chat } : {}),
			};
		}
	}
	return out;
}

function replaceTwitchPersistedSnapshot(
	persisted: PersistedStore,
	next: Record<string, v.InferOutput<typeof TWITCH_PERSISTED_ROW>>,
) {
	const snapshot = persisted[0];
	const setPersisted = persisted[1];

	if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
		for (const key of Object.keys(snapshot)) {
			setPersisted(key, undefined!);
		}
	}
	for (const [id, row] of Object.entries(next)) {
		setPersisted(id, row);
	}
}

function applyTwitchHostMirror(
	ctx: TwitchCtx,
	payload: Pick<HostMirrorPayload, "twitchUsers" | "twitchPersisted">,
) {
	const { auth, persisted } = ctx;
	const twitchUsers = Array.isArray(payload.twitchUsers) ? payload.twitchUsers : [];
	const twitchPersisted = normalizeTwitchPersisted(payload.twitchPersisted);

	batch(() => {
		replaceTwitchPersistedSnapshot(persisted, twitchPersisted);

		for (const id of Array.from(auth.accounts.keys())) {
			auth.accounts.delete(id);
		}

		for (const u of twitchUsers) {
			const acc: Account = {
				data: {
					id: u.id,
					login: u.login,
					display_name: u.display_name,
				},
				credential: async () => {
					throw new Error(
						"Remote editor: OAuth credentials exist only on the host. Run graphs from the desktop app.",
					);
				},
			};
			auth.accounts.set(u.id, () => acc);
		}
	});
}

function clearTwitchRemoteMirror(core: Core) {
	const pkg = twitchPkg(core);
	if (!pkg) return;
	const { auth, persisted } = pkg.ctx!;
	batch(() => {
		replaceTwitchPersistedSnapshot(persisted, {});
		for (const id of Array.from(auth.accounts.keys())) {
			auth.accounts.delete(id);
		}
	});
}

export function applyHostMirrorPayloadToCore(core: Core, raw: unknown) {
	if (!core.remoteShell) return;

	const parsed = v.safeParse(HOST_MIRROR_PAYLOAD_SCHEMA, raw);
	if (!parsed.success) {
		core.setRemoteHostMirrorCredentialSummaries([]);
		clearTwitchRemoteMirror(core);
		clearIntegrationSlices(core);
		return;
	}

	const payload = normalizeHostMirror(parsed.output);

	core.setRemoteHostMirrorCredentialSummaries(payload.credentials);

	const pkg = twitchPkg(core);
	if (pkg?.ctx) {
		applyTwitchHostMirror(pkg.ctx, payload);
	} else {
		clearTwitchRemoteMirror(core);
	}

	clearIntegrationSlices(core);
	applyIntegrationSlices(core, payload.slices);
}

export function parseHostMirrorPayload(raw: unknown): HostMirrorPayload | undefined {
	const parsed = v.safeParse(HOST_MIRROR_PAYLOAD_SCHEMA, raw);
	if (!parsed.success) return undefined;
	return normalizeHostMirror(parsed.output);
}
