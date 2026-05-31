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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs_1 = require("fs");
const stream_1 = require("stream");
const path_1 = require("path");
const http_1 = require("http");
const https_1 = require("https");
const crypto_1 = require("crypto");
const ws_1 = require("ws");
const obs_websocket_js_1 = __importDefault(require("obs-websocket-js"));
const child_process_1 = require("child_process");
const form_data_1 = __importDefault(require("form-data"));
const tiktok_live_connector_1 = require("tiktok-live-connector");
const ikea_coap_1 = require("./ikea-coap");
const DEV = process.env.NODE_ENV === "development" || process.argv.includes("--dev");
const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
const APP_VERSION = electron_1.app.getVersion() || "1.0.0";
let mainWindow = null;
const WINDOW_STATE_FILE = electron_1.app.isPackaged
    ? (0, path_1.join)(electron_1.app.getPath("userData"), "window-state.json")
    : (0, path_1.join)(__dirname, "..", "window-state.json");
function saveWindowState() {
    if (!mainWindow)
        return;
    try {
        const bounds = mainWindow.getBounds();
        const maximized = mainWindow.isMaximized();
        (0, fs_1.writeFileSync)(WINDOW_STATE_FILE, JSON.stringify({ ...bounds, maximized }));
    }
    catch { }
}
function loadWindowState() {
    try {
        return JSON.parse((0, fs_1.readFileSync)(WINDOW_STATE_FILE, "utf-8"));
    }
    catch {
        return { x: undefined, y: undefined, width: 1280, height: 800, maximized: false };
    }
}
function createWindow() {
    const saved = loadWindowState();
    const iconPath = (0, path_1.join)(__dirname, "..", "resources", process.platform === "win32" ? "icon.ico" : "icon.png");
    mainWindow = new electron_1.BrowserWindow({
        width: saved.width,
        height: saved.height,
        x: saved.x,
        y: saved.y,
        minWidth: 800,
        minHeight: 600,
        title: "MacroGraph",
        icon: iconPath,
        autoHideMenuBar: true,
        webPreferences: {
            preload: (0, path_1.join)(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: !DEV,
        },
    });
    if (saved.maximized)
        mainWindow.maximize();
    if (DEV) {
        mainWindow.loadURL(DEV_URL);
    }
    else {
        mainWindow.loadFile((0, path_1.join)(__dirname, "..", ".output", "public", "index.html"));
    }
    mainWindow.on("resize", saveWindowState);
    mainWindow.on("move", saveWindowState);
    mainWindow.on("maximize", saveWindowState);
    mainWindow.on("unmaximize", saveWindowState);
    mainWindow.on("closed", () => { mainWindow = null; });
}
// ── Session tracking ──────────────────────────────────────────────────────────
const SESSION_FILE = electron_1.app.isPackaged
    ? (0, path_1.join)(electron_1.app.getPath("userData"), "logs", "session.json")
    : (0, path_1.join)(__dirname, "..", "logs", "session.json");
const LOG_DIR = (0, path_1.dirname)(SESSION_FILE);
const CRASH_LOG = (0, path_1.join)(LOG_DIR, "crash.log");
function initSessionTracking() {
    if (!(0, fs_1.existsSync)(LOG_DIR))
        (0, fs_1.mkdirSync)(LOG_DIR, { recursive: true });
    const prev = readSessionFile();
    if (prev && !prev.cleanExit) {
        appendCrashLog("recovery", `previous session (v${prev.version}) did not exit cleanly (started ${prev.startedAt})`);
    }
    writeSessionFile({ cleanExit: false, startedAt: Math.floor(Date.now() / 1000), version: APP_VERSION });
    appendCrashLog("startup", `MacroGraph ${APP_VERSION} started; log: ${CRASH_LOG}`);
}
function markCleanExit() {
    writeSessionFile({ cleanExit: true, startedAt: Math.floor(Date.now() / 1000), version: APP_VERSION });
}
function readSessionFile() {
    try {
        return JSON.parse((0, fs_1.readFileSync)(SESSION_FILE, "utf-8"));
    }
    catch {
        return null;
    }
}
function writeSessionFile(state) {
    try {
        (0, fs_1.writeFileSync)(SESSION_FILE, JSON.stringify(state));
    }
    catch { }
}
function appendCrashLog(kind, message) {
    try {
        const line = `[${Math.floor(Date.now() / 1000)}] [${kind}] ${message}\n`;
        (0, fs_1.writeFileSync)(CRASH_LOG, line, { encoding: "utf-8", flag: "a" });
    }
    catch { }
}
// ── App lifecycle ──────────────────────────────────────────────────────────────
electron_1.app.whenReady().then(() => {
    initSessionTracking();
    createWindow();
    registerIpcHandlers();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on("will-quit", () => {
    appendCrashLog("exit", "application Exit");
    markCleanExit();
});
process.on("uncaughtException", (err) => {
    appendCrashLog("panic", `${err.name}: ${err.message}\n${err.stack || ""}`);
    markCleanExit();
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    appendCrashLog("error", `unhandledRejection: ${String(reason)}`);
});
electron_1.app.on("window-all-closed", () => {
    appendCrashLog("exit", "window-all-closed");
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
function getWindow() {
    if (!mainWindow)
        throw new Error("No main window");
    return mainWindow;
}
function sendToRenderer(channel, ...args) {
    const win = getWindow();
    if (win.webContents)
        win.webContents.send(channel, ...args);
}
// ── IPC registration ───────────────────────────────────────────────────────────
function registerIpcHandlers() {
    registerPlatformHandlers();
    registerFsHandlers();
    registerShellHandlers();
    registerWsHandlers();
    registerOutboundWsHandlers();
    registerRemoteHostHandlers();
    registerObsHandlers();
    registerOAuthHandlers();
    registerAudioHandlers();
    registerKbMouseHandlers();
    registerLoginHandlers();
    registerCrashLogHandlers();
    registerFilePathHandlers();
    registerHttpHandlers();
    registerTikTokHandlers();
    registerIkeaHandlers();
}
// ── Platform (dialogs, clipboard, shell) ──────────────────────────────────────
function registerPlatformHandlers() {
    electron_1.ipcMain.handle("dialog:open", async (_, options) => {
        const result = await electron_1.dialog.showOpenDialog(getWindow(), options);
        return result.canceled ? null : result.filePaths[0] ?? null;
    });
    electron_1.ipcMain.handle("dialog:save", async (_, options) => {
        const result = await electron_1.dialog.showSaveDialog(getWindow(), options);
        return result.canceled ? null : result.filePath ?? null;
    });
    electron_1.ipcMain.handle("dialog:confirm", async (_, options) => {
        const result = await electron_1.dialog.showMessageBox(getWindow(), {
            type: "question",
            buttons: ["Yes", "No"],
            defaultId: 0,
            cancelId: 1,
            message: options.message,
            title: options.title ?? "Confirm",
        });
        return result.response === 0;
    });
    electron_1.ipcMain.handle("clipboard:readText", () => electron_1.clipboard.readText());
    electron_1.ipcMain.handle("clipboard:writeText", (_, text) => { electron_1.clipboard.writeText(text); });
    electron_1.ipcMain.handle("shell:openExternal", (_, url) => electron_1.shell.openExternal(url));
}
// ── File system ────────────────────────────────────────────────────────────────
function registerFsHandlers() {
    electron_1.ipcMain.handle("fs:list", (_, path) => {
        const entries = (0, fs_1.readdirSync)(path, { withFileTypes: true });
        return entries.map((e) => (e.isDirectory() ? { Dir: e.name } : { File: e.name }));
    });
    electron_1.ipcMain.handle("fs:readTextFile", (_, path) => (0, fs_1.readFileSync)(path, "utf-8"));
    electron_1.ipcMain.handle("fs:writeTextFile", (_, path, content) => {
        const dir = (0, path_1.dirname)(path);
        if (!(0, fs_1.existsSync)(dir))
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        (0, fs_1.writeFileSync)(path, content, "utf-8");
    });
    electron_1.ipcMain.handle("fs:readBinaryFile", (_, path) => (0, fs_1.readFileSync)(path));
    electron_1.ipcMain.handle("fs:writeBinaryFile", (_, path, data) => {
        const dir = (0, path_1.dirname)(path);
        if (!(0, fs_1.existsSync)(dir))
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        (0, fs_1.writeFileSync)(path, Buffer.from(data));
    });
    electron_1.ipcMain.handle("fs:fileSize", (_, path) => {
        try {
            return (0, fs_1.statSync)(path).size;
        }
        catch {
            return null;
        }
    });
}
// ── Shell ──────────────────────────────────────────────────────────────────────
function registerShellHandlers() {
    electron_1.ipcMain.handle("shell:execute", (_, command) => {
        return new Promise((resolve, reject) => {
            (0, child_process_1.exec)(command, (error) => {
                if (error)
                    reject(error);
                else
                    resolve();
            });
        });
    });
}
// ── File path ──────────────────────────────────────────────────────────────────
function registerFilePathHandlers() {
    electron_1.ipcMain.handle("path:convertFileSrc", (_, path) => path);
}
// ── WebSocket server ───────────────────────────────────────────────────────────
const wsServers = new Map();
function registerWsHandlers() {
    electron_1.ipcMain.handle("ws:server:start", (_, port) => {
        if (wsServers.has(port))
            return;
        const wss = new ws_1.WebSocketServer({ port });
        const clients = new Set();
        wss.on("connection", (ws) => {
            clients.add(ws);
            sendToRenderer("ws:server:message", [port, -1, "Connected"]);
            ws.on("message", (data) => {
                const text = data.toString();
                let clientId = -1, i = 0;
                for (const client of clients) {
                    if (client === ws) {
                        clientId = i;
                        break;
                    }
                    i++;
                }
                sendToRenderer("ws:server:message", [port, clientId, { Text: text }]);
            });
            ws.on("close", () => {
                clients.delete(ws);
                sendToRenderer("ws:server:message", [port, -1, "Disconnected"]);
            });
            ws.on("error", () => { clients.delete(ws); });
        });
        wsServers.set(port, { wss, clients });
    });
    electron_1.ipcMain.handle("ws:server:send", (_, args) => {
        const server = wsServers.get(args.port);
        if (!server)
            return;
        if (args.client !== null) {
            let i = 0;
            for (const ws of server.clients) {
                if (i === args.client) {
                    ws.send(args.data);
                    break;
                }
                i++;
            }
        }
        else {
            for (const ws of server.clients)
                ws.send(args.data);
        }
    });
    electron_1.ipcMain.handle("ws:server:disconnectAll", () => {
        for (const [, server] of wsServers) {
            for (const ws of server.clients)
                ws.close();
            server.clients.clear();
        }
    });
    electron_1.ipcMain.handle("ws:server:stop", (_, port) => {
        const server = wsServers.get(port);
        if (server) {
            server.wss.close();
            wsServers.delete(port);
        }
    });
}
const outboundWsConnections = new Map();
const OUTBOUND_WS_CONNECT_TIMEOUT = 15000;
function registerOutboundWsHandlers() {
    function tryConnect(conn) {
        if (conn.ws.readyState === ws_1.WebSocket.OPEN || conn.ws.readyState === ws_1.WebSocket.CONNECTING)
            return;
        conn.ws = new ws_1.WebSocket(conn.url);
        const timeout = setTimeout(() => {
            if (conn.ws.readyState === ws_1.WebSocket.CONNECTING) {
                conn.ws.close();
                sendToRenderer("outboundWs:message", [conn.url, { Error: "connect timeout" }]);
            }
        }, OUTBOUND_WS_CONNECT_TIMEOUT);
        conn.ws.on("open", () => { clearTimeout(timeout); });
        conn.ws.on("open", () => {
            conn.reconnectAttempt = 0;
            sendToRenderer("outboundWs:message", [conn.url, "Open"]);
        });
        conn.ws.on("message", (data) => {
            sendToRenderer("outboundWs:message", [conn.url, { Text: data.toString() }]);
        });
        conn.ws.on("close", () => {
            sendToRenderer("outboundWs:message", [conn.url, "Closed"]);
            if (conn.shouldReconnect) {
                const delay = Math.min(1000 * Math.pow(2, conn.reconnectAttempt), 30000);
                conn.reconnectAttempt++;
                conn.reconnectTimer = setTimeout(() => tryConnect(conn), delay);
            }
        });
        conn.ws.on("error", (err) => {
            sendToRenderer("outboundWs:message", [conn.url, { Error: err.message }]);
        });
    }
    function addTimeout(ws, url) {
        const timeout = setTimeout(() => {
            if (ws.readyState === ws_1.WebSocket.CONNECTING) {
                ws.close();
                sendToRenderer("outboundWs:message", [url, { Error: "connect timeout" }]);
            }
        }, OUTBOUND_WS_CONNECT_TIMEOUT);
        ws.on("open", () => { clearTimeout(timeout); });
    }
    electron_1.ipcMain.handle("outboundWs:open", (_, url) => {
        let conn = outboundWsConnections.get(url);
        if (conn) {
            conn.shouldReconnect = true;
            if (conn.ws.readyState !== ws_1.WebSocket.OPEN)
                tryConnect(conn);
            return;
        }
        conn = { ws: new ws_1.WebSocket(url), url, reconnectAttempt: 0, shouldReconnect: true };
        addTimeout(conn.ws, url);
        conn.ws.on("open", () => {
            conn.reconnectAttempt = 0;
            sendToRenderer("outboundWs:message", [url, "Open"]);
        });
        conn.ws.on("message", (data) => {
            sendToRenderer("outboundWs:message", [url, { Text: data.toString() }]);
        });
        conn.ws.on("close", () => {
            sendToRenderer("outboundWs:message", [url, "Closed"]);
            if (conn.shouldReconnect) {
                const delay = Math.min(1000 * Math.pow(2, conn.reconnectAttempt), 30000);
                conn.reconnectAttempt++;
                conn.reconnectTimer = setTimeout(() => tryConnect(conn), delay);
            }
        });
        conn.ws.on("error", (err) => {
            sendToRenderer("outboundWs:message", [url, { Error: err.message }]);
        });
        outboundWsConnections.set(url, conn);
    });
    electron_1.ipcMain.handle("outboundWs:close", (_, url) => {
        const conn = outboundWsConnections.get(url);
        if (conn) {
            conn.shouldReconnect = false;
            if (conn.reconnectTimer)
                clearTimeout(conn.reconnectTimer);
            conn.ws.close();
            outboundWsConnections.delete(url);
        }
    });
    electron_1.ipcMain.handle("outboundWs:closeAll", () => {
        for (const [, conn] of outboundWsConnections) {
            conn.shouldReconnect = false;
            if (conn.reconnectTimer)
                clearTimeout(conn.reconnectTimer);
            conn.ws.close();
        }
        outboundWsConnections.clear();
    });
    electron_1.ipcMain.handle("outboundWs:send", (_, args) => {
        const conn = outboundWsConnections.get(args.url);
        if (conn && conn.ws.readyState === ws_1.WebSocket.OPEN)
            conn.ws.send(args.data);
    });
    electron_1.ipcMain.handle("outboundWs:list", () => [...outboundWsConnections.keys()]);
    electron_1.ipcMain.handle("outboundWs:isConnected", (_, url) => {
        const conn = outboundWsConnections.get(url);
        return conn !== undefined && conn.ws.readyState === ws_1.WebSocket.OPEN;
    });
    electron_1.ipcMain.handle("outboundWs:pruneExcept", (_, keep) => {
        const toDelete = [...outboundWsConnections.keys()].filter((k) => !keep.includes(k));
        for (const url of toDelete) {
            const conn = outboundWsConnections.get(url);
            if (conn) {
                conn.shouldReconnect = false;
                if (conn.reconnectTimer)
                    clearTimeout(conn.reconnectTimer);
                conn.ws.close();
                outboundWsConnections.delete(url);
            }
        }
    });
}
let remoteHost = null;
function registerRemoteHostHandlers() {
    electron_1.ipcMain.handle("remoteHost:start", async (_, args) => {
        if (remoteHost)
            await stopRemoteHost();
        const password = args.password ?? null;
        remoteHost = {
            httpServer: null, wss: null, clients: new Map(),
            password, nextClientId: 1,
        };
        const wss = new ws_1.WebSocketServer({ noServer: true });
        remoteHost.wss = wss;
        const remotePublicDir = (0, path_1.join)(__dirname, "..", "remote-public");
        const httpServer = (0, http_1.createServer)((req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "*");
            if (req.method === "OPTIONS") {
                res.writeHead(204);
                res.end();
                return;
            }
            const serveFile = (path) => {
                const fullPath = (0, path_1.join)(remotePublicDir, path);
                if ((0, fs_1.existsSync)(fullPath) && (0, fs_1.statSync)(fullPath).isFile()) {
                    const extMap = {
                        ".html": "text/html", ".js": "application/javascript",
                        ".css": "text/css", ".json": "application/json",
                        ".png": "image/png", ".svg": "image/svg+xml",
                        ".ico": "image/x-icon",
                    };
                    res.writeHead(200, { "Content-Type": extMap[(0, path_1.extname)(fullPath)] || "application/octet-stream" });
                    res.end((0, fs_1.readFileSync)(fullPath));
                }
                else {
                    res.writeHead(404);
                    res.end("Not found");
                }
            };
            if (req.url === "/" || !req.url) {
                const indexPath = (0, path_1.join)(remotePublicDir, "index.html");
                if ((0, fs_1.existsSync)(indexPath)) {
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end((0, fs_1.readFileSync)(indexPath, "utf-8"));
                }
                else {
                    serveFile("index.html");
                }
            }
            else {
                serveFile(req.url);
            }
        });
        httpServer.on("upgrade", (request, socket, head) => {
            wss.handleUpgrade(request, socket, head, (ws) => {
                const clientId = remoteHost.nextClientId++;
                const entry = { id: clientId, authenticated: remoteHost.password === null };
                remoteHost.clients.set(ws, entry);
                if (!entry.authenticated) {
                    ws.send(JSON.stringify({ type: "authRequired" }));
                }
                else {
                    sendToRenderer("remote-host://message", [clientId, "Connected"]);
                }
                ws.on("message", (data) => {
                    const text = data.toString();
                    let parsed;
                    try {
                        parsed = JSON.parse(text);
                    }
                    catch {
                        parsed = null;
                    }
                    if (!entry.authenticated && parsed?.type === "auth" && remoteHost.password !== null) {
                        if (parsed.password === remoteHost.password) {
                            entry.authenticated = true;
                            entry.username = parsed.username;
                            sendToRenderer("remote-host://message", [clientId, { ConnectedWithUser: { username: parsed.username ?? "User" } }]);
                            ws.send(JSON.stringify({ type: "authSuccess" }));
                        }
                        else {
                            ws.send(JSON.stringify({ type: "authFailed" }));
                            ws.close();
                        }
                        return;
                    }
                    if (entry.authenticated) {
                        sendToRenderer("remote-host://message", [clientId, { Text: text }]);
                    }
                });
                ws.on("close", () => {
                    remoteHost.clients.delete(ws);
                    sendToRenderer("remote-host://message", [clientId, "Disconnected"]);
                });
                ws.on("error", () => { remoteHost.clients.delete(ws); });
            });
        });
        remoteHost.httpServer = httpServer;
        return new Promise((resolve) => {
            httpServer.listen(args.port, "0.0.0.0", () => resolve());
        });
    });
    async function stopRemoteHost() {
        if (!remoteHost)
            return;
        for (const ws of remoteHost.clients.keys())
            ws.close();
        remoteHost.wss.close();
        remoteHost.httpServer.close();
        remoteHost = null;
    }
    electron_1.ipcMain.handle("remoteHost:stop", async () => { await stopRemoteHost(); });
    electron_1.ipcMain.handle("remoteHost:send", (_, args) => {
        if (!remoteHost)
            return;
        for (const [ws, entry] of remoteHost.clients) {
            if (!entry.authenticated)
                continue;
            if (args.client !== null && entry.id !== args.client)
                continue;
            if (args.except_client !== undefined && args.except_client !== null && entry.id === args.except_client)
                continue;
            ws.send(args.data);
        }
    });
    electron_1.ipcMain.handle("remoteHost:setPassword", (_, password) => {
        if (remoteHost)
            remoteHost.password = password;
    });
}
// ── OBS WebSocket ──────────────────────────────────────────────────────────────
const obsInstances = new Map();
function registerObsHandlers() {
    electron_1.ipcMain.handle("obs:connect", async (_, args) => {
        const obs = new obs_websocket_js_1.default();
        await obs.connect(args.url, args.password ?? undefined);
        obs.on("ConnectionClosed", () => {
            sendToRenderer("obs:event", [args.url, { lifecycle: "Disconnected" }]);
        });
        obs.on("Identified", () => {
            sendToRenderer("obs:event", [args.url, { lifecycle: "Connected" }]);
        });
        obs.on("*", (eventType, eventData) => {
            sendToRenderer("obs:event", [args.url, { eventType, eventData }]);
        });
        obsInstances.set(args.url, obs);
    });
    electron_1.ipcMain.handle("obs:disconnect", async (_, url) => {
        const obs = obsInstances.get(url);
        if (obs) {
            await obs.disconnect();
            obsInstances.delete(url);
        }
    });
    electron_1.ipcMain.handle("obs:disconnectAll", async () => {
        for (const [url, obs] of obsInstances) {
            await obs.disconnect();
            obsInstances.delete(url);
        }
    });
    electron_1.ipcMain.handle("obs:call", async (_, args) => {
        const obs = obsInstances.get(args.url);
        if (!obs)
            throw new Error(`OBS not connected to ${args.url}`);
        return obs.call(args.requestType, args.requestData);
    });
    electron_1.ipcMain.handle("obs:callBatch", async (_, args) => {
        const obs = obsInstances.get(args.url);
        if (!obs)
            throw new Error(`OBS not connected to ${args.url}`);
        const results = [];
        for (const req of args.requests) {
            results.push(await obs.call(req.requestType, req.requestData));
        }
        return results;
    });
}
// ── OAuth ──────────────────────────────────────────────────────────────────────
function registerOAuthHandlers() {
    electron_1.ipcMain.handle("oauth:authorize", async (_, url) => {
        return new Promise((resolve, reject) => {
            const server = (0, http_1.createServer)(async (req, res) => {
                const urlObj = new URL(req.url, `http://${req.headers.host}`);
                const token = urlObj.searchParams.get("token");
                if (token) {
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end("<html><body><h1>Authorization successful! You can close this tab.</h1></body></html>");
                    try {
                        const tokenData = JSON.parse(Buffer.from(token, "base64").toString());
                        server.close();
                        resolve(tokenData);
                    }
                    catch {
                        server.close();
                        reject(new Error("Failed to decode token"));
                    }
                }
                else {
                    res.writeHead(400);
                    res.end("No authorization token");
                    server.close();
                    reject(new Error("No authorization token"));
                }
            });
            server.listen(0, "127.0.0.1", () => {
                const port = server.address().port;
                const state = Buffer.from(JSON.stringify({ env: "desktop", port })).toString("base64");
                electron_1.shell.openExternal(`${url}?state=${encodeURIComponent(state)}`);
            });
        });
    });
}
// ── Login listener ─────────────────────────────────────────────────────────────
let loginServer = null;
function registerLoginHandlers() {
    electron_1.ipcMain.handle("loginListen", async () => {
        return new Promise((resolve, reject) => {
            if (loginServer)
                loginServer.close();
            const id = String(Math.floor(Date.now() / 1000));
            function corsHeaders() {
                return {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                };
            }
            loginServer = (0, http_1.createServer)((req, res) => {
                if (req.method === "OPTIONS") {
                    res.writeHead(204, corsHeaders());
                    res.end();
                    return;
                }
                if (req.method === "GET" && req.url === "/") {
                    res.writeHead(200, { "Content-Type": "text/plain", ...corsHeaders() });
                    res.end(id);
                    return;
                }
                if (req.method === "POST" && req.url === "/session") {
                    let body = "";
                    req.on("data", (chunk) => { body += chunk; });
                    req.on("end", () => {
                        try {
                            const session = JSON.parse(body);
                            if (typeof session === "string") {
                                res.writeHead(200, corsHeaders());
                                res.end("ok");
                                if (loginServer)
                                    loginServer.close();
                                loginServer = null;
                                resolve(session);
                            }
                            else {
                                res.writeHead(400, corsHeaders());
                                res.end("invalid session");
                            }
                        }
                        catch {
                            res.writeHead(400, corsHeaders());
                            res.end("invalid json");
                        }
                    });
                    return;
                }
                res.writeHead(404, corsHeaders());
                res.end("not found");
            });
            loginServer.listen(25000, "127.0.0.1", () => { });
        });
    });
}
const audioPlayers = new Map();
function registerAudioHandlers() {
    electron_1.ipcMain.handle("audio:enumerate", async () => {
        const devices = [];
        try {
            const result = await new Promise((resolve) => {
                (0, child_process_1.exec)('powershell -Command "Get-AudioDevice -List | Select-Object ID, Name | ConvertTo-Json"', (err, stdout) => {
                    resolve(err ? "[]" : stdout);
                });
            });
            const parsed = JSON.parse(result);
            if (Array.isArray(parsed)) {
                return parsed.map((d) => ({ device_id: d.ID ?? "default", label: d.Name ?? "Unknown" }));
            }
        }
        catch { }
        return [{ device_id: "default", label: "Default Output" }];
    });
    electron_1.ipcMain.handle("audio:play", async (_, args) => {
        const id = (0, crypto_1.randomUUID)();
        try {
            const ext = (0, path_1.extname)(args.path).toLowerCase();
            let proc;
            if (ext === ".wav") {
                proc = (0, child_process_1.spawn)("powershell", ["-c", `(New-Object Media.SoundPlayer '${args.path.replace(/'/g, "''")}').PlaySync()`]);
            }
            else if (["mp3", "ogg", "flac", "aac", "m4a", "wma", "opus", "webm"].includes(ext)) {
                const tempWav = (0, path_1.join)(electron_1.app.getPath("temp"), `mg-audio-${id}.wav`);
                try {
                    await new Promise((resolve, reject) => {
                        (0, child_process_1.exec)(`ffmpeg -y -i "${args.path}" -f wav "${tempWav}"`, (err) => {
                            if (err)
                                reject(err);
                            else
                                resolve();
                        });
                    });
                    proc = (0, child_process_1.spawn)("powershell", ["-c", `(New-Object Media.SoundPlayer '${tempWav.replace(/'/g, "''")}').PlaySync()`]);
                    proc.on("exit", () => {
                        try {
                            (0, fs_1.unlinkSync)(tempWav);
                        }
                        catch { }
                    });
                }
                catch {
                    // ffmpeg not available, fall back to shell open
                    proc = (0, child_process_1.spawn)("powershell", ["-c", `Start-Process -FilePath '${args.path}' -WindowStyle Hidden`]);
                }
            }
            else {
                proc = (0, child_process_1.spawn)("powershell", ["-c", `Start-Process -FilePath '${args.path}' -WindowStyle Hidden`]);
            }
            const state = { process: proc, id, volume: 1.0 };
            proc.on("exit", () => {
                audioPlayers.delete(id);
            });
            audioPlayers.set(id, state);
            return { id };
        }
        catch {
            return { id };
        }
    });
    electron_1.ipcMain.handle("audio:stop", (_, id) => {
        const player = audioPlayers.get(id);
        if (player) {
            try {
                player.process.kill();
            }
            catch { }
            audioPlayers.delete(id);
        }
    });
    electron_1.ipcMain.handle("audio:setVolume", (_, args) => {
        const player = audioPlayers.get(args.id);
        if (player) {
            player.volume = Math.max(0, Math.min(1, args.volume));
        }
    });
    electron_1.ipcMain.handle("audio:stopAll", () => {
        for (const [id, player] of audioPlayers) {
            try {
                player.process.kill();
            }
            catch { }
            audioPlayers.delete(id);
        }
    });
}
// ── KB/Mouse simulation ────────────────────────────────────────────────────────
let kbHooks = null;
function registerKbMouseHandlers() {
    electron_1.ipcMain.handle("kbMouse:simulateKeys", async (_, args) => {
        try {
            const keysStr = args.keys.join(",");
            await new Promise((resolve, reject) => {
                (0, child_process_1.exec)(`powershell -Command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${keysStr.replace(/'/g, "''")}')"`, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
        catch { }
    });
    electron_1.ipcMain.handle("kbMouse:simulateMouse", async (_, args) => {
        try {
            await new Promise((resolve, reject) => {
                (0, child_process_1.exec)(`powershell -Command "[System.Windows.Forms.Cursor]::Position = [System.Windows.Forms.Cursor]::Position; Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MouseButtons]::${args.button} = [System.Windows.Forms.MouseButtons]::${args.button} -bxor [System.Windows.Forms.MouseButtons]::${args.button}"`, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
        catch { }
    });
    electron_1.ipcMain.handle("kbMouse:setMousePosition", async (_, args) => {
        try {
            if (args.absolute) {
                await (0, child_process_1.exec)(`powershell -Command "[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(args.x)}, ${Math.round(args.y)})"`);
            }
            else {
                await (0, child_process_1.exec)(`powershell -Command "$p = [System.Windows.Forms.Cursor]::Position; $p.X += ${Math.round(args.x)}; $p.Y += ${Math.round(args.y)}; [System.Windows.Forms.Cursor]::Position = $p"`);
            }
        }
        catch { }
    });
    electron_1.ipcMain.handle("kbMouse:startHooks", async () => {
        try {
            const uiohook = await Promise.resolve().then(() => __importStar(require("uiohook-napi")));
            if (kbHooks)
                kbHooks.stop();
            uiohook.uIOhook.on("keydown", (e) => {
                const key = `Key${String.fromCharCode(e.keycode).toUpperCase()}`;
                sendToRenderer("kb:keyDown", { key, appFocused: false });
            });
            uiohook.uIOhook.on("keyup", (e) => {
                const key = `Key${String.fromCharCode(e.keycode).toUpperCase()}`;
                sendToRenderer("kb:keyUp", { key, appFocused: false });
            });
            uiohook.uIOhook.start();
            kbHooks = { stop: () => { uiohook.uIOhook.stop(); } };
        }
        catch (e) {
            console.warn("uiohook-napi not available, global keyboard hooks disabled", e);
        }
    });
    electron_1.ipcMain.handle("kbMouse:stopHooks", async () => {
        if (kbHooks) {
            kbHooks.stop();
            kbHooks = null;
        }
    });
}
// ── Crash log ──────────────────────────────────────────────────────────────────
function registerCrashLogHandlers() {
    electron_1.crashReporter.start({ submitURL: "", uploadToServer: false });
    electron_1.ipcMain.handle("crashLog:append", (_, kind, message) => {
        appendCrashLog(kind, message);
    });
    electron_1.ipcMain.handle("crashLog:path", () => CRASH_LOG);
}
// ── HTTP client (reqwest-equivalent in Node.js) ────────────────────────────────
let httpRequestIdCounter = 0;
const httpRequests = new Map();
const httpResponses = new Map();
function sanitizeFilePath(path) {
    let s = path.replace(/[\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "").replace(/\s+/g, "");
    while (s.startsWith('"') || s.startsWith("'"))
        s = s.slice(1);
    while (s.endsWith('"') || s.endsWith("'"))
        s = s.slice(0, -1);
    if (/^[a-zA-Z]:/.test(s))
        s = s.replace(/\//g, "\\");
    return s;
}
function doHttpRequest(url, method, headers, body, connectTimeout, maxRedirections) {
    // Handle data: URLs
    if (url.startsWith("data:")) {
        const commaIdx = url.indexOf(",");
        if (commaIdx === -1)
            return Promise.reject(new Error("invalid data URL"));
        const meta = url.substring(5, commaIdx);
        const raw = url.substring(commaIdx + 1);
        const decoded = meta.includes(";base64") ? Buffer.from(raw, "base64") : Buffer.from(decodeURIComponent(raw));
        const mimeType = meta.split(";")[0] || "text/plain";
        return Promise.resolve({
            status: 200,
            statusText: "OK",
            headers: [["content-type", mimeType]],
            url,
            body: decoded,
        });
    }
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === "https:";
        const httpMod = isHttps ? https_1.request : http_1.request;
        const headersObj = {};
        for (const [k, v] of headers)
            headersObj[k.toLowerCase()] = v;
        if (body === null && (method === "POST" || method === "PUT")) {
            headersObj["content-length"] = "0";
        }
        if (!headersObj["user-agent"])
            headersObj["user-agent"] = "MacroGraph";
        if (headersObj["range"] && !headersObj["accept-encoding"]) {
            headersObj["accept-encoding"] = "identity";
        }
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method,
            headers: headersObj,
            timeout: connectTimeout !== null ? connectTimeout : 0,
            rejectUnauthorized: true,
        };
        let redirectsLeft = maxRedirections ?? 20;
        function doRequest(currentUrl) {
            const currentParsed = new URL(currentUrl);
            const currentMod = currentParsed.protocol === "https:" ? https_1.request : http_1.request;
            const isCurrentHttps = currentParsed.protocol === "https:";
            const opts = { ...options, hostname: currentParsed.hostname, port: currentParsed.port || (isCurrentHttps ? 443 : 80), path: currentParsed.pathname + currentParsed.search };
            const req = currentMod(opts, (res) => {
                const status = res.statusCode || 0;
                const isRedirect = status >= 300 && status < 400 && res.headers.location;
                if (isRedirect && redirectsLeft > 0) {
                    redirectsLeft--;
                    const redirectUrl = new URL(res.headers.location, currentUrl).toString();
                    doRequest(redirectUrl);
                    return;
                }
                const responseHeaders = [];
                for (let i = 0; i < (res.rawHeaders?.length || 0); i += 2) {
                    responseHeaders.push([res.rawHeaders[i], res.rawHeaders[i + 1]]);
                }
                const chunks = [];
                res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                res.on("end", () => {
                    resolve({
                        status,
                        statusText: res.statusMessage || "",
                        headers: responseHeaders,
                        url: currentUrl,
                        body: Buffer.concat(chunks),
                    });
                });
            });
            req.on("error", reject);
            if (connectTimeout !== null) {
                req.on("timeout", () => { req.destroy(new Error("connect timeout")); });
            }
            if (body)
                req.write(body);
            req.end();
        }
        doRequest(url);
    });
}
function registerHttpHandlers() {
    electron_1.ipcMain.handle("http:fetch", async (_, args) => {
        const rid = ++httpRequestIdCounter;
        const body = args.data ? Buffer.from(args.data) : null;
        const promise = doHttpRequest(args.url, args.method, args.headers, body, args.connectTimeout, args.maxRedirections);
        httpRequests.set(rid, {
            promise,
            cancel: () => { },
        });
        return rid;
    });
    electron_1.ipcMain.handle("http:fetchMultipart", async (_, args) => {
        const rid = ++httpRequestIdCounter;
        const promise = new Promise(async (resolve, reject) => {
            try {
                const form = new form_data_1.default();
                for (const [key, value] of args.fields)
                    form.append(key, value);
                let uploadTotal = 0;
                if (args.filePath && args.fileFieldName) {
                    const sanitized = sanitizeFilePath(args.filePath);
                    const fileName = sanitized.split(/[\/\\]/).at(-1) ?? "file";
                    uploadTotal = (0, fs_1.statSync)(sanitized).size;
                    const readStream = (0, fs_1.createReadStream)(sanitized);
                    let bytesSent = 0;
                    let lastPercent = 0;
                    const progressStream = new stream_1.PassThrough();
                    readStream.on("data", (chunk) => {
                        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                        bytesSent += buf.length;
                        if (uploadTotal > 0) {
                            const pct = Math.min(Math.floor((bytesSent * 100) / uploadTotal), 100);
                            if (pct > lastPercent) {
                                lastPercent = pct;
                                sendToRenderer("http-upload-progress", { rid, percent: pct, sent: bytesSent, total: uploadTotal });
                            }
                        }
                        progressStream.write(buf);
                    });
                    readStream.on("end", () => { progressStream.end(); });
                    readStream.on("error", (err) => { progressStream.destroy(err); });
                    form.append(args.fileFieldName, progressStream, { filename: fileName, knownLength: uploadTotal });
                }
                const parsedUrl = new URL(args.url);
                const isHttps = parsedUrl.protocol === "https:";
                const httpMod = isHttps ? https_1.request : http_1.request;
                const headersObj = {};
                for (const [k, v] of args.headers) {
                    const lk = k.toLowerCase();
                    if (lk !== "host" && lk !== "content-length" && lk !== "content-type") {
                        headersObj[k] = v;
                    }
                }
                headersObj["user-agent"] = "MacroGraph";
                form.submit({ hostname: parsedUrl.hostname, port: parsedUrl.port || (isHttps ? 443 : 80), path: parsedUrl.pathname + parsedUrl.search, protocol: (isHttps ? "https:" : "http:"), headers: headersObj }, (err, res) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (uploadTotal > 0) {
                        sendToRenderer("http-upload-progress", { rid, percent: 100, sent: uploadTotal, total: uploadTotal });
                    }
                    const status = res.statusCode || 0;
                    const responseHeaders = [];
                    for (let i = 0; i < (res.rawHeaders?.length || 0); i += 2) {
                        responseHeaders.push([res.rawHeaders[i], res.rawHeaders[i + 1]]);
                    }
                    const chunks = [];
                    res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                    res.on("end", () => {
                        resolve({
                            status,
                            statusText: res.statusMessage || "",
                            headers: responseHeaders,
                            url: args.url,
                            body: Buffer.concat(chunks),
                        });
                    });
                });
            }
            catch (e) {
                reject(e);
            }
        });
        httpRequests.set(rid, { promise, cancel: () => { } });
        return rid;
    });
    electron_1.ipcMain.handle("http:fetchSend", async (_, rid) => {
        const entry = httpRequests.get(rid);
        if (!entry)
            throw new Error(`Invalid request id: ${rid}`);
        httpRequests.delete(rid);
        const result = await entry.promise;
        httpResponses.set(rid, result.body);
        return { status: result.status, statusText: result.statusText, headers: result.headers, url: result.url };
    });
    electron_1.ipcMain.handle("http:fetchReadBody", async (_, rid) => {
        const body = httpResponses.get(rid);
        if (!body)
            throw new Error(`Invalid request id: ${rid}`);
        httpResponses.delete(rid);
        return [...body];
    });
    electron_1.ipcMain.handle("http:fetchCancel", async (_, rid) => {
        httpRequests.delete(rid);
    });
}
// ── IKEA TRADFRI Gateway ────────────────────────────────────────────────────────
function registerIkeaHandlers() {
    electron_1.ipcMain.handle("ikea:connect", async (_, { host, securityCode }) => {
        console.log(`[IKEA] Connecting to ${host}...`);
        try {
            const result = await (0, ikea_coap_1.ikeaConnect)(host, securityCode);
            console.log(`[IKEA] Connected to ${host}, fetching devices...`);
            const devices = await (0, ikea_coap_1.ikeaListDevices)(host);
            console.log(`[IKEA] Found ${devices.length} devices`);
            sendToRenderer("ikea:connectionStatus", [host, { status: "connected" }]);
            return { identity: result.identity, psk: result.psk, devices };
        }
        catch (err) {
            const msg = err.message ?? String(err);
            console.error(`[IKEA] Connection failed:`, msg);
            sendToRenderer("ikea:error", [host, msg]);
            throw err;
        }
    });
    electron_1.ipcMain.handle("ikea:disconnect", async (_, host) => {
        await (0, ikea_coap_1.ikeaDisconnect)(host);
        sendToRenderer("ikea:connectionStatus", [host, { status: "disconnected" }]);
    });
    electron_1.ipcMain.handle("ikea:listDevices", async (_, host) => {
        return await (0, ikea_coap_1.ikeaListDevices)(host);
    });
    electron_1.ipcMain.handle("ikea:getDevice", async (_, { host, deviceId }) => {
        return await (0, ikea_coap_1.ikeaGetDevice)(host, deviceId);
    });
    electron_1.ipcMain.handle("ikea:controlLight", async (_, args) => {
        await (0, ikea_coap_1.ikeaControlLight)(args.host, args.deviceId, args.command);
    });
    electron_1.ipcMain.handle("ikea:startObserving", async (_, { host, deviceId }) => {
        await (0, ikea_coap_1.ikeaStartObserving)(host, deviceId, (device) => {
            console.log(`[IKEA] forwarding deviceUpdate to renderer: ${device.name} on=${device.lightState?.on} brightness=${device.lightState?.brightness}`);
            sendToRenderer("ikea:deviceUpdate", [host, device]);
        });
    });
    electron_1.ipcMain.handle("ikea:stopObserving", async (_, { host, deviceId }) => {
        await (0, ikea_coap_1.ikeaStopObserving)(host, deviceId);
    });
}
const tikTokConnections = new Map();
const tikTokConnectionStates = new Map();
function setTikTokState(username, partial) {
    const current = tikTokConnectionStates.get(username) ?? {
        username,
        status: "disconnected",
        connectionMethod: null,
        roomId: null,
        error: null,
    };
    const next = { ...current, ...partial };
    tikTokConnectionStates.set(username, next);
    sendToRenderer("tiktok:event", [username, next]);
    console.log(`[TikTok] ${username}: ${next.status}${next.error ? ` — ${next.error}` : ""}`);
}
function registerTikTokHandlers() {
    electron_1.ipcMain.handle("tiktok:connect", async (_, { username, signApiKey }) => {
        const existing = tikTokConnections.get(username);
        if (existing) {
            existing.disconnect();
            tikTokConnections.delete(username);
        }
        const conn = new tiktok_live_connector_1.WebcastPushConnection(username, {
            enableExtendedGiftInfo: true,
            ...(signApiKey ? { signProviderOptions: { params: { apiKey: signApiKey } } } : {}),
        });
        tikTokConnections.set(username, conn);
        setTikTokState(username, { status: "connecting", connectionMethod: null, roomId: null, error: null });
        let connected = false;
        conn.on("connected", (state) => {
            connected = true;
            setTikTokState(username, {
                status: "connected",
                connectionMethod: state.upgradedToWebsocket ? "websocket" : "polling",
                roomId: state.roomId ?? null,
                error: null,
            });
        });
        conn.on("disconnected", () => {
            setTikTokState(username, { status: "disconnected", error: null });
        });
        conn.on("streamEnd", () => {
            setTikTokState(username, { status: "disconnected", error: null });
        });
        conn.on("error", (err) => {
            if (!connected)
                return;
            const msg = err?.exception?.message ?? err?.message ?? String(err ?? "Unknown error");
            console.error(`[TikTok] ${username} error:`, msg);
            setTikTokState(username, { status: "error", error: msg });
        });
        const forward = (eventName, data) => {
            sendToRenderer("tiktok:data", [username, eventName, data]);
        };
        conn.on("chat", (data) => forward("chat", data));
        conn.on("gift", (data) => forward("gift", data));
        conn.on("member", (data) => forward("member", data));
        conn.on("follow", (data) => forward("follow", data));
        conn.on("share", (data) => forward("share", data));
        conn.on("like", (data) => forward("like", data));
        try {
            await conn.connect();
        }
        catch (err) {
            const msg = err?.message ?? String(err ?? "Unknown error");
            console.error(`[TikTok] ${username} connection failed:`, msg);
            setTikTokState(username, { status: "error", error: msg });
        }
    });
    electron_1.ipcMain.handle("tiktok:disconnect", async (_, username) => {
        const conn = tikTokConnections.get(username);
        if (conn) {
            conn.disconnect();
            tikTokConnections.delete(username);
        }
        tikTokConnectionStates.delete(username);
        sendToRenderer("tiktok:event", [username, { username, status: "disconnected", connectionMethod: null, roomId: null, error: null }]);
    });
    electron_1.ipcMain.handle("tiktok:getState", (_, username) => {
        return tikTokConnectionStates.get(username) ?? { username, status: "disconnected", connectionMethod: null, roomId: null, error: null };
    });
    electron_1.ipcMain.handle("tiktok:disconnectAll", async () => {
        for (const [username, conn] of tikTokConnections) {
            conn.disconnect();
        }
        tikTokConnections.clear();
        tikTokConnectionStates.clear();
    });
}
//# sourceMappingURL=main.js.map