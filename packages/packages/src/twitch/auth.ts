import type { Credential } from "@macrograph/api-contract";
import type { Core } from "@macrograph/runtime";
import { makeCache } from "@macrograph/utils";
import { ReactiveMap } from "@solid-primitives/map";
import { createAsync } from "@solidjs/router";
import type { Accessor } from "solid-js";
import * as v from "valibot";

import type { PersistedStore } from "./ctx";
import type { Helix } from "./helix";

const USER_DATA = v.object({
	id: v.string(),
	login: v.string(),
	display_name: v.string(),
});

export interface Account {
	credential: () => Promise<Credential>;
	data: v.InferOutput<typeof USER_DATA>;
}

export function createAuth(
	clientId: string,
	core: Core,
	helixClient: Helix,
	[, setPersisted]: PersistedStore,
) {
	const accounts = new ReactiveMap<string, Accessor<Account | undefined>>();

	async function enableAccount(userId: string) {
		const getAccount = makeCache(async () => {
			const c = await core.getCredential("twitch", userId);
			if (!c) return undefined;

			const data = await helixClient
				.call("GET /users", c, {})
				.then(({ data }) => v.parse(USER_DATA, data[0]));

			return {
				data,
				credential: async () => {
					const c = await core.getCredential("twitch", userId);
					if (!c) throw new Error("No credential");
					return c;
				},
			};
		});

		await getAccount();

		accounts.set(
			userId,
			createAsync(() => getAccount()),
		);

		setPersisted(userId, {});
	}

	return {
		accounts,
		clientId,
		enableAccount,
		disableAccount(id: string) {
			accounts.delete(id);

			setPersisted(id, undefined!);
		},
	};
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;
