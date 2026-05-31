import * as http from "node:http";
import { networkInterfaces } from "node:os";

function log(...args) {
	console.log("[TEST]", ...args);
}

function probeDevice(addr, port = 9123) {
	return new Promise((resolve) => {
		const req = http.get(`http://${addr}:${port}/elgato/lights`, { timeout: 2000 }, (res) => {
			let data = "";
			res.on("data", (chunk) => (data += chunk));
			res.on("end", () => {
				try {
					const parsed = JSON.parse(data);
					if (parsed && parsed.lights && parsed.numberOfLights > 0) {
						log(`>>> FOUND at ${addr}:${port} — ${JSON.stringify(parsed)}`);
						resolve({ id: `${addr}:${port}`, name: `Elgato Key Light (${addr})`, addr, port });
					} else {
						resolve(null);
					}
				} catch { resolve(null); }
			});
		});
		req.on("error", () => resolve(null));
		req.on("timeout", () => { req.destroy(); resolve(null); });
	});
}

function getLocalSubnets() {
	const subnets = new Set();
	const nets = networkInterfaces();
	for (const name of Object.keys(nets)) {
		for (const net of nets[name] ?? []) {
			if (net.family === "IPv4" && !net.internal) {
				const parts = net.address.split(".");
				subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
			}
		}
	}
	return [...subnets];
}

async function scanSubnet(subnet, port = 9123) {
	log(`Scanning ${subnet}.0/24...`);
	const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
	const results = await Promise.all(ips.map((ip) => probeDevice(ip, port)));
	const found = results.filter(Boolean);
	if (found.length > 0) log(`Found ${found.length} device(s) in ${subnet}.0/24`);
	return found;
}

async function main() {
	log("=== Elgato Key Light Subnet Scanner ===\n");

	const subnets = getLocalSubnets();
	log("Local subnets:", subnets);

	const allFound = [];
	for (const subnet of subnets) {
		const found = await scanSubnet(subnet);
		allFound.push(...found);
	}

	log(`\n=== RESULT: ${allFound.length} device(s) found ===`);
	for (const d of allFound) {
		log(`  ${d.name} @ ${d.addr}:${d.port}`);
	}

	process.exit(allFound.length > 0 ? 0 : 1);
}

main().catch((e) => {
	console.error("[TEST] Fatal:", e);
	process.exit(1);
});
