use reqwest::{header::HeaderMap, *};
use serde::Deserialize;
use specta::Type;
use std::collections::HashMap;

#[derive(Deserialize, Type, Debug)]
pub enum HTTPMethod {
    #[serde(rename = "GET")]
    Get,
    #[serde(rename = "POST")]
    Post,
    #[serde(rename = "PUT")]
    Put,
    #[serde(rename = "PATCH")]
    Patch,
    #[serde(rename = "DELETE")]
    Delete,
}

impl HTTPMethod {
    fn to_method(self) -> Method {
        match self {
            Self::Get => Method::GET,
            Self::Post => Method::POST,
            Self::Put => Method::PUT,
            Self::Patch => Method::PATCH,
            Self::Delete => Method::DELETE,
        }
    }
}

#[derive(Deserialize, Type, Debug)]
pub struct HTTPRequest {
    url: String,
    method: HTTPMethod,
    #[serde(default)]
    #[specta(optional)]
    headers: HashMap<String, String>,
    #[specta(optional)]
    body: Option<serde_json::Value>,
}

impl HTTPRequest {
    pub async fn exec(self) -> reqwest::Response {
        let client = reqwest::Client::new();

        let mut req = client
            .request(self.method.to_method(), self.url)
            .headers(HeaderMap::try_from(&self.headers).unwrap());

        if let Some(body) = self.body {
            req = req.json(&body);
        }

        client.execute(req.build().unwrap()).await.unwrap()
    }
}
