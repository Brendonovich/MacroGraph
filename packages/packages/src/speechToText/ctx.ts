import { None, type Option, Some, makePersistedOption } from "@macrograph/option";
import { createSignal } from "solid-js";
import type { Backend, CaptureSettings, SttStatus } from "./types";

const STT_BACKEND = "STT_BACKEND";
const STT_MODEL = "STT_MODEL";
const STT_MIC = "STT_MIC";
const STT_MIC_LABEL = "STT_MIC_LABEL";
const STT_WAS_CAPTURING = "STT_WAS_CAPTURING";
const STT_MAX_DURATION = "STT_MAX_DURATION";
const STT_OVERLAP = "STT_OVERLAP";

function lsOption<T>(key: string, fallback: T): [() => Option<T>, (v: Option<T>) => Option<T>] {
  const [get, set] = createSignal<Option<T>>(fallback);
  try {
    const v = localStorage.getItem(key);
    if (v !== null) set(Some(JSON.parse(v)));
  } catch {}
  return [
    get,
    (value: Option<T>) => {
      const r = set(value);
      if (r.isNone()) localStorage.removeItem(key);
      else r.peek((val) => localStorage.setItem(key, JSON.stringify(val)));
      return r;
    },
  ];
}

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
  const [backend, setBackend] = makePersistedOption(
    createSignal<Option<Backend>>(Some("cpu")),
    STT_BACKEND,
  );
  const [selectedModel, setSelectedModel] = makePersistedOption(
    createSignal<Option<string>>(Some("base.en")),
    STT_MODEL,
  );
  const [selectedMic, setSelectedMic] = lsOption<string>(STT_MIC, None);
  const [selectedMicLabel, setSelectedMicLabel] = lsOption<string>(STT_MIC_LABEL, None);
  const [wasCapturing, setWasCapturing] = makePersistedOption(
    createSignal<Option<boolean>>(None),
    STT_WAS_CAPTURING,
  );

  const [status, setStatus] = createSignal<SttStatus>({
    modelLoaded: false,
    currentModel: null,
    backend: "cpu",
    isCapturing: false,
    isTranscribing: false,
    error: null,
  });

  const [downloadProgress, setDownloadProgress] = createSignal<{
    modelName: string;
    loaded: number;
    total: number;
  } | null>(null);

  const [micList, setMicList] = createSignal<
    { deviceId: string; label: string }[]
  >([]);

  const [recentTranscript, setRecentTranscript] = createSignal<string | null>(null);

  const [captureSettings, setCaptureSettings] = createSignal<CaptureSettings>({
    maxDurationSecs: 5,
    overlapSecs: 1,
  });

  let onTranscription:
    | ((data: { text: string; confidence: number; isFinal: boolean }) => void)
    | null = null;

  function setOnTranscription(
    cb: typeof onTranscription,
  ) {
    onTranscription = cb;
  }

  function emitTranscription(
    data: { text: string; confidence: number; isFinal: boolean },
  ) {
    setRecentTranscript(data.text);
    onTranscription?.(data);
  }

  return {
    backend,
    setBackend,
    selectedModel,
    setSelectedModel,
    selectedMic,
    setSelectedMic,
    selectedMicLabel,
    setSelectedMicLabel,
    wasCapturing,
    setWasCapturing,
    status,
    setStatus,
    downloadProgress,
    setDownloadProgress,
    micList,
    setMicList,
    recentTranscript,
    setRecentTranscript,
    captureSettings,
    setCaptureSettings,
    setOnTranscription,
    emitTranscription,
  };
}
