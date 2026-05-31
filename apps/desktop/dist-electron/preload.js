"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    platform: {
        saveProject: (data, path) => electron_1.ipcRenderer.invoke("fs:writeTextFile", path, data),
        loadProject: (path) => electron_1.ipcRenderer.invoke("fs:readTextFile", path),
        url: null,
    },
    clipboard: {
        readText: () => electron_1.ipcRenderer.invoke("clipboard:readText"),
        writeText: (text) => electron_1.ipcRenderer.invoke("clipboard:writeText", text),
    },
    dialog: {
        open: (options) => electron_1.ipcRenderer.invoke("dialog:open", options ?? {}),
        save: (options) => electron_1.ipcRenderer.invoke("dialog:save", options ?? {}),
        confirm: (message, title) => electron_1.ipcRenderer.invoke("dialog:confirm", { message, title }),
    },
    shell: {
        execute: (command) => electron_1.ipcRenderer.invoke("shell:execute", command),
        openExternal: (url) => electron_1.ipcRenderer.invoke("shell:openExternal", url),
    },
    fs: {
        list: (path) => electron_1.ipcRenderer.invoke("fs:list", path),
        readTextFile: (path) => electron_1.ipcRenderer.invoke("fs:readTextFile", path),
        writeTextFile: (path, content) => electron_1.ipcRenderer.invoke("fs:writeTextFile", path, content),
        readBinaryFile: (path) => electron_1.ipcRenderer.invoke("fs:readBinaryFile", path),
        writeBinaryFile: (path, data) => electron_1.ipcRenderer.invoke("fs:writeBinaryFile", path, data),
        fileSize: (path) => electron_1.ipcRenderer.invoke("fs:fileSize", path),
    },
    ws: {
        startServer: (port) => electron_1.ipcRenderer.invoke("ws:server:start", port),
        stopServer: (port) => electron_1.ipcRenderer.invoke("ws:server:stop", port),
        send: (args) => electron_1.ipcRenderer.invoke("ws:server:send", args),
        disconnectAllClients: () => electron_1.ipcRenderer.invoke("ws:server:disconnectAll"),
    },
    remoteHost: {
        start: (args) => electron_1.ipcRenderer.invoke("remoteHost:start", args),
        stop: () => electron_1.ipcRenderer.invoke("remoteHost:stop"),
        send: (args) => electron_1.ipcRenderer.invoke("remoteHost:send", args),
        setPassword: (password) => electron_1.ipcRenderer.invoke("remoteHost:setPassword", password),
    },
    tiktok: {
        connect: (username, signApiKey) => electron_1.ipcRenderer.invoke("tiktok:connect", { username, signApiKey }),
        disconnect: (username) => electron_1.ipcRenderer.invoke("tiktok:disconnect", username),
        getState: (username) => electron_1.ipcRenderer.invoke("tiktok:getState", username),
        disconnectAll: () => electron_1.ipcRenderer.invoke("tiktok:disconnectAll"),
    },
    outboundWs: {
        open: (url) => electron_1.ipcRenderer.invoke("outboundWs:open", url),
        close: (url) => electron_1.ipcRenderer.invoke("outboundWs:close", url),
        closeAll: () => electron_1.ipcRenderer.invoke("outboundWs:closeAll"),
        send: (args) => electron_1.ipcRenderer.invoke("outboundWs:send", args),
        list: () => electron_1.ipcRenderer.invoke("outboundWs:list"),
        isConnected: (url) => electron_1.ipcRenderer.invoke("outboundWs:isConnected", url),
        pruneExcept: (keep) => electron_1.ipcRenderer.invoke("outboundWs:pruneExcept", keep),
    },
    obs: {
        connect: (args) => electron_1.ipcRenderer.invoke("obs:connect", args),
        disconnect: (url) => electron_1.ipcRenderer.invoke("obs:disconnect", url),
        disconnectAll: () => electron_1.ipcRenderer.invoke("obs:disconnectAll"),
        call: (args) => electron_1.ipcRenderer.invoke("obs:call", args),
        callBatch: (args) => electron_1.ipcRenderer.invoke("obs:callBatch", args),
    },
    oauth: {
        authorize: (url) => electron_1.ipcRenderer.invoke("oauth:authorize", url),
    },
    loginListen: () => electron_1.ipcRenderer.invoke("loginListen"),
    audio: {
        enumerate: () => electron_1.ipcRenderer.invoke("audio:enumerate"),
        play: (args) => electron_1.ipcRenderer.invoke("audio:play", args),
        stop: (id) => electron_1.ipcRenderer.invoke("audio:stop", id),
        setVolume: (id, volume) => electron_1.ipcRenderer.invoke("audio:setVolume", { id, volume }),
        stopAll: () => electron_1.ipcRenderer.invoke("audio:stopAll"),
    },
    kbMouse: {
        simulateKeys: (keys, delay) => electron_1.ipcRenderer.invoke("kbMouse:simulateKeys", { keys, delay }),
        simulateMouse: (button, delay) => electron_1.ipcRenderer.invoke("kbMouse:simulateMouse", { button, delay }),
        setMousePosition: (x, y, absolute) => electron_1.ipcRenderer.invoke("kbMouse:setMousePosition", { x, y, absolute }),
        startHooks: () => electron_1.ipcRenderer.invoke("kbMouse:startHooks"),
        stopHooks: () => electron_1.ipcRenderer.invoke("kbMouse:stopHooks"),
    },
    crashLog: {
        append: (kind, message) => electron_1.ipcRenderer.invoke("crashLog:append", kind, message),
        path: () => electron_1.ipcRenderer.invoke("crashLog:path"),
    },
    http: {
        fetch: (args) => electron_1.ipcRenderer.invoke("http:fetch", args),
        fetchMultipart: (args) => electron_1.ipcRenderer.invoke("http:fetchMultipart", args),
        fetchSend: (rid) => electron_1.ipcRenderer.invoke("http:fetchSend", rid),
        fetchReadBody: (rid) => electron_1.ipcRenderer.invoke("http:fetchReadBody", rid),
        fetchCancel: (rid) => electron_1.ipcRenderer.invoke("http:fetchCancel", rid),
    },
    onEvent: (channel, callback) => {
        const handler = (_event, ...args) => callback(...args);
        electron_1.ipcRenderer.on(channel, handler);
        return () => electron_1.ipcRenderer.removeListener(channel, handler);
    },
    path: {
        convertFileSrc: (path) => electron_1.ipcRenderer.invoke("path:convertFileSrc", path),
    },
    ikea: {
        connect: (host, securityCode) => electron_1.ipcRenderer.invoke("ikea:connect", { host, securityCode }),
        disconnect: (host) => electron_1.ipcRenderer.invoke("ikea:disconnect", host),
        listDevices: (host) => electron_1.ipcRenderer.invoke("ikea:listDevices", host),
        getDevice: (host, deviceId) => electron_1.ipcRenderer.invoke("ikea:getDevice", { host, deviceId }),
        controlLight: (host, deviceId, command) => electron_1.ipcRenderer.invoke("ikea:controlLight", { host, deviceId, command }),
        startObserving: (host) => electron_1.ipcRenderer.invoke("ikea:startObserving", { host, deviceId: 0 }),
        stopObserving: (host) => electron_1.ipcRenderer.invoke("ikea:stopObserving", { host, deviceId: 0 }),
    },
    lifx: {
        discover: (manualAddr) => electron_1.ipcRenderer.invoke("lifx:discover", manualAddr),
        startObserving: () => electron_1.ipcRenderer.invoke("lifx:startObserving"),
        stopObserving: () => electron_1.ipcRenderer.invoke("lifx:stopObserving"),
        setPower: (args) => electron_1.ipcRenderer.invoke("lifx:setPower", args),
        setColor: (args) => electron_1.ipcRenderer.invoke("lifx:setColor", args),
        getState: (args) => electron_1.ipcRenderer.invoke("lifx:getState", args),
        cleanup: () => electron_1.ipcRenderer.invoke("lifx:cleanup"),
    },
    elgatoKeyLight: {
        discover: (manualAddr) => electron_1.ipcRenderer.invoke("elgatoKeyLight:discover", manualAddr),
        startObserving: () => electron_1.ipcRenderer.invoke("elgatoKeyLight:startObserving"),
        stopObserving: () => electron_1.ipcRenderer.invoke("elgatoKeyLight:stopObserving"),
        getState: (args) => electron_1.ipcRenderer.invoke("elgatoKeyLight:getState", args),
        setState: (args) => electron_1.ipcRenderer.invoke("elgatoKeyLight:setState", args),
        toggle: (args) => electron_1.ipcRenderer.invoke("elgatoKeyLight:toggle", args),
        incrBrightness: (args) => electron_1.ipcRenderer.invoke("elgatoKeyLight:incrBrightness", args),
        incrTemperature: (args) => electron_1.ipcRenderer.invoke("elgatoKeyLight:incrTemperature", args),
        cleanup: () => electron_1.ipcRenderer.invoke("elgatoKeyLight:cleanup"),
    },
});
//# sourceMappingURL=preload.js.map