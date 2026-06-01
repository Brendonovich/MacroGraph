import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { type Ctx, createCtx } from "./ctx";
import { lightDeviceProperty } from "./resource";

export type { LifxDevice } from "./resource";
export type { Ctx } from "./ctx";

export type Events = {
	lightStateChanged: {
		id: string;
		label: string;
		power: boolean;
		brightness: number;
		hue: number;
		saturation: number;
		kelvin: number;
	};
};

export type Pkg = Package<Events, Ctx>;

function getBridge() {
	const api =
		typeof window !== "undefined" ? (window as any).electronAPI : null;
	return api?.lifx ?? null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const cleaned = hex.replace("#", "").trim();
	if (cleaned.length !== 6 && cleaned.length !== 3) return null;
	const full = cleaned.length === 3
		? cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2]
		: cleaned;
	const num = Number.parseInt(full, 16);
	if (Number.isNaN(num)) return null;
	return {
		r: (num >> 16) & 255,
		g: (num >> 8) & 255,
		b: num & 255,
	};
}

function rgbToHsb(r: number, g: number, b: number): { hue: number; saturation: number; brightness: number } {
	const rf = r / 255, gf = g / 255, bf = b / 255;
	const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
	const d = max - min;

	let hue = 0;
	if (d !== 0) {
		if (max === rf) hue = ((gf - bf) / d + (gf < bf ? 6 : 0)) * 60;
		else if (max === gf) hue = ((bf - rf) / d + 2) * 60;
		else hue = ((rf - gf) / d + 4) * 60;
	}

	return {
		hue: Math.round(hue),
		saturation: max === 0 ? 0 : Math.round((d / max) * 100),
		brightness: Math.round(max * 100),
	};
}

