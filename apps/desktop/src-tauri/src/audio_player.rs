use std::collections::HashMap;
use std::sync::mpsc;
use std::sync::Mutex;
use std::thread;

use rodio::cpal::traits::{DeviceTrait, HostTrait};
use rodio::{OutputStream, OutputStreamHandle, Sink};
use serde::Serialize;
use specta::Type;

#[derive(Type, Serialize)]
pub struct PlayResult {
	pub id: String,
}

enum AudioCommand {
	Play {
		path: String,
		device_name: Option<String>,
		res: mpsc::Sender<Result<String, String>>,
	},
	Stop {
		id: String,
	},
	SetVolume {
		id: String,
		volume: f32,
	},
	StopAll,
}

pub struct AudioPlayer {
	tx: Mutex<mpsc::Sender<AudioCommand>>,
}

impl Default for AudioPlayer {
	fn default() -> Self {
		let (tx, rx) = mpsc::channel::<AudioCommand>();
		thread::spawn(move || audio_thread(rx));
		Self {
			tx: Mutex::new(tx),
		}
	}
}

fn audio_thread(rx: mpsc::Receiver<AudioCommand>) {
	let mut stream: Option<OutputStream> = None;
	let mut handle: Option<OutputStreamHandle> = None;
	let mut device_name: Option<String> = None;
	let mut sinks: HashMap<String, Sink> = HashMap::new();

	while let Ok(cmd) = rx.recv() {
		match cmd {
			AudioCommand::Play {
				path,
				device_name: new_device,
				res,
			} => {
				let result = play_on_thread(
					&path,
					new_device.as_deref(),
					&mut stream,
					&mut handle,
					&mut device_name,
					&mut sinks,
				);
				let _ = res.send(result);
			}
			AudioCommand::Stop { id } => {
				if let Some(sink) = sinks.remove(&id) {
					sink.stop();
				}
			}
			AudioCommand::SetVolume { id, volume } => {
				if let Some(sink) = sinks.get(&id) {
					sink.set_volume(volume);
				}
			}
			AudioCommand::StopAll => {
				for (_, sink) in sinks.drain() {
					sink.stop();
				}
			}
		}
	}
}

fn play_on_thread(
	path: &str,
	new_device: Option<&str>,
	stream: &mut Option<OutputStream>,
	handle: &mut Option<OutputStreamHandle>,
	device_name: &mut Option<String>,
	sinks: &mut HashMap<String, Sink>,
) -> Result<String, String> {
	if handle.is_none() || new_device != device_name.as_deref() {
		*stream = None;
		*handle = None;
		*device_name = new_device.map(|s| s.to_string());

		let host = rodio::cpal::default_host();

		let (s, h) = match new_device {
			Some(name) => {
				let all_devices: Vec<_> = host.output_devices()
					.map_err(|e| format!("Failed to enumerate: {e}"))?
					.collect();

				let device = all_devices.iter()
					.find(|d: &&rodio::cpal::Device| d.name().ok().as_deref() == Some(name))
					.or_else(|| {
						eprintln!("[AudioPlayer] Device '{name}' not found by name, trying case-insensitive match");
						all_devices.iter().find(|d| {
							d.name().ok().map(|n| n.to_lowercase()).as_deref()
								== Some(&name.to_lowercase())
						})
					})
					.or_else(|| {
						eprintln!("[AudioPlayer] Device '{name}' not found. Available devices:");
						for d in &all_devices {
							if let Ok(n) = d.name() {
								eprintln!("  - '{n}'");
							}
						}
						eprintln!("[AudioPlayer] Falling back to default device");
						None
					});

				match device {
					Some(d) => OutputStream::try_from_device(d)
						.map_err(|e| format!("Failed to open '{name}': {e}"))?,
					None => OutputStream::try_default()
						.map_err(|e| format!("Failed to open default device: {e}"))?,
				}
			}
			None => OutputStream::try_default()
				.map_err(|e| format!("Failed to open default device: {e}"))?,
		};
		*stream = Some(s);
		*handle = Some(h);
	}

	let h = handle.as_ref().unwrap();

	let file = std::fs::File::open(path).map_err(|e| format!("Failed to open '{path}': {e}"))?;
	let source = rodio::Decoder::new(std::io::BufReader::new(file))
		.map_err(|e| format!("Failed to decode audio: {e}"))?;

	let sink = Sink::try_new(h).map_err(|e| format!("Failed to create sink: {e}"))?;
	sink.append(source);

	let id = uuid::Uuid::new_v4().to_string();
	sinks.insert(id.clone(), sink);

	Ok(id)
}

#[tauri::command]
#[specta::specta]
pub fn play_audio(
	state: tauri::State<AudioPlayer>,
	path: String,
	device_name: Option<String>,
) -> Result<PlayResult, String> {
	let tx = state.tx.lock().unwrap().clone();
	let (res_tx, res_rx) = mpsc::channel();

	tx.send(AudioCommand::Play {
		path,
		device_name,
		res: res_tx,
	})
	.map_err(|_| "Audio thread disconnected".to_string())?;

	res_rx
		.recv()
		.map_err(|_| "Audio thread error".to_string())?
		.map(|id| PlayResult { id })
}

#[tauri::command]
#[specta::specta]
pub fn stop_audio(state: tauri::State<AudioPlayer>, id: String) {
	let tx = state.tx.lock().unwrap().clone();
	let _ = tx.send(AudioCommand::Stop { id });
}

#[tauri::command]
#[specta::specta]
pub fn set_audio_volume(state: tauri::State<AudioPlayer>, id: String, volume: f32) {
	let tx = state.tx.lock().unwrap().clone();
	let _ = tx.send(AudioCommand::SetVolume { id, volume });
}

#[tauri::command]
#[specta::specta]
pub fn stop_all_audio(state: tauri::State<AudioPlayer>) {
	let tx = state.tx.lock().unwrap().clone();
	let _ = tx.send(AudioCommand::StopAll);
}
