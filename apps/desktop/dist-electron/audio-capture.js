"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedAudioChunk = feedAudioChunk;
exports.startCapture = startCapture;
exports.stopCapture = stopCapture;
exports.isCapturing = isCapturing;
exports.isBackendAvailable = isBackendAvailable;
const electron_1 = require("electron");
const path_1 = require("path");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const vad_1 = require("./vad");
let transcriberProcess = null;
let currentVad = null;
let currentModel = null;
const MODELS_DIR = (0, path_1.join)(electron_1.app.getPath("userData"), "models");
const SAMPLE_RATE = 16000;
function getBackendDir() {
    return (0, path_1.join)(__dirname, "..", "electron", "whisper-native");
}
function findTranscriberBinary() {
    const dir = getBackendDir();
    const candidates = [
        (0, path_1.join)(dir, "transcriber.exe"),
        (0, path_1.join)(__dirname, "transcriber.exe"),
        (0, path_1.join)(electron_1.app.getAppPath(), "resources", "whisper-native", "transcriber.exe"),
    ];
    for (const p of candidates) {
        if ((0, fs_1.existsSync)(p))
            return p;
    }
    return null;
}
function startTranscriber(modelName) {
    if (transcriberProcess)
        return Promise.resolve();
    const binary = findTranscriberBinary();
    if (!binary)
        throw new Error("transcriber binary not found. Run build:whisper.");
    const modelPath = (0, path_1.join)(MODELS_DIR, `ggml-${modelName}.bin`);
    if (!(0, fs_1.existsSync)(modelPath))
        throw new Error(`Model not found: ${modelPath}`);
    const backendDir = getBackendDir();
    const env = { ...process.env, PATH: `${backendDir};${process.env.PATH}` };
    transcriberProcess = (0, child_process_1.spawn)(binary, ["--model", modelPath], {
        stdio: ["pipe", "pipe", "pipe"],
        env,
    });
    transcriberProcess.stderr.on("data", (d) => {
        const msg = d.toString().trim();
        if (msg)
            console.log("[whisper]", msg);
    });
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("transcriber init timeout")), 30000);
        const onData = (d) => {
            try {
                if (d.length < 4)
                    return;
                const len = d.readUInt32LE(0);
                if (d.length >= 4 + len) {
                    const payload = d.subarray(4, 4 + len).toString();
                    const msg = JSON.parse(payload);
                    if (msg.type === "ready") {
                        clearTimeout(timeout);
                        if (transcriberProcess?.stdout)
                            transcriberProcess.stdout.removeListener("data", onData);
                        resolve();
                    }
                }
            }
            catch { }
        };
        transcriberProcess.stdout.on("data", onData);
        transcriberProcess.on("exit", (code) => {
            clearTimeout(timeout);
            transcriberProcess = null;
            reject(new Error(`transcriber exited with code ${code}`));
        });
    });
}
function transcribeAudio(pcmData) {
    if (!transcriberProcess?.stdin || !transcriberProcess.stdout)
        return Promise.resolve("");
    return new Promise((resolve) => {
        const audioBuf = Buffer.from(pcmData.buffer);
        const header = Buffer.alloc(4);
        header.writeUInt32LE(audioBuf.length, 0);
        const responseHandler = (d) => {
            try {
                if (d.length < 4)
                    return;
                const len = d.readUInt32LE(0);
                if (d.length >= 4 + len) {
                    const payload = d.subarray(4, 4 + len).toString();
                    const msg = JSON.parse(payload);
                    transcriberProcess.stdout.removeListener("data", responseHandler);
                    resolve(msg.text ?? "");
                }
            }
            catch { }
        };
        transcriberProcess.stdout.on("data", responseHandler);
        transcriberProcess.stdin.write(Buffer.concat([header, audioBuf]));
    });
}
function feedAudioChunk(pcmData) {
    if (!currentVad)
        return;
    const samples = new Float32Array(pcmData);
    const utterance = currentVad.process(samples);
    if (utterance) {
        transcribeAudio(utterance).then((text) => {
            if (text.trim()) {
                const win = electron_1.BrowserWindow.getAllWindows()[0];
                if (win)
                    win.webContents.send("stt:transcription", { text, confidence: 1, isFinal: true });
            }
        });
    }
}
async function startCapture(modelName, settings) {
    currentModel = modelName;
    await startTranscriber(modelName);
    currentVad = new vad_1.VAD(SAMPLE_RATE);
    if (settings?.maxDurationSecs)
        currentVad.setMaxDuration(settings.maxDurationSecs);
    if (settings?.overlapSecs)
        currentVad.setOverlap(settings.overlapSecs);
}
function stopCapture() {
    currentVad?.reset();
    currentVad = null;
    if (transcriberProcess) {
        transcriberProcess.kill();
        transcriberProcess = null;
    }
    currentModel = null;
}
function isCapturing() {
    return currentVad !== null;
}
function isBackendAvailable() {
    return findTranscriberBinary() !== null;
}
//# sourceMappingURL=audio-capture.js.map