use axum::extract::Query;
use base64::prelude::*;
use rspc::alpha::AlphaRouter;
use serde_json::json;

use crate::R;

pub fn router() -> AlphaRouter<super::Ctx> {
    R.router().procedure(
        "authorize",
        R.subscription(|_, url: String| async move {
            use axum::*;

            let (tx, mut rx) = tokio::sync::mpsc::channel(4);

            #[derive(serde::Deserialize)]
            struct Response {
                token: String,
            }

            // build our application with a route
            let app = <Router>::new()
                .layer(tower_http::cors::CorsLayer::very_permissive())
                .route(
                    "/",
                    routing::get(|Query(resp): Query<Response>| async move {
                        tx.send(
                            serde_json::from_slice::<serde_json::Value>(
                                &BASE64_STANDARD.decode(resp.token).unwrap(),
                            )
                            .unwrap(),
                        )
                        .await
                        .expect("no send?!");
                        "You can return to macrograph!"
                    }),
                );

            let addr = "127.0.0.1:0".parse().unwrap();

            let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

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

            opener::open(format!(
                "{}?state={}",
                url,
                base64::prelude::BASE64_STANDARD.encode(
                    &serde_json::to_string(&json!({
                        "env": "desktop",
                        "port": port
                    }))
                    .unwrap()
                ),
            ))
            .expect("Failed to open twitch URL!");

            async_stream::stream! {
                let response = rx.recv().await;

                shutdown_tx.send(()).ok();

                yield response
            }
        }),
    )
}
