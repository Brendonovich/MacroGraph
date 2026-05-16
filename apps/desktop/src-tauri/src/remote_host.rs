use std::{
	collections::BTreeMap,
	net::{Ipv4Addr, SocketAddr},
	ops::{Deref, DerefMut},
	path::PathBuf,
	sync::Arc,
};

use axum::{
	extract::{ws, WebSocketUpgrade},
	response::{Html, IntoResponse},
	routing::get,
	Router,
};
use rspc::alpha::AlphaRouter;
use serde::Deserialize;
use serde_json::Value;
use specta::Type;
use tokio::sync::{broadcast, mpsc, oneshot, Mutex};
use tower_http::services::ServeDir;

use crate::R;

struct RemoteWsShutdown(broadcast::Receiver<()>);

impl Clone for RemoteWsShutdown {
	fn clone(&self) -> Self {
		Self(self.0.resubscribe())
	}
}

impl Deref for RemoteWsShutdown {
	type Target = broadcast::Receiver<()>;

	fn deref(&self) -> &Self::Target {
		&self.0
	}
}

impl DerefMut for RemoteWsShutdown {
	fn deref_mut(&mut self) -> &mut Self::Target {
		&mut self.0
	}
}

type ClientSenders = Arc<Mutex<BTreeMap<u8, mpsc::Sender<String>>>>;

pub struct Ctx {
	senders: Mutex<BTreeMap<u16, ClientSenders>>,
	pub password: Arc<Mutex<Option<String>>>,
}

impl Default for Ctx {
	fn default() -> Self {
		Self {
			senders: Default::default(),
			password: Arc::new(Mutex::new(None)),
		}
	}
}

fn random_client_id<T>(map: &BTreeMap<u8, T>) -> u8 {
	let mut i = 0u8;
	loop {
		if !map.contains_key(&i) {
			break;
		}
		if i == u8::MAX {
			panic!("No more remote client ids available");
		}
		i += 1;
	}
	i
}

enum HandshakeResult {
	ReadyWithUser(String),
	/// No password on host; first message was not `auth` — forward to host app.
	ForwardFirst(String),
}

async fn remote_handshake(
	socket: &mut ws::WebSocket,
	password_expected: Option<String>,
	ws_shutdown_rx: &mut RemoteWsShutdown,
) -> Result<HandshakeResult, ()> {
	let need_auth = password_expected
		.as_ref()
		.map(|s| !s.is_empty())
		.unwrap_or(false);

	loop {
		tokio::select! {
			_ = ws_shutdown_rx.recv() => return Err(()),
			msg = socket.recv() => {
				let msg = match msg {
					Some(Ok(m)) => m,
					_ => return Err(()),
				};
				match msg {
					ws::Message::Text(t) => {
						let v: Value = match serde_json::from_str(&t) {
							Ok(v) => v,
							Err(_) => {
								if need_auth {
									return Err(());
								}
								return Ok(HandshakeResult::ForwardFirst(t));
							}
						};
						let ty = v.get("type").and_then(|x| x.as_str());
						if ty == Some("auth") {
							let pwd = v
								.get("password")
								.and_then(|x| x.as_str())
								.unwrap_or("");
							let username = v.get("username").and_then(|x| x.as_str()).unwrap_or("remote").to_string();
							if need_auth {
								let exp = password_expected.as_deref().ok_or(())?;
								if pwd != exp {
									return Err(());
								}
								return Ok(HandshakeResult::ReadyWithUser(username));
							}
							return Ok(HandshakeResult::ReadyWithUser(username));
						}
						if need_auth {
							return Err(());
						}
						return Ok(HandshakeResult::ForwardFirst(t));
					}
					ws::Message::Close(_) => return Err(()),
					_ => {}
				}
			}
		}
	}
}

