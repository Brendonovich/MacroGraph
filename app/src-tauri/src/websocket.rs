use std::{
    net::SocketAddr,
    ops::{Deref, DerefMut},
};

use axum::{
    extract::{ws, State, WebSocketUpgrade},
    response::IntoResponse,
    routing::get,
};
use rspc::alpha::AlphaRouter;
use serde::Serialize;
use specta::Type;
use tokio::sync::{broadcast, mpsc, oneshot};

use crate::R;

struct WebSocketShutdown(broadcast::Receiver<()>);

impl Clone for WebSocketShutdown {
    fn clone(&self) -> Self {
        Self(self.0.resubscribe())
    }
}

impl Deref for WebSocketShutdown {
    type Target = broadcast::Receiver<()>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for WebSocketShutdown {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

pub fn router() -> AlphaRouter<()> {
    R.router().procedure(
        "server",
        R.subscription(|_, port: u16| {
            let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
            let (ws_shutdown_tx, ws_shutdown_rx) = broadcast::channel(1);

            let addr = SocketAddr::from(([127, 0, 0, 1], port));

            let (msg_tx, mut msg_rx) = mpsc::channel(64);

            tokio::spawn(async move {
                axum::Server::bind(&addr)
                    .serve(
                        axum::Router::new()
                            .route("/", get(ws_handler))
                            .with_state((msg_tx, WebSocketShutdown(ws_shutdown_rx)))
                            .into_make_service(),
                    )
                    .with_graceful_shutdown(async {
                        shutdown_rx.await.ok();
                        ws_shutdown_tx.send(()).ok();
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
    State((msg_tx, shutdown_rx)): State<(mpsc::Sender<Message>, WebSocketShutdown)>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, msg_tx, shutdown_rx))
}

#[derive(Serialize, Type)]
enum Message {
    Text(String),
    Connected,
    Disconnected,
}

async fn handle_socket(
    mut socket: ws::WebSocket,
    msg_tx: mpsc::Sender<Message>,
    mut shutdown_rx: WebSocketShutdown,
) {
    msg_tx.send(Message::Connected).await.ok();

    loop {
        tokio::select! {
            _ = shutdown_rx.recv() => return,
            Some(msg) = socket.recv() => {
                if let Ok(msg) = msg {
                    match msg {
                        ws::Message::Text(t) => {
                            msg_tx.send(Message::Text(t)).await.ok();
                        }
                        ws::Message::Close(_) => {
                            break;
                        }
                        _ => {}
                    }
                } else {
                    break;
                }
            }
        };
    }

    msg_tx.send(Message::Disconnected).await.ok();
}
