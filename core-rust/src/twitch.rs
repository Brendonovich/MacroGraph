const AUTH_URL: &str = "https://id.twitch.tv/oauth2/authorize";

pub const SCOPES: [&str; 33] = [
    "channel.update",
    "channel.follow",
    "channel.subscribe",
    "channel.subscription.end",
    "channel.subscription.gift",
    "channel.subscription.message",
    "channel.cheer",
    "channel.raid",
    "channel.ban",
    "channel.unban",
    "channel.moderator.add",
    "channel.moderator.remove",
    "channel.channel_points_custom_reward.add",
    "channel.channel_points_custom_reward.update",
    "channel.channel_points_custom_reward.remove",
    "channel.channel_points_custom_reward_redemption.add",
    "channel.channel_points_custom_reward_redemption.update",
    "channel.poll.begin",
    "channel.poll.progress",
    "channel.poll.end",
    "channel.prediction.begin",
    "channel.prediction.progress",
    "channel.prediction.lock",
    "channel.prediction.end",
    "channel.hype_train.begin",
    "channel.hype_train.progress",
    "channel.hype_train.end",
    "channel.shield_mode.begin",
    "channel.shield_mode.end",
    "channel.shoutout.create",
    "channel.shoutout.receive",
    "stream.online",
    "stream.offline",
];

pub fn oauth2_url(
    client_id: &str,
    redirect_uri: &str,
    scopes: Vec<&str>,
    force_verify: bool,
    state: serde_json::Value,
) -> String {
    format!(
        "{AUTH_URL}?client_id={}&redirect_uri={}&scopes={}&response_type=code&force_verify={}&state={}",
        client_id,
        redirect_uri,
        scopes.join(","),
        force_verify,
        urlencoding::encode(&serde_json::to_string(&state).unwrap())
    )
}
