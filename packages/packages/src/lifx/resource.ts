import { type PropertyDef, createResourceType } from "@macrograph/runtime";
import type { Pkg } from ".";

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

export const LightDevice = createResourceType({
	name: "LIFX Light",
	sources: (pkg: Pkg) =>
		[...pkg.ctx!.devices().values()].map((device) => ({
			id: device.id,
			display: device.label || device.id,
			value: device,
		})),
});

export const lightDeviceProperty = {
	name: "Light",
	resource: LightDevice,
} satisfies PropertyDef;
