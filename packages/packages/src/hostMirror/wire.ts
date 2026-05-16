import type { Core, Package } from "@macrograph/runtime";
import { batch } from "solid-js";
import { reconcile } from "solid-js/store";
import * as v from "valibot";

import type { Account } from "../twitch/auth";
import type { Ctx as TwitchCtx } from "../twitch/ctx";
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
			Object.entries(persisted[0]).filter(
				(e): e is [string, { eventsub?: boolean; chat?: boolean }] =>
					e[1] != null && typeof e[1] === "object",
			),
		),
		slices,
	};
}

function clearTwitchRemoteMirror(core: Core) {
	const pkg = twitchPkg(core);
	if (!pkg) return;
	const { auth, persisted } = pkg.ctx!;
	const [, setPersisted] = persisted;
	batch(() => {
		setPersisted(reconcile({}));
		for (const id of [...auth.accounts.keys()]) {
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
	if (pkg) {
		const { auth, persisted } = pkg.ctx!;
		const [, setPersisted] = persisted;

		batch(() => {
			setPersisted(reconcile(payload.twitchPersisted));

			for (const id of [...auth.accounts.keys()]) {
				auth.accounts.delete(id);
			}

			for (const u of payload.twitchUsers) {
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
