//! Outbound WebSocket client (generic `ws://` / `wss://`) on native sockets.

use std::{collections::HashMap, sync::Arc, time::Duration};

use futures_util::{SinkExt, StreamExt};
use rspc::{alpha::AlphaRouter, Error, ErrorCode};
use serde::{Deserialize, Serialize};
use specta::Type;
use tokio::sync::{broadcast, mpsc, watch, Mutex};
use tokio_websockets::{ClientBuilder, Message};

use crate::{Ctx as AppCtx, R};

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
    Error(String),
}

#[derive(Default, Clone)]
pub struct Ctx {
    pub(crate) clients: Arc<Mutex<HashMap<String, OutSession>>>,
}

pub(crate) struct OutSession {
    cmd_tx: mpsc::Sender<String>,
    _task: tokio::task::JoinHandle<()>,
    /// Inbound text frames from the peer.
    text_tx: broadcast::Sender<String>,
    /// Dial / read failures surfaced to the UI (not replayed; live stream only).
    error_tx: broadcast::Sender<String>,
    /// `true` while the socket is up; new subscribers read the current value immediately.
    connected_tx: watch::Sender<bool>,
}

const CONNECT_TIMEOUT: Duration = Duration::from_secs(15);

/// Stable session map key (normalizes empty path to `/`).
fn canonical_ws_url(raw: &str) -> Result<String, String> {
    let mut u = url::Url::parse(raw.trim()).map_err(|e| e.to_string())?;
    if u.path().is_empty() {
        u.set_path("/");
    }
    Ok(u.to_string())
}

fn session_for_url<'a>(
    m: &'a HashMap<String, OutSession>,
    url: &str,
) -> Option<&'a OutSession> {
    if let Ok(canonical) = canonical_ws_url(url) {
        if let Some(s) = m.get(&canonical) {
            return Some(s);
        }
    }
    if let Some(s) = m.get(url) {
        return Some(s);
    }
    let key = endpoint_key(url)?;
    m.iter()
        .find(|(u, _)| endpoint_key(u).as_deref() == Some(key.as_str()))
        .map(|(_, s)| s)
}

/// `host:port` — same key for `ws://` and `wss://` to the same target.
fn endpoint_key(url: &str) -> Option<String> {
    let u = url::Url::parse(url).ok()?;
    let host = u.host_str()?;
    let port = u.port_or_known_default()?;
    Some(format!("{}:{}", host.to_lowercase(), port))
}

fn connect_error_hint(url: &str, err: &str) -> &'static str {
    let tls_mismatch = err.contains("invalid token")
        || err.contains("SEC_E")
        || err.contains("0x80090308")
        || err.contains("-2146893048");
    if url.starts_with("wss://") && tls_mismatch {
        return " MacroGraph WebSocket servers are plain ws:// only (no TLS). Use ws://host:port.";
    }
    if url.starts_with("ws://") && tls_mismatch {
        return " TLS error on ws:// — the remote port may be speaking wss://, not plain ws://.";
    }
    ""
}

fn parse_ws_uri(raw: &str) -> Result<String, String> {
    let u = url::Url::parse(raw).map_err(|e| format!("URL parse error: {e}"))?;
    let scheme = u.scheme();
    if scheme != "ws" && scheme != "wss" {
        return Err(format!("unsupported URL scheme: {scheme}"));
    }
    if u.host_str().is_none() {
        return Err("URL missing host".to_string());
    }
    Ok(u.to_string())
}

/// `true` when the session was stopped (command channel closed).
async fn sleep_or_shutdown(cmd_rx: &mut mpsc::Receiver<String>, ms: u64) -> bool {
    if cmd_rx.is_closed() {
        return true;
    }
    let sleep = tokio::time::sleep(Duration::from_millis(ms));
    tokio::pin!(sleep);
    loop {
        tokio::select! {
            _ = &mut sleep => return false,
            _ = tokio::time::sleep(Duration::from_millis(25)) => {
                if cmd_rx.is_closed() {
                    return true;
                }
            }
        }
    }
}

async fn wait_cmd_closed(cmd_rx: &mut mpsc::Receiver<String>) {
    while !cmd_rx.is_closed() {
        tokio::time::sleep(Duration::from_millis(25)).await;
    }
}

