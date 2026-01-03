import {
	Core,
	createWsProvider,
	type RefreshedOAuthToken,
} from "@macrograph/runtime";
import "tauri-plugin-midi";

import { rawApi } from "./api";
import { env } from "./env";
import { fetch } from "./http";
import { client } from "./rspc";

const AUTH_URL = `${env.VITE_MACROGRAPH_API_URL}/auth`;

export const core = new Core({
	fetch: fetch as any,
	api: rawApi,
	oauth: {
		authorize: (provider) =>
			new Promise((res) => {
				client.addSubscription(
					["oauth.authorize", `${AUTH_URL}/${provider}/login`],
					{
						onData(data) {
							res({ ...data, issued_at: Date.now() / 1000 });
						},
					},
				);
			}),
		refresh: async (provider, refreshToken) => {
			const res = await fetch(`${AUTH_URL}/${provider}/refresh`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ refreshToken }),
			});

			return {
				...((await res.json()) as RefreshedOAuthToken),
				issued_at: Date.now() / 1000,
			};
		},
	},
});

export const wsProvider = createWsProvider({
	async startServer(port, onData) {
		return client.addSubscription(["websocket.server", port], {
			onData: (d) => onData(d),
		});
	},
	async stopServer(unsubscribe) {
		unsubscribe();
	},
	async sendMessage(data) {
		return client.mutation([
			"websocket.send",
			{ port: data.port, client: data.client, data: data.data },
		]);
	},
});
