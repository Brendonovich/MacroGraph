import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { type Ctx, createCtx } from "./ctx";
import { lightDeviceProperty } from "./resource";

export type { ElgatoDevice } from "./resource";
export type { Ctx } from "./ctx";

export type Events = {
	deviceDiscovered: {
		id: string;
		name: string;
		addr: string;
	};
};

export type Pkg = Package<Events, Ctx>;

function getBridge() {
	const api = typeof window !== "undefined" ? (window as any).electronAPI : null;
	return api?.elgatoKeyLight ?? null;
}

function miredsToKelvin(mireds: number): number {
	return Math.round(1_000_000 / mireds);
}

function kelvinToMireds(kelvin: number): number {
	return Math.round(1_000_000 / kelvin);
}

export function pkg() {
	const ctx = createCtx((e) => pkg.emitEvent(e));

	const pkg = new Package<Events>({
		name: "Elgato Key Light",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	pkg.registerResourceType(lightDeviceProperty.resource);

	const lightInfoStruct = pkg.createStruct("LightInfo", (s) => ({
		id: s.field("ID", t.string()),
		name: s.field("Name", t.string()),
		addr: s.field("Address", t.string()),
		port: s.field("Port", t.int()),
		on: s.field("On", t.bool()),
		brightness: s.field("Brightness", t.int()),
		kelvin: s.field("Temperature (Kelvin)", t.int()),
	}));

	pkg.createEventSchema({
		name: "Device Discovered",
		event: "deviceDiscovered",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				id: io.dataOutput({ id: "id", name: "Device ID", type: t.string() }),
				name: io.dataOutput({ id: "name", name: "Name", type: t.string() }),
				addr: io.dataOutput({ id: "addr", name: "Address", type: t.string() }),
			};
		},
		run({ ctx: runCtx, data, io }) {
			runCtx.setOutput(io.id, data.id);
			runCtx.setOutput(io.name, data.name);
			runCtx.setOutput(io.addr, data.addr);
			runCtx.exec(io.exec);
		},
	});

	pkg.createSchema({
		name: "Discover Key Lights",
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
			const mapped = await Promise.all(
				devices.map(async (d: any) => {
					try {
						const state = await bridge.getState({ addr: d.addr, port: d.port });
						const light = state.lights[0];
						return {
							id: d.id,
							name: d.name,
							addr: d.addr,
							port: d.port,
							on: light.on === 1,
							brightness: light.brightness,
							kelvin: miredsToKelvin(light.temperature),
						};
					} catch {
						return {
							id: d.id,
							name: d.name,
							addr: d.addr,
							port: d.port,
							on: false,
							brightness: 0,
							kelvin: 0,
						};
					}
				}),
			);
			runCtx.setOutput(io.lights, mapped);
		},
	});

	pkg.createSchema({
		name: "Set Key Light State",
		type: "exec",
		properties: { light: lightDeviceProperty },
		createIO({ io }) {
			return {
				on: io.dataInput({ id: "on", name: "On", type: t.bool() }),
				brightness: io.dataInput({ id: "brightness", name: "Brightness (0-100)", type: t.int() }),
				temperature: io.dataInput({ id: "temperature", name: "Temperature (Kelvin)", type: t.int() }),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx.getProperty(properties.light).expect("No light selected");
			const on = runCtx.getInput(io.on);
			const brightness = runCtx.getInput(io.brightness);
			const temperature = runCtx.getInput(io.temperature);
			const bridge = getBridge();
			if (!bridge) return;
			const state: any = {};
			if (on !== undefined) state.on = on ? 1 : 0;
			if (brightness !== undefined && brightness !== null) state.brightness = brightness;
			if (temperature !== undefined && temperature !== null) state.temperature = kelvinToMireds(temperature);
			await bridge.setState({ addr: device.addr, port: device.port, state });
		},
	});

	pkg.createSchema({
		name: "Get Key Light State",
		type: "exec",
		properties: { light: lightDeviceProperty },
		createIO({ io }) {
			return {
				on: io.dataOutput({ id: "on", name: "On", type: t.bool() }),
				brightness: io.dataOutput({ id: "brightness", name: "Brightness (0-100)", type: t.int() }),
				kelvin: io.dataOutput({ id: "kelvin", name: "Temperature (Kelvin)", type: t.int() }),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx.getProperty(properties.light).expect("No light selected");
			const bridge = getBridge();
			if (!bridge) return;
			const state = await bridge.getState({ addr: device.addr, port: device.port });
			if (!state || !state.lights || state.lights.length === 0) return;
			const light = state.lights[0];
			runCtx.setOutput(io.on, light.on === 1);
			runCtx.setOutput(io.brightness, light.brightness);
			runCtx.setOutput(io.kelvin, miredsToKelvin(light.temperature));
		},
	});

	pkg.createSchema({
		name: "Toggle Key Light",
		type: "exec",
		properties: { light: lightDeviceProperty },
		createIO({ io }) {
			return {
				on: io.dataOutput({ id: "on", name: "On", type: t.bool() }),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx.getProperty(properties.light).expect("No light selected");
			const bridge = getBridge();
			if (!bridge) return;
			const result = await bridge.toggle({ addr: device.addr, port: device.port });
			if (result && result.lights && result.lights.length > 0) {
				runCtx.setOutput(io.on, result.lights[0].on === 1);
			}
		},
	});

	pkg.createSchema({
		name: "Increment Brightness",
		type: "exec",
		properties: { light: lightDeviceProperty },
		createIO({ io }) {
			return {
				delta: io.dataInput({ id: "delta", name: "Delta", type: t.int() }),
				brightness: io.dataOutput({ id: "brightness", name: "Brightness", type: t.int() }),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx.getProperty(properties.light).expect("No light selected");
			const delta = runCtx.getInput(io.delta) ?? 0;
			const bridge = getBridge();
			if (!bridge) return;
			const result = await bridge.incrBrightness({ addr: device.addr, port: device.port, delta });
			if (result && result.lights && result.lights.length > 0) {
				runCtx.setOutput(io.brightness, result.lights[0].brightness);
			}
		},
	});

	pkg.createSchema({
		name: "Increment Temperature",
		type: "exec",
		properties: { light: lightDeviceProperty },
		createIO({ io }) {
			return {
				delta: io.dataInput({ id: "delta", name: "Delta (Kelvin)", type: t.int() }),
				kelvin: io.dataOutput({ id: "kelvin", name: "Temperature (Kelvin)", type: t.int() }),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx.getProperty(properties.light).expect("No light selected");
			const delta = runCtx.getInput(io.delta) ?? 0;
			const bridge = getBridge();
			if (!bridge) return;
			const state = await bridge.getState({ addr: device.addr, port: device.port });
			if (!state || !state.lights || state.lights.length === 0) return;
			const currentMireds = state.lights[0].temperature;
			const currentKelvin = miredsToKelvin(currentMireds);
			const newKelvin = Math.max(2900, Math.min(7000, currentKelvin + delta));
			const newMireds = kelvinToMireds(newKelvin);
			const result = await bridge.setState({ addr: device.addr, port: device.port, state: { temperature: newMireds } });
			if (result && result.lights && result.lights.length > 0) {
				runCtx.setOutput(io.kelvin, miredsToKelvin(result.lights[0].temperature));
			}
		},
	});

	pkg.createSchema({
		name: "Brightness to Percent",
		type: "pure",
		createIO({ io }) {
			return {
				brightness: io.dataInput({ id: "brightness", name: "Brightness (0-100)", type: t.int() }),
				percent: io.dataOutput({ id: "percent", name: "Percent (0-100)", type: t.float() }),
			};
		},
		run({ ctx: runCtx, io }) {
			const value = runCtx.getInput(io.brightness) ?? 0;
			runCtx.setOutput(io.percent, value);
		},
	});

	return pkg;
}
