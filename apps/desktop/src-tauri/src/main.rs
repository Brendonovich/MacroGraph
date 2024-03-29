// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;

use rspc::{alpha::Rspc, Router};
use tauri::Manager;

mod fs;
mod http;
mod oauth;
mod websocket;

macro_rules! tauri_handlers {
	($($name:path),+) => {{
		#[cfg(debug_assertions)]
		tauri_specta::ts::export(specta::collect_types![$($name),+], "../src/commands.ts").unwrap();

		tauri::generate_handler![$($name),+]
	}};
}

#[tokio::main]
async fn main() {
    let ctx: Ctx = Default::default();

    tauri::Builder::default()
        .plugin(rspc::integrations::tauri::plugin(
            std::sync::Arc::new(router()),
            move || ctx.clone(),
        ))
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_midi::init())
        .setup(|app| {
            app.manage(http::State::new(app.handle()));

            Ok(())
        })
        .invoke_handler(tauri_handlers![
            http::fetch,
            http::fetch_cancel,
            http::fetch_send,
            http::fetch_read_body
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Default)]
pub struct CtxInner {
    ws: websocket::Ctx,
}

pub type Ctx = Arc<CtxInner>;

#[allow(non_upper_case_globals)]
pub const R: Rspc<Ctx> = Rspc::new();

pub fn router() -> Router<Ctx> {
    R.router()
        .merge("fs.", fs::router())
        .merge("oauth.", oauth::router())
        .merge("websocket.", websocket::router())
        .build(rspc::Config::new().export_ts_bindings(
            std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../src/rspc/types.ts"),
        ))
}
