use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::command;

static LOG_FILE: Mutex<Option<PathBuf>> = Mutex::new(None);
static SESSION_FILE: Mutex<Option<PathBuf>> = Mutex::new(None);

#[derive(Serialize, Deserialize)]
struct SessionState {
    clean_exit: bool,
    started_at_secs: u64,
    version: String,
}

pub fn init(app: &tauri::AppHandle) {
    let resolver = app.path_resolver();
    let log_dir = resolver
        .app_log_dir()
        .or_else(|| resolver.app_local_data_dir().map(|d| d.join("logs")))
        .unwrap_or_else(|| PathBuf::from(".").join("logs"));

    let _ = std::fs::create_dir_all(&log_dir);
    let log_path = log_dir.join("crash.log");
    let session_path = log_dir.join("session.json");

    if let Ok(mut guard) = LOG_FILE.lock() {
        *guard = Some(log_path.clone());
    }
    if let Ok(mut guard) = SESSION_FILE.lock() {
        *guard = Some(session_path.clone());
    }

    if let Some(prev) = read_session(&session_path) {
        if !prev.clean_exit {
            writeln_entry(
                "recovery",
                &format!(
                    "previous session (v{}) did not exit cleanly (started {})",
                    prev.version, prev.started_at_secs
                ),
            );
        }
    }

    write_session(
        &session_path,
        SessionState {
            clean_exit: false,
            started_at_secs: unix_secs(),
            version: env!("CARGO_PKG_VERSION").into(),
        },
    );

    install_panic_hook();
    writeln_entry(
        "startup",
        &format!(
            "MacroGraph {} started; log: {}",
            env!("CARGO_PKG_VERSION"),
            log_path.display()
        ),
    );
}

pub fn mark_clean_exit() {
    if let Ok(guard) = SESSION_FILE.lock() {
        if let Some(path) = guard.as_ref() {
            write_session(
                path,
                SessionState {
                    clean_exit: true,
                    started_at_secs: unix_secs(),
                    version: env!("CARGO_PKG_VERSION").into(),
                },
            );
        }
    }
}

pub fn on_run_event(event: &tauri::RunEvent) {
    use tauri::{RunEvent, WindowEvent};

    match event {
        RunEvent::ExitRequested { .. } => {
            writeln_entry("exit", "ExitRequested");
        }
        RunEvent::Exit => {
            writeln_entry("exit", "application Exit");
            mark_clean_exit();
        }
        RunEvent::WindowEvent { label, event, .. } => match event {
            WindowEvent::CloseRequested { .. } => {
                writeln_entry("exit", &format!("window '{label}' CloseRequested"));
            }
            WindowEvent::Destroyed => {
                writeln_entry("exit", &format!("window '{label}' Destroyed"));
            }
            _ => {}
        },
        _ => {}
    }
}

fn install_panic_hook() {
    let default = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let payload = info
            .payload()
            .downcast_ref::<&str>()
            .map(|s| (*s).to_string())
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "unknown panic payload".into());
        let location = info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".into());
        let backtrace = std::backtrace::Backtrace::force_capture();
        writeln_entry(
            "panic",
            &format!("{payload}\n  at {location}\n{backtrace}"),
        );
        default(info);
    }));
}

fn read_session(path: &Path) -> Option<SessionState> {
    let raw = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

fn write_session(path: &Path, state: SessionState) {
    if let Ok(json) = serde_json::to_string(&state) {
        let _ = std::fs::write(path, json);
    }
}

fn unix_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn timestamp() -> String {
    let secs = unix_secs();
    format!("{secs}")
}

fn writeln_entry(kind: &str, message: &str) {
    let line = format!("[{}] [{kind}] {message}\n", timestamp());
    if let Ok(guard) = LOG_FILE.lock() {
        if let Some(path) = guard.as_ref() {
            if let Ok(mut file) = OpenOptions::new()
                .create(true)
                .append(true)
                .open(path)
            {
                let _ = file.write_all(line.as_bytes());
                let _ = file.flush();
            }
        }
    }
}

/// Append a line from the webview (uncaught errors, unhandled rejections).
#[command]
#[specta::specta]
pub fn crash_log_append(kind: String, message: String) {
    writeln_entry(&kind, &message);
}

/// Path to `crash.log` for support / debugging.
#[command]
#[specta::specta]
pub fn crash_log_path() -> Result<String, String> {
    LOG_FILE
        .lock()
        .ok()
        .and_then(|g| g.as_ref().map(|p| p.display().to_string()))
        .ok_or_else(|| "crash log not initialized".into())
}
