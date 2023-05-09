const AUTH_URL: &str = "https://id.twitch.tv/oauth2/authorize";

pub fn oauth2_url(client_id: &str, redirect_uri: &str, scopes: Vec<String>) -> String {
    format!(
        "{AUTH_URL}?client_id={}&redirect_uri={}&scopes={}&response_type=code",
        client_id,
        redirect_uri,
        scopes.join(","),
    )
}

