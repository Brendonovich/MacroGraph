use napi_derive::napi;
use once_cell::sync::Lazy;
use std::sync::Mutex;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext};

static ENGINE: Lazy<Mutex<Option<WhisperEngine>>> =
    Lazy::new(|| Mutex::new(None));

struct WhisperEngine {
    context: WhisperContext,
    model_name: String,
    backend: String,
}

unsafe impl Send for WhisperEngine {}

#[napi(object)]
pub struct TranscriptionSegment {
    pub text: String,
    pub start: f64,
    pub end: f64,
    pub confidence: f64,
}

#[napi(object)]
pub struct TranscriptionResult {
    pub text: String,
    pub segments: Vec<TranscriptionSegment>,
    pub language: Option<String>,
}

#[napi(object)]
pub struct EngineStatus {
    pub initialized: bool,
    pub model_name: String,
    pub backend: String,
}

#[napi]
pub fn init(model_path: String, backend: String) -> bool {
    match WhisperContext::new(&model_path) {
        Ok(context) => {
            let name = std::path::Path::new(&model_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();
            *ENGINE.lock().unwrap() = Some(WhisperEngine {
                context,
                model_name: name,
                backend,
            });
            true
        }
        Err(e) => {
            eprintln!("whisper init failed: {}", e);
            false
        }
    }
}

#[napi]
pub fn set_backend(_backend: String) -> bool {
    if let Some(ref mut e) = *ENGINE.lock().unwrap() {
        e.backend = _backend;
    }
    true
}

#[napi]
pub fn unload() -> bool {
    *ENGINE.lock().unwrap() = None;
    true
}

#[napi]
pub fn transcribe(audio_data: Vec<f32>) -> Option<TranscriptionResult> {
    let mut guard = ENGINE.lock().ok()?;
    let engine = guard.as_mut()?;

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 5 });
    params.set_n_threads(4);
    params.set_language(Some("en"));
    params.set_no_timestamps(true);

    engine.context.full(params, &audio_data).ok()?;

    let n = engine.context.full_n_segments();
    let mut segments = Vec::with_capacity(n);
    let mut full_text = String::new();

    for i in 0..n {
        if let Ok(text) = engine.context.full_get_segment_text(i) {
            let t0 = engine.context.full_get_segment_t0(i);
            let t1 = engine.context.full_get_segment_t1(i);

            if !full_text.is_empty() {
                full_text.push(' ');
            }
            full_text.push_str(&text);

            segments.push(TranscriptionSegment {
                text,
                start: t0 as f64 / 100.0,
                end: t1 as f64 / 100.0,
                confidence: 0.0,
            });
        }
    }

    Some(TranscriptionResult {
        text: full_text,
        segments,
        language: Some("en".to_string()),
    })
}

#[napi]
pub fn get_status() -> EngineStatus {
    let guard = ENGINE.lock().unwrap();
    match guard.as_ref() {
        Some(e) => EngineStatus {
            initialized: true,
            model_name: e.model_name.clone(),
            backend: e.backend.clone(),
        },
        None => EngineStatus {
            initialized: false,
            model_name: String::new(),
            backend: String::new(),
        },
    }
}
