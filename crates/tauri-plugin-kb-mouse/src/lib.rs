use std::time::Duration;

use enigo::{Enigo, MouseControllable};
use rdev::{Button, EventType, Key};
use tauri::plugin::{Builder, TauriPlugin};

const PLUGIN_NAME: &str = "kb-mouse";

#[tauri::command]
#[specta::specta]
async fn simulate_keys(keys: Vec<Key>, hold_duration: u32) {
    keys.iter().for_each(|key| {
        rdev::simulate(&EventType::KeyPress(*key)).ok();
    });

    tokio::time::sleep(Duration::from_millis(hold_duration as u64)).await;

    keys.iter().for_each(|key| {
        rdev::simulate(&EventType::KeyRelease(*key)).ok();
    })
}

#[tauri::command]
#[specta::specta]
async fn simulate_mouse(button: Button, hold_duration: u32) {
    rdev::simulate(&EventType::ButtonPress(button)).ok();

    tokio::time::sleep(Duration::from_millis(hold_duration as u64)).await;

    rdev::simulate(&EventType::ButtonRelease(button)).ok();
}

#[tauri::command]
#[specta::specta]
async fn set_mouse_position(x: i32, y: i32, absolute: bool) {
    let mut enigo = Enigo::new();
    if absolute {
        enigo.mouse_move_to(x, y);
    } else {
        enigo.mouse_move_relative(x, y);
    }
}

macro_rules! specta_builder {
    () => {
        tauri_specta::ts::builder().commands(tauri_specta::collect_commands![
            simulate_keys,
            simulate_mouse,
            set_mouse_position
        ])
        // .events(tauri_specta::collect_events![])
    };
}

pub fn init<R: tauri::Runtime>() -> TauriPlugin<R> {
    let plugin_utils = specta_builder!().into_plugin_utils(PLUGIN_NAME);

    Builder::new(PLUGIN_NAME)
        .invoke_handler(plugin_utils.invoke_handler)
        .setup(move |app| {
            (plugin_utils.setup)(app);

            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        specta_builder!()
            .path("./guest-js/bindings.ts")
            .config(specta::ts::ExportConfig::default().formatter(specta::ts::formatter::prettier))
            .export_for_plugin(PLUGIN_NAME)
            .ok();
    }
}
