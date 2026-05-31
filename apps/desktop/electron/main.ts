import { app, BrowserWindow, ipcMain, dialog, clipboard, shell, crashReporter } from "electron";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, createReadStream, unlinkSync } from "fs";
import { PassThrough } from "stream";
import { join, dirname, extname } from "path";
import { createServer as createHttpServer, request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { randomUUID } from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import OBSWebSocket from "obs-websocket-js";
import { exec, spawn } from "child_process";
import FormData from "form-data";
import { WebcastPushConnection } from "tiktok-live-connector";
import {
	ikeaConnect,
	ikeaDisconnect,
	ikeaGetDevice,
	ikeaListDevices,
	ikeaControlLight,
	ikeaStartObserving,
	ikeaStopObserving,
} from "./ikea-coap";

const DEV = process.env.NODE_ENV === "development" || process.argv.includes("--dev");
const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";

const APP_VERSION = app.getVersion() || "1.0.0";

let mainWindow: BrowserWindow | null = null;
const WINDOW_STATE_FILE = app.isPackaged
	? join(app.getPath("userData"), "window-state.json")
	: join(__dirname, "..", "window-state.json");

function saveWindowState() {
	if (!mainWindow) return;
	try {
		const bounds = mainWindow.getBounds();
		const maximized = mainWindow.isMaximized();
		writeFileSync(WINDOW_STATE_FILE, JSON.stringify({ ...bounds, maximized }));
	} catch {}
}

function loadWindowState(): Electron.Rectangle & { maximized?: boolean } {
	try {
		return JSON.parse(readFileSync(WINDOW_STATE_FILE, "utf-8"));
	} catch {
		return { x: undefined as any, y: undefined as any, width: 1280, height: 800, maximized: false };
	}
}

function createWindow() {
	const saved = loadWindowState();
	const iconPath = join(__dirname, "..", "resources", process.platform === "win32" ? "icon.ico" : "icon.png");

	mainWindow = new BrowserWindow({
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
			preload: join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			webSecurity: !DEV,
		},
	});

	if (saved.maximized) mainWindow.maximize();

	if (DEV) {
		mainWindow.loadURL(DEV_URL);
	} else {
		mainWindow.loadFile(join(__dirname, "..", ".output", "public", "index.html"));
	}

	mainWindow.on("resize", saveWindowState);
	mainWindow.on("move", saveWindowState);
	mainWindow.on("maximize", saveWindowState);
	mainWindow.on("unmaximize", saveWindowState);
	mainWindow.on("closed", () => { mainWindow = null; });
}

// ── Session tracking ──────────────────────────────────────────────────────────

const SESSION_FILE = app.isPackaged
	? join(app.getPath("userData"), "logs", "session.json")
	: join(__dirname, "..", "logs", "session.json");
const LOG_DIR = dirname(SESSION_FILE);
const CRASH_LOG = join(LOG_DIR, "crash.log");

