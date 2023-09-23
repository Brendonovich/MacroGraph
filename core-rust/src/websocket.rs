use std::{
    net::SocketAddr,
    ops::{Deref, DerefMut},
};

use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::IntoResponse,
    routing::get,
};
use rspc::alpha::AlphaRouter;
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
                        println!("shutdown");
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
    State((msg_tx, shutdown_rx)): State<(mpsc::Sender<String>, WebSocketShutdown)>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, msg_tx, shutdown_rx))
}

async fn handle_socket(
    mut socket: WebSocket,
    msg_tx: mpsc::Sender<String>,
    mut shutdown_rx: WebSocketShutdown,
) {
    println!("client connected");

    loop {
        tokio::select! {
            _ = shutdown_rx.recv() => return,
            Some(msg) = socket.recv() => {
                if let Ok(msg) = msg {
                    match msg {
                        Message::Text(t) => {
                            msg_tx.send(t).await.ok();
                        }
                        Message::Close(_) => {
                            println!("client disconnected");
                            return;
                        }
                        _ => {}
                    }
                } else {
                    println!("client disconnected");
                    return;
                }
            }
        };
    }
}
