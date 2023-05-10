const AUTH_URL: &str = "https://id.twitch.tv/oauth2/authorize";

pub const SCOPES: [&str; 23] = [
    "bits:read",
    "channel:read:vips",
    "channel:manage:vips",
    "clips:edit",
    "channel:manage:broadcast",
    "channel:read:subscriptions",
    "moderator:manage:shoutouts",
    "channel:manage:predictions",
    "moderation:read",
    "moderator:manage:shield_mode",
    "channel:manage:polls",
    "moderator:manage:banned_users",
    "chat:edit",
    "chat:read",
    "channel:moderate",
    "moderator:read:followers",
    "user:read:follows",
    "user:read:subscriptions",
    "channel:read:hype_train",
    "channel:manage:redemptions",
    "moderator:manage:chat_messages",
    "moderator:read:followers",
    "moderator:manage:chat_settings",
];

pub fn oauth2_url(
    client_id: &str,
    redirect_uri: &str,
    scopes: Vec<&str>,
    force_verify: bool,
    state: &str,
) -> String {
    let params = vec![
        format!("client_id={client_id}"),
        format!("redirect_uri={redirect_uri}"),
        format!("scopes={}", urlencoding::encode(&scopes.join(" "))),
        format!("response_type=code"),
        format!("force_verify={force_verify}"),
        format!("state={}", urlencoding::encode(state)),
    ]
    .join("&");

    format!("{AUTH_URL}?{}", params)
}
