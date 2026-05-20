//! OBS WebSocket 5.x over native TCP/WebSocket so plain `ws://` works to LAN hosts.

use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
    time::Duration,
};

use base64::{engine::general_purpose, Engine};
use futures_util::{SinkExt, StreamExt};
use rspc::{alpha::AlphaRouter, Error, ErrorCode};
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};
use specta::Type;
use tokio::sync::{broadcast, Mutex};
use tokio_websockets::{ClientBuilder, Message, WebSocketStream};
use tokio_websockets::MaybeTlsStream;

use crate::R;

type TcpWs = WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>;
type WsWrite = futures_util::stream::SplitSink<TcpWs, Message>;
type WsRead = futures_util::stream::SplitStream<TcpWs>;

/// Match `obs-websocket-js` subscriptions in `obs/ctx.ts`.
const EVENT_SUBSCRIPTIONS: u32 = {
    const ALL: u32 = (1 << 0)
        | (1 << 1)
        | (1 << 2)
        | (1 << 3)
        | (1 << 4)
        | (1 << 5)
        | (1 << 6)
        | (1 << 7)
        | (1 << 8)
        | (1 << 9)
        | (1 << 10)
        | (1 << 11);
    const INPUT_ACTIVE: u32 = 1 << 17;
    const INPUT_SHOW: u32 = 1 << 18;
    const SCENE_ITEM_XFORM: u32 = 1 << 19;
    ALL | INPUT_ACTIVE | INPUT_SHOW | SCENE_ITEM_XFORM
};

#[derive(Default, Clone)]
pub struct Ctx {
    conns: Arc<Mutex<HashMap<String, Arc<ObsConn>>>>,
}

pub struct ObsConn {
    id: AtomicU64,
    write: Mutex<WsWrite>,
    recv_task: tokio::task::JoinHandle<()>,
    event_tx: broadcast::Sender<ObsEventMsg>,
    receivers: ReceiverMap,
    batch_receivers: BatchReceiverMap,
}

#[derive(Clone, serde::Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ObsEventMsg {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lifecycle: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event_data: Option<serde_json::Value>,
}

#[derive(Deserialize)]
struct HelloData {
    #[serde(rename = "rpcVersion")]
    rpc_version: u32,
    authentication: Option<AuthChallenge>,
}

#[derive(Deserialize)]
struct AuthChallenge {
    challenge: String,
    salt: String,
}

#[derive(Deserialize)]
struct ReqStatus {
    result: bool,
    code: u16,
    comment: Option<String>,
}

#[derive(Deserialize)]
struct ReqRespBody {
    #[serde(rename = "requestId")]
    id: String,
    #[serde(rename = "requestStatus")]
    status: ReqStatus,
    #[serde(rename = "responseData", default)]
    data: serde_json::Value,
}

#[derive(Deserialize)]
struct BatchRespBody {
    #[serde(rename = "requestId")]
    id: String,
    #[serde(default)]
    results: Vec<serde_json::Value>,
}

type ReceiverMap =
    Arc<Mutex<HashMap<u64, tokio::sync::oneshot::Sender<(ReqStatus, serde_json::Value)>>>>;
type BatchReceiverMap = Arc<Mutex<HashMap<u64, tokio::sync::oneshot::Sender<Vec<serde_json::Value>>>>>;

fn obs_auth(secret: &str, salt: &str, challenge: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    hasher.update(salt.as_bytes());
    let mut step1 = general_purpose::STANDARD.encode(hasher.finalize_reset());
    hasher.update(step1.as_bytes());
    hasher.update(challenge.as_bytes());
    step1.clear();
    general_purpose::STANDARD.encode_string(hasher.finalize(), &mut step1);
    step1
}

