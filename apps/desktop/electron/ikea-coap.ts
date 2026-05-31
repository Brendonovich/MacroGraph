import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { join } from "path";

export interface IkeaDevice {
	id: number;
	name: string;
	reachable: boolean;
	deviceType: "light" | "remote" | "plug" | "blinds" | "purifier" | "repeater" | "unknown";
	deviceInfo?: {
		manufacturer: string;
		modelNumber: string;
		firmwareVersion: string;
		batteryLevel?: number;
	};
	lightState?: {
		on: boolean;
		brightness: number;
		colorTemp?: number;
		hexColor?: string;
	};
}

export interface LightCommand {
	state?: boolean;
	dimmer?: number;
	colorTemp?: number;
	hexColor?: string;
	transitionTime?: number;
}

let worker: any = null;
let buffer = "";
let pendingResolve: ((v: any) => void) | null = null;
let pendingReject: ((e: Error) => void) | null = null;

function workerPath() {
	return join(__dirname, "..", "electron", "ikea-worker.mjs");
}

function sendToWorker(msg: any) {
	return new Promise<any>((resolve, reject) => {
		if (!worker) {
			reject(new Error("Worker not running"));
			return;
		}
		const to = setTimeout(() => {
			pendingResolve = null;
			pendingReject = null;
			reject(new Error("Request timed out"));
		}, 20000);
		pendingResolve = (result: any) => {
			clearTimeout(to);
			resolve(result);
		};
		pendingReject = (err: Error) => {
			clearTimeout(to);
			reject(err);
		};
		worker.stdin.write(JSON.stringify(msg) + "\n");
	});
}

function startWorker(host: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const path = workerPath();
		worker = spawn("node", [path, host], {
			stdio: ["pipe", "pipe", "pipe"],
		});

		let started = false;
		const to = setTimeout(() => {
			if (!started) {
				worker.kill();
				reject(new Error("Worker startup timed out"));
			}
		}, 5000);

		worker.stdout.on("data", (data: Buffer) => {
			if (!started) { started = true; clearTimeout(to); resolve(); }

			buffer += data.toString();
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				try {
					const msg = JSON.parse(trimmed);
					if (msg.type === "device_update") {
						// handled by observation setup
					} else if (pendingResolve) {
						const r = pendingResolve;
						pendingResolve = null;
						pendingReject = null;
						r(msg);
					}
				} catch {}
			}
		});

		worker.stderr.on("data", (data: Buffer) => {
			console.error("[IKEA Worker]", data.toString().trim());
		});

		worker.on("exit", (code: number) => {
			if (!started) {
				clearTimeout(to);
				reject(new Error(`Worker exited with code ${code}`));
			} else if (pendingReject) {
				pendingReject(new Error(`Worker exited unexpectedly (code ${code})`));
				pendingResolve = null;
				pendingReject = null;
			}
			worker = null;
		});
	});
}

export async function ikeaConnect(host: string, securityCode: string): Promise<{ identity: string; psk: string }> {
	const identity = randomUUID().replace(/-/g, "").substring(0, 16);

	await startWorker(host);

	const result = await sendToWorker({
		command: "connect",
		securityCode,
		identity,
	});

	if (result.type === "error") throw new Error(result.error);
	return { identity: result.identity, psk: result.psk };
}

export async function ikeaDisconnect(host: string): Promise<void> {
	if (worker) {
		try {
			worker.stdin.write(JSON.stringify({ command: "disconnect" }) + "\n");
		} catch {}
		try { worker.kill(); } catch {}
		worker = null;
	}
	buffer = "";
	pendingResolve = null;
	pendingReject = null;
}

export async function ikeaListDevices(host: string): Promise<IkeaDevice[]> {
	const result = await sendToWorker({ command: "list_devices" });
	if (result.type === "error") throw new Error(result.error);
	return (result.devices || []) as IkeaDevice[];
}

export async function ikeaControlLight(host: string, deviceId: number, cmd: LightCommand): Promise<void> {
	const result = await sendToWorker({
		command: "control_light",
		deviceId,
		lightCommand: cmd,
	});
	if (result.type === "error") throw new Error(result.error);
}

export async function ikeaGetDevice(host: string, deviceId: number): Promise<IkeaDevice> {
	const result = await sendToWorker({ command: "get_device", deviceId });
	if (result.type === "error") throw new Error(result.error);
	return result.device as IkeaDevice;
}

export async function ikeaStartObserving(
	host: string,
	deviceId: number,
	onUpdate: (device: IkeaDevice) => void,
): Promise<void> {
	if (!worker?.stdout) return;
	await sendToWorker({ command: "start_observing" });
	const handler = (data: Buffer) => {
		const text = data.toString();
		for (const line of text.split("\n")) {
			try {
				const msg = JSON.parse(line.trim());
				if (msg.type === "device_update") {
					onUpdate(msg.device as IkeaDevice);
				}
			} catch {}
		}
	};
	worker.stdout.on("data", handler);
}

export async function ikeaStopObserving(host: string, deviceId: number): Promise<void> {
	await sendToWorker({ command: "stop_observing" });
}
