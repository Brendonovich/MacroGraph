use std::{
    collections::BTreeMap,
    net::SocketAddr,
    ops::{Deref, DerefMut},
    sync::Arc,
};

use axum::{
    extract::{ws, State, WebSocketUpgrade},
    response::{IntoResponse, Response},
    routing::get,
};
use rspc::alpha::AlphaRouter;
use serde::{Deserialize, Serialize};
use specta::Type;
use tokio::sync::{broadcast, mpsc, oneshot, Mutex};

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

#[derive(Default)]
pub struct Ctx {
    senders: Mutex<BTreeMap<u16, Arc<Mutex<BTreeMap<u8, mpsc::Sender<String>>>>>>,
}

fn random_id<T>(map: &BTreeMap<u8, T>) -> u8 {
    let mut i = 0;

    loop {
        if !map.contains_key(&i) {
            break;
        }

        if i == u8::MAX {
            panic!("No more ids available");
        }

        i += 1;
    }

    i
}

pub fn router() -> AlphaRouter<super::Ctx> {
    R.router()
        .procedure(
            "server",
            R.subscription(|ctx, port: u16| async move {
                let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
                let (ws_shutdown_tx, ws_shutdown_rx) = broadcast::channel(1);

                let addr = SocketAddr::from(([127, 0, 0, 1], port));

                let (receiver_tx, mut receiver_rx) = mpsc::channel::<(u8, Message)>(16);

                let sender_txs = {
                    let mut senders = ctx.ws.senders.lock().await;
                    senders.entry(port).or_default().clone()
                };

                let server = axum::Server::bind(&addr)
                    .serve(
                        axum::Router::new()
                            .route("/", get(ws_handler))
                            .with_state(WsState {
                                receiver_tx,
                                sender_txs,
                                shutdown_rx: WebSocketShutdown(ws_shutdown_rx),
                            })
                            .into_make_service(),
                    )
                    .with_graceful_shutdown(async move {
                        shutdown_rx.await.ok();
                        ws_shutdown_tx.send(()).ok();
                    });

                tokio::spawn(server);

                async_stream::stream! {
                    while let Some(msg) = receiver_rx.recv().await {
                        yield msg
                    }

                    ctx.ws.senders.lock().await.remove(&port);

                    drop(shutdown_tx);
                }
            }),
        )
        .procedure(
            "send",
            R.mutation({
                #[derive(Deserialize, Type)]
                #[specta(inline)]
                struct Args {
                    port: u16,
                    client: u8,
                    data: String,
                }

                |ctx, Args { port, client, data }: Args| async move {
                    let senders = ctx.ws.senders.lock().await;

                    let Some(clients) = senders.get(&port) else {
                        return;
                    };

                    let clients = clients.lock().await;
                    let Some(client) = clients.get(&client) else {
                        return;
                    };

                    client.send(data).await.ok();
                }
            }),
        )
}

#[derive(Clone)]
struct WsState {
    sender_txs: Arc<Mutex<BTreeMap<u8, mpsc::Sender<String>>>>,
    receiver_tx: mpsc::Sender<(u8, Message)>,
    shutdown_rx: WebSocketShutdown,
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<WsState>) -> Response {
    let (id, send_rx) = {
        let mut clients = state.sender_txs.lock().await;

        let (send_tx, send_rx) = mpsc::channel(16);

        let id = random_id(&clients);
        clients.insert(id, send_tx);

        (id, send_rx)
    };

    ws.on_upgrade(move |socket| async move {
        handle_socket(socket, state, id, send_rx).await;
    })
}

#[derive(Serialize, Type)]
enum Message {
    Text(String),
    Connected,
    Disconnected,
}

async fn handle_socket(
    mut socket: ws::WebSocket,
    WsState {
        receiver_tx,
        mut shutdown_rx,
        ..
    }: WsState,
    id: u8,
    mut sender_rx: mpsc::Receiver<String>,
) {
    receiver_tx.send((id, Message::Connected)).await.ok();

    loop {
        tokio::select! {
            _ = shutdown_rx.recv() => return,
            Some(msg) = sender_rx.recv() => {
                socket.send(ws::Message::Text(msg)).await.ok();
            }
            Some(msg) = socket.recv() => {
                if let Ok(msg) = msg {
                    match msg {
                        ws::Message::Text(t) => {
                            receiver_tx.send((id, Message::Text(t))).await.ok();
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

    receiver_tx.send((id, Message::Disconnected)).await.ok();
}
