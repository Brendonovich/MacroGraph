import { ipcMain, app } from "electron";
import { join } from "path";
import { createWriteStream, existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from "fs";
import { BrowserWindow } from "electron";
import { feedAudioChunk, startCapture, stopCapture, isCapturing, isBackendAvailable } from "./audio-capture";

let currentModel: string | null = null;

const MODELS_DIR = join(app.getPath("userData"), "models");

function ensureModelsDir() {
  if (!existsSync(MODELS_DIR)) mkdirSync(MODELS_DIR, { recursive: true });
}

function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null;
}

function sendToRenderer(channel: string, ...args: unknown[]) {
  const win = getMainWindow();
  if (win?.webContents) win.webContents.send(channel, ...args);
}

export function registerSttHandlers() {
  ensureModelsDir();

  ipcMain.handle("stt:loadModel", async (_, modelName: string) => {
    currentModel = modelName;
    return true;
  });

  ipcMain.handle("stt:unloadModel", async () => {
    stopCapture();
    currentModel = null;
    return true;
  });

  ipcMain.handle("stt:isBackendAvailable", async () => {
    return isBackendAvailable();
  });

  ipcMain.handle("stt:startCapture", async (_, _micId: string, modelName?: string, settings?: { maxDurationSecs?: number; overlapSecs?: number }) => {
    const name = modelName || currentModel;
    if (!name) return { error: "No model loaded" };
    try {
      await startCapture(name, settings);
      return { success: true };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.on("stt:audioChunk", (_, data: ArrayBuffer) => {
    feedAudioChunk(data);
  });

  ipcMain.handle("stt:stopCapture", async () => {
    stopCapture();
    return true;
  });

  ipcMain.handle("stt:downloadModel", async (_, modelName: string) => {
    const url = getModelUrl(modelName);
    if (!url) throw new Error(`Unknown model: ${modelName}`);

    ensureModelsDir();
    const dest = join(MODELS_DIR, `ggml-${modelName}.bin`);

    const response = await fetch(url);
    if (!response.ok || !response.body)
      throw new Error(`HTTP ${response.status} ${response.statusText}`);

    const total = parseInt(response.headers.get("content-length") ?? "0", 10);
    let loaded = 0;
    const reader = response.body.getReader();
    const file = createWriteStream(dest);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        file.write(Buffer.from(value));
        loaded += value.length;
        sendToRenderer("stt:downloadProgress", {
          modelName,
          loaded,
          total,
          done: false,
        });
      }
    } finally {
      file.end();
    }

    sendToRenderer("stt:downloadProgress", {
      modelName,
      loaded: total || loaded,
      total: total || loaded,
      done: true,
    });
  });

  ipcMain.handle("stt:getCachedModels", async () => {
    ensureModelsDir();
    try {
      return readdirSync(MODELS_DIR)
        .filter((f) => f.endsWith(".bin"))
        .map((f) => ({
          name: f.replace(/^ggml-/, "").replace(/\.bin$/, ""),
          path: join(MODELS_DIR, f),
          size: statSync(join(MODELS_DIR, f)).size,
        }));
    } catch {
      return [];
    }
  });

  ipcMain.handle("stt:deleteModel", async (_, modelName: string) => {
    const p = join(MODELS_DIR, `ggml-${modelName}.bin`);
    try { unlinkSync(p); } catch {}
    return true;
  });

  ipcMain.handle("stt:getStatus", async () => {
    return {
      modelLoaded: currentModel !== null,
      currentModel,
      isCapturing: isCapturing(),
      isTranscribing: false,
      error: null,
    };
  });
}

function getModelUrl(name: string): string | null {
  const urls: Record<string, string> = {
    "tiny.en": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin",
    "base.en": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin",
    "small.en": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin",
    "medium.en": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin",
    "large-v3": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin",
  };
  return urls[name] ?? null;
}
