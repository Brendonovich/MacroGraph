import { contract } from "@macrograph/api-contract";
import { makePersisted } from "@solid-primitives/storage";
import { initClient } from "@ts-rest/core";
import { initQueryClient } from "@ts-rest/solid-query";
import { createSignal } from "solid-js";

import { action } from "@solidjs/router";
import { env } from "./env";
import { fetch } from "./http";
import { queryClient } from "./rspc";

async function readJsonBody(r: Response): Promise<unknown> {
	const text = await r.text();
	if (!text.trim()) return null;
	return JSON.parse(text) as unknown;
}

export const [sessionToken, setSessionToken] = makePersisted(
	createSignal<string | null>(null),
	{ name: "mg-auth-token" },
);

export const rawApi = initClient(contract, {
	api: (args) =>
		fetch(args.path, args).then(async (r) => ({
			status: r.status,
			body: await readJsonBody(r),
			headers: r.headers,
		})),
	baseUrl: `${env.VITE_MACROGRAPH_API_URL}/api`,
	get baseHeaders(): Record<string, string> {
		const token = sessionToken();
		return token ? { Authorization: `Bearer ${token}` } : {};
	},
});

export const api = initQueryClient(contract, {
	api: (args) =>
		fetch(args.path, args).then(async (r) => ({
			status: r.status,
			body: await readJsonBody(r),
			headers: r.headers,
		})),
	baseUrl: `${env.VITE_MACROGRAPH_API_URL}/api`,
	get baseHeaders(): Record<string, string> {
		const token = sessionToken();
		return token ? { Authorization: `Bearer ${token}` } : {};
	},
});

export const logOutAction = action(async () => {
	setSessionToken(null);
	queryClient.clear();
});
