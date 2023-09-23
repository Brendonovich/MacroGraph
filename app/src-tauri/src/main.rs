// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod http;

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
            std::sync::Arc::new(macrograph_core::router()),
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
