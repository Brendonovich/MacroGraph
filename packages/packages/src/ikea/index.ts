import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { type Ctx, createCtx } from "./ctx";
import { lightDeviceProperty } from "./resource";

export type { IkeaDevice, LightCommand } from "./resource";
export type { ConnectionState, Ctx } from "./ctx";

export type Events = {
	lightStateChanged: {
		deviceId: number;
		deviceName: string;
		on: boolean;
		brightness: number;
		colorTemp: number;
		hexColor: string;
	};
};

export type Pkg = Package<Events, Ctx>;

export function pkg() {
	const ctx = createCtx((e) => pkg.emitEvent(e));

	const pkg = new Package<Events>({
		name: "IKEA",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	pkg.registerResourceType(lightDeviceProperty.resource);

	pkg.createEventSchema({
		name: "Light State Changed",
		event: "lightStateChanged",
		createIO({ io }) {
			return {
				exec: io.execOutput({ id: "exec" }),
				deviceName: io.dataOutput({
					id: "deviceName",
					name: "Device Name",
					type: t.string(),
				}),
				on: io.dataOutput({
					id: "on",
					name: "On",
					type: t.bool(),
				}),
				brightness: io.dataOutput({
					id: "brightness",
					name: "Brightness",
					type: t.int(),
				}),
				colorTemp: io.dataOutput({
					id: "colorTemp",
					name: "Color Temp",
					type: t.int(),
				}),
				hexColor: io.dataOutput({
					id: "hexColor",
					name: "Hex Color",
					type: t.string(),
				}),
			};
		},
		run({ ctx: runCtx, data, io }) {
			runCtx.setOutput(io.deviceName, data.deviceName);
			runCtx.setOutput(io.on, data.on);
			runCtx.setOutput(io.brightness, data.brightness);
			runCtx.setOutput(io.colorTemp, data.colorTemp);
			runCtx.setOutput(io.hexColor, data.hexColor);
			runCtx.exec(io.exec);
		},
	});

	function getBridge() {
		const api =
			typeof window !== "undefined" ? (window as any).electronAPI : null;
		return api?.ikea ?? null;
	}

	pkg.createSchema({
		name: "Set Light State",
		type: "exec",
		properties: {
			light: lightDeviceProperty,
		},
		createIO({ io }) {
			return {
				state: io.dataInput({
					id: "state",
					name: "State",
					type: t.bool(),
				}),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx
				.getProperty(properties.light)
				.expect("No light selected");
			const state = runCtx.getInput(io.state);
			const bridge = getBridge();
			if (!bridge) return;
			const host = ctx.host().toNullable();
			if (!host) return;
			await bridge.controlLight(host, device.id, { state });
		},
	});

	pkg.createSchema({
		name: "Set Brightness",
		type: "exec",
		properties: {
			light: lightDeviceProperty,
		},
		createIO({ io }) {
			return {
				brightness: io.dataInput({
					id: "brightness",
					name: "Brightness",
					type: t.int(),
				}),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx
				.getProperty(properties.light)
				.expect("No light selected");
			const brightness = runCtx.getInput(io.brightness);
			const bridge = getBridge();
			if (!bridge) return;
			const host = ctx.host().toNullable();
			if (!host) return;
			await bridge.controlLight(host, device.id, { dimmer: brightness });
		},
	});

	pkg.createSchema({
		name: "Set Color Temperature",
		type: "exec",
		properties: {
			light: lightDeviceProperty,
		},
		createIO({ io }) {
			return {
				colorTemp: io.dataInput({
					id: "colorTemp",
					name: "Color Temp (mireds)",
					type: t.int(),
				}),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx
				.getProperty(properties.light)
				.expect("No light selected");
			const colorTemp = runCtx.getInput(io.colorTemp);
			const bridge = getBridge();
			if (!bridge) return;
			const host = ctx.host().toNullable();
			if (!host) return;
			await bridge.controlLight(host, device.id, { colorTemp });
		},
	});

	pkg.createSchema({
		name: "Set Color",
		type: "exec",
		properties: {
			light: lightDeviceProperty,
		},
		createIO({ io }) {
			return {
				hexColor: io.dataInput({
					id: "hexColor",
					name: "Hex Color",
					type: t.string(),
				}),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx
				.getProperty(properties.light)
				.expect("No light selected");
			const hexColor = runCtx.getInput(io.hexColor);
			const bridge = getBridge();
			if (!bridge) return;
			const host = ctx.host().toNullable();
			if (!host) return;
			await bridge.controlLight(host, device.id, { hexColor });
		},
	});

	const lightStruct = pkg.createStruct("LightInfo", (s) => ({
		id: s.field("ID", t.int()),
		name: s.field("Name", t.string()),
		reachable: s.field("Reachable", t.bool()),
		on: s.field("On", t.bool()),
		brightness: s.field("Brightness", t.int()),
		colorTemp: s.field("Color Temp", t.int()),
		hexColor: s.field("Hex Color", t.string()),
	}));

	pkg.createSchema({
		name: "List Lights",
		type: "exec",
		createIO({ io }) {
			return {
				lights: io.dataOutput({
					id: "lights",
					name: "Lights",
					type: t.list(t.struct(lightStruct)),
				}),
			};
		},
		run({ ctx: runCtx, io }) {
			const lights = [...ctx.devices().values()]
				.filter((d) => d.deviceType === "light")
				.map((d) => ({
					id: d.id,
					name: d.name,
					reachable: d.reachable,
					on: d.lightState?.on ?? false,
					brightness: d.lightState?.brightness ?? 0,
					colorTemp: d.lightState?.colorTemp ?? 0,
					hexColor: d.lightState?.hexColor ?? "",
				}));
			runCtx.setOutput(io.lights, lights);
		},
	});

	pkg.createSchema({
		name: "Get Light State",
		type: "exec",
		properties: {
			light: lightDeviceProperty,
		},
		createIO({ io }) {
			return {
				deviceName: io.dataOutput({
					id: "deviceName",
					name: "Device Name",
					type: t.string(),
				}),
				on: io.dataOutput({
					id: "on",
					name: "On",
					type: t.bool(),
				}),
				brightness: io.dataOutput({
					id: "brightness",
					name: "Brightness",
					type: t.int(),
				}),
				colorTemp: io.dataOutput({
					id: "colorTemp",
					name: "Color Temp",
					type: t.int(),
				}),
				hexColor: io.dataOutput({
					id: "hexColor",
					name: "Hex Color",
					type: t.string(),
				}),
				reachable: io.dataOutput({
					id: "reachable",
					name: "Reachable",
					type: t.bool(),
				}),
			};
		},
		async run({ ctx: runCtx, io, properties }) {
			const device = runCtx
				.getProperty(properties.light)
				.expect("No light selected");
			const bridge = getBridge();
			const host = ctx.host().toNullable();
			const fresh =
				bridge && host
					? await bridge.getDevice(host, device.id).catch(() => device)
					: device;
			runCtx.setOutput(io.deviceName, fresh.name);
			runCtx.setOutput(io.on, fresh.lightState?.on ?? false);
			runCtx.setOutput(io.brightness, fresh.lightState?.brightness ?? 0);
			runCtx.setOutput(io.colorTemp, fresh.lightState?.colorTemp ?? 0);
			runCtx.setOutput(io.hexColor, fresh.lightState?.hexColor ?? "");
			runCtx.setOutput(io.reachable, fresh.reachable);
		},
	});

	return pkg;
}
