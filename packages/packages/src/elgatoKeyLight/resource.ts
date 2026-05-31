import { type PropertyDef, createResourceType } from "@macrograph/runtime";
import type { Pkg } from ".";

export interface ElgatoDevice {
	id: string;
	name: string;
	addr: string;
	port: number;
}

export const LightDevice = createResourceType({
	name: "Elgato Key Light",
	sources: (pkg: Pkg) =>
		[...pkg.ctx!.devices().values()].map((device) => ({
			id: device.id,
			display: device.name || device.id,
			value: device,
		})),
});

export const lightDeviceProperty = {
	name: "Light",
	resource: LightDevice,
} satisfies PropertyDef;
