import * as http from "http";
import { networkInterfaces } from "os";

export interface ElgatoDevice {
	id: string;
	name: string;
	addr: string;
	port: number;
}

function httpGet(addr: string, port: number): Promise<any> {
	return new Promise((resolve, reject) => {
		const req = http.get(`http://${addr}:${port}/elgato/lights`, { timeout: 5000 }, (res) => {
			let data = "";
			res.on("data", (chunk: any) => (data += chunk));
			res.on("end", () => {
				try {
					resolve(JSON.parse(data));
				} catch (e) {
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

function httpPut(addr: string, port: number, body: any): Promise<any> {
	return new Promise((resolve, reject) => {
		const data = JSON.stringify(body);
		const req = http.request(
			`http://${addr}:${port}/elgato/lights`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
				timeout: 5000,
			},
			(res) => {
				let responseData = "";
				res.on("data", (chunk: any) => (responseData += chunk));
				res.on("end", () => {
					try {
						resolve(JSON.parse(responseData));
					} catch (e) {
						reject(e);
					}
				});
			},
		);
		req.on("error", reject);
		req.on("timeout", () => {
			req.destroy();
			reject(new Error("Request timed out"));
		});
		req.write(data);
		req.end();
	});
}

function probeDevice(addr: string, port: number): Promise<ElgatoDevice | null> {
	return new Promise((resolve) => {
		const req = http.get(`http://${addr}:${port}/elgato/lights`, { timeout: 2000 }, (res) => {
			let data = "";
			res.on("data", (chunk: any) => (data += chunk));
			res.on("end", () => {
				try {
					const parsed = JSON.parse(data);
					if (parsed && parsed.lights && parsed.numberOfLights > 0) {
						resolve({ id: `${addr}:${port}`, name: `Elgato Key Light (${addr})`, addr, port });
					} else {
						resolve(null);
					}
				} catch {
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

function getLocalSubnets(): string[] {
	const subnets = new Set<string>();
	const nets = networkInterfaces();
	for (const name of Object.keys(nets)) {
		// Skip virtual adapters (Tailscale, Hyper-V, WSL, Docker, etc.)
		if (name.toLowerCase().includes("tailscale") ||
			name.toLowerCase().includes("v ethernet") ||
			name.toLowerCase().includes("vswitch") ||
			name.toLowerCase().includes("hyper-v") ||
			name.toLowerCase().includes("docker") ||
			name.toLowerCase().includes("virtualbox") ||
			name.toLowerCase().includes("vmware") ||
			name.toLowerCase().includes("bluetooth")) continue;
		for (const net of nets[name] ?? []) {
			if (net.family === "IPv4" && !net.internal) {
				const parts = net.address.split(".");
				subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
			}
		}
	}
	return [...subnets];
}

async function scanSubnet(subnet: string, port: number): Promise<ElgatoDevice[]> {
	const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
	const results = await Promise.all(ips.map((ip) => probeDevice(ip, port)));
	return results.filter((d): d is ElgatoDevice => d !== null);
}

export async function elgatoDiscover(manualAddr?: string): Promise<ElgatoDevice[]> {
	if (manualAddr) {
		const device = await probeDevice(manualAddr, 9123);
		return device ? [device] : [];
	}

	const subnets = getLocalSubnets();
	if (subnets.length === 0) return [];

	const seen = new Set<string>();
	const results: ElgatoDevice[] = [];

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

export async function elgatoGetState(addr: string, port: number): Promise<any> {
	return httpGet(addr, port);
}

export async function elgatoSetState(addr: string, port: number, state: { on?: number; brightness?: number; temperature?: number }): Promise<any> {
	const current = await elgatoGetState(addr, port);
	const lights = current.lights.map((light: any) => ({
		...light,
		...(state.on !== undefined ? { on: state.on } : {}),
		...(state.brightness !== undefined ? { brightness: state.brightness } : {}),
		...(state.temperature !== undefined ? { temperature: state.temperature } : {}),
	}));
	return httpPut(addr, port, { numberOfLights: current.numberOfLights, lights });
}

export async function elgatoToggle(addr: string, port: number): Promise<any> {
	const current = await elgatoGetState(addr, port);
	const newOn = current.lights[0].on === 1 ? 0 : 1;
	return elgatoSetState(addr, port, { on: newOn });
}

export async function elgatoIncrBrightness(addr: string, port: number, delta: number): Promise<any> {
	const current = await elgatoGetState(addr, port);
	const newBrightness = Math.max(0, Math.min(100, current.lights[0].brightness + delta));
	return elgatoSetState(addr, port, { brightness: newBrightness });
}

function miredsToKelvin(m: number): number {
	return Math.round(1_000_000 / m);
}

function kelvinToMireds(k: number): number {
	return Math.round(1_000_000 / k);
}

export async function elgatoIncrTemperature(addr: string, port: number, delta: number): Promise<any> {
	const current = await elgatoGetState(addr, port);
	const currentK = miredsToKelvin(current.lights[0].temperature);
	const newK = Math.max(2900, Math.min(7000, currentK + delta));
	return elgatoSetState(addr, port, { temperature: kelvinToMireds(newK) });
}

export function elgatoCleanup() {
}