function hsToRgb(hue: number, saturation: number): string {
	const h = (hue / 65535) * 360;
	const s = saturation / 65535;
	const c = s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = 0;
	let r = 0, g = 0, b = 0;

	if (h < 60) { r = c; g = x; }
	else if (h < 120) { r = x; g = c; }
	else if (h < 180) { g = c; b = x; }
	else if (h < 240) { g = x; b = c; }
	else if (h < 300) { r = x; b = c; }
	else { r = c; b = x; }

	const toHex = (v: number) =>
		Math.round((v + m) * 255).toString(16).padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function pkg() {
	const ctx = createCtx((e) => pkg.emitEvent(e));

	const pkg = new Package<Events>({
		name: "LIFX",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	pkg.registerResourceType(lightDeviceProperty.resource);

	const lightInfoStruct = pkg.createStruct("LightInfo", (s) => ({
		id: s.field("ID", t.string()),
		label: s.field("Label", t.string()),
		addr: s.field("Address", t.string()),
		power: s.field("Power", t.bool()),
		brightness: s.field("Brightness", t.int()),
		hue: s.field("Hue", t.int()),
		saturation: s.field("Saturation", t.int()),
		kelvin: s.field("Kelvin", t.int()),
	}));

	pkg.createEventSchema({
		name: "Device Discovered",
		event: "deviceDiscovered",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				id: io.dataOutput({ id: "id", name: "Device ID", type: t.string() }),
				label: io.dataOutput({ id: "label", name: "Label", type: t.string() }),
				addr: io.dataOutput({ id: "addr", name: "Address", type: t.string() }),
			};
		},
		run({ ctx: runCtx, data, io }) {
			runCtx.setOutput(io.id, data.id);
			runCtx.setOutput(io.label, data.label);
			runCtx.setOutput(io.addr, data.addr);
			runCtx.exec(io.exec);
		},
	});

	pkg.createSchema({
		name: "Discover Lights",
		type: "exec",
		createIO({ io }) {
			return {
				lights: io.dataOutput({
					id: "lights",
					name: "Lights",
					type: t.list(t.struct(lightInfoStruct)),
				}),
			};
		},
		async run({ ctx: runCtx, io }) {
			const bridge = getBridge();
			if (!bridge) return;
			const devices = await bridge.discover();
			const mapped = devices.map((d: any) => ({
				id: d.id,
				label: d.label,
				addr: d.addr,
				power: d.power > 0,
				brightness: Math.round((d.brightness / 65535) * 100),
				hue: d.hue,
				saturation: d.saturation,
				kelvin: d.kelvin,
			}));
			runCtx.setOutput(io.lights, mapped);
		},
	});

	pkg.createSchema({
		name: "Set Light Power",
		type: "exec",
		properties: { light: lightDeviceProperty },
		createIO({ io }) {
			return {
				state: io.dataInput({ id: "state", name: "On", type: t.bool() }),
				duration: io.dataInput({ id: "duration", name: "Duration (ms)", type: t.int() }),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx.getProperty(properties.light).expect("No light selected");
			const state = runCtx.getInput(io.state);
			const duration = runCtx.getInput(io.duration) ?? 0;
			const bridge = getBridge();
			if (!bridge) return;
			await bridge.setPower({ target: device.id, addr: device.addr, port: device.port, level: state, duration });
		},
	});

	pkg.createSchema({
		name: "Set Light Color",
		type: "exec",
		properties: { light: lightDeviceProperty },
		createIO({ io }) {
			return {
				brightness: io.dataInput({ id: "brightness", name: "Brightness (0-100)", type: t.int() }),
				hue: io.dataInput({ id: "hue", name: "Hue (0-360)", type: t.int() }),
				saturation: io.dataInput({ id: "saturation", name: "Saturation (0-100)", type: t.int() }),
				kelvin: io.dataInput({ id: "kelvin", name: "Kelvin (2500-9000)", type: t.int() }),
				duration: io.dataInput({ id: "duration", name: "Duration (ms)", type: t.int() }),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx.getProperty(properties.light).expect("No light selected");
			const brightness = (runCtx.getInput(io.brightness) ?? 100) / 100 * 65535;
			const hue = (runCtx.getInput(io.hue) ?? 0) / 360 * 65535;
			const saturation = (runCtx.getInput(io.saturation) ?? 0) / 100 * 65535;
			const kelvin = runCtx.getInput(io.kelvin) ?? 3500;
			const duration = runCtx.getInput(io.duration) ?? 0;
			const bridge = getBridge();
			if (!bridge) return;
			await bridge.setColor({ target: device.id, addr: device.addr, port: device.port, color: { hue, saturation, brightness, kelvin }, duration });
		},
	});

	pkg.createSchema({
		name: "Set Brightness",
		type: "exec",
		properties: { light: lightDeviceProperty },
		createIO({ io }) {
			return {
				brightness: io.dataInput({ id: "brightness", name: "Brightness (0-100)", type: t.int() }),
				duration: io.dataInput({ id: "duration", name: "Duration (ms)", type: t.int() }),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx.getProperty(properties.light).expect("No light selected");
			const brightness = (runCtx.getInput(io.brightness) ?? 100) / 100 * 65535;
			const duration = runCtx.getInput(io.duration) ?? 0;
			const bridge = getBridge();
			if (!bridge) return;
			await bridge.setColor({ target: device.id, addr: device.addr, port: device.port, color: { brightness }, duration });
		},
	});

	pkg.createSchema({
		name: "Set Kelvin",
		type: "exec",
		properties: { light: lightDeviceProperty },
		createIO({ io }) {
			return {
				kelvin: io.dataInput({ id: "kelvin", name: "Kelvin (2500-9000)", type: t.int() }),
				duration: io.dataInput({ id: "duration", name: "Duration (ms)", type: t.int() }),
				brightness: io.dataInput({ id: "brightness", name: "Brightness (0-100)", type: t.int() }),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx.getProperty(properties.light).expect("No light selected");
			const kelvin = runCtx.getInput(io.kelvin) ?? 3500;
			const brightness = (runCtx.getInput(io.brightness) ?? 100) / 100 * 65535;
			const duration = runCtx.getInput(io.duration) ?? 0;
			const bridge = getBridge();
			if (!bridge) return;
			await bridge.setColor({ target: device.id, addr: device.addr, port: device.port, color: { brightness, kelvin, saturation: 0 }, duration });
		},
	});

	pkg.createSchema({
		name: "Get Light State",
		type: "exec",
		properties: { light: lightDeviceProperty },
		createIO({ io }) {
			return {
				label: io.dataOutput({ id: "label", name: "Label", type: t.string() }),
				power: io.dataOutput({ id: "power", name: "Power", type: t.bool() }),
				brightness: io.dataOutput({ id: "brightness", name: "Brightness (0-100)", type: t.int() }),
				hue: io.dataOutput({ id: "hue", name: "Hue (0-360)", type: t.int() }),
				saturation: io.dataOutput({ id: "saturation", name: "Saturation (0-100)", type: t.int() }),
				kelvin: io.dataOutput({ id: "kelvin", name: "Kelvin", type: t.int() }),
				hex: io.dataOutput({ id: "hex", name: "Hex Color", type: t.string() }),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx.getProperty(properties.light).expect("No light selected");
			const bridge = getBridge();
			if (!bridge) return;
			const state = await bridge.getState({ target: device.id, addr: device.addr, port: device.port });
			if (!state) return;
			runCtx.setOutput(io.label, state.label);
			runCtx.setOutput(io.power, state.power > 0);
			runCtx.setOutput(io.brightness, Math.round((state.brightness / 65535) * 100));
			runCtx.setOutput(io.hue, Math.round((state.hue / 65535) * 360));
			runCtx.setOutput(io.saturation, Math.round((state.saturation / 65535) * 100));
			runCtx.setOutput(io.kelvin, state.kelvin);
			runCtx.setOutput(io.hex, hsToRgb(state.hue, state.saturation));
		},
	});

	pkg.createSchema({
		name: "Hex to Color",
		type: "exec",
		createIO({ io }) {
			return {
				hex: io.dataInput({ id: "hex", name: "Hex Color", type: t.string() }),
				hue: io.dataOutput({ id: "hue", name: "Hue (0-360)", type: t.int() }),
				saturation: io.dataOutput({ id: "saturation", name: "Saturation (0-100)", type: t.int() }),
				brightness: io.dataOutput({ id: "brightness", name: "Brightness (0-100)", type: t.int() }),
				lifxHue: io.dataOutput({ id: "lifxHue", name: "LIFX Hue", type: t.int() }),
				lifxSaturation: io.dataOutput({ id: "lifxSaturation", name: "LIFX Saturation", type: t.int() }),
				lifxBrightness: io.dataOutput({ id: "lifxBrightness", name: "LIFX Brightness", type: t.int() }),
			};
		},
		run({ ctx: runCtx, io }) {
			const hex = runCtx.getInput(io.hex);
			const rgb = hexToRgb(hex);
			if (!rgb) return;
			const hsb = rgbToHsb(rgb.r, rgb.g, rgb.b);
			runCtx.setOutput(io.hue, hsb.hue);
			runCtx.setOutput(io.saturation, hsb.saturation);
			runCtx.setOutput(io.brightness, hsb.brightness);
			runCtx.setOutput(io.lifxHue, Math.round((hsb.hue / 360) * 65535));
			runCtx.setOutput(io.lifxSaturation, Math.round((hsb.saturation / 100) * 65535));
			runCtx.setOutput(io.lifxBrightness, Math.round((hsb.brightness / 100) * 65535));
		},
	});

	return pkg;
}
