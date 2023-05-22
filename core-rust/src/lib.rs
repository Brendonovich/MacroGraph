mod http;
pub mod twitch;

use axum::extract::Query;
use rspc::{
    alpha::{AlphaRouter, Rspc},
    Config, Router,
};
use serde::{Deserialize, Serialize};
use specta::Type;

#[allow(non_upper_case_globals)]
pub(self) const R: Rspc<()> = Rspc::new();

pub fn router() -> Router {
    R.router()
        .merge("http.", http())
        .merge("auth.", auth())
        .build(Config::new().export_ts_bindings(
            std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../core/src/core.ts"),
        ))
}

const MACROGRAPH_DOT_APP: &str = "https://macrograph.vercel.app";

fn http() -> AlphaRouter<()> {
    #[derive(Type, Serialize)]
    #[specta(inline)]
    struct Resp<T> {
        data: T,
        status: u16,
    }

    R.router()
        .procedure(
            "text",
            R.query(|_, request: http::HTTPRequest| async move {
                let resp = request.exec().await;

                Ok(Resp {
                    status: resp.status().as_u16(),
                    data: resp.text().await.unwrap(),
                })
            }),
        )
        .procedure(
            "json",
            R.query(|_, request: http::HTTPRequest| async move {
                let resp = request.exec().await;

                Ok(Resp {
                    status: resp.status().as_u16(),
                    data: resp.json::<serde_json::Value>().await.unwrap(),
                })
            }),
        )
}

fn auth() -> AlphaRouter<()> {
    R.router().procedure(
        "twitch",
        R.subscription(|_, _: ()| async move {
            use axum::*;

            #[derive(Type, Serialize)]
            #[specta(inline)]
            enum Message {
                Listening,
                #[serde(rename_all = "camelCase")]
                Received {
                    access_token: String,
                    refresh_token: String,
                    scope: Vec<String>,
                    expires_in: u32,
                },
            }

            let (tx, mut rx) = tokio::sync::mpsc::channel(4);

            #[derive(Deserialize, Debug)]
            struct TokenData {
                access_token: String,
                refresh_token: String,
                scope: Vec<String>,
                expires_in: u32,
            }

            #[derive(Deserialize, Debug)]
            struct Params {
                token: String,
            }

            // build our application with a route
            let app = <Router>::new()
                .layer(tower_http::cors::CorsLayer::very_permissive())
                .route(
                    "/",
                    routing::get(|Query(params): Query<Params>| async move {
                        tx.send(serde_json::from_str::<TokenData>(&params.token).unwrap())
                            .await
                            .expect("no send?!");
                        "You can return to macrograph!"
                    }),
                );

            let addr = format!(
                "127.0.0.1:{}",
                cfg!(debug_assertions).then_some(1820).unwrap_or(0)
            )
            .parse()
            .unwrap();

            let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

            let server = axum::Server::bind(&addr).serve(app.into_make_service());

            let port = server.local_addr().port();

            tokio::spawn(async move {
                server
                    .with_graceful_shutdown(async {
                        shutdown_rx.await.ok();
                        println!("shutting down!")
                    })
                    .await
                    .unwrap();
            });

            let redirect_uri = format!(
                "{}/auth/twitch",
                match std::env::var("API_ORIGIN") {
                    Ok(o) => o,
                    Err(_) => MACROGRAPH_DOT_APP.to_string(),
                }
            );

            opener::open(twitch::oauth2_url(
                "ldbp0fkq9yalf2lzsi146i0cip8y59",
                &redirect_uri,
                twitch::SCOPES.into_iter().collect(),
                true,
                &serde_json::to_string(&serde_json::json!({
                    "port": port,
                    "redirect_uri": redirect_uri
                }))
                .unwrap(),
            ))
            .expect("Failed to open twitch URL!");

            async_stream::stream! {
                yield Message::Listening;

                if let Some(token) = rx.recv().await {
                    yield Message::Received {
                        access_token: token.access_token,
                        refresh_token: token.refresh_token,
                        expires_in: token.expires_in,
                        scope: token.scope
                    };
                }

                shutdown_tx.send(()).ok();
            }
        }),
    )
}
