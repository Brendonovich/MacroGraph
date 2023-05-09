mod http;

use rspc::{Config, Router};
use serde::Serialize;
use specta::Type;

pub fn router() -> Router {
    <Router>::new()
        .config(Config::new().export_ts_bindings(
            std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../core/src/core.ts"),
        ))
        .query("http.text", |t| {
            #[derive(Type, Serialize)]
            #[specta(inline)]
            struct Resp {
                data: String,
                status: u16,
            }

            t(|_, request: http::HTTPRequest| async move {
                let resp = request.exec().await;

                Ok(Resp {
                    status: resp.status().as_u16(),
                    data: resp.text().await.unwrap(),
                })
            })
        })
        .query("http.json", |t| {
            #[derive(Type, Serialize)]
            #[specta(inline)]
            struct Resp {
                data: serde_json::Value,
                status: u16,
            }

            t(|_, request: http::HTTPRequest| async move {
                let resp = request.exec().await;

                Ok(Resp {
                    status: resp.status().as_u16(),
                    data: resp.json().await.unwrap(),
                })
            })
        })
        .build()
}
