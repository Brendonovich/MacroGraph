import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
	platform: {
		saveProject: (data: string, path: string) =>
			ipcRenderer.invoke("fs:writeTextFile", path, data),
		loadProject: (path: string) =>
			ipcRenderer.invoke("fs:readTextFile", path),
		url: null,
	},
	clipboard: {
		readText: () => ipcRenderer.invoke("clipboard:readText"),
		writeText: (text: string) => ipcRenderer.invoke("clipboard:writeText", text),
	},
	dialog: {
		open: (options?: any) => ipcRenderer.invoke("dialog:open", options ?? {}),
		save: (options?: any) => ipcRenderer.invoke("dialog:save", options ?? {}),
		confirm: (message: string, title?: string) =>
			ipcRenderer.invoke("dialog:confirm", { message, title }),
	},
	shell: {
		execute: (command: string) => ipcRenderer.invoke("shell:execute", command),
		openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
	},
	fs: {
		list: (path: string) => ipcRenderer.invoke("fs:list", path),
		readTextFile: (path: string) => ipcRenderer.invoke("fs:readTextFile", path),
		writeTextFile: (path: string, content: string) =>
			ipcRenderer.invoke("fs:writeTextFile", path, content),
		readBinaryFile: (path: string) => ipcRenderer.invoke("fs:readBinaryFile", path),
		writeBinaryFile: (path: string, data: number[]) =>
			ipcRenderer.invoke("fs:writeBinaryFile", path, data),
		fileSize: (path: string) => ipcRenderer.invoke("fs:fileSize", path),
	},
	ws: {
		startServer: (port: number) => ipcRenderer.invoke("ws:server:start", port),
		stopServer: (port: number) => ipcRenderer.invoke("ws:server:stop", port),
		send: (args: { port: number; client: number | null; data: string }) =>
			ipcRenderer.invoke("ws:server:send", args),
		disconnectAllClients: () => ipcRenderer.invoke("ws:server:disconnectAll"),
	},
	remoteHost: {
		start: (args: { port: number; password?: string | null }) =>
			ipcRenderer.invoke("remoteHost:start", args),
		stop: () => ipcRenderer.invoke("remoteHost:stop"),
		send: (args: { port: number; client: number | null; except_client?: number | null; data: string }) =>
			ipcRenderer.invoke("remoteHost:send", args),
		setPassword: (password: string | null) =>
			ipcRenderer.invoke("remoteHost:setPassword", password),
	},
	tiktok: {
		connect: (username: string, signApiKey?: string | null) => ipcRenderer.invoke("tiktok:connect", { username, signApiKey }),
		disconnect: (username: string) => ipcRenderer.invoke("tiktok:disconnect", username),
		getState: (username: string) => ipcRenderer.invoke("tiktok:getState", username),
		disconnectAll: () => ipcRenderer.invoke("tiktok:disconnectAll"),
	},
	outboundWs: {
		open: (url: string) => ipcRenderer.invoke("outboundWs:open", url),
		close: (url: string) => ipcRenderer.invoke("outboundWs:close", url),
		closeAll: () => ipcRenderer.invoke("outboundWs:closeAll"),
		send: (args: { url: string; data: string }) =>
			ipcRenderer.invoke("outboundWs:send", args),
		list: () => ipcRenderer.invoke("outboundWs:list"),
		isConnected: (url: string) => ipcRenderer.invoke("outboundWs:isConnected", url),
		pruneExcept: (keep: string[]) => ipcRenderer.invoke("outboundWs:pruneExcept", keep),
	},
	obs: {
		connect: (args: { url: string; password?: string | null }) =>
			ipcRenderer.invoke("obs:connect", args),
		disconnect: (url: string) => ipcRenderer.invoke("obs:disconnect", url),
		disconnectAll: () => ipcRenderer.invoke("obs:disconnectAll"),
		call: (args: { url: string; requestType: string; requestData?: unknown }) =>
			ipcRenderer.invoke("obs:call", args),
		callBatch: (args: { url: string; requests: { requestType: string; requestData?: unknown }[] }) =>
			ipcRenderer.invoke("obs:callBatch", args),
	},
	oauth: {
		authorize: (url: string) => ipcRenderer.invoke("oauth:authorize", url),
	},
	loginListen: () => ipcRenderer.invoke("loginListen"),
	audio: {
		enumerate: () => ipcRenderer.invoke("audio:enumerate"),
		play: (args: { path: string; deviceName?: string }) =>
			ipcRenderer.invoke("audio:play", args),
		stop: (id: string) => ipcRenderer.invoke("audio:stop", id),
		setVolume: (id: string, volume: number) =>
			ipcRenderer.invoke("audio:setVolume", { id, volume }),
		stopAll: () => ipcRenderer.invoke("audio:stopAll"),
	},
	kbMouse: {
		simulateKeys: (keys: string[], delay: number) =>
			ipcRenderer.invoke("kbMouse:simulateKeys", { keys, delay }),
		simulateMouse: (button: string, delay: number) =>
			ipcRenderer.invoke("kbMouse:simulateMouse", { button, delay }),
		setMousePosition: (x: number, y: number, absolute: boolean) =>
			ipcRenderer.invoke("kbMouse:setMousePosition", { x, y, absolute }),
		startHooks: () => ipcRenderer.invoke("kbMouse:startHooks"),
		stopHooks: () => ipcRenderer.invoke("kbMouse:stopHooks"),
	},
	crashLog: {
		append: (kind: string, message: string) =>
			ipcRenderer.invoke("crashLog:append", kind, message),
		path: () => ipcRenderer.invoke("crashLog:path"),
	},
	http: {
		fetch: (args: { method: string; url: string; headers: [string, string][]; data: number[] | null; connectTimeout: number | null; maxRedirections: number | null }) =>
			ipcRenderer.invoke("http:fetch", args),
		fetchMultipart: (args: { url: string; headers: [string, string][]; fields: [string, string][]; filePath: string | null; fileFieldName: string | null; connectTimeout: number | null }) =>
			ipcRenderer.invoke("http:fetchMultipart", args),
		fetchSend: (rid: number) => ipcRenderer.invoke("http:fetchSend", rid),
		fetchReadBody: (rid: number) => ipcRenderer.invoke("http:fetchReadBody", rid),
		fetchCancel: (rid: number) => ipcRenderer.invoke("http:fetchCancel", rid),
	},
	onEvent: (channel: string, callback: (...args: any[]) => void) => {
		const handler = (_event: any, ...args: any[]) => callback(...args);
		ipcRenderer.on(channel, handler);
		return () => ipcRenderer.removeListener(channel, handler);
	},
	path: {
		convertFileSrc: (path: string) => ipcRenderer.invoke("path:convertFileSrc", path),
	},
});
