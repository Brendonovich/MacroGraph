import { None, Some, makePersistedOption } from "@macrograph/option";
import type {
	Core,
	OAuthToken,
	RefreshedOAuthToken,
} from "@macrograph/runtime";
import { createResource, createSignal } from "solid-js";
import * as v from "valibot";

import { createEndpoint } from "../httpEndpoint";

export const TOKEN_LOCALSTORAGE = "spotifyToken";

const USER = v.object({
	display_name: v.nullable(v.string()),
	external_urls: v.object({ spotify: v.string() }),
	followers: v.object({ href: v.nullable(v.string()), total: v.number() }),
	href: v.string(),
	id: v.string(),
	images: v.array(
		v.object({
			url: v.string(),
			height: v.nullable(v.number()),
			width: v.nullable(v.number()),
		}),
	),
	type: v.string(),
	uri: v.string(),
});

const USER_PRIVATE = v.intersect([
	USER,
	v.object({
		product: v.string(),
		explicit_content: v.object({
			filter_enabled: v.boolean(),
			filter_locked: v.boolean(),
		}),
		email: v.string(),
		country: v.string(),
	}),
]);

export type Requests = { "GET /me": v.InferOutput<typeof USER_PRIVATE> };

export function createCtx(core: Core) {
	const [authToken, setAuthToken] = makePersistedOption<OAuthToken>(
		createSignal(None),
		TOKEN_LOCALSTORAGE,
	);

	const client = createEndpoint({
		path: "https://api.spotify.com/v1",
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
				const prevToken = authToken().unwrap();
				const token: RefreshedOAuthToken = (await core.oauth.refresh(
					"spotify",
					prevToken.refresh_token,
				)) as any;

				setAuthToken(Some({ ...prevToken, ...token }));

				resp = await run();
			}

			return await resp.json();
		},
	});

	const api = { me: client.extend("/me") };

	const [user] = createResource(
		() => authToken().toNullable(),
		async () => {
			const resp = await api.me.get(USER_PRIVATE);

			return resp;
		},
	);

	return { core, authToken, setAuthToken, user };
}

export type Ctx = ReturnType<typeof createCtx>;
