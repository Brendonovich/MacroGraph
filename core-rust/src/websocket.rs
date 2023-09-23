use std::net::SocketAddr;

use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::IntoResponse,
    routing::get,
};
use rspc::alpha::AlphaRouter;
use tokio::sync::{mpsc, oneshot};

use crate::R;

pub fn router() -> AlphaRouter<()> {
    R.router().procedure(
        "server",
        R.subscription(|_, port: u16| {
            let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

            let addr = SocketAddr::from(([127, 0, 0, 1], port));

            let (msg_tx, mut msg_rx) = mpsc::channel(64);

            tokio::spawn(async move {
                axum::Server::bind(&addr)
                    .serve(
                        axum::Router::new()
                            .route("/", get(ws_handler))
                            .with_state(msg_tx)
                            .into_make_service(),
                    )
                    .with_graceful_shutdown(async {
                        shutdown_rx.await.ok();
                    })
                    .await
                    .unwrap();
            });

            async_stream::stream! {
                while let Some(msg) = msg_rx.recv().await {
                    yield msg
                }

                drop(shutdown_tx);
            }
        }),
    )
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(msg_tx): State<mpsc::Sender<String>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, msg_tx))
}

async fn handle_socket(mut socket: WebSocket, msg_tx: mpsc::Sender<String>) {
    while let Some(msg) = socket.recv().await {
        if let Ok(msg) = msg {
            match msg {
                Message::Text(t) => {
                    msg_tx.send(t).await.ok();
                }
                _ => {}
            }
        } else {
            println!("client disconnected");
        }
    }
}
