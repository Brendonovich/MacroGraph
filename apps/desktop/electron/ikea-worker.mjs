import { dtls } from "node-dtls-client";
import * as coap from "coap-packet";

const host = process.argv[2];

const opts = {
	type: "udp4", address: host, port: 5684,
	timeout: 8000, ciphers: ["TLS_PSK_WITH_AES_128_CCM_8"],
	compat: { resetAntiReplayWindowBeforeServerHello: true },
};

process.stdout.write(JSON.stringify({ type: "ready" }) + "\n");

let currentConn = null;
let currentMid = 1;
function nextMid() { return currentMid++; }

function coapGenerate(method, path, payload, token, extraOpts = []) {
	const opts = [
		...path.split("/").filter(Boolean).map(p => ({ name: "Uri-Path", value: Buffer.from(p) })),
		...extraOpts,
	];
	return coap.generate({
		messageId: nextMid(),
		code: { get: "0.01", post: "0.02", put: "0.03" }[method],
		payload: payload ? Buffer.from(payload) : null,
		options: opts,
		token,
	});
}

function coapReq(s, method, path, payload) {
	return new Promise((resolve, reject) => {
		const mid = nextMid();
		const buf = coap.generate({
			messageId: mid,
			code: { get: "0.01", post: "0.02", put: "0.03" }[method],
			payload: payload ? Buffer.from(payload) : null,
			options: path.split("/").filter(Boolean).map(p => ({ name: "Uri-Path", value: Buffer.from(p) })),
			token: Buffer.from([mid & 0xff]),
		});
		const to = setTimeout(() => { cleanup(); reject(new Error("CoAP timeout")); }, 10000);
		const cleanup = () => { clearTimeout(to); s.removeListener("message", onMsg); };
		const onMsg = (msg) => {
			try {
				const p = coap.parse(msg);
				if (p.messageId !== mid) return;
				cleanup();
				const codeNum = parseInt(p.code?.split(".")?.[0] ?? "0");
				if (codeNum >= 4) reject(new Error(`Gateway error ${p.code}`));
				else resolve(p.payload?.toString() ?? "");
			} catch {}
		};
		s.on("message", onMsg);
		s.send(buf);
	});
}

function sendMsg(msg) {
	process.stdout.write(JSON.stringify(msg) + "\n");
}

const OBSERVE_TOKEN_PREFIX = 0xFD;
let observeTokens = {}; // token hex string -> deviceId
let observedDeviceIds = new Set();
let observeAttached = false;
let fallbackPollTimer = null;
let lastFallbackStates = {};

function attachObserveListener(s) {
	if (observeAttached) return;
	observeAttached = true;
	s.on("message", (msg) => {
		try {
			const p = coap.parse(msg);
			if (!p.token || p.token[0] !== OBSERVE_TOKEN_PREFIX) return;
			const key = p.token.toString("hex");
			const deviceId = observeTokens[key];
			if (deviceId === undefined) return;
			const raw = p.payload?.toString();
			if (!raw) return;
			if (deviceId === -1) {
				const ids = JSON.parse(raw);
				for (const id of ids) {
					if (!observedDeviceIds.has(id)) {
						observedDeviceIds.add(id);
						observeOneDevice(s, id);
					}
				}
			} else {
				const device = parseDevice(deviceId, raw);
				sendMsg({ type: "device_update", device_id: deviceId, device });
			}
		} catch {}
	});
}

function observeOneDevice(s, deviceId) {
	const token = Buffer.from([OBSERVE_TOKEN_PREFIX, (deviceId >> 8) & 0xFF, deviceId & 0xFF]);
	const key = token.toString("hex");
	if (observeTokens[key] !== undefined) return;
	observeTokens[key] = deviceId;
	const buf = coapGenerate("get", `15001/${deviceId}`, null, token, [
		{ name: "Observe", value: Buffer.from([0]) },
	]);
	s.send(buf);
}

async function pollDevices(s) {
	try {
		const raw = await coapReq(s, "get", "15001");
		const ids = JSON.parse(raw);
		for (const id of ids) {
			try {
				const d = await coapReq(s, "get", `15001/${id}`);
				const device = parseDevice(id, d);
				const key = String(id);
				const prev = JSON.stringify(lastFallbackStates[key]);
				const curr = JSON.stringify(device);
				if (prev !== curr) {
					lastFallbackStates[key] = device;
					sendMsg({ type: "device_update", device_id: id, device });
				}
			} catch {}
		}
	} catch {}
}

async function observeAllDevices(s) {
	const raw = await coapReq(s, "get", "15001");
	const ids = JSON.parse(raw);
	const listToken = Buffer.from([OBSERVE_TOKEN_PREFIX, 0xFF, 0xFF]);
	observeTokens[listToken.toString("hex")] = -1;
	const listBuf = coapGenerate("get", "15001", null, listToken, [
		{ name: "Observe", value: Buffer.from([0]) },
	]);
	s.send(listBuf);
	// Seed fallback states and observe each device
	lastFallbackStates = {};
	for (const id of ids) {
		observedDeviceIds.add(id);
		observeOneDevice(s, id);
	}
	// Fallback poll every 30s in case Observe misses reconnections
	if (fallbackPollTimer) clearInterval(fallbackPollTimer);
	fallbackPollTimer = setInterval(() => pollDevices(s), 10000);
}

