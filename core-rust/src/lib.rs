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
                    routing::get(|| async move {
                        response::Html(
                            r#"
                            <!DOCTYPE html>
                            <html>
                                <head>
                                    <script>
                                        const params = new URL(document.location).searchParams;

                                        fetch("http://localhost:1820", {
                                            method: "POST",
                                            body: JSON.stringify(params.get("code")),
                                            headers: {
                                                "content-type": "application/json"
                                            }
                                        })
                                    </script>
                                </head>
                                <body>
                                    <h1>You can return to Macrograph!</h1>
                                </body>
                            </html>
                            "#,
                        )
                    }),
                );

            let addr = "0.0.0.0:1820".parse().unwrap();

            tokio::spawn(async move {
                axum::Server::bind(&addr)
                    .serve(app.into_make_service())
                    .await
                    .unwrap();
            });

            opener::open(twitch::oauth2_url(
                "ldbp0fkq9yalf2lzsi146i0cip8y59",
                "http://localhost:1820",
                vec![],
            ))
            .unwrap();

            async_stream::stream! {
                yield Message::Listening;

                if let Some(token) = rx.recv().await {
                    println!("received");
                    yield Message::Received(token)
                }
            }
        }),
    )
}
