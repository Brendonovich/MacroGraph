import type { Credential } from "@macrograph/api-contract";
import type { Core } from "@macrograph/runtime";
import { makeCache } from "@macrograph/utils";
import { ReactiveMap } from "@solid-primitives/map";
import { createAsync } from "@solidjs/router";
import type { Accessor } from "solid-js";
import { z } from "zod";

import type { PersistedStore } from "./ctx";
import type { Helix } from "./helix";

const USER_DATA = z.object({
	id: z.string(),
	login: z.string(),
	display_name: z.string(),
});

export interface Account {
	credential: Credential;
	data: z.infer<typeof USER_DATA>;
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
				.then(({ data }) => USER_DATA.parse(data[0]));

			return {
				data,
				credential: c,
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
