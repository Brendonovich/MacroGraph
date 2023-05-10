mod http;
pub mod twitch;

use rspc::{
    alpha::{AlphaRouter, Rspc},
    Config, Router,
};
use serde::Serialize;
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
                Received(String),
            }

            let (tx, mut rx) = tokio::sync::mpsc::channel(4);

            // build our application with a route
            let app = <Router>::new()
                .route(
                    "/",
                    routing::post(|Json(payload): Json<String>| async move {
                        tx.send(payload).await.expect("no send?!");
                        "bruh"
                    }),
                )
                .route(
                    "/",
                    routing::get(|| async move { response::Html(include_str!("./twitch.html")) }),
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
                    })
                    .await
                    .unwrap();
            });

            opener::open(twitch::oauth2_url(
                "ldbp0fkq9yalf2lzsi146i0cip8y59",
                &format!("http://localhost:{port}"),
                vec![],
                true,
                serde_json::json!({ "port": port }),
            ))
            .expect("Failed to open twitch URL!");

            async_stream::stream! {
                yield Message::Listening;

                if let Some(token) = rx.recv().await {
                    yield Message::Received(token);
                }

                shutdown_tx.send(()).ok();
            }
        }),
    )
}