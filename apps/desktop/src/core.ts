import {
	Core,
	type RefreshedOAuthToken,
	type WsMessage,
	createWsProvider,
} from "@macrograph/runtime";

import { rawApi } from "./api";
import { env } from "./env";
import { fetch, fetchMultipart } from "./http";

const AUTH_URL = `${env.VITE_MACROGRAPH_API_URL}/auth`;

const WS_EVENT = "ws:server:message";

export const core = new Core({
	fetch: fetch as any,
	fetchMultipart: async (url, fields, file, options) => {
		const res = await fetchMultipart(url, fields, file, options);
		return { status: res.status };
	},
	api: rawApi,
	oauth: {
		authorize: (provider) =>
			window.electronAPI.oauth.authorize(`${AUTH_URL}/${provider}/login`).then((data) => ({
				...data,
				issued_at: Date.now() / 1000,
			})),
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
		await window.electronAPI.ws.startServer(port);
		const unlisten = window.electronAPI.onEvent(WS_EVENT, (eventPayload: unknown) => {
			const [eventPort, client, message] = eventPayload as [number, number, WsMessage];
			if (eventPort === port) onData([client, message] as [number, WsMessage]);
		});
		return () => {
			unlisten();
		};
	},
	async stopServer(cleanup) {
		cleanup();
	},
	async disconnectAllClients() {
		return window.electronAPI.ws.disconnectAllClients();
	},
	async sendMessage(data) {
		return window.electronAPI.ws.send({
			port: data.port,
			client: data.client,
			data: data.data,
		});
	},
});
