// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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
    tauri::Builder::default()
        .plugin(rspc::integrations::tauri::plugin(
            std::sync::Arc::new(router()),
            || (),
        ))
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

#[allow(non_upper_case_globals)]
pub(self) const R: Rspc<()> = Rspc::new();

pub fn router() -> Router {
    R.router()
        .merge("fs.", fs::router())
        .merge("oauth.", oauth::router())
        .merge("websocket.", websocket::router())
        .build(rspc::Config::new().export_ts_bindings(
            std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../src/rspc/types.ts"),
        ))
}