process.stdin.on("data", async (data) => {
	for (const line of data.toString().split("\n").filter(Boolean)) {
		try {
			const req = JSON.parse(line);
			const cmd = req.command;

			if (cmd === "connect") {
				const sock = dtls.createSocket({ ...opts, psk: { "Client_identity": req.securityCode } });
				await new Promise((res, rej) => { sock.on("connected", res); sock.on("error", rej); });
				const pskResp = await coapReq(sock, "post", "15011/9063", JSON.stringify({ "9090": req.identity }));
				sock.close();
				const psk = JSON.parse(pskResp)["9091"];
				currentConn = dtls.createSocket({ ...opts, psk: { [req.identity]: psk } });
				await new Promise((res, rej) => { currentConn.on("connected", res); currentConn.on("error", rej); });
				sendMsg({ type: "connected", identity: req.identity, psk });
			}
			else if (cmd === "list_devices" && currentConn) {
				const raw = await coapReq(currentConn, "get", "15001");
				const ids = JSON.parse(raw);
				const devices = [];
				for (const id of ids) {
					try {
						const d = await coapReq(currentConn, "get", `15001/${id}`);
						devices.push(parseDevice(id, d));
					} catch {}
				}
				sendMsg({ type: "devices", devices });
			}
			else if (cmd === "get_device" && currentConn) {
				try {
					const raw = await coapReq(currentConn, "get", `15001/${req.deviceId}`);
					const device = parseDevice(req.deviceId, raw);
					sendMsg({ type: "device", device });
				} catch (e) {
					sendMsg({ type: "error", error: e.message });
				}
			}
			else if (cmd === "control_light" && currentConn) {
				const p = { "3311": [{}] };
				const c = req.lightCommand;
				if (c.state !== undefined) p["3311"][0]["5850"] = c.state ? 1 : 0;
				if (c.dimmer !== undefined) p["3311"][0]["5851"] = Math.max(0, Math.min(254, Math.round(c.dimmer)));
				if (c.colorTemp !== undefined) p["3311"][0]["5711"] = kelvinToMireds(c.colorTemp);
				if (c.hexColor !== undefined) p["3311"][0]["5706"] = c.hexColor.replace("#", "");
				await coapReq(currentConn, "put", `15001/${req.deviceId}`, JSON.stringify(p));
				sendMsg({ type: "success" });
			}
			else if (cmd === "start_observing" && currentConn) {
				attachObserveListener(currentConn);
				observeAllDevices(currentConn).catch(() => {});
				sendMsg({ type: "observing_started" });
			}
			else if (cmd === "stop_observing") {
				if (fallbackPollTimer) { clearInterval(fallbackPollTimer); fallbackPollTimer = null; }
				observeTokens = {};
				observedDeviceIds = new Set();
				lastFallbackStates = {};
				sendMsg({ type: "observing_stopped" });
			}
			else if (cmd === "disconnect") {
				if (fallbackPollTimer) { clearInterval(fallbackPollTimer); fallbackPollTimer = null; }
				observeTokens = {};
				observedDeviceIds = new Set();
				lastFallbackStates = {};
				observeAttached = false;
				if (currentConn) { try { currentConn.close(); } catch {} currentConn = null; }
				sendMsg({ type: "disconnected" });
				process.exit(0);
			}
		} catch (e) {
			sendMsg({ type: "error", error: e.message });
		}
	}
});

function miredsToKelvin(mireds) {
	if (mireds === undefined || mireds === 0) return undefined;
	return Math.round(1000000 / mireds);
}

function kelvinToMireds(kelvin) {
	if (kelvin === undefined || kelvin === 0) return undefined;
	return Math.round(1000000 / kelvin);
}

function parseDevice(id, raw) {
	const data = JSON.parse(raw);
	const tc = data["5750"] ?? -1;
	const typeMap = { 0: "remote", 2: "light", 3: "light", 4: "plug", 5: "blinds", 6: "purifier", 7: "repeater" };
	const dev = { id, name: data["9001"] ?? `Device ${id}`, reachable: data["9019"] === 1, deviceType: typeMap[tc] ?? "unknown" };
	const info = data["3"];
	if (info) dev.deviceInfo = { manufacturer: info["0"] ?? "", modelNumber: info["1"] ?? "", firmwareVersion: info["3"] ?? "", batteryLevel: info["9"] };
	const ls = data["3311"];
	if (ls?.length > 0) dev.lightState = { on: ls[0]["5850"] === 1, brightness: ls[0]["5851"] ?? 0, colorTemp: miredsToKelvin(ls[0]["5711"]), hexColor: ls[0]["5706"] };
	return dev;
}

process.stdin.on("end", () => { if (currentConn) try { currentConn.close(); } catch {} process.exit(0); });
