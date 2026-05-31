import { createSocket, RemoteInfo } from "dgram";
import { networkInterfaces } from "os";

const LIFX_PORT = 56700;
const PROTOCOL = 0x0400;
const SOURCE = 0x72757374;

export interface LifxDevice {
	id: string;
	addr: string;
	port: number;
	label: string;
	power: number;
	hue: number;
	saturation: number;
	brightness: number;
	kelvin: number;
}

function buildHeader(type: number, target: string, sequence: number, payloadLength: number, requireResponse?: boolean): Buffer[] {
	const totalSize = 36 + payloadLength;
	const isBroadcast = !target || target === "00:00:00:00:00:00";
	const tagged = isBroadcast ? 1 : 0;
	const frameWord = (0 << 14) | (tagged << 13) | (1 << 12) | PROTOCOL;

	const frame = Buffer.alloc(8);
	frame.writeUInt16LE(totalSize, 0);
	frame.writeUInt16LE(frameWord, 2);
	frame.writeUInt32LE(SOURCE, 4);

	const frameAddr = Buffer.alloc(16);
	if (target) {
		const parts = target.split(":");
		for (let i = 0; i < 6 && i < parts.length; i++)
			frameAddr[i] = parseInt(parts[i], 16);
	}
	if (requireResponse) frameAddr[14] = 1;
	frameAddr[15] = sequence;

	const protoHeader = Buffer.alloc(12);
	protoHeader.writeUInt16LE(type, 8);

	return [frame, frameAddr, protoHeader];
}

function encodeMessage(type: number, target: string, sequence: number, payload?: Buffer, requireResponse?: boolean): Buffer {
	const payloadBuf = payload ?? Buffer.alloc(0);
	const headers = buildHeader(type, target, sequence, payloadBuf.length, requireResponse);
	const size = headers.reduce((s, h) => s + h.length, 0) + payloadBuf.length;
	headers[0].writeUInt16LE(size, 0);
	return Buffer.concat([...headers, payloadBuf]);
}



function parseMessage(buf: Buffer): { type: number; target: string; seq: number; payload: Buffer } {
	const target = Array.from({ length: 6 }, (_, i) => buf[8 + i].toString(16).padStart(2, "0")).join(":");
	const type = buf.readUInt16LE(32);
	const seq = buf[23];
	const payload = buf.subarray(36);
	return { type, target, seq, payload };
}

let socket: ReturnType<typeof createSocket> | null = null;
let socketBound = false;
let seqCounter = 0;
let listenerActive = false;

const messageQueue: { buf: Buffer; rinfo: RemoteInfo; ts: number }[] = [];

function nextSeq() {
	seqCounter = (seqCounter + 1) & 0xff;
	return seqCounter;
}

function ensureSocket(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (socket && socketBound) { resolve(); return; }
		socketBound = false;
		listenerActive = false;
		socket = createSocket("udp4");
		socket.on("error", (err: any) => {});
		socket.on("listening", () => {
			socket!.setBroadcast(true);
			socketBound = true;
			socket!.on("message", (buf: Buffer, rinfo: RemoteInfo) => {
				messageQueue.push({ buf, rinfo, ts: Date.now() });
			});
			listenerActive = true;
			resolve();
		});
		socket.bind();
		setTimeout(() => {
			if (!socketBound) reject(new Error("Socket bind timed out"));
		}, 2000);
	});
}

function drainQueue(beforeTs: number): { buf: Buffer; rinfo: RemoteInfo }[] {
	const results: { buf: Buffer; rinfo: RemoteInfo }[] = [];
	while (messageQueue.length > 0 && messageQueue[0].ts < beforeTs) {
		const m = messageQueue.shift()!;
		results.push({ buf: m.buf, rinfo: m.rinfo });
	}
	return results;
}

function send(buf: Buffer, addr: string, port: number): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!socket) { reject(new Error("Socket not bound")); return; }
		socket.send(buf, port, addr, (err) => {
			if (err) reject(err);
			else resolve();
		});
	});
}

function getBroadcastAddresses(): string[] {
	const addresses: string[] = [];
	const nets = networkInterfaces();
	for (const name of Object.keys(nets)) {
		for (const net of nets[name] ?? []) {
			if (net.family === "IPv4" && !net.internal) {
				const parts = net.address.split(".");
				const mask = net.netmask.split(".");
				const broadcast = parts.map((p, i) => String(Number(p) | (~Number(mask[i]) & 255))).join(".");
				if (!addresses.includes(broadcast)) addresses.push(broadcast);
			}
		}
	}
	return addresses;
}

async function waitForDiscovery(
	beforeMsgsCount: number,
	timeout: number,
): Promise<{ type: number; target: string; payload: Buffer; rinfo: RemoteInfo }[]> {
	const deadline = Date.now() + timeout;
	const results: { type: number; target: string; payload: Buffer; rinfo: RemoteInfo }[] = [];

	while (Date.now() < deadline) {
		while (messageQueue.length > beforeMsgsCount) {
			const m = messageQueue[beforeMsgsCount];
			results.push({ ...parseMessage(m.buf), rinfo: m.rinfo });
			beforeMsgsCount++;
		}
		if (results.length > 0) break;
		await new Promise((r) => setTimeout(r, 10));
	}

	return results;
}

