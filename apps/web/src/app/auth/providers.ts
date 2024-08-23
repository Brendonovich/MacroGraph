import { createHTTPClient } from "@macrograph/http-client";
import { serverEnv } from "~/env/server";

import type * as DiscordAPI from "@macrograph/packages/src/discord/api";
import type * as PatreonAPI from "@macrograph/packages/src/patreon/ctx";
import type * as SpotifyAPI from "@macrograph/packages/src/spotify/ctx";
import type * as TwitchHelix from "@macrograph/packages/src/twitch/helix";

export const AuthProviders: Record<string, AuthProviderConfig> = {
	twitch: {
		clientId: serverEnv.TWITCH_CLIENT_ID,
		clientSecret: serverEnv.TWITCH_CLIENT_SECRET,
		authorize: {
			url: "https://id.twitch.tv/oauth2/authorize",
			searchParams: {
				// https://discuss.dev.twitch.com/t/force-verify-true-causing-502-error-with-authorization-flow-when-not-logged-in/59964
				force_verify: "true",
			},
		},
		token: { url: "https://id.twitch.tv/oauth2/token" },
		get scopes() {
			return TWITCH_SCOPES;
		},
		async getUserData(accessToken) {
			const client = createHTTPClient<TwitchHelix.Requests, string>({
				root: "https://api.twitch.tv/helix",
				fetch: async (accessToken, url, args) => {
					const r = await fetch(url, {
						headers: {
							...args?.headers,
							"content-type": "application/json",
							"Client-Id": this.clientId,
							Authorization: `Bearer ${accessToken}`,
						},
						...args,
					});
					return await r.json();
				},
			});

			const users = await client.call("GET /users", accessToken);

			const user = users.data[0];
			if (!user) throw new Error("Failed to get user");

			return { id: user.id, displayName: user.display_name };
		},
	},
	discord: {
		clientId: serverEnv.DISCORD_CLIENT_ID,
		clientSecret: serverEnv.DISCORD_CLIENT_SECRET,
		authorize: { url: "https://discord.com/api/oauth2/authorize" },
		token: { url: "https://discord.com/api/oauth2/token" },
		scopes: ["identify", "email"],
		async getUserData(accessToken) {
			const client = createHTTPClient<DiscordAPI.Requests, string>({
				root: "https://discord.com/api/v10",
				fetch: async (accessToken, url, args) => {
					const r = await fetch(url, {
						headers: {
							...args?.headers,
							"Content-Type": "application/json",
							Authorization: `Bearer ${accessToken}`,
						},
						...args,
					});
					return await r.json();
				},
			});

			const user = await client.call("GET /users/@me", accessToken);
			if (!user) throw new Error("Failed to get user");

			return {
				id: user.id,
				displayName: user.global_name ?? user.username,
			};
		},
	},
	github: {
		clientId: serverEnv.GITHUB_CLIENT_ID,
		clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
		authorize: {
			url: "https://github.com/login/oauth/authorize",
		},
		token: {
			url: "https://github.com/login/oauth/access_token",
			headers: { Accept: "application/json" },
		},
		scopes: [],
		async getUserData(accessToken) {
			const octo = await import("octokit").then(
				({ Octokit }) => new Octokit({ auth: accessToken }),
			);

			const user = await octo.rest.users.getAuthenticated();

			return {
				id: user.data.id.toString(),
				displayName: user.data.login,
			};
		},
	},
	spotify: {
		clientId: serverEnv.SPOTIFY_CLIENT_ID,
		clientSecret: serverEnv.SPOTIFY_CLIENT_SECRET,
		scopes: ["user-read-private", "user-read-email"],
		authorize: {
			url: "https://accounts.spotify.com/authorize",
			searchParams: { show_dialog: "true" },
		},
		token: {
			url: "https://accounts.spotify.com/api/token",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Basic ${Buffer.from(
					`${serverEnv.SPOTIFY_CLIENT_ID}:${serverEnv.SPOTIFY_CLIENT_SECRET}`,
				).toString("base64")}`,
			},
		},
		async getUserData(accessToken) {
			const client = createHTTPClient<SpotifyAPI.Requests, string>({
				root: "https://api.spotify.com/v1",
				fetch: async (accessToken, url, opts) => {
					const r = await fetch(url, {
						...opts,
						headers: {
							Authorization: `Bearer ${accessToken}`,
							...opts?.headers,
						},
					});
					return await r.json();
				},
			});

			const user = await client.call("GET /me", accessToken);
			if (!user) throw new Error("Failed to get user");

			return {
				id: user.id,
				displayName: user.display_name ?? user.email,
			};
		},
	},
	google: {
		clientId: serverEnv.GOOGLE_CLIENT_ID,
		clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
		authorize: {
			url: "https://accounts.google.com/o/oauth2/v2/auth",
			searchParams: {
				access_type: "offline",
				prompt: "consent",
			},
		},
		token: {
			url: "https://oauth2.googleapis.com/token",
		},
		scopes: [
			"https://www.googleapis.com/auth/youtube",
			"email",
			"profile",
			"openid",
		],
	},
	patreon: {
		clientId: serverEnv.PATREON_CLIENT_ID,
		clientSecret: serverEnv.PATREON_CLIENT_SECRET,
		authorize: { url: "https://www.patreon.com/oauth2/authorize" },
		token: { url: "https://www.patreon.com/api/oauth2/token" },
		scopes: ["identity"],
		async getUserData(accessToken) {
			const client = createHTTPClient<PatreonAPI.Requests, string>({
				root: "https://www.patreon.com/api",
				fetch: async (accessToken, url, opts) => {
					const r = await fetch(url, {
						...opts,
						headers: {
							Authorization: `Bearer ${accessToken}`,
							...opts?.headers,
						},
					});
					return await r.json();
				},
			});

			const { data } = await client.call(
				"GET /oauth2/api/current_user",
				accessToken,
			);

			return {
				id: data.id,
				displayName: data.attributes.full_name,
			};
		},
	},
	streamlabs: {
		clientId: serverEnv.STREAMLABS_CLIENT_ID,
		clientSecret: serverEnv.STREAMLABS_CLIENT_SECRET,
		authorize: { url: "https://streamlabs.com/api/v2.0/authorize" },
		token: { url: "https://streamlabs.com/api/v2.0/token" },
		refresh: false,
		scopes: [],
	},
};

export type AuthProvider = keyof typeof AuthProviders;

export interface AuthProviderConfig {
	clientId: string;
	clientSecret: string;
	/**
	 * @defaultValue `{ path: "/authorize" }`
	 */
	authorize: OAuthFetchConfig;
	/**
	 * @defaultValue `{ path: "/token" }`
	 */
	token: OAuthFetchConfig;
	/**
	 * @defaultValue `true`
	 */
	refresh?: boolean;
	scopes: string[];
	getUserData?(
		accessToken: string,
	): Promise<{ id: string; displayName: string }>;
}

type OAuthFetchConfig = {
	url: `http${string}`;
	searchParams?: Record<string, any>;
	headers?: Record<string, string>;
};

const TWITCH_SCOPES = [
	"analytics:read:extensions",
	"analytics:read:games",
	"bits:read",
	"channel:edit:commercial",
	"channel:manage:broadcast",
	"channel:read:charity",
	"channel:manage:extensions",
	"channel:manage:moderators",
	"channel:manage:polls",
	"channel:manage:predictions",
	"channel:manage:raids",
	"channel:manage:redemptions",
	"channel:manage:schedule",
	"channel:manage:videos",
	"channel:manage:vips",
	"channel:moderate",
	"channel:manage:redemptions",
	"channel:read:editors",
	"channel:read:goals",
	"channel:read:hype_train",
	"channel:read:polls",
	"channel:read:predictions",
	"channel:read:redemptions",
	"channel:read:stream_key",
	"channel:read:subscriptions",
	"channel:read:vips",
	"channel:read:ads",
	"chat:edit",
	"chat:read",
	"clips:edit",
	"moderation:read",
	"moderator:manage:announcements",
	"moderator:manage:automod_settings",
	"moderator:manage:banned_users",
	"moderator:manage:chat_messages",
	"moderator:manage:chat_settings",
	"moderator:manage:shield_mode",
	"moderator:manage:shoutouts",
	"moderator:manage:warnings",
	"moderator:read:automod_settings",
	"moderator:read:blocked_terms",
	"moderator:read:chat_settings",
	"moderator:read:chatters",
	"moderator:read:followers",
	"moderator:read:shield_mode",
	"moderator:read:shoutouts",
	"user:edit",
	"user:manage:blocked_users",
	"user:manage:chat_color",
	"user:manage:whispers",
	"user:read:blocked_users",
	"user:read:broadcast",
	"user:read:email",
	"user:read:follows",
	"user:read:chat",
	"user:read:subscriptions",
	"whispers:read",
	"whispers:edit",
];
