import { app, BrowserWindow } from "electron";
import { join } from "path";
import { spawn, type ChildProcess } from "child_process";
import { existsSync } from "fs";
import { VAD } from "./vad";

let transcriberProcess: ChildProcess | null = null;
let currentVad: VAD | null = null;
let currentModel: string | null = null;

const MODELS_DIR = join(app.getPath("userData"), "models");
const SAMPLE_RATE = 16000;

function getBackendDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "whisper-native");
  }
  return join(__dirname, "..", "electron", "whisper-native");
}

function findTranscriberBinary(): string | null {
  const candidates = [
    join(getBackendDir(), "transcriber.exe"),
    join(__dirname, "transcriber.exe"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function startTranscriber(modelName: string): Promise<void> {
  if (transcriberProcess) return Promise.resolve();

  const binary = findTranscriberBinary();
  if (!binary) throw new Error("Speech-to-text backend not found.");

  const modelPath = join(MODELS_DIR, `ggml-${modelName}.bin`);
  if (!existsSync(modelPath)) throw new Error(`Model not found: ${modelPath}`);

  const backendDir = getBackendDir();
  const env = { ...process.env, PATH: `${backendDir};${process.env.PATH}` };

  transcriberProcess = spawn(binary, ["--model", modelPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env,
  });

  transcriberProcess.stderr!.on("data", (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.log("[whisper]", msg);
  });

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("transcriber init timeout")), 30000);
    const onData = (d: Buffer) => {
      try {
        if (d.length < 4) return;
        const len = d.readUInt32LE(0);
        if (d.length >= 4 + len) {
          const payload = d.subarray(4, 4 + len).toString();
          const msg = JSON.parse(payload);
          if (msg.type === "ready") {
            clearTimeout(timeout);
            if (transcriberProcess?.stdout) transcriberProcess.stdout.removeListener("data", onData);
            resolve();
          }
        }
      } catch {}
    };
    transcriberProcess!.stdout!.on("data", onData);
    transcriberProcess!.on("exit", (code) => {
      clearTimeout(timeout);
      transcriberProcess = null;
      reject(new Error(`transcriber exited with code ${code}`));
    });
  });
}

function transcribeAudio(pcmData: Float32Array): Promise<{ text: string; confidence: number }> {
  if (!transcriberProcess?.stdin || !transcriberProcess.stdout)
    return Promise.resolve({ text: "", confidence: 0 });
  return new Promise((resolve) => {
    const audioBuf = Buffer.from(pcmData.buffer);
    const header = Buffer.alloc(4);
    header.writeUInt32LE(audioBuf.length, 0);
    const responseHandler = (d: Buffer) => {
      try {
        if (d.length < 4) return;
        const len = d.readUInt32LE(0);
        if (d.length >= 4 + len) {
          const payload = d.subarray(4, 4 + len).toString();
          const msg = JSON.parse(payload);
          transcriberProcess!.stdout!.removeListener("data", responseHandler);
          resolve({ text: msg.text ?? "", confidence: msg.confidence ?? 0 });
        }
      } catch {}
    };
    transcriberProcess!.stdout!.on("data", responseHandler);
    transcriberProcess!.stdin!.write(Buffer.concat([header, audioBuf]));
  });
}

export function feedAudioChunk(pcmData: ArrayBuffer): void {
  if (!currentVad) return;
  const samples = new Float32Array(pcmData);
  const utterance = currentVad.process(samples);
  if (utterance) {
    transcribeAudio(utterance).then(({ text, confidence }) => {
      if (text.trim()) {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) win.webContents.send("stt:transcription", { text, confidence, isFinal: true });
      }
    });
  }
}

export async function startCapture(
  modelName: string,
  settings?: { maxDurationSecs?: number; overlapSecs?: number },
): Promise<void> {
  currentModel = modelName;
  await startTranscriber(modelName);
  currentVad = new VAD(SAMPLE_RATE);
  if (settings?.maxDurationSecs) currentVad.setMaxDuration(settings.maxDurationSecs);
  if (settings?.overlapSecs) currentVad.setOverlap(settings.overlapSecs);
}

export function stopCapture(): void {
  currentVad?.reset();
  currentVad = null;
  if (transcriberProcess) {
    transcriberProcess.kill();
    transcriberProcess = null;
  }
  currentModel = null;
}

export function isCapturing(): boolean {
  return currentVad !== null;
}

export function isBackendAvailable(): boolean {
  return findTranscriberBinary() !== null;
}
