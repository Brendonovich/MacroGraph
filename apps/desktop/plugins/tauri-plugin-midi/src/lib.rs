use std::{
    collections::BTreeMap,
    sync::{Arc, Mutex},
    time::Duration,
};

use midir::{MidiInput, MidiOutput};
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager,
};
use tauri_specta::Event;

#[derive(Default)]
struct MidiState {
    input_connections: BTreeMap<String, midir::MidiInputConnection<()>>,
    output_connections: BTreeMap<String, midir::MidiOutputConnection>,
}

type State = Arc<Mutex<MidiState>>;

const PLUGIN_NAME: &str = "midi";

fn get_inputs(midi_in: &midir::MidiInput) -> Result<Vec<String>, String> {
    midi_in
        .ports()
        .iter()
        .map(|p| {
            midi_in
                .port_name(p)
                .map_err(|e| format!("Failed to get port name: {e}"))
        })
        .collect()
}

fn get_outputs(midi_out: &midir::MidiOutput) -> Result<Vec<String>, String> {
    midi_out
        .ports()
        .iter()
        .map(|p| {
            midi_out
                .port_name(p)
                .map_err(|e| format!("Failed to get port name: {e}"))
        })
        .collect()
}

#[tauri::command(async)]
#[specta::specta]
fn open_input<R: tauri::Runtime>(
    name: String,
    state: tauri::State<State>,
    app: tauri::AppHandle<R>,
) {
    let mut state = state.lock().unwrap();

    if state.input_connections.contains_key(&name) {
        return;
    }

    let mut midi_in = MidiInput::new("").unwrap();
    midi_in.ignore(midir::Ignore::None);

    let ports = midi_in.ports();
    let port = ports
        .iter()
        .find(|p| {
            midi_in
                .port_name(p)
                .map(|p_name| p_name == name)
                .unwrap_or_default()
        })
        .expect("Failed to find port");

    let connection = midi_in
        .connect(
            &port,
            "",
            {
                let name = name.clone();
                move |_, msg, _| {
                    MIDIMessage(name.to_string(), msg.to_vec())
                        .emit_all(&app)
                        .ok();
                }
            },
            (),
        )
        .expect("Failed to open MIDI input");

    state.input_connections.insert(name, connection);
}

#[tauri::command(async)]
#[specta::specta]
fn close_input(name: String, state: tauri::State<State>) {
    let mut state = state.lock().unwrap();

    let Some(connection) = state.input_connections.remove(&name) else {
        return;
    };

    connection.close();
}

#[tauri::command(async)]
#[specta::specta]
fn open_output(name: String, state: tauri::State<State>) {
    let mut state = state.lock().unwrap();

    if state.output_connections.contains_key(&name) {
        return;
    }

    let midi_out = MidiOutput::new("").unwrap();

    let ports = midi_out.ports();
    let port = ports
        .iter()
        .find(|p| {
            midi_out
                .port_name(p)
                .map(|p_name| p_name == name)
                .unwrap_or_default()
        })
        .expect("Failed to find port");

    let connection = midi_out
        .connect(&port, "")
        .expect("Failed to open MIDI input");

    println!("inserting output connection {name}");
    state.output_connections.insert(name, connection);
}

#[tauri::command(async)]
#[specta::specta]
fn close_output(name: String, state: tauri::State<State>) {
    let mut state = state.lock().unwrap();

    println!("removing output connection {name}");
    let Some(connection) = state.output_connections.remove(&name) else {
        return;
    };

    connection.close();
}

#[tauri::command(async)]
#[specta::specta]
fn output_send(name: String, msg: Vec<u8>, state: tauri::State<State>) {
    let mut state = state.lock().unwrap();

    let connection = state.output_connections.get_mut(&name).unwrap();

    connection.send(&msg).unwrap();
}

#[derive(serde::Serialize, specta::Type, tauri_specta::Event, Clone, Debug)]
struct StateChange {
    inputs: Vec<String>,
    outputs: Vec<String>,
}

#[derive(serde::Serialize, specta::Type, tauri_specta::Event, Clone)]
struct MIDIMessage(String, Vec<u8>);

macro_rules! specta_builder {
    () => {
        tauri_specta::ts::builder()
            .commands(tauri_specta::collect_commands![
                open_input::<tauri::Wry>,
                close_input,
                open_output,
                close_output,
                output_send
            ])
            .events(tauri_specta::collect_events![StateChange, MIDIMessage])
    };
}

pub fn init<R: tauri::Runtime>() -> TauriPlugin<R> {
    let plugin_utils = specta_builder!().into_plugin_utils(PLUGIN_NAME);

    Builder::new("midi")
        .invoke_handler(plugin_utils.invoke_handler)
        .setup(move |app| {
            app.manage(State::default());

            (plugin_utils.setup)(app);

            let app = app.clone();

            #[cfg(target_os = "macos")]
            coremidi_hotplug_notification::receive_device_updates(|| {})
                .expect("Failed to register for MIDI device updates");

            tokio::spawn(async move {
                let midi_in = midir::MidiInput::new("tauri-plugin-midi blank input")
                    .map_err(|e| format!("Failed to create MIDI input: {e}"))
                    .unwrap();
                let midi_out = midir::MidiOutput::new("tauri-plugin-midi blank output")
                    .map_err(|e| format!("Failed to create MIDI output: {e}"))
                    .unwrap();

                loop {
                    StateChange {
                        inputs: get_inputs(&midi_in).unwrap_or_default(),
                        outputs: get_outputs(&midi_out).unwrap_or_default(),
                    }
                    .emit_all(&app)
                    .ok();

                    std::thread::sleep(Duration::from_millis(1000));
                }
            });

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
