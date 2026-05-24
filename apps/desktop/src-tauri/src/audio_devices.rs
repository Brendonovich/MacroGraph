use std::collections::HashMap;
use serde::Serialize;
use specta::Type;
use windows::Devices::Enumeration::{DeviceClass, DeviceInformation};
use windows::Win32::Media::Audio::{
	IMMDeviceEnumerator, IMMDeviceCollection, MMDeviceEnumerator, DEVICE_STATE_ACTIVE, eRender,
};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_MULTITHREADED};

#[derive(Type, Serialize)]
pub struct AudioOutputDevice {
	pub device_id: String,
	pub label: String,
}

fn pwstr_to_string(ptr: *const u16) -> String {
	if ptr.is_null() {
		return String::new();
	}
	let len = (0..).take_while(|&i| unsafe { *ptr.add(i) } != 0).count();
	String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(ptr, len) })
}

/// Extract the GUID from a COM endpoint ID like `{0.0.0.00000000}.{guid}`
fn extract_com_guid(id: &str) -> Option<&str> {
	id.split("}.")
		.nth(1)
		.and_then(|s| s.strip_suffix("}"))
}

/// Extract the GUID from a WinRT device ID like `...{0.0.0.00000000}.{guid}#...`
fn extract_winrt_guid(id: &str) -> Option<&str> {
	id.split("}.")
		.nth(1)
		.and_then(|s| s.split('#').next())
		.and_then(|s| s.strip_suffix("}"))
}

#[tauri::command]
#[specta::specta]
pub fn enumerate_audio_outputs() -> Result<Vec<AudioOutputDevice>, String> {
	unsafe { let _ = CoInitializeEx(None, COINIT_MULTITHREADED); };

	let result = get_devices_inner();

	unsafe { CoUninitialize() };

	result
}

fn get_devices_inner() -> Result<Vec<AudioOutputDevice>, String> {
	unsafe {
		let enumerator: IMMDeviceEnumerator =
			CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
				.map_err(|e| format!("Failed to create device enumerator: {e}"))?;

		let collection: IMMDeviceCollection = enumerator
			.EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)
			.map_err(|e| format!("Failed to enumerate endpoints: {e}"))?;

		let com_count = collection
			.GetCount()
			.map_err(|e| format!("Failed to get device count: {e}"))?;

		// Get WinRT devices and build a map: GUID -> device name
		let rt_devices = DeviceInformation::FindAllAsyncDeviceClass(DeviceClass::AudioRender)
			.map_err(|e| format!("Failed to create WinRT enumerator: {e}"))?
			.get()
			.map_err(|e| format!("Failed to get WinRT devices: {e}"))?;

		let rt_count = rt_devices
			.Size()
			.map_err(|e| format!("Failed to get WinRT count: {e}"))?;

		let mut guid_to_name: HashMap<String, String> = HashMap::new();
		for i in 0..rt_count {
			if let Ok(rt_device) = rt_devices.GetAt(i) {
				if let Ok(id) = rt_device.Id() {
					if let Some(guid) = extract_winrt_guid(&id.to_string()) {
						if let Ok(name) = rt_device.Name() {
							guid_to_name.insert(guid.to_string(), name.to_string());
						}
					}
				}
			}
		}

		let mut result = Vec::new();

		for i in 0..com_count {
			let device = collection
				.Item(i)
				.map_err(|e| format!("Failed to get COM device at {i}: {e}"))?;

			let id = device
				.GetId()
				.map_err(|e| format!("Failed to get device id: {e}"))?;
			let device_id = pwstr_to_string(id.as_ptr());

			let guid = extract_com_guid(&device_id).unwrap_or("");
			let label = guid_to_name
				.get(guid)
				.cloned()
				.unwrap_or_else(|| format!("Audio Device {}", i + 1));

			result.push(AudioOutputDevice { device_id, label });
		}

		Ok(result)
	}
}