async fn run_client(
    url: String,
    mut cmd_rx: mpsc::Receiver<String>,
    text_tx: broadcast::Sender<String>,
    error_tx: broadcast::Sender<String>,
    connected_tx: watch::Sender<bool>,
) {
    let mut backoff_ms: u64 = 1000;
    loop {
        if cmd_rx.is_closed() {
            return;
        }

        let uri = match parse_ws_uri(&url) {
            Ok(u) => u,
            Err(_) => {
                if sleep_or_shutdown(&mut cmd_rx, backoff_ms).await {
                    return;
                }
                backoff_ms = (backoff_ms * 2).min(30_000);
                continue;
            }
        };

        let builder = match ClientBuilder::new().uri(&uri) {
            Ok(b) => b,
            Err(_) => {
                if sleep_or_shutdown(&mut cmd_rx, backoff_ms).await {
                    return;
                }
                backoff_ms = (backoff_ms * 2).min(30_000);
                continue;
            }
        };

        let connect = builder.connect();
        tokio::pin!(connect);
        let connect_result = tokio::select! {
            result = tokio::time::timeout(CONNECT_TIMEOUT, &mut connect) => match result {
                Ok(Ok(s)) => Ok(s),
                Ok(Err(e)) => {
                    let err_str = e.to_string();
                    let hint = connect_error_hint(&url, &err_str);
                    Err(format!("connect failed: {err_str}{hint}"))
                }
                Err(_) => Err(format!(
                    "connect timed out after {CONNECT_TIMEOUT:?} (no response from server)"
                )),
            },
            _ = wait_cmd_closed(&mut cmd_rx) => return,
        };
        let (socket, _response) = match connect_result {
            Ok(s) => s,
            Err(detail) => {
                let _ = error_tx.send(detail);
                if sleep_or_shutdown(&mut cmd_rx, backoff_ms).await {
                    return;
                }
                backoff_ms = (backoff_ms * 2).min(30_000);
                continue;
            }
        };

        backoff_ms = 1000;
        let _ = connected_tx.send(true);

        let (mut write, mut read) = socket.split();

        loop {
            tokio::select! {
                cmd = cmd_rx.recv() => {
                    match cmd {
                        Some(text) => {
                            if write.send(Message::text(text)).await.is_err() {
                                break;
                            }
                        }
                        None => {
                            let _ = write.send(Message::close(None, "")).await;
                            let _ = connected_tx.send(false);
                            return;
                        }
                    }
                }
                incoming = read.next() => {
                    match incoming {
                        Some(Ok(m)) => {
                            if let Some(t) = m.as_text() {
                                let _ = text_tx.send(t.to_string());
                            } else if m.is_close() {
                                break;
                            }
                        }
                        Some(Err(_)) | None => break,
                    }
                }
            }
        }

        let _ = connected_tx.send(false);
        if sleep_or_shutdown(&mut cmd_rx, backoff_ms).await {
            return;
        }
        backoff_ms = (backoff_ms * 2).min(30_000);
    }
}

impl Ctx {
    /// Stop every native client dialing the same host:port (e.g. stale `wss://` after switching to `ws://`).
    pub async fn close_endpoint(&self, url: String) {
        let Some(key) = endpoint_key(&url) else {
            self.close(url).await;
            return;
        };
        let urls: Vec<String> = self
            .clients
            .lock()
            .await
            .keys()
            .filter(|u| endpoint_key(u).as_deref() == Some(key.as_str()))
            .cloned()
            .collect();
        for u in urls {
            self.close(u).await;
        }
    }

    pub async fn list(&self) -> Vec<String> {
        self.clients.lock().await.keys().cloned().collect()
    }

    pub async fn is_connected(&self, url: &str) -> bool {
        let m = self.clients.lock().await;
        session_for_url(&m, url)
            .map(|s| *s.connected_tx.borrow())
            .unwrap_or(false)
    }

    pub async fn prune_except(&self, keep: Vec<String>) {
        let keep_set: std::collections::HashSet<String> = keep.iter().cloned().collect();
        let keep_endpoints: std::collections::HashSet<String> =
            keep.iter().filter_map(|u| endpoint_key(u)).collect();
        let stale: Vec<String> = self
            .clients
            .lock()
            .await
            .keys()
            .filter(|u| {
                if keep_set.contains(*u) {
                    return false;
                }
                if let Some(ek) = endpoint_key(u) {
                    if keep_endpoints.contains(&ek) {
                        return true;
                    }
                }
                true
            })
            .cloned()
            .collect();
        for u in stale {
            self.close_endpoint(u).await;
        }
    }