async fn obs_handshake(
    read: &mut WsRead,
    write: &mut WsWrite,
    password: Option<&str>,
) -> Result<(), String> {
    let hello_raw = read
        .next()
        .await
        .ok_or_else(|| "connection closed before Hello".to_string())?
        .map_err(|e| e.to_string())?;
    let hello_txt = hello_raw
        .as_text()
        .ok_or_else(|| "non-text Hello".to_string())?;
    let hello: serde_json::Value =
        serde_json::from_str(hello_txt).map_err(|e| e.to_string())?;
    if hello["op"].as_u64() != Some(0) {
        return Err("expected Hello (op 0)".to_string());
    }
    let hello_d: HelloData =
        serde_json::from_value(hello["d"].clone()).map_err(|e| e.to_string())?;

    let authentication = match (hello_d.authentication, password) {
        (Some(ch), Some(pw)) => Some(obs_auth(pw, &ch.salt, &ch.challenge)),
        (Some(_), None) => return Err("OBS requires a WebSocket password".to_string()),
        (None, _) => None,
    };

    let identify = json!({
        "op": 1,
        "d": {
            "rpcVersion": hello_d.rpc_version,
            "authentication": authentication,
            "eventSubscriptions": EVENT_SUBSCRIPTIONS,
        }
    });
    let identify_txt = serde_json::to_string(&identify).map_err(|e| e.to_string())?;
    write
        .send(Message::text(identify_txt))
        .await
        .map_err(|e| e.to_string())?;

    let id_raw = read
        .next()
        .await
        .ok_or_else(|| "connection closed before Identified".to_string())?
        .map_err(|e| e.to_string())?;
    let id_txt = id_raw
        .as_text()
        .ok_or_else(|| "non-text Identified".to_string())?;
    let id_msg: serde_json::Value = serde_json::from_str(id_txt).map_err(|e| e.to_string())?;
    if id_msg["op"].as_u64() != Some(2) {
        return Err(format!("expected Identified (op 2), got {:?}", id_msg["op"]));
    }
    Ok(())
}

fn parse_ws_url(raw: &str) -> Result<(String, u16, bool), String> {
    let u = url::Url::parse(raw).map_err(|e| e.to_string())?;
    let scheme = u.scheme();
    let tls = match scheme {
        "ws" => false,
        "wss" => true,
        _ => return Err(format!("unsupported URL scheme: {scheme}")),
    };
    let host = u
        .host_str()
        .ok_or_else(|| "URL missing host".to_string())?
        .to_string();
    let port = u
        .port_or_known_default()
        .ok_or_else(|| "URL missing port".to_string())?;
    Ok((host, port, tls))
}

async fn recv_loop(
    mut read: WsRead,
    receivers: ReceiverMap,
    batch_receivers: BatchReceiverMap,
    event_tx: broadcast::Sender<ObsEventMsg>,
) {
    while let Some(msg) = read.next().await {
        let msg = match msg {
            Ok(m) => m,
            Err(_) => break,
        };
        if msg.as_close().is_some() {
            let _ = event_tx.send(ObsEventMsg {
                lifecycle: Some("closed".into()),
                event_type: None,
                event_data: None,
            });
            break;
        }
        let txt = match msg.as_text() {
            Some(t) => t,
            None => continue,
        };
        let v: serde_json::Value = match serde_json::from_str(txt) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let op = match v["op"].as_u64() {
            Some(o) => o,
            None => continue,
        };
        match op {
            5 => {
                let d = &v["d"];
                let event_type = d["eventType"].as_str().map(String::from);
                let event_data = d.get("eventData").cloned();
                if let Some(et) = event_type {
                    let _ = event_tx.send(ObsEventMsg {
                        lifecycle: None,
                        event_type: Some(et),
                        event_data,
                    });
                }
            }
            7 => {
                let body: ReqRespBody = match serde_json::from_value(v["d"].clone()) {
                    Ok(b) => b,
                    Err(_) => continue,
                };
                let id: u64 = match body.id.parse() {
                    Ok(i) => i,
                    Err(_) => continue,
                };
                if let Some(tx) = receivers.lock().await.remove(&id) {
                    let _ = tx.send((body.status, body.data));
                }
            }
            9 => {
                let body: BatchRespBody = match serde_json::from_value(v["d"].clone()) {
                    Ok(b) => b,
                    Err(_) => continue,
                };
                let id: u64 = match body.id.parse() {
                    Ok(i) => i,
                    Err(_) => continue,
                };
                if let Some(tx) = batch_receivers.lock().await.remove(&id) {
                    let _ = tx.send(body.results);
                }
            }
            _ => {}
        }
    }
    receivers.lock().await.clear();
    batch_receivers.lock().await.clear();
    let _ = event_tx.send(ObsEventMsg {
        lifecycle: Some("closed".into()),
        event_type: None,
        event_data: None,
    });
}