pub fn router() -> AlphaRouter<super::Ctx> {
	R.router()
		.procedure(
			"setPassword",
			R.mutation(|ctx, password: Option<String>| async move {
				let normalized = password.filter(|s| !s.is_empty());
				*ctx.remote_host.password.lock().await = normalized;
			}),
		)
		.procedure(
			"server",
			R.subscription(|ctx, port: u16| async move {
				let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
				let (ws_shutdown_tx, ws_shutdown_rx) = broadcast::channel(1);

				let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("remote-public");
				let index_html: Arc<str> = match std::fs::read_to_string(root.join("index.html")) {
					Ok(s) => s.into(),
					Err(_) => "<!doctype html><html><head><meta charset=\"utf-8\"><title>MacroGraph Remote</title></head><body style=\"font-family:system-ui;padding:2rem;background:#111;color:#eee\"><h1>Remote editor assets missing</h1><p>From the repo root run:</p><pre style=\"background:#222;padding:1rem\">pnpm --filter @macrograph/remote-editor build</pre></body></html>".into(),
				};

				let assets_dir = root.join("assets");
				let assets_exists = assets_dir.is_dir();

				let addr = SocketAddr::from((Ipv4Addr::UNSPECIFIED, port));

				let (receiver_tx, mut receiver_rx) = mpsc::channel::<(u8, RemoteServerMessage)>(32);

				let sender_txs = {
					let mut senders = ctx.remote_host.senders.lock().await;
					senders.entry(port).or_default().clone()
				};

				let password_gate = ctx.remote_host.password.clone();

				let mut router = Router::new().route(
					"/",
					get({
						let index_html = index_html.clone();
						move || async move { Html(index_html.as_ref().to_owned()) }
					}),
				);

				if assets_exists {
					router = router.nest_service("/assets", ServeDir::new(assets_dir));
				}

				let receiver_tx_ws = receiver_tx.clone();
				let sender_txs_ws = sender_txs.clone();
				let ws_shutdown_rx = RemoteWsShutdown(ws_shutdown_rx.resubscribe());

				router = router.route(
					"/ws",
					get(move |ws: WebSocketUpgrade| {
						let receiver_tx = receiver_tx_ws.clone();
						let sender_txs = sender_txs_ws.clone();
						let ws_shutdown_rx = ws_shutdown_rx.clone();
						let password_gate = password_gate.clone();
						async move {
							let (id, send_rx) = {
								let mut clients = sender_txs.lock().await;
								let (send_tx, send_rx) = mpsc::channel(32);
								let id = random_client_id(&clients);
								clients.insert(id, send_tx);
								(id, send_rx)
							};

							let password_expected = password_gate.lock().await.clone();

							ws.on_upgrade(move |mut socket| async move {
								let mut ws_shutdown_rx = ws_shutdown_rx.clone();
								match remote_handshake(
									&mut socket,
									password_expected,
									&mut ws_shutdown_rx,
								)
								.await
								{
									Err(()) => {
										let _ = socket
											.send(ws::Message::Text(
												r#"{"type":"authError","reason":"rejected"}"#.into(),
											))
											.await;
										let mut clients = sender_txs.lock().await;
										clients.remove(&id);
										return;
									}
									Ok(HandshakeResult::ForwardFirst(t)) => {
										receiver_tx
											.send((id, RemoteServerMessage::Connected))
											.await
											.ok();
										receiver_tx
											.send((id, RemoteServerMessage::Text(t)))
											.await
											.ok();
									}
									Ok(HandshakeResult::ReadyWithUser(username)) => {
										receiver_tx
											.send((id, RemoteServerMessage::ConnectedWithUser { username }))
											.await
											.ok();
									}
								}

								run_remote_socket_relay(
									socket,
									receiver_tx,
									id,
									send_rx,
									ws_shutdown_rx,
								)
								.await;
							})
							.into_response()
						}
					}),
				);

				let app = router.layer(tower_http::cors::CorsLayer::very_permissive());

				let server = axum::Server::bind(&addr)
					.serve(app.into_make_service())
					.with_graceful_shutdown(async move {
						shutdown_rx.await.ok();
						ws_shutdown_tx.send(()).ok();
					});

				tokio::spawn(server);

				async_stream::stream! {
					while let Some(msg) = receiver_rx.recv().await {
						yield msg;
					}

					ctx.remote_host.senders.lock().await.remove(&port);

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
					client: Option<u8>,
					#[serde(default)]
					except_client: Option<u8>,
					data: String,
				}

				|ctx, Args { port, client, except_client, data }: Args| async move {
					let senders = ctx.remote_host.senders.lock().await;

					let Some(clients) = senders.get(&port) else {
						return;
					};

					let clients = clients.lock().await;
					match client.and_then(|client| clients.get(&client)) {
						Some(client) => {
							client.send(data).await.ok();
						}
						None => {
							for (&id, ch) in clients.iter() {
								if except_client == Some(id) {
									continue;
								}
								ch.send(data.clone()).await.ok();
							}
						}
					}
				}
			}),
		)
}

#[derive(serde::Serialize, Type)]
pub enum RemoteServerMessage {
	Text(String),
	Connected,
	ConnectedWithUser { username: String },
	Disconnected,
}

async fn run_remote_socket_relay(
	mut socket: ws::WebSocket,
	receiver_tx: mpsc::Sender<(u8, RemoteServerMessage)>,
	id: u8,
	mut sender_rx: mpsc::Receiver<String>,
	mut ws_shutdown_rx: RemoteWsShutdown,
) {
	loop {
		tokio::select! {
			_ = ws_shutdown_rx.recv() => return,
			Some(msg) = sender_rx.recv() => {
				socket.send(ws::Message::Text(msg)).await.ok();
			}
			Some(msg) = socket.recv() => {
				if let Ok(msg) = msg {
					match msg {
						ws::Message::Text(t) => {
							receiver_tx.send((id, RemoteServerMessage::Text(t))).await.ok();
						}
						ws::Message::Close(_) => break,
						_ => {}
					}
				} else {
					break;
				}
			}
		}
	}

	receiver_tx
		.send((id, RemoteServerMessage::Disconnected))
		.await
		.ok();
}