    pub async fn open(&self, url: String) -> Result<(), String> {
        let url = canonical_ws_url(&url)?;
        self.close_endpoint(url.clone()).await;

        let mut m = self.clients.lock().await;
        let (cmd_tx, cmd_rx) = mpsc::channel(8);
        // Small buffer: lagging rspc subscribers drop frames instead of retaining strings.
        let (text_tx, _) = broadcast::channel(32);
        let (error_tx, _) = broadcast::channel(8);
        let (connected_tx, _) = watch::channel(false);
        let text_task = text_tx.clone();
        let error_task = error_tx.clone();
        let connected_task = connected_tx.clone();
        let u = url.clone();
        let task = tokio::spawn(run_client(
            u,
            cmd_rx,
            text_task,
            error_task,
            connected_task,
        ));
        m.insert(
            url,
            OutSession {
                cmd_tx,
                _task: task,
                text_tx,
                error_tx,
                connected_tx,
            },
        );
        Ok(())
    }

    pub async fn close(&self, url: String) {
        let session = self.clients.lock().await.remove(&url);
        if let Some(session) = session {
            drop(session.cmd_tx);
            const CLOSE_WAIT: Duration = Duration::from_secs(3);
            let abort = session._task.abort_handle();
            match tokio::time::timeout(CLOSE_WAIT, session._task).await {
                Ok(Ok(())) => {}
                Ok(Err(_)) | Err(_) => {
                    abort.abort();
                }
            }
        }
    }

    pub async fn close_all(&self) {
        let urls: Vec<String> = self.clients.lock().await.keys().cloned().collect();
        for url in urls {
            self.close(url).await;
        }
    }

    pub async fn send(&self, url: String, data: String) -> Result<(), String> {
        let m = self.clients.lock().await;
        let s = session_for_url(&m, &url)
            .ok_or_else(|| "WebSocket client not started for this URL".to_string())?;
        s.cmd_tx
            .send(data)
            .await
            .map_err(|e| format!("WebSocket send failed: {e}"))
    }
}

pub fn router() -> AlphaRouter<AppCtx> {
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
                ctx.outbound_ws.close_endpoint(url).await;
            }),
        )
        .procedure(
            "closeAll",
            R.mutation(|ctx, _: ()| async move {
                ctx.outbound_ws.close_all().await;
            }),
        )
        .procedure(
            "list",
            R.query(|ctx, _: ()| async move { ctx.outbound_ws.list().await }),
        )
        .procedure(
            "isConnected",
            R.query(|ctx, url: String| async move { ctx.outbound_ws.is_connected(&url).await }),
        )
        .procedure(
            "pruneExcept",
            R.mutation(|ctx, keep: Vec<String>| async move {
                ctx.outbound_ws.prune_except(keep).await;
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
                    let (mut connected_rx, mut text_rx, mut error_rx) = loop {
                        let m = ctx.outbound_ws.clients.lock().await;
                        if let Some(s) = session_for_url(&m, &url) {
                            break (
                                s.connected_tx.subscribe(),
                                s.text_tx.subscribe(),
                                s.error_tx.subscribe(),
                            );
                        }
                        drop(m);
                        tokio::time::sleep(Duration::from_millis(50)).await;
                    };

                    if *connected_rx.borrow_and_update() {
                        yield OutboundClientMsg::Open;
                    }

                    loop {
                        tokio::select! {
                            biased;
                            changed = connected_rx.changed() => {
                                if changed.is_err() {
                                    break;
                                }
                                if *connected_rx.borrow_and_update() {
                                    yield OutboundClientMsg::Open;
                                } else {
                                    yield OutboundClientMsg::Closed;
                                }
                            }
                            text = text_rx.recv() => {
                                match text {
                                    Ok(t) => yield OutboundClientMsg::Text(t),
                                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {}
                                    Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                                }
                            }
                            err = error_rx.recv() => {
                                match err {
                                    Ok(message) => {
                                        if *connected_rx.borrow() {
                                            continue;
                                        }
                                        yield OutboundClientMsg::Error(message);
                                    }
                                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {}
                                    Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                                }
                            }
                        }
                    }
                }
            }),
        )
}
