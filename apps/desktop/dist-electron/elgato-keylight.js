"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.elgatoDiscover = elgatoDiscover;
exports.elgatoGetState = elgatoGetState;
exports.elgatoSetState = elgatoSetState;
exports.elgatoToggle = elgatoToggle;
exports.elgatoIncrBrightness = elgatoIncrBrightness;
exports.elgatoIncrTemperature = elgatoIncrTemperature;
exports.elgatoCleanup = elgatoCleanup;
const http = __importStar(require("http"));
const os_1 = require("os");
function httpGet(addr, port) {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://${addr}:${port}/elgato/lights`, { timeout: 5000 }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(e);
                }
            });
        });
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timed out"));
        });
    });
}
function httpPut(addr, port, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request(`http://${addr}:${port}/elgato/lights`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
            timeout: 5000,
        }, (res) => {
            let responseData = "";
            res.on("data", (chunk) => (responseData += chunk));
            res.on("end", () => {
                try {
                    resolve(JSON.parse(responseData));
                }
                catch (e) {
                    reject(e);
                }
            });
        });
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timed out"));
        });
        req.write(data);
        req.end();
    });
}
function probeDevice(addr, port) {
    return new Promise((resolve) => {
        const req = http.get(`http://${addr}:${port}/elgato/lights`, { timeout: 2000 }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.lights && parsed.numberOfLights > 0) {
                        resolve({ id: `${addr}:${port}`, name: `Elgato Key Light (${addr})`, addr, port });
                    }
                    else {
                        resolve(null);
                    }
                }
                catch {
                    resolve(null);
                }
            });
        });
        req.on("error", () => resolve(null));
        req.on("timeout", () => {
            req.destroy();
            resolve(null);
        });
    });
}
function getLocalSubnets() {
    const subnets = new Set();
    const nets = (0, os_1.networkInterfaces)();
    for (const name of Object.keys(nets)) {
        // Skip virtual adapters (Tailscale, Hyper-V, WSL, Docker, etc.)
        if (name.toLowerCase().includes("tailscale") ||
            name.toLowerCase().includes("v ethernet") ||
            name.toLowerCase().includes("vswitch") ||
            name.toLowerCase().includes("hyper-v") ||
            name.toLowerCase().includes("docker") ||
            name.toLowerCase().includes("virtualbox") ||
            name.toLowerCase().includes("vmware") ||
            name.toLowerCase().includes("bluetooth"))
            continue;
        for (const net of nets[name] ?? []) {
            if (net.family === "IPv4" && !net.internal) {
                const parts = net.address.split(".");
                subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
            }
        }
    }
    return [...subnets];
}
async function scanSubnet(subnet, port) {
    const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
    const results = await Promise.all(ips.map((ip) => probeDevice(ip, port)));
    return results.filter((d) => d !== null);
}
async function elgatoDiscover(manualAddr) {
    if (manualAddr) {
        const device = await probeDevice(manualAddr, 9123);
        return device ? [device] : [];
    }
    const subnets = getLocalSubnets();
    if (subnets.length === 0)
        return [];
    const seen = new Set();
    const results = [];
    for (const subnet of subnets) {
        const found = await scanSubnet(subnet, 9123);
        for (const d of found) {
            if (!seen.has(d.id)) {
                seen.add(d.id);
                results.push(d);
            }
        }
    }
    return results;
}
async function elgatoGetState(addr, port) {
    return httpGet(addr, port);
}
async function elgatoSetState(addr, port, state) {
    const current = await elgatoGetState(addr, port);
    const lights = current.lights.map((light) => ({
        ...light,
        ...(state.on !== undefined ? { on: state.on } : {}),
        ...(state.brightness !== undefined ? { brightness: state.brightness } : {}),
        ...(state.temperature !== undefined ? { temperature: state.temperature } : {}),
    }));
    return httpPut(addr, port, { numberOfLights: current.numberOfLights, lights });
}
async function elgatoToggle(addr, port) {
    const current = await elgatoGetState(addr, port);
    const newOn = current.lights[0].on === 1 ? 0 : 1;
    return elgatoSetState(addr, port, { on: newOn });
}
async function elgatoIncrBrightness(addr, port, delta) {
    const current = await elgatoGetState(addr, port);
    const newBrightness = Math.max(0, Math.min(100, current.lights[0].brightness + delta));
    return elgatoSetState(addr, port, { brightness: newBrightness });
}
function miredsToKelvin(m) {
    return Math.round(1_000_000 / m);
}
function kelvinToMireds(k) {
    return Math.round(1_000_000 / k);
}
async function elgatoIncrTemperature(addr, port, delta) {
    const current = await elgatoGetState(addr, port);
    const currentK = miredsToKelvin(current.lights[0].temperature);
    const newK = Math.max(2900, Math.min(7000, currentK + delta));
    return elgatoSetState(addr, port, { temperature: kelvinToMireds(newK) });
}
function elgatoCleanup() {
}
//# sourceMappingURL=elgato-keylight.js.map