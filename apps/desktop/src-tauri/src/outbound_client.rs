//! Outbound WebSocket client (generic `ws://` / `wss://`) on native sockets.

use std::{collections::HashMap, sync::Arc, time::Duration};

use futures_util::{SinkExt, StreamExt};
use rspc::{alpha::AlphaRouter, Error, ErrorCode};
use serde::{Deserialize, Serialize};
use specta::Type;
use tokio::sync::{broadcast, mpsc, Mutex};
use tokio_websockets::{ClientBuilder, Message};

use crate::R;

#[derive(Deserialize, Serialize, Type)]
#[serde(rename_all = "camelCase")]
struct OutboundSendArgs {
    url: String,
    data: String,
}

#[derive(Clone, Serialize, Type)]
pub enum OutboundClientMsg {
    Open,
    Text(String),
    Closed,
}

#[derive(Default, Clone)]
pub struct Ctx {
    pub(crate) clients: Arc<Mutex<HashMap<String, OutSession>>>,
}

pub(crate) struct OutSession {
    cmd_tx: mpsc::Sender<String>,
    _task: tokio::task::JoinHandle<()>,
    event_tx: broadcast::Sender<OutboundClientMsg>,
}

fn parse_ws_uri(raw: &str) -> Result<String, String> {
    let u = url::Url::parse(raw).map_err(|e| e.to_string())?;
    let scheme = u.scheme();
    if scheme != "ws" && scheme != "wss" {
        return Err(format!("unsupported URL scheme: {scheme}"));
    }
    let host = u
        .host_str()
        .ok_or_else(|| "URL missing host".to_string())?
        .to_string();
    let port = u
        .port_or_known_default()
        .ok_or_else(|| "URL missing port".to_string())?;
    Ok(format!("{scheme}://{host}:{port}/"))
}

async fn run_client(
    url: String,
    mut cmd_rx: mpsc::Receiver<String>,
    event_tx: broadcast::Sender<OutboundClientMsg>,
) {
    let mut backoff_ms: u64 = 1000;
    loop {
        let uri = match parse_ws_uri(&url) {
            Ok(u) => u,
            Err(_) => {
                tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
                backoff_ms = (backoff_ms * 2).min(30_000);
                continue;
            }
        };

        let builder = match ClientBuilder::new().uri(&uri) {
            Ok(b) => b,
            Err(_) => {
                tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
                backoff_ms = (backoff_ms * 2).min(30_000);
                continue;
            }
        };

        let (socket, _response) = match builder.connect().await {
            Ok(s) => s,
            Err(_) => {
                // Do not broadcast `Closed` here: the UI treats `Closed` as end of a live
                // session. Failed dial attempts are retried in this loop with backoff.
                tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
                backoff_ms = (backoff_ms * 2).min(30_000);
                continue;
            }
        };

        backoff_ms = 1000;
        let (mut write, mut read) = socket.split();
        let _ = event_tx.send(OutboundClientMsg::Open);

        loop {
            tokio::select! {
                cmd = cmd_rx.recv() => {
                    match cmd {
                        Some(text) => {
                            if write.send(Message::text(text)).await.is_err() {
                                break;
                            }
                        }
                        None => return,
                    }
                }
                incoming = read.next() => {
                    match incoming {
                        Some(Ok(m)) => {
                            if let Some(t) = m.as_text() {
                                let _ =
                                    event_tx.send(OutboundClientMsg::Text(t.to_string()));
                            } else if m.is_close() {
                                break;
                            }
                        }
                        Some(Err(_)) | None => break,
                    }
                }
            }
        }

        let _ = event_tx.send(OutboundClientMsg::Closed);
        tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
        backoff_ms = (backoff_ms * 2).min(30_000);
    }
}

impl Ctx {
    pub async fn open(&self, url: String) -> Result<(), String> {
        let mut m = self.clients.lock().await;
        if m.contains_key(&url) {
            return Ok(());
        }
        let (cmd_tx, cmd_rx) = mpsc::channel(8);
        let (event_tx, _) = broadcast::channel(512);
        let et = event_tx.clone();
        let u = url.clone();
        let task = tokio::spawn(run_client(u, cmd_rx, et));
        m.insert(
            url,
            OutSession {
                cmd_tx,
                _task: task,
                event_tx,
            },
        );
        Ok(())
    }

    pub async fn close(&self, url: String) {
        self.clients.lock().await.remove(&url);
    }

    pub async fn send(&self, url: String, data: String) -> Result<(), String> {
        let m = self.clients.lock().await;
        let s = m
            .get(&url)
            .ok_or_else(|| "WebSocket client not started for this URL".to_string())?;
        s.cmd_tx
            .send(data)
            .await
            .map_err(|_| "WebSocket send failed".to_string())
    }
}

pub fn router() -> AlphaRouter<super::Ctx> {
    R.router()
        .procedure(
            "open",
            R.mutation(|ctx, url: String| async move {
                ctx.outbound_ws
                    .open(url)
                    .await
                    .map_err(|s| Error::new(ErrorCode::BadRequest, s))
            }),
        )
        .procedure(
            "close",
            R.mutation(|ctx, url: String| async move {
                ctx.outbound_ws.close(url).await;
            }),
        )
        .procedure(
            "send",
            R.mutation(|ctx, args: OutboundSendArgs| async move {
                ctx.outbound_ws
                    .send(args.url, args.data)
                    .await
                    .map_err(|s| Error::new(ErrorCode::BadRequest, s))
            }),
        )
        .procedure(
            "messages",
            R.subscription(|ctx, url: String| async move {
                async_stream::stream! {
                    let mut sub = {
                        let m = ctx.outbound_ws.clients.lock().await;
                        match m.get(&url) {
                            Some(s) => s.event_tx.subscribe(),
                            None => {
                                yield OutboundClientMsg::Closed;
                                return;
                            }
                        }
                    };
                    loop {
                        match sub.recv().await {
                            Ok(m) => yield m,
                            Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                            Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                        }
                    }
                }
            }),
        )
}
