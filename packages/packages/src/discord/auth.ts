import type { Credential } from "@macrograph/api-contract";
import type { Core } from "@macrograph/runtime";
import { makeCache } from "@macrograph/utils";
import { ReactiveMap } from "@solid-primitives/map";
import { createAsync } from "@solidjs/router";
import type { Accessor } from "solid-js";
import type * as v from "valibot";

import type { PersistedStore } from ".";
import type { Api } from "./api";
import type { USER_SCHEMA } from "./schemas";

export interface Account {
	credential: Credential;
	data: v.InferOutput<typeof USER_SCHEMA>;
}

export interface BotAccount {
	token: string;
	data: v.InferOutput<typeof USER_SCHEMA>;
}

export function createAuth(
	core: Core,
	api: Api,
	[, setPersisted]: PersistedStore,
) {
	const accounts = new ReactiveMap<string, Accessor<Account | undefined>>();

	async function enableAccount(userId: string) {
		const getAccount = makeCache(async () => {
			const cred = await core.getCredential("discord", userId);
			if (!cred) return undefined;

			const data = await api.call("GET /users/@me", { type: "cred", cred });

			return {
				data,
				credential: cred,
			};
		});

		await getAccount();

		accounts.set(
			userId,
			createAsync(() => getAccount()),
		);

		setPersisted("users", (u) => [...new Set([...u, userId])]);
	}

	function disableAccount(id: string) {
		accounts.delete(id);

		setPersisted("users", (u) => u.filter((x) => x !== id));
	}

	const bots = new ReactiveMap<string, Accessor<BotAccount | undefined>>();

	async function addBot(token: string) {
		if (bots.has(token)) return;

		const getAccount = makeCache(async () => {
			const data = await api.call("GET /users/@me", { type: "bot", token });
			if (!data) return;

			return { token, data };
		});

		const acc = await getAccount();
		if (!acc) return;

		bots.set(
			token,
			createAsync(() => getAccount()),
		);

		setPersisted("bots", (b) => ({ ...b, [acc.data.id]: { token } }));
	}

	async function removeBot(token: string) {
		bots.delete(token);

		setPersisted("bots", (b) => {
			const { [token]: _, ...rest } = b;
			return rest;
		});
	}

	return {
		accounts,
		enableAccount,
		disableAccount,
		bots,
		addBot,
		removeBot,
	};
}

export type Auth = ReturnType<typeof createAuth>;