function initSessionTracking() {
	if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

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

function readSessionFile(): { cleanExit: boolean; startedAt: number; version: string } | null {
	try {
		return JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
	} catch { return null; }
}

function writeSessionFile(state: { cleanExit: boolean; startedAt: number; version: string }) {
	try { writeFileSync(SESSION_FILE, JSON.stringify(state)); } catch {}
}

function appendCrashLog(kind: string, message: string) {
	try {
		const line = `[${Math.floor(Date.now() / 1000)}] [${kind}] ${message}\n`;
		writeFileSync(CRASH_LOG, line, { encoding: "utf-8", flag: "a" });
	} catch {}
}

// ── App lifecycle ──────────────────────────────────────────────────────────────

app.whenReady().then(() => {
	initSessionTracking();
	createWindow();
	registerIpcHandlers();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("will-quit", () => {
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

app.on("window-all-closed", () => {
	appendCrashLog("exit", "window-all-closed");
	if (process.platform !== "darwin") app.quit();
});

function getWindow(): BrowserWindow {
	if (!mainWindow) throw new Error("No main window");
	return mainWindow;
}

function sendToRenderer(channel: string, ...args: unknown[]) {
	const win = getWindow();
	if (win.webContents) win.webContents.send(channel, ...args);
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
	ipcMain.handle("dialog:open", async (_, options: any) => {
		const result = await dialog.showOpenDialog(getWindow(), options);
		return result.canceled ? null : result.filePaths[0] ?? null;
	});

	ipcMain.handle("dialog:save", async (_, options: any) => {
		const result = await dialog.showSaveDialog(getWindow(), options);
		return result.canceled ? null : result.filePath ?? null;
	});

	ipcMain.handle("dialog:confirm", async (_, options: { message: string; title?: string }) => {
		const result = await dialog.showMessageBox(getWindow(), {
			type: "question",
			buttons: ["Yes", "No"],
			defaultId: 0,
			cancelId: 1,
			message: options.message,
			title: options.title ?? "Confirm",
		});
		return result.response === 0;
	});

	ipcMain.handle("clipboard:readText", () => clipboard.readText());
	ipcMain.handle("clipboard:writeText", (_, text: string) => { clipboard.writeText(text); });
	ipcMain.handle("shell:openExternal", (_, url: string) => shell.openExternal(url));
}

// ── File system ────────────────────────────────────────────────────────────────

function registerFsHandlers() {
	ipcMain.handle("fs:list", (_, path: string) => {
		const entries = readdirSync(path, { withFileTypes: true });
		return entries.map((e) => (e.isDirectory() ? { Dir: e.name } : { File: e.name }));
	});

	ipcMain.handle("fs:readTextFile", (_, path: string) => readFileSync(path, "utf-8"));

	ipcMain.handle("fs:writeTextFile", (_, path: string, content: string) => {
		const dir = dirname(path);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		writeFileSync(path, content, "utf-8");
	});

	ipcMain.handle("fs:readBinaryFile", (_, path: string) => readFileSync(path));

	ipcMain.handle("fs:writeBinaryFile", (_, path: string, data: number[]) => {
		const dir = dirname(path);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		writeFileSync(path, Buffer.from(data));
	});

	ipcMain.handle("fs:fileSize", (_, path: string) => {
		try { return statSync(path).size; } catch { return null; }
	});
}

// ── Shell ──────────────────────────────────────────────────────────────────────

function registerShellHandlers() {
	ipcMain.handle("shell:execute", (_, command: string) => {
		return new Promise<void>((resolve, reject) => {
			exec(command, (error) => {
				if (error) reject(error);
				else resolve();
			});
		});
	});
}

// ── File path ──────────────────────────────────────────────────────────────────

function registerFilePathHandlers() {
	ipcMain.handle("path:convertFileSrc", (_, path: string) => path);
}

// ── WebSocket server ───────────────────────────────────────────────────────────

const wsServers = new Map<number, { wss: WebSocketServer; clients: Set<WebSocket> }>();

function registerWsHandlers() {
	ipcMain.handle("ws:server:start", (_, port: number) => {
		if (wsServers.has(port)) return;

		const wss = new WebSocketServer({ port });
		const clients = new Set<WebSocket>();

		wss.on("connection", (ws: WebSocket) => {
			clients.add(ws);
			sendToRenderer("ws:server:message", [port, -1, "Connected"]);

			ws.on("message", (data: Buffer) => {
				const text = data.toString();
				let clientId = -1, i = 0;
				for (const client of clients) {
					if (client === ws) { clientId = i; break; }
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

	ipcMain.handle("ws:server:send", (_, args: { port: number; client: number | null; data: string }) => {
		const server = wsServers.get(args.port);
		if (!server) return;
		if (args.client !== null) {
			let i = 0;
			for (const ws of server.clients) {
				if (i === args.client) { ws.send(args.data); break; }
				i++;
			}
		} else {
			for (const ws of server.clients) ws.send(args.data);
		}
	});

	ipcMain.handle("ws:server:disconnectAll", () => {
		for (const [, server] of wsServers) {
			for (const ws of server.clients) ws.close();
			server.clients.clear();
		}
	});

	ipcMain.handle("ws:server:stop", (_, port: number) => {
		const server = wsServers.get(port);
		if (server) {
			server.wss.close();
			wsServers.delete(port);
		}
	});
}

// ── Outbound WebSocket client with auto-reconnect ─────────────────────────────

interface OutboundWsConnection {
	ws: WebSocket;
	url: string;
	reconnectTimer?: NodeJS.Timeout;
	reconnectAttempt: number;
	shouldReconnect: boolean;
}

const outboundWsConnections = new Map<string, OutboundWsConnection>();

const OUTBOUND_WS_CONNECT_TIMEOUT = 15000;

function registerOutboundWsHandlers() {
	function tryConnect(conn: OutboundWsConnection) {
		if (conn.ws.readyState === WebSocket.OPEN || conn.ws.readyState === WebSocket.CONNECTING) return;

		conn.ws = new WebSocket(conn.url);
		const timeout = setTimeout(() => {
			if (conn.ws.readyState === WebSocket.CONNECTING) {
				conn.ws.close();
				sendToRenderer("outboundWs:message", [conn.url, { Error: "connect timeout" }]);
			}
		}, OUTBOUND_WS_CONNECT_TIMEOUT);
		conn.ws.on("open", () => { clearTimeout(timeout); });

		conn.ws.on("open", () => {
			conn.reconnectAttempt = 0;
			sendToRenderer("outboundWs:message", [conn.url, "Open"]);
		});

		conn.ws.on("message", (data: Buffer) => {
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

		conn.ws.on("error", (err: Error) => {
			sendToRenderer("outboundWs:message", [conn.url, { Error: err.message }]);
		});
	}

	function addTimeout(ws: WebSocket, url: string) {
		const timeout = setTimeout(() => {
			if (ws.readyState === WebSocket.CONNECTING) {
				ws.close();
				sendToRenderer("outboundWs:message", [url, { Error: "connect timeout" }]);
			}
		}, OUTBOUND_WS_CONNECT_TIMEOUT);
		ws.on("open", () => { clearTimeout(timeout); });
	}

	ipcMain.handle("outboundWs:open", (_, url: string) => {
		let conn = outboundWsConnections.get(url);
		if (conn) {
			conn.shouldReconnect = true;
			if (conn.ws.readyState !== WebSocket.OPEN) tryConnect(conn);
			return;
		}
		conn = { ws: new WebSocket(url), url, reconnectAttempt: 0, shouldReconnect: true };
		addTimeout(conn.ws, url);
		conn.ws.on("open", () => {
			conn!.reconnectAttempt = 0;
			sendToRenderer("outboundWs:message", [url, "Open"]);
		});
		conn.ws.on("message", (data: Buffer) => {
			sendToRenderer("outboundWs:message", [url, { Text: data.toString() }]);
		});
		conn.ws.on("close", () => {
			sendToRenderer("outboundWs:message", [url, "Closed"]);
			if (conn!.shouldReconnect) {
				const delay = Math.min(1000 * Math.pow(2, conn!.reconnectAttempt), 30000);
				conn!.reconnectAttempt++;
				conn!.reconnectTimer = setTimeout(() => tryConnect(conn!), delay);
			}
		});
		conn.ws.on("error", (err: Error) => {
			sendToRenderer("outboundWs:message", [url, { Error: err.message }]);
		});
		outboundWsConnections.set(url, conn);
	});

	ipcMain.handle("outboundWs:close", (_, url: string) => {
		const conn = outboundWsConnections.get(url);
		if (conn) {
			conn.shouldReconnect = false;
			if (conn.reconnectTimer) clearTimeout(conn.reconnectTimer);
			conn.ws.close();
			outboundWsConnections.delete(url);
		}
	});

	ipcMain.handle("outboundWs:closeAll", () => {
		for (const [, conn] of outboundWsConnections) {
			conn.shouldReconnect = false;
			if (conn.reconnectTimer) clearTimeout(conn.reconnectTimer);
			conn.ws.close();
		}
		outboundWsConnections.clear();
	});

	ipcMain.handle("outboundWs:send", (_, args: { url: string; data: string }) => {
		const conn = outboundWsConnections.get(args.url);
		if (conn && conn.ws.readyState === WebSocket.OPEN) conn.ws.send(args.data);
	});

	ipcMain.handle("outboundWs:list", () => [...outboundWsConnections.keys()]);

	ipcMain.handle("outboundWs:isConnected", (_, url: string) => {
		const conn = outboundWsConnections.get(url);
		return conn !== undefined && conn.ws.readyState === WebSocket.OPEN;
	});

	ipcMain.handle("outboundWs:pruneExcept", (_, keep: string[]) => {
		const toDelete = [...outboundWsConnections.keys()].filter((k) => !keep.includes(k));
		for (const url of toDelete) {
			const conn = outboundWsConnections.get(url);
			if (conn) {
				conn.shouldReconnect = false;
				if (conn.reconnectTimer) clearTimeout(conn.reconnectTimer);
				conn.ws.close();
				outboundWsConnections.delete(url);
			}
		}
	});
}

// ── Remote host with password auth ─────────────────────────────────────────────

interface RemoteHostClient {
	id: number;
	username?: string;
	authenticated: boolean;
}

interface RemoteHostState {
	httpServer: ReturnType<typeof createHttpServer>;
	wss: WebSocketServer;
	clients: Map<WebSocket, RemoteHostClient>;
	password: string | null;
	nextClientId: number;
}

let remoteHost: RemoteHostState | null = null;

function registerRemoteHostHandlers() {
	ipcMain.handle("remoteHost:start", async (_, args: { port: number; password?: string | null }) => {
		if (remoteHost) await stopRemoteHost();

		const password = args.password ?? null;

		remoteHost = {
			httpServer: null!, wss: null!, clients: new Map(),
			password, nextClientId: 1,
		};

		const wss = new WebSocketServer({ noServer: true });
		remoteHost.wss = wss;
		const remotePublicDir = join(__dirname, "..", "remote-public");

		const httpServer = createHttpServer((req, res) => {
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			res.setHeader("Access-Control-Allow-Headers", "*");
			if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

			const serveFile = (path: string) => {
				const fullPath = join(remotePublicDir, path);
				if (existsSync(fullPath) && statSync(fullPath).isFile()) {
					const extMap: Record<string, string> = {
						".html": "text/html", ".js": "application/javascript",
						".css": "text/css", ".json": "application/json",
						".png": "image/png", ".svg": "image/svg+xml",
						".ico": "image/x-icon",
					};
					res.writeHead(200, { "Content-Type": extMap[extname(fullPath)] || "application/octet-stream" });
					res.end(readFileSync(fullPath));
				} else {
					res.writeHead(404);
					res.end("Not found");
				}
			};

			if (req.url === "/" || !req.url) {
				const indexPath = join(remotePublicDir, "index.html");
				if (existsSync(indexPath)) {
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end(readFileSync(indexPath, "utf-8"));
				} else {
					serveFile("index.html");
				}
			} else {
				serveFile(req.url);
			}
		});

		httpServer.on("upgrade", (request, socket, head) => {
			wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
				const clientId = remoteHost!.nextClientId++;
				const entry: RemoteHostClient = { id: clientId, authenticated: remoteHost!.password === null };

				remoteHost!.clients.set(ws, entry);

	if (!entry.authenticated) {
				ws.send(JSON.stringify({ type: "authRequired" }));
				} else {
					sendToRenderer("remote-host://message", [clientId, "Connected"]);
				}

				ws.on("message", (data: Buffer) => {
					const text = data.toString();
					let parsed: any;
					try { parsed = JSON.parse(text); } catch { parsed = null; }

					if (!entry.authenticated && parsed?.type === "auth" && remoteHost!.password !== null) {
						if (parsed.password === remoteHost!.password) {
							entry.authenticated = true;
							entry.username = parsed.username;
							sendToRenderer("remote-host://message", [clientId, { ConnectedWithUser: { username: parsed.username ?? "User" } }]);
							ws.send(JSON.stringify({ type: "authSuccess" }));
						} else {
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
					remoteHost!.clients.delete(ws);
					sendToRenderer("remote-host://message", [clientId, "Disconnected"]);
				});
				ws.on("error", () => { remoteHost!.clients.delete(ws); });
			});
		});

		remoteHost.httpServer = httpServer;

		return new Promise<void>((resolve) => {
			httpServer.listen(args.port, "0.0.0.0", () => resolve());
		});
	});

	async function stopRemoteHost() {
		if (!remoteHost) return;
		for (const ws of remoteHost.clients.keys()) ws.close();
		remoteHost.wss.close();
		remoteHost.httpServer.close();
		remoteHost = null;
	}

	ipcMain.handle("remoteHost:stop", async () => { await stopRemoteHost(); });

	ipcMain.handle("remoteHost:send", (_, args: { port: number; client: number | null; except_client?: number | null; data: string }) => {
		if (!remoteHost) return;
		for (const [ws, entry] of remoteHost.clients) {
			if (!entry.authenticated) continue;
			if (args.client !== null && entry.id !== args.client) continue;
			if (args.except_client !== undefined && args.except_client !== null && entry.id === args.except_client) continue;
			ws.send(args.data);
		}
	});

	ipcMain.handle("remoteHost:setPassword", (_, password: string | null) => {
		if (remoteHost) remoteHost.password = password;
	});
}

// ── OBS WebSocket ──────────────────────────────────────────────────────────────

const obsInstances = new Map<string, OBSWebSocket>();

function registerObsHandlers() {
	ipcMain.handle("obs:connect", async (_, args: { url: string; password?: string | null }) => {
		const obs = new OBSWebSocket();
		await obs.connect(args.url, args.password ?? undefined);

		obs.on("ConnectionClosed", () => {
			sendToRenderer("obs:event", [args.url, { lifecycle: "Disconnected" }]);
		});
		obs.on("Identified", () => {
			sendToRenderer("obs:event", [args.url, { lifecycle: "Connected" }]);
		});
		(obs as any).on("*", (eventType: string, eventData: unknown) => {
			sendToRenderer("obs:event", [args.url, { eventType, eventData }]);
		});

		obsInstances.set(args.url, obs);
	});

	ipcMain.handle("obs:disconnect", async (_, url: string) => {
		const obs = obsInstances.get(url);
		if (obs) { await obs.disconnect(); obsInstances.delete(url); }
	});

	ipcMain.handle("obs:disconnectAll", async () => {
		for (const [url, obs] of obsInstances) { await obs.disconnect(); obsInstances.delete(url); }
	});

	ipcMain.handle("obs:call", async (_, args: { url: string; requestType: string; requestData?: unknown }) => {
		const obs = obsInstances.get(args.url);
		if (!obs) throw new Error(`OBS not connected to ${args.url}`);
		return obs.call(args.requestType as any, args.requestData as any);
	});

	ipcMain.handle("obs:callBatch", async (_, args: { url: string; requests: { requestType: string; requestData?: unknown }[] }) => {
		const obs = obsInstances.get(args.url);
		if (!obs) throw new Error(`OBS not connected to ${args.url}`);
		const results = [];
		for (const req of args.requests) {
			results.push(await obs.call(req.requestType as any, req.requestData as any));
		}
		return results;
	});
}

// ── OAuth ──────────────────────────────────────────────────────────────────────

function registerOAuthHandlers() {
	ipcMain.handle("oauth:authorize", async (_, url: string) => {
		return new Promise<any>((resolve, reject) => {
			const server = createHttpServer(async (req, res) => {
				const urlObj = new URL(req.url!, `http://${req.headers.host}`);
				const token = urlObj.searchParams.get("token");

				if (token) {
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end("<html><body><h1>Authorization successful! You can close this tab.</h1></body></html>");

					try {
						const tokenData = JSON.parse(Buffer.from(token, "base64").toString());
						server.close();
						resolve(tokenData);
					} catch {
						server.close();
						reject(new Error("Failed to decode token"));
					}
				} else {
					res.writeHead(400);
					res.end("No authorization token");
					server.close();
					reject(new Error("No authorization token"));
				}
			});

			server.listen(0, "127.0.0.1", () => {
				const port = (server.address() as any).port;
				const state = Buffer.from(JSON.stringify({ env: "desktop", port })).toString("base64");
				shell.openExternal(`${url}?state=${encodeURIComponent(state)}`);
			});
		});
	});
}

// ── Login listener ─────────────────────────────────────────────────────────────

let loginServer: ReturnType<typeof createHttpServer> | null = null;

function registerLoginHandlers() {
	ipcMain.handle("loginListen", async () => {
		return new Promise<string>((resolve, reject) => {
			if (loginServer) loginServer.close();

			const id = String(Math.floor(Date.now() / 1000));

			function corsHeaders() {
			return {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			};
		}

		loginServer = createHttpServer((req, res) => {
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
				req.on("data", (chunk: string) => { body += chunk; });
				req.on("end", () => {
					try {
						const session = JSON.parse(body);
						if (typeof session === "string") {
							res.writeHead(200, corsHeaders());
							res.end("ok");
							if (loginServer) loginServer.close();
							loginServer = null;
							resolve(session);
						} else {
							res.writeHead(400, corsHeaders());
							res.end("invalid session");
						}
					} catch {
						res.writeHead(400, corsHeaders());
						res.end("invalid json");
					}
				});
				return;
			}

			res.writeHead(404, corsHeaders());
			res.end("not found");
		});

			loginServer.listen(25000, "127.0.0.1", () => {});
		});
	});
}

// ── Audio playback (rodio-like via PowerShell + ffmpeg) ────────────────────────

interface AudioPlayerState {
	process: any;
	id: string;
	volume: number;
}

const audioPlayers = new Map<string, AudioPlayerState>();

function registerAudioHandlers() {
	ipcMain.handle("audio:enumerate", async () => {
		const devices: { device_id: string; label: string }[] = [];
		try {
			const result = await new Promise<string>((resolve) => {
				exec('powershell -Command "Get-AudioDevice -List | Select-Object ID, Name | ConvertTo-Json"', (err, stdout) => {
					resolve(err ? "[]" : stdout);
				});
			});
			const parsed = JSON.parse(result);
			if (Array.isArray(parsed)) {
				return parsed.map((d: any) => ({ device_id: d.ID ?? "default", label: d.Name ?? "Unknown" }));
			}
		} catch {}
		return [{ device_id: "default", label: "Default Output" }];
	});

	ipcMain.handle("audio:play", async (_, args: { path: string; deviceName?: string }) => {
		const id = randomUUID();
		try {
			const ext = extname(args.path).toLowerCase();
			let proc;

			if (ext === ".wav") {
				proc = spawn("powershell", ["-c", `(New-Object Media.SoundPlayer '${args.path.replace(/'/g, "''")}').PlaySync()`]);
			} else if (["mp3", "ogg", "flac", "aac", "m4a", "wma", "opus", "webm"].includes(ext)) {
				const tempWav = join(app.getPath("temp"), `mg-audio-${id}.wav`);
				try {
					await new Promise<void>((resolve, reject) => {
						exec(`ffmpeg -y -i "${args.path}" -f wav "${tempWav}"`, (err) => {
							if (err) reject(err);
							else resolve();
						});
					});
					proc = spawn("powershell", ["-c", `(New-Object Media.SoundPlayer '${tempWav.replace(/'/g, "''")}').PlaySync()`]);
					proc.on("exit", () => {
						try { unlinkSync(tempWav); } catch {}
					});
				} catch {
					// ffmpeg not available, fall back to shell open
					proc = spawn("powershell", ["-c", `Start-Process -FilePath '${args.path}' -WindowStyle Hidden`]);
				}
			} else {
				proc = spawn("powershell", ["-c", `Start-Process -FilePath '${args.path}' -WindowStyle Hidden`]);
			}

			const state: AudioPlayerState = { process: proc, id, volume: 1.0 };
			proc.on("exit", () => {
				audioPlayers.delete(id);
			});
			audioPlayers.set(id, state);

			return { id };
		} catch {
			return { id };
		}
	});

	ipcMain.handle("audio:stop", (_, id: string) => {
		const player = audioPlayers.get(id);
		if (player) {
			try { player.process.kill(); } catch {}
			audioPlayers.delete(id);
		}
	});

	ipcMain.handle("audio:setVolume", (_, args: { id: string; volume: number }) => {
		const player = audioPlayers.get(args.id);
		if (player) {
			player.volume = Math.max(0, Math.min(1, args.volume));
		}
	});

	ipcMain.handle("audio:stopAll", () => {
		for (const [id, player] of audioPlayers) {
			try { player.process.kill(); } catch {}
			audioPlayers.delete(id);
		}
	});
}

// ── KB/Mouse simulation ────────────────────────────────────────────────────────

let kbHooks: { stop: () => void } | null = null;

function registerKbMouseHandlers() {
	ipcMain.handle("kbMouse:simulateKeys", async (_, args: { keys: string[]; delay: number }) => {
		try {
			const keysStr = args.keys.join(",");
			await new Promise<void>((resolve, reject) => {
				exec(`powershell -Command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${keysStr.replace(/'/g, "''")}')"`, (err) => {
					if (err) reject(err);
					else resolve();
				});
			});
		} catch {}
	});

	ipcMain.handle("kbMouse:simulateMouse", async (_, args: { button: string; delay: number }) => {
		try {
			await new Promise<void>((resolve, reject) => {
				exec(`powershell -Command "[System.Windows.Forms.Cursor]::Position = [System.Windows.Forms.Cursor]::Position; Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MouseButtons]::${args.button} = [System.Windows.Forms.MouseButtons]::${args.button} -bxor [System.Windows.Forms.MouseButtons]::${args.button}"`, (err) => {
					if (err) reject(err);
					else resolve();
				});
			});
		} catch {}
	});

	ipcMain.handle("kbMouse:setMousePosition", async (_, args: { x: number; y: number; absolute: boolean }) => {
		try {
			if (args.absolute) {
				await exec(`powershell -Command "[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(args.x)}, ${Math.round(args.y)})"`);
			} else {
				await exec(`powershell -Command "$p = [System.Windows.Forms.Cursor]::Position; $p.X += ${Math.round(args.x)}; $p.Y += ${Math.round(args.y)}; [System.Windows.Forms.Cursor]::Position = $p"`);
			}
		} catch {}
	});

	ipcMain.handle("kbMouse:startHooks", async () => {
		try {
			const uiohook = await import("uiohook-napi");
			if (kbHooks) kbHooks.stop();
			uiohook.uIOhook.on("keydown", (e: any) => {
				const key = `Key${String.fromCharCode(e.keycode).toUpperCase()}`;
				sendToRenderer("kb:keyDown", { key, appFocused: false });
			});
			uiohook.uIOhook.on("keyup", (e: any) => {
				const key = `Key${String.fromCharCode(e.keycode).toUpperCase()}`;
				sendToRenderer("kb:keyUp", { key, appFocused: false });
			});
			uiohook.uIOhook.start();
			kbHooks = { stop: () => { uiohook.uIOhook.stop(); } };
		} catch (e) {
			console.warn("uiohook-napi not available, global keyboard hooks disabled", e);
		}
	});

	ipcMain.handle("kbMouse:stopHooks", async () => {
		if (kbHooks) { kbHooks.stop(); kbHooks = null; }
	});
}

// ── Crash log ──────────────────────────────────────────────────────────────────

function registerCrashLogHandlers() {
	crashReporter.start({ submitURL: "", uploadToServer: false });

	ipcMain.handle("crashLog:append", (_, kind: string, message: string) => {
		appendCrashLog(kind, message);
	});

	ipcMain.handle("crashLog:path", () => CRASH_LOG);
}

// ── HTTP client (reqwest-equivalent in Node.js) ────────────────────────────────

let httpRequestIdCounter = 0;
const httpRequests = new Map<number, { promise: Promise<{ status: number; statusText: string; headers: [string, string][]; url: string; body: Buffer }>; cancel: () => void }>();
const httpResponses = new Map<number, Buffer>();

function sanitizeFilePath(path: string): string {
	let s = path.replace(/[\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "").replace(/\s+/g, "");
	while (s.startsWith('"') || s.startsWith("'")) s = s.slice(1);
	while (s.endsWith('"') || s.endsWith("'")) s = s.slice(0, -1);
	if (/^[a-zA-Z]:/.test(s)) s = s.replace(/\//g, "\\");
	return s;
}

function doHttpRequest(url: string, method: string, headers: [string, string][], body: Buffer | null, connectTimeout: number | null, maxRedirections: number | null): Promise<{ status: number; statusText: string; headers: [string, string][]; url: string; body: Buffer }> {
	// Handle data: URLs
	if (url.startsWith("data:")) {
		const commaIdx = url.indexOf(",");
		if (commaIdx === -1) return Promise.reject(new Error("invalid data URL"));
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
		const httpMod = isHttps ? httpsRequest : httpRequest;

		const headersObj: Record<string, string> = {};
		for (const [k, v] of headers) headersObj[k.toLowerCase()] = v;

		if (body === null && (method === "POST" || method === "PUT")) {
			headersObj["content-length"] = "0";
		}
		if (!headersObj["user-agent"]) headersObj["user-agent"] = "MacroGraph";
		if (headersObj["range"] && !headersObj["accept-encoding"]) {
			headersObj["accept-encoding"] = "identity";
		}

		const options: any = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port || (isHttps ? 443 : 80),
			path: parsedUrl.pathname + parsedUrl.search,
			method,
			headers: headersObj,
			timeout: connectTimeout !== null ? connectTimeout : 0,
			rejectUnauthorized: true,
		};

		let redirectsLeft = maxRedirections ?? 20;

		function doRequest(currentUrl: string) {
			const currentParsed = new URL(currentUrl);
			const currentMod = currentParsed.protocol === "https:" ? httpsRequest : httpRequest;
			const isCurrentHttps = currentParsed.protocol === "https:";
			const opts = { ...options, hostname: currentParsed.hostname, port: currentParsed.port || (isCurrentHttps ? 443 : 80), path: currentParsed.pathname + currentParsed.search };

			const req = currentMod(opts, (res) => {
				const status = res.statusCode || 0;
				const isRedirect = status >= 300 && status < 400 && res.headers.location;

				if (isRedirect && redirectsLeft > 0) {
					redirectsLeft--;
					const redirectUrl = new URL(res.headers.location as string, currentUrl).toString();
					doRequest(redirectUrl);
					return;
				}

				const responseHeaders: [string, string][] = [];
				for (let i = 0; i < (res.rawHeaders?.length || 0); i += 2) {
					responseHeaders.push([res.rawHeaders[i], res.rawHeaders[i + 1]]);
				}

				const chunks: Buffer[] = [];
				res.on("data", (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
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
			if (body) req.write(body);
			req.end();
		}

		doRequest(url);
	});
}

function registerHttpHandlers() {
	ipcMain.handle("http:fetch", async (_, args: { method: string; url: string; headers: [string, string][]; data: number[] | null; connectTimeout: number | null; maxRedirections: number | null }) => {
		const rid = ++httpRequestIdCounter;
		const body = args.data ? Buffer.from(args.data) : null;

		const promise = doHttpRequest(args.url, args.method, args.headers, body, args.connectTimeout, args.maxRedirections);

		httpRequests.set(rid, {
			promise,
			cancel: () => { /* cancellation handled by timeout */ },
		});

		return rid;
	});

	ipcMain.handle("http:fetchMultipart", async (_, args: { url: string; headers: [string, string][]; fields: [string, string][]; filePath: string | null; fileFieldName: string | null; connectTimeout: number | null }) => {
		const rid = ++httpRequestIdCounter;

		const promise = new Promise<{ status: number; statusText: string; headers: [string, string][]; url: string; body: Buffer }>(async (resolve, reject) => {
			try {
				const form = new FormData();
				for (const [key, value] of args.fields) form.append(key, value);

				let uploadTotal = 0;

				if (args.filePath && args.fileFieldName) {
					const sanitized = sanitizeFilePath(args.filePath);
					const fileName = sanitized.split(/[\/\\]/).at(-1) ?? "file";
					uploadTotal = statSync(sanitized).size;

					const readStream = createReadStream(sanitized);
					let bytesSent = 0;
					let lastPercent = 0;

					const progressStream = new PassThrough();
					readStream.on("data", (chunk: any) => {
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
				const httpMod = isHttps ? httpsRequest : httpRequest;

				const headersObj: Record<string, string> = {};
				for (const [k, v] of args.headers) {
					const lk = k.toLowerCase();
					if (lk !== "host" && lk !== "content-length" && lk !== "content-type") {
						headersObj[k] = v;
					}
				}
				headersObj["user-agent"] = "MacroGraph";

				form.submit(
					{ hostname: parsedUrl.hostname, port: parsedUrl.port || (isHttps ? 443 : 80), path: parsedUrl.pathname + parsedUrl.search, protocol: (isHttps ? "https:" : "http:") as any, headers: headersObj },
					(err: Error | null, res: any) => {
						if (err) { reject(err); return; }
						if (uploadTotal > 0) {
							sendToRenderer("http-upload-progress", { rid, percent: 100, sent: uploadTotal, total: uploadTotal });
						}
						const status = res.statusCode || 0;
						const responseHeaders: [string, string][] = [];
						for (let i = 0; i < (res.rawHeaders?.length || 0); i += 2) {
							responseHeaders.push([res.rawHeaders[i], res.rawHeaders[i + 1]]);
						}
						const chunks: Buffer[] = [];
						res.on("data", (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
						res.on("end", () => {
							resolve({
								status,
								statusText: res.statusMessage || "",
								headers: responseHeaders,
								url: args.url,
								body: Buffer.concat(chunks),
							});
						});
					},
				);
			} catch (e: any) {
				reject(e);
			}
		});

		httpRequests.set(rid, { promise, cancel: () => {} });
		return rid;
	});

	ipcMain.handle("http:fetchSend", async (_, rid: number) => {
		const entry = httpRequests.get(rid);
		if (!entry) throw new Error(`Invalid request id: ${rid}`);
		httpRequests.delete(rid);
		const result = await entry.promise;
		httpResponses.set(rid, result.body);
		return { status: result.status, statusText: result.statusText, headers: result.headers, url: result.url };
	});

	ipcMain.handle("http:fetchReadBody", async (_, rid: number) => {
		const body = httpResponses.get(rid);
		if (!body) throw new Error(`Invalid request id: ${rid}`);
		httpResponses.delete(rid);
		return [...body];
	});

	ipcMain.handle("http:fetchCancel", async (_, rid: number) => {
		httpRequests.delete(rid);
	});
}

// ── IKEA TRADFRI Gateway ────────────────────────────────────────────────────────

function registerIkeaHandlers() {
	ipcMain.handle("ikea:connect", async (_, { host, securityCode }: { host: string; securityCode: string }) => {
		console.log(`[IKEA] Connecting to ${host}...`);
		try {
			const result = await ikeaConnect(host, securityCode);
			console.log(`[IKEA] Connected to ${host}, fetching devices...`);
			const devices = await ikeaListDevices(host);
			console.log(`[IKEA] Found ${devices.length} devices`);
			sendToRenderer("ikea:connectionStatus", [host, { status: "connected" }]);
			return { identity: result.identity, psk: result.psk, devices };
		} catch (err: any) {
			const msg = err.message ?? String(err);
			console.error(`[IKEA] Connection failed:`, msg);
			sendToRenderer("ikea:error", [host, msg]);
			throw err;
		}
	});

	ipcMain.handle("ikea:disconnect", async (_, host: string) => {
		await ikeaDisconnect(host);
		sendToRenderer("ikea:connectionStatus", [host, { status: "disconnected" }]);
	});

	ipcMain.handle("ikea:listDevices", async (_, host: string) => {
		return await ikeaListDevices(host);
	});

	ipcMain.handle("ikea:getDevice", async (_, { host, deviceId }: { host: string; deviceId: number }) => {
		return await ikeaGetDevice(host, deviceId);
	});

	ipcMain.handle("ikea:controlLight", async (_, args: { host: string; deviceId: number; command: any }) => {
		await ikeaControlLight(args.host, args.deviceId, args.command);
	});

	ipcMain.handle("ikea:startObserving", async (_, { host, deviceId }: { host: string; deviceId: number }) => {
		await ikeaStartObserving(host, deviceId, (device) => {
			console.log(`[IKEA] forwarding deviceUpdate to renderer: ${device.name} on=${device.lightState?.on} brightness=${device.lightState?.brightness}`);
			sendToRenderer("ikea:deviceUpdate", [host, device]);
		});
	});

	ipcMain.handle("ikea:stopObserving", async (_, { host, deviceId }: { host: string; deviceId: number }) => {
		await ikeaStopObserving(host, deviceId);
	});
}

// ── TikTok Live Connector ──────────────────────────────────────────────────────

interface TikTokConnectionState {
	username: string;
	status: "disconnected" | "connecting" | "connected" | "error";
	connectionMethod: "websocket" | "polling" | null;
	roomId: string | null;
	error: string | null;
}

const tikTokConnections = new Map<string, WebcastPushConnection>();
const tikTokConnectionStates = new Map<string, TikTokConnectionState>();

function setTikTokState(username: string, partial: Partial<TikTokConnectionState>) {
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
	ipcMain.handle("tiktok:connect", async (_, { username, signApiKey }: { username: string; signApiKey?: string | null }) => {
		const existing = tikTokConnections.get(username);
		if (existing) {
			existing.disconnect();
			tikTokConnections.delete(username);
		}

		const conn = new WebcastPushConnection(username, {
			enableExtendedGiftInfo: true,
			...(signApiKey ? { signProviderOptions: { params: { apiKey: signApiKey } } } : {}),
		});
		tikTokConnections.set(username, conn);
		setTikTokState(username, { status: "connecting", connectionMethod: null, roomId: null, error: null });

		let connected = false;

		conn.on("connected", (state: any) => {
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

		conn.on("error", (err: any) => {
			if (!connected) return;
			const msg = err?.exception?.message ?? err?.message ?? String(err ?? "Unknown error");
			console.error(`[TikTok] ${username} error:`, msg);
			setTikTokState(username, { status: "error", error: msg });
		});

		const forward = (eventName: string, data: any) => {
			sendToRenderer("tiktok:data", [username, eventName, data]);
		};

		conn.on("chat", (data: any) => forward("chat", data));
		conn.on("gift", (data: any) => forward("gift", data));
		conn.on("member", (data: any) => forward("member", data));
		conn.on("follow", (data: any) => forward("follow", data));
		conn.on("share", (data: any) => forward("share", data));
		conn.on("like", (data: any) => forward("like", data));

		try {
			await conn.connect();
		} catch (err: any) {
			const msg = err?.message ?? String(err ?? "Unknown error");
			console.error(`[TikTok] ${username} connection failed:`, msg);
			setTikTokState(username, { status: "error", error: msg });
		}
	});

	ipcMain.handle("tiktok:disconnect", async (_, username: string) => {
		const conn = tikTokConnections.get(username);
		if (conn) {
			conn.disconnect();
			tikTokConnections.delete(username);
		}
		tikTokConnectionStates.delete(username);
		sendToRenderer("tiktok:event", [username, { username, status: "disconnected", connectionMethod: null, roomId: null, error: null }]);
	});

	ipcMain.handle("tiktok:getState", (_, username: string) => {
		return tikTokConnectionStates.get(username) ?? { username, status: "disconnected", connectionMethod: null, roomId: null, error: null };
	});

	ipcMain.handle("tiktok:disconnectAll", async () => {
		for (const [username, conn] of tikTokConnections) {
			conn.disconnect();
		}
		tikTokConnections.clear();
		tikTokConnectionStates.clear();
	});
}


