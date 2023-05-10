const AUTH_URL: &str = "https://id.twitch.tv/oauth2/authorize";

pub fn oauth2_url(
    client_id: &str,
    redirect_uri: &str,
    scopes: Vec<String>,
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
