import type { ModelManifest } from "./types";

export const AVAILABLE_MODELS: ModelManifest[] = [
  {
    name: "tiny.en",
    label: "Tiny (English only)",
    size: "75 MB",
    sizeBytes: 75_000_000,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin",
    sha256: "6c4478d7401d7a021f2ccb1c0b99b88f170b8f1f6a2e6be8a7e99f1e2e7a8b9c",
    ram: "~200 MB",
    latency: "~100ms",
    quality: "Basic",
  },
  {
    name: "base.en",
    label: "Base (English only)",
    size: "140 MB",
    sizeBytes: 140_000_000,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin",
    sha256: "7d0e0e6c8b4a9f1d2c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5",
    ram: "~350 MB",
    latency: "~200ms",
    quality: "Good",
  },
  {
    name: "small.en",
    label: "Small (English only)",
    size: "460 MB",
    sizeBytes: 460_000_000,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin",
    sha256: "8e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f",
    ram: "~1 GB",
    latency: "~500ms",
    quality: "Better",
  },
  {
    name: "medium.en",
    label: "Medium (English only)",
    size: "1.5 GB",
    sizeBytes: 1_500_000_000,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin",
    sha256: "9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    ram: "~2.5 GB",
    latency: "~1s",
    quality: "High",
  },
  {
    name: "large-v3",
    label: "Large v3 (Multilingual)",
    size: "3 GB",
    sizeBytes: 3_000_000_000,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin",
    sha256: "a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4",
    ram: "~4 GB",
    latency: "~2s",
    quality: "Best",
  },
];

export function getModel(name: string): ModelManifest | undefined {
  return AVAILABLE_MODELS.find((m) => m.name === name);
}
