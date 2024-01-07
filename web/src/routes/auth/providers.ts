import { env } from "~/env/server";

export const AuthProviders: Record<string, AuthProviderConfig> = {
  twitch: {
    clientId: env.TWITCH_CLIENT_ID,
    clientSecret: env.TWITCH_CLIENT_SECRET,
    authorize: {
      url: "https://id.twitch.tv/oauth2/authorize",
      searchParams: { force_verify: "true" },
    },
    token: { url: "https://id.twitch.tv/oauth2/token" },
    get scopes() {
      return TWITCH_SCOPES;
    },
  },
  discord: {
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    authorize: { url: "https://discord.com/api/oauth2/authorize" },
    token: { url: "https://discord.com/api/oauth2/token" },
    scopes: ["identify", "email"],
  },
  github: {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    authorize: {
      url: "https://accounts.google.com/o/oauth2/v2/auth",
    },
    token: {
      url: "https://github.com/login/oauth/access_token",
      headers: { Accept: "application/json" },
    },
    scopes: [],
  },
  spotify: {
    clientId: env.SPOTIFY_CLIENT_ID,
    clientSecret: env.SPOTIFY_CLIENT_SECRET,
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
          `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
    },
  },
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    authorize: { url: "https://accounts.google.com/o/oauth2/v2/auth" },
    token: {
      url: "https://oauth2.googleapis.com/token",
      searchParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
    scopes: [
      "https://www.googleapis.com/auth/youtube",
      "email",
      "profile",
      "openid",
    ],
  },
  patreon: {
    clientId: env.PATREON_CLIENT_ID,
    clientSecret: env.PATREON_CLIENT_SECRET,
    authorize: { url: "https://www.patreon.com/oauth2/authorize" },
    token: { url: "https://www.patreon.com/api/oauth2/token" },
    scopes: [],
  },
  streamlabs: {
    clientId: env.STREAMLABS_CLIENT_ID,
    clientSecret: env.STREAMLABS_CLIENT_SECRET,
    authorize: { url: "https://streamlabs.com/api/v2.0/authorize" },
    token: { url: "https://streamlabs.com/api/v2.0/token" },
    refresh: false,
    scopes: [],
  },
};

interface AuthProviderConfig {
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
