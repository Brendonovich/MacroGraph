import { None, Some, makePersistedOption } from "@macrograph/option";
import type {
	Core,
	OAuthToken,
	RefreshedOAuthToken,
} from "@macrograph/runtime";
import { createResource, createSignal } from "solid-js";
import * as v from "valibot";

import { createEndpoint } from "../httpEndpoint";

export const TOKEN_LOCALSTORAGE = "googleToken";

export function createCtx(core: Core) {
	const [authToken, setAuthToken] = makePersistedOption<OAuthToken>(
		createSignal(None),
		TOKEN_LOCALSTORAGE,
	);

	const client = createEndpoint({
		path: "https://www.googleapis.com",
		fetch: async (url, opts) => {
			const run = () =>
				fetch(url, {
					...opts,
					headers: {
						Authorization: `Bearer ${authToken().unwrap().access_token}`,
						...opts?.headers,
					},
				});

			let resp = await run();

			if (resp.status !== 200) {
				const refreshToken = authToken().unwrap().refresh_token;

				const newToken: RefreshedOAuthToken = (await core.oauth.refresh(
					"google",
					refreshToken,
				)) as any;

				setAuthToken(Some({ ...newToken, refresh_token: refreshToken }));

				resp = await run();
			}

			return await resp.json();
		},
	});

	const api = {
		oauth: (() => {
			const oauth = client.extend("/oauth2/v3");

			return { userinfo: oauth.extend("/userinfo") };
		})(),
	};

	const [user] = createResource(
		() => authToken().toNullable(),
		async () => {
			const resp = await api.oauth.userinfo.get(
				v.object({
					sub: v.string(),
					name: v.string(),
					given_name: v.string(),
					picture: v.string(),
					email: v.string(),
					email_verified: v.boolean(),
					locale: v.string(),
				}),
			);

			return resp;
		},
	);

	return { core, authToken, setAuthToken, user };
}

export type Ctx = ReturnType<typeof createCtx>;
