"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSttHandlers = registerSttHandlers;
const electron_1 = require("electron");
const path_1 = require("path");
const fs_1 = require("fs");
const electron_2 = require("electron");
const audio_capture_1 = require("./audio-capture");
let currentModel = null;
const MODELS_DIR = (0, path_1.join)(electron_1.app.getPath("userData"), "models");
function ensureModelsDir() {
    if (!(0, fs_1.existsSync)(MODELS_DIR))
        (0, fs_1.mkdirSync)(MODELS_DIR, { recursive: true });
}
function getMainWindow() {
    return electron_2.BrowserWindow.getAllWindows()[0] ?? null;
}
function sendToRenderer(channel, ...args) {
    const win = getMainWindow();
    if (win?.webContents)
        win.webContents.send(channel, ...args);
}
function registerSttHandlers() {
    ensureModelsDir();
    electron_1.ipcMain.handle("stt:loadModel", async (_, modelName) => {
        currentModel = modelName;
        return true;
    });
    electron_1.ipcMain.handle("stt:unloadModel", async () => {
        (0, audio_capture_1.stopCapture)();
        currentModel = null;
        return true;
    });
    electron_1.ipcMain.handle("stt:isBackendAvailable", async () => {
        return (0, audio_capture_1.isBackendAvailable)();
    });
    electron_1.ipcMain.handle("stt:startCapture", async (_, _micId, modelName, settings) => {
        const name = modelName || currentModel;
        if (!name)
            return { error: "No model loaded" };
        try {
            await (0, audio_capture_1.startCapture)(name, settings);
            return { success: true };
        }
        catch (err) {
            return { error: err.message };
        }
    });
    electron_1.ipcMain.on("stt:audioChunk", (_, data) => {
        (0, audio_capture_1.feedAudioChunk)(data);
    });
    electron_1.ipcMain.handle("stt:stopCapture", async () => {
        (0, audio_capture_1.stopCapture)();
        return true;
    });
    electron_1.ipcMain.handle("stt:downloadModel", async (_, modelName) => {
        const url = getModelUrl(modelName);
        if (!url)
            throw new Error(`Unknown model: ${modelName}`);
        ensureModelsDir();
        const dest = (0, path_1.join)(MODELS_DIR, `ggml-${modelName}.bin`);
        const response = await fetch(url);
        if (!response.ok || !response.body)
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        const total = parseInt(response.headers.get("content-length") ?? "0", 10);
        let loaded = 0;
        const reader = response.body.getReader();
        const file = (0, fs_1.createWriteStream)(dest);
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                file.write(Buffer.from(value));
                loaded += value.length;
                sendToRenderer("stt:downloadProgress", {
                    modelName,
                    loaded,
                    total,
                    done: false,
                });
            }
        }
        finally {
            file.end();
        }
        sendToRenderer("stt:downloadProgress", {
            modelName,
            loaded: total || loaded,
            total: total || loaded,
            done: true,
        });
    });
    electron_1.ipcMain.handle("stt:getCachedModels", async () => {
        ensureModelsDir();
        try {
            return (0, fs_1.readdirSync)(MODELS_DIR)
                .filter((f) => f.endsWith(".bin"))
                .map((f) => ({
                name: f.replace(/^ggml-/, "").replace(/\.bin$/, ""),
                path: (0, path_1.join)(MODELS_DIR, f),
                size: (0, fs_1.statSync)((0, path_1.join)(MODELS_DIR, f)).size,
            }));
        }
        catch {
            return [];
        }
    });
    electron_1.ipcMain.handle("stt:deleteModel", async (_, modelName) => {
        const p = (0, path_1.join)(MODELS_DIR, `ggml-${modelName}.bin`);
        try {
            (0, fs_1.unlinkSync)(p);
        }
        catch { }
        return true;
    });
    electron_1.ipcMain.handle("stt:getStatus", async () => {
        return {
            modelLoaded: currentModel !== null,
            currentModel,
            isCapturing: (0, audio_capture_1.isCapturing)(),
            isTranscribing: false,
            error: null,
        };
    });
}
function getModelUrl(name) {
    const urls = {
        "tiny.en": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin",
        "base.en": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin",
        "small.en": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin",
        "medium.en": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin",
        "large-v3": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin",
    };
    return urls[name] ?? null;
}
//# sourceMappingURL=stt.js.map