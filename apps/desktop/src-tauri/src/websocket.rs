use std::{
    collections::BTreeMap,
    net::{Ipv4Addr, SocketAddr},
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

use crate::{Ctx as AppCtx, R};

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

type WebsocketServerSenders = Arc<Mutex<BTreeMap<u8, mpsc::Sender<String>>>>;

#[derive(Default)]
pub struct Ctx {
    senders: Mutex<BTreeMap<u16, WebsocketServerSenders>>,
    /// Per-port broadcast to drop connected clients without stopping the listener.
    client_kicks: Mutex<BTreeMap<u16, broadcast::Sender<()>>>,
}

impl Ctx {
    /// Close every client socket on active servers; listeners keep running.
    pub async fn disconnect_all_clients(&self) {
        let kicks = self.client_kicks.lock().await;
        for (_, tx) in kicks.iter() {
            let _ = tx.send(());
        }
    }
}

fn random_id<T>(map: &BTreeMap<u8, T>) -> Option<u8> {
    let mut i = 0;

    loop {
        if !map.contains_key(&i) {
            return Some(i);
        }

        if i == u8::MAX {
            eprintln!("[ws-server] connection limit reached (256 clients)");
            return None;
        }

        i += 1;
    }
}

pub fn router() -> AlphaRouter<AppCtx> {
    R.router()
        .procedure(
            "server",
            R.subscription(|ctx, port: u16| async move {
                let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
                let (ws_shutdown_tx, ws_shutdown_rx) = broadcast::channel(1);
                let (client_kick_tx, _) = broadcast::channel::<()>(64);
                ctx.ws
                    .client_kicks
                    .lock()
                    .await
                    .insert(port, client_kick_tx.clone());

                let addr = SocketAddr::from((Ipv4Addr::UNSPECIFIED, port));

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
                                client_kick_tx,
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
                    ctx.ws.client_kicks.lock().await.remove(&port);

                    drop(shutdown_tx);
                }
            }),
        )
        .procedure(
            "disconnectAllClients",
            R.mutation(|ctx, _: ()| async move {
                ctx.ws.disconnect_all_clients().await;
            }),
        )
        .procedure(
            "send",
            R.mutation({
                #[derive(Deserialize, Type)]
                #[specta(inline)]
                struct Args {
                    port: u16,
                    client: Option<u8>,
                    data: String,
                }

                |ctx, Args { port, client, data }: Args| async move {
                    let senders = ctx.ws.senders.lock().await;

                    let Some(clients) = senders.get(&port) else {
                        return;
                    };

                    let mut clients = clients.lock().await;
                    match client {
                        Some(client_id) => {
                            let Some(tx) = clients.get(&client_id) else {
                                return;
                            };
                            if tx.send(data).await.is_err() {
                                clients.remove(&client_id);
                            }
                        }
                        None => {
                            let mut dead: Vec<u8> = Vec::new();
                            let ids: Vec<u8> = clients.keys().copied().collect();
                            for client_id in ids {
                                if let Some(tx) = clients.get(&client_id) {
                                    if tx.send(data.clone()).await.is_err() {
                                        dead.push(client_id);
                                    }
                                }
                            }
                            for client_id in dead {
                                clients.remove(&client_id);
                            }
                        }
                    }
                }
            }),
        )
}

#[derive(Clone)]
struct WsState {
    sender_txs: Arc<Mutex<BTreeMap<u8, mpsc::Sender<String>>>>,
    receiver_tx: mpsc::Sender<(u8, Message)>,
    shutdown_rx: WebSocketShutdown,
    client_kick_tx: broadcast::Sender<()>,
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<WsState>) -> Response {
    let (id, send_rx) = {
        let mut clients = state.sender_txs.lock().await;

        let (send_tx, send_rx) = mpsc::channel(16);

        let Some(id) = random_id(&clients) else {
            return axum::http::StatusCode::SERVICE_UNAVAILABLE.into_response();
        };
        clients.insert(id, send_tx);

        (id, send_rx)
    };

    let WsState {
        receiver_tx,
        sender_txs,
        shutdown_rx,
        client_kick_tx,
        ..
    } = state;
    let client_kick_rx = client_kick_tx.subscribe();
    ws.on_upgrade(move |socket| async move {
        handle_socket(
            socket,
            id,
            send_rx,
            receiver_tx,
            shutdown_rx,
            client_kick_rx,
            sender_txs,
        )
        .await;
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
    id: u8,
    mut sender_rx: mpsc::Receiver<String>,
    receiver_tx: mpsc::Sender<(u8, Message)>,
    mut shutdown_rx: WebSocketShutdown,
    mut client_kick_rx: broadcast::Receiver<()>,
    sender_txs: WebsocketServerSenders,
) {
    let _ = receiver_tx.send((id, Message::Connected)).await;

    loop {
        tokio::select! {
            _ = shutdown_rx.recv() => break,
            _ = client_kick_rx.recv() => {
                let _ = socket.send(ws::Message::Close(None)).await;
                break;
            }
            Some(msg) = sender_rx.recv() => {
                if socket.send(ws::Message::Text(msg)).await.is_err() {
                    break;
                }
            }
            Some(msg) = socket.recv() => {
                if let Ok(msg) = msg {
                    match msg {
                        ws::Message::Text(t) => {
                            if receiver_tx.send((id, Message::Text(t))).await.is_err() {
                                break;
                            }
                        }
                        ws::Message::Close(_) => break,
                        _ => {}
                    }
                } else {
                    break;
                }
            }
        };
    }

    {
        let mut clients = sender_txs.lock().await;
        clients.remove(&id);
    }

    receiver_tx.send((id, Message::Disconnected)).await.ok();
}
