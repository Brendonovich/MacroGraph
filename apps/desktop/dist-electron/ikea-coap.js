"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ikeaConnect = ikeaConnect;
exports.ikeaDisconnect = ikeaDisconnect;
exports.ikeaListDevices = ikeaListDevices;
exports.ikeaControlLight = ikeaControlLight;
exports.ikeaGetDevice = ikeaGetDevice;
exports.ikeaStartObserving = ikeaStartObserving;
exports.ikeaStopObserving = ikeaStopObserving;
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const path_1 = require("path");
let worker = null;
let buffer = "";
let pendingResolve = null;
let pendingReject = null;
function workerPath() {
    return (0, path_1.join)(__dirname, "..", "electron", "ikea-worker.mjs");
}
function sendToWorker(msg) {
    return new Promise((resolve, reject) => {
        if (!worker) {
            reject(new Error("Worker not running"));
            return;
        }
        const to = setTimeout(() => {
            pendingResolve = null;
            pendingReject = null;
            reject(new Error("Request timed out"));
        }, 20000);
        pendingResolve = (result) => {
            clearTimeout(to);
            resolve(result);
        };
        pendingReject = (err) => {
            clearTimeout(to);
            reject(err);
        };
        worker.stdin.write(JSON.stringify(msg) + "\n");
    });
}
function startWorker(host) {
    return new Promise((resolve, reject) => {
        const path = workerPath();
        worker = (0, child_process_1.spawn)("node", [path, host], {
            stdio: ["pipe", "pipe", "pipe"],
        });
        let started = false;
        const to = setTimeout(() => {
            if (!started) {
                worker.kill();
                reject(new Error("Worker startup timed out"));
            }
        }, 5000);
        worker.stdout.on("data", (data) => {
            if (!started) {
                started = true;
                clearTimeout(to);
                resolve();
            }
            buffer += data.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                try {
                    const msg = JSON.parse(trimmed);
                    if (msg.type === "device_update") {
                        // handled by observation setup
                    }
                    else if (pendingResolve) {
                        const r = pendingResolve;
                        pendingResolve = null;
                        pendingReject = null;
                        r(msg);
                    }
                }
                catch { }
            }
        });
        worker.stderr.on("data", (data) => {
            console.error("[IKEA Worker]", data.toString().trim());
        });
        worker.on("exit", (code) => {
            if (!started) {
                clearTimeout(to);
                reject(new Error(`Worker exited with code ${code}`));
            }
            else if (pendingReject) {
                pendingReject(new Error(`Worker exited unexpectedly (code ${code})`));
                pendingResolve = null;
                pendingReject = null;
            }
            worker = null;
        });
    });
}
async function ikeaConnect(host, securityCode) {
    const identity = (0, crypto_1.randomUUID)().replace(/-/g, "").substring(0, 16);
    await startWorker(host);
    const result = await sendToWorker({
        command: "connect",
        securityCode,
        identity,
    });
    if (result.type === "error")
        throw new Error(result.error);
    return { identity: result.identity, psk: result.psk };
}
async function ikeaDisconnect(host) {
    if (worker) {
        try {
            worker.stdin.write(JSON.stringify({ command: "disconnect" }) + "\n");
        }
        catch { }
        try {
            worker.kill();
        }
        catch { }
        worker = null;
    }
    buffer = "";
    pendingResolve = null;
    pendingReject = null;
}
async function ikeaListDevices(host) {
    const result = await sendToWorker({ command: "list_devices" });
    if (result.type === "error")
        throw new Error(result.error);
    return (result.devices || []);
}
async function ikeaControlLight(host, deviceId, cmd) {
    const result = await sendToWorker({
        command: "control_light",
        deviceId,
        lightCommand: cmd,
    });
    if (result.type === "error")
        throw new Error(result.error);
}
async function ikeaGetDevice(host, deviceId) {
    const result = await sendToWorker({ command: "get_device", deviceId });
    if (result.type === "error")
        throw new Error(result.error);
    return result.device;
}
async function ikeaStartObserving(host, deviceId, onUpdate) {
    if (!worker?.stdout)
        return;
    await sendToWorker({ command: "start_observing" });
    const handler = (data) => {
        const text = data.toString();
        for (const line of text.split("\n")) {
            try {
                const msg = JSON.parse(line.trim());
                if (msg.type === "device_update") {
                    onUpdate(msg.device);
                }
            }
            catch { }
        }
    };
    worker.stdout.on("data", handler);
}
async function ikeaStopObserving(host, deviceId) {
    await sendToWorker({ command: "stop_observing" });
}
//# sourceMappingURL=ikea-coap.js.map