impl ObsConn {
    pub async fn call(
        &self,
        request_type: String,
        request_data: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, String> {
        let id = self.id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = tokio::sync::oneshot::channel();
        self.receivers.lock().await.insert(id, tx);
        let d = match request_data {
            Some(v) if !v.is_null() => json!({
                "requestType": request_type,
                "requestId": id.to_string(),
                "requestData": v,
            }),
            _ => json!({
                "requestType": request_type,
                "requestId": id.to_string(),
            }),
        };
        let msg = json!({ "op": 6, "d": d });
        let txt = serde_json::to_string(&msg).map_err(|e| e.to_string())?;
        {
            let mut w = self.write.lock().await;
            w.send(Message::text(txt))
                .await
                .map_err(|e| e.to_string())?;
        }
        let (status, data) = rx.await.map_err(|_| "OBS disconnected".to_string())?;
        if !status.result {
            return Err(
                status
                    .comment
                    .unwrap_or_else(|| format!("OBS error {}", status.code)),
            );
        }
        Ok(data)
    }

    pub async fn call_batch(
        &self,
        requests: Vec<serde_json::Value>,
    ) -> Result<Vec<serde_json::Value>, String> {
        let id = self.id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = tokio::sync::oneshot::channel();
        self.batch_receivers.lock().await.insert(id, tx);
        let d = json!({
            "requestId": id.to_string(),
            "haltOnFailure": false,
            "requests": requests,
        });
        let msg = json!({ "op": 8, "d": d });
        let txt = serde_json::to_string(&msg).map_err(|e| e.to_string())?;
        {
            let mut w = self.write.lock().await;
            w.send(Message::text(txt))
                .await
                .map_err(|e| e.to_string())?;
        }
        rx.await.map_err(|_| "OBS disconnected".to_string())
    }
}

impl Ctx {
    pub async fn connect(&self, url: String, password: Option<String>) -> Result<(), String> {
        self.disconnect(url.clone()).await;

        let (host, port, tls) = parse_ws_url(&url)?;
        let uri = format!(
            "{}://{}:{}/",
            if tls { "wss" } else { "ws" },
            host,
            port
        );

        let (socket, _response) = ClientBuilder::new()
            .uri(&uri)
            .map_err(|e| e.to_string())?
            .connect()
            .await
            .map_err(|e| e.to_string())?;

        let (mut write, mut read) = socket.split();

        obs_handshake(&mut read, &mut write, password.as_deref()).await?;

        let receivers: ReceiverMap = Arc::new(Mutex::new(HashMap::new()));
        let batch_receivers: BatchReceiverMap = Arc::new(Mutex::new(HashMap::new()));
        let (event_tx, _) = broadcast::channel(256);
        let r1 = Arc::clone(&receivers);
        let r2 = Arc::clone(&batch_receivers);
        let et = event_tx.clone();
        let join = tokio::spawn(recv_loop(read, r1, r2, et));

        let conn = Arc::new(ObsConn {
            id: AtomicU64::new(1),
            write: Mutex::new(write),
            recv_task: join,
            event_tx,
            receivers,
            batch_receivers,
        });

        self.conns.lock().await.insert(url, conn);
        Ok(())
    }