export async function lifxDiscover(manualAddr?: string): Promise<LifxDevice[]> {
	await ensureSocket();

	const seq = nextSeq();
	const getService = encodeMessage(2, "00:00:00:00:00:00", seq, undefined, false);

	const beforeMsgs = messageQueue.length;

	if (manualAddr) {
		for (let attempt = 0; attempt < 3; attempt++) {
			await send(getService, manualAddr, LIFX_PORT).catch(() => {});
			if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
		}
	} else {
		const broadcasts = getBroadcastAddresses();
		const allTargets = [...new Set([...broadcasts, "255.255.255.255"])];

		for (let attempt = 0; attempt < 3; attempt++) {
			for (const addr of allTargets) {
				await send(getService, addr, LIFX_PORT).catch(() => {});
			}
			if (attempt < 2) await new Promise((r) => setTimeout(r, 200));
		}
	}

	const responses = await waitForDiscovery(beforeMsgs, 3000);

	const results: LifxDevice[] = [];
	const seen = new Set<string>();

	for (const msg of responses) {
		if (msg.type === 3) {
			const port = msg.payload.readUInt32LE(1);
			const id = msg.target;

			if (seen.has(id)) continue;
			seen.add(id);

			const info = await getLightInfo(id, msg.rinfo.address, port || LIFX_PORT);
			if (info) results.push(info);
		}
	}

	return results;
}

async function getLightInfo(target: string, addr: string, port: number): Promise<LifxDevice | null> {
	const seq = nextSeq();

	const lightGet = encodeMessage(101, target, seq, undefined, true);
	const beforeMsgs = messageQueue.length;

	await send(lightGet, addr, port);

	const responses = await waitForDiscovery(beforeMsgs, 1000);

	for (const msg of responses) {
		if (msg.type === 107) {
			const hue = msg.payload.readUInt16LE(0);
			const saturation = msg.payload.readUInt16LE(2);
			const brightness = msg.payload.readUInt16LE(4);
			const kelvin = msg.payload.readUInt16LE(6);
			const power = msg.payload.readUInt16LE(10);
			const label = msg.payload.subarray(12, 44).toString("utf-8").replace(/\0/g, "").trim();

			const getLabel = encodeMessage(23, target, seq + 1, undefined, true);
			const beforeLabelMsgs = messageQueue.length;
			await send(getLabel, addr, port);
			const labelResponses = await waitForDiscovery(beforeLabelMsgs, 500);

			let label2 = label;
			for (const lm of labelResponses) {
				if (lm.type === 25) {
					label2 = lm.payload.subarray(0, 32).toString("utf-8").replace(/\0/g, "").trim();
				}
			}

			return {
				id: target,
				addr,
				port,
				label: label2,
				power,
				hue,
				saturation,
				brightness,
				kelvin,
			};
		}
	}

	return null;
}

export async function lifxSetPower(target: string, addr: string, port: number, level: boolean, duration: number): Promise<void> {
	await ensureSocket();
	const seq = nextSeq();

	const levelVal = level ? 65535 : 0;
	const payload = Buffer.alloc(6);
	payload.writeUInt16LE(levelVal, 0);
	payload.writeUInt32LE(duration, 2);

	const msg = encodeMessage(117, target, seq, payload, false);
	await send(msg, addr, port);
	await new Promise((r) => setTimeout(r, 100));
}

export async function lifxSetColor(
	target: string,
	addr: string,
	port: number,
	color: { hue?: number; saturation?: number; brightness?: number; kelvin?: number },
	duration: number,
): Promise<void> {
	await ensureSocket();
	const seq = nextSeq();

	const payload = Buffer.alloc(13);
	payload[0] = 0;
	const h = color.hue ?? 0;
	const s = color.saturation ?? 0;
	const b = color.brightness ?? 65535;
	const k = color.kelvin ?? 3500;
	payload.writeUInt16LE(Math.round(h), 1);
	payload.writeUInt16LE(Math.round(s), 3);
	payload.writeUInt16LE(Math.round(b), 5);
	payload.writeUInt16LE(Math.round(k), 7);
	payload.writeUInt32LE(duration, 9);

	const msg = encodeMessage(102, target, seq, payload, false);
	await send(msg, addr, port);
	await new Promise((r) => setTimeout(r, 100));
}

export async function lifxGetState(target: string, addr: string, port: number): Promise<LifxDevice | null> {
	await ensureSocket();
	return getLightInfo(target, addr, port);
}

export async function lifxCleanup(): Promise<void> {
	if (socket) {
		try { socket.close(); } catch {}
		socket = null;
	}
	socketBound = false;
	listenerActive = false;
	messageQueue.length = 0;
}
