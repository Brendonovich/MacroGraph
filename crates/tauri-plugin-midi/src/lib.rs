use midir::MidiInput;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};
use tauri_specta::{ts, Event};

const PLUGIN_NAME: &str = "tauri-plugin-midi";

#[derive(Clone, serde::Serialize, specta::Type, Event)]
enum IOUpdate {
    Connected,
    Disconnected,
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    let plugin_utils = ts::builder().into_plugin_utils(PLUGIN_NAME);

    Builder::new(PLUGIN_NAME)
        .invoke_handler(plugin_utils.invoke_handler)
        .setup(move |app| {
            (plugin_utils.setup)(app);

            let midi_in = MidiInput::new("tauri-plugin-midi input 0").unwrap();

            let ports = midi_in.ports();

            dbg!(ports
                .iter()
                .map(|p| midi_in.port_name(p).unwrap())
                .collect::<Vec<_>>());

            Ok(())
        })
        .build()
}