    pub async fn disconnect(&self, url: String) {
        let maybe = self.conns.lock().await.remove(&url);
        if let Some(conn) = maybe {
            if let Ok(mut w) = conn.write.try_lock() {
                let _ = w.send(Message::close(None, "")).await;
            }
            const CLOSE_WAIT: Duration = Duration::from_secs(3);
            match Arc::try_unwrap(conn) {
                Ok(conn) => {
                    let abort = conn.recv_task.abort_handle();
                    match tokio::time::timeout(CLOSE_WAIT, conn.recv_task).await {
                        Ok(Ok(())) => {}
                        Ok(Err(e)) => {
                            eprintln!("[obs-native] recv task join error for {url}: {e}")
                        }
                        Err(_) => abort.abort(),
                    }
                }
                Err(conn) => {
                    conn.recv_task.abort();
                }
            }
        }
    }

    pub async fn disconnect_all(&self) {
        let urls: Vec<String> = self.conns.lock().await.keys().cloned().collect();
        for url in urls {
            self.disconnect(url).await;
        }
    }

    async fn get(&self, url: &str) -> Result<Arc<ObsConn>, Error> {
        self.conns
            .lock()
            .await
            .get(url)
            .cloned()
            .ok_or_else(|| {
                Error::new(
                    ErrorCode::NotFound,
                    "OBS not connected for this URL".to_string(),
                )
            })
    }
}

#[derive(serde::Deserialize, serde::Serialize, Type)]
#[serde(rename_all = "camelCase")]
struct ObsConnectArgs {
    url: String,
    password: Option<String>,
}

#[derive(serde::Deserialize, serde::Serialize, Type)]
#[serde(rename_all = "camelCase")]
struct ObsCallArgs {
    url: String,
    request_type: String,
    request_data: Option<serde_json::Value>,
}

#[derive(serde::Deserialize, serde::Serialize, Type)]
#[serde(rename_all = "camelCase")]
struct ObsBatchArgs {
    url: String,
    requests: Vec<serde_json::Value>,
}

pub fn router() -> AlphaRouter<super::Ctx> {
    R.router()
        .procedure(
            "connect",
            R.mutation(|ctx, args: ObsConnectArgs| async move {
                ctx.obs_native
                    .connect(args.url, args.password)
                    .await
                    .map_err(|s| Error::new(ErrorCode::BadRequest, s))
            }),
        )
        .procedure(
            "disconnect",
            R.mutation(|ctx, url: String| async move {
                ctx.obs_native.disconnect(url).await;
            }),
        )
        .procedure(
            "disconnectAll",
            R.mutation(|ctx, _: ()| async move {
                ctx.obs_native.disconnect_all().await;
            }),
        )
        .procedure(
            "call",
            R.mutation(|ctx, args: ObsCallArgs| async move {
                let c = ctx.obs_native.get(&args.url).await?;
                c.call(args.request_type, args.request_data)
                    .await
                    .map_err(|s| Error::new(ErrorCode::BadRequest, s))
            }),
        )
        .procedure(
            "callBatch",
            R.mutation(|ctx, args: ObsBatchArgs| async move {
                let c = ctx.obs_native.get(&args.url).await?;
                c.call_batch(args.requests)
                    .await
                    .map_err(|s| Error::new(ErrorCode::BadRequest, s))
            }),
        )
        .procedure(
            "events",
            R.subscription(|ctx, url: String| async move {
                async_stream::stream! {
                    let mut sub = {
                        let m = ctx.obs_native.conns.lock().await;
                        match m.get(&url) {
                            Some(c) => c.event_tx.subscribe(),
                            None => {
                                yield ObsEventMsg {
                                    lifecycle: Some("not_connected".into()),
                                    event_type: None,
                                    event_data: None,
                                };
                                return;
                            }
                        }
                    };
                    loop {
                        match sub.recv().await {
                            Ok(ev) => yield ev,
                            Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                            Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                        }
                    }
                }
            }),
        )
}
