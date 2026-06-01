export type Backend = "cpu" | "cuda";

export interface ModelManifest {
  name: string;
  label: string;
  size: string;
  sizeBytes: number;
  url: string;
  sha256: string;
  ram: string;
  latency: string;
  quality: string;
}

export interface TranscriptionResult {
  text: string;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  language?: string;
}

export interface SttStatus {
  modelLoaded: boolean;
  currentModel: string | null;
  backend: Backend;
  isCapturing: boolean;
  isTranscribing: boolean;
  error?: string | null;
}

export interface CaptureSettings {
  maxDurationSecs: number;
  overlapSecs: number;
}
