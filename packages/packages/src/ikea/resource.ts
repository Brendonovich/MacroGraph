import { type PropertyDef, createResourceType } from "@macrograph/runtime";
import type { Pkg } from ".";

export interface LightCommand {
	state?: boolean;
	dimmer?: number;
	colorTemp?: number;
	hexColor?: string;
	transitionTime?: number;
}

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

export const LightDevice = createResourceType({
	name: "IKEA Light",
	sources: (pkg: Pkg) =>
		[...pkg.ctx!.devices().values()]
			.filter((d) => d.deviceType === "light")
			.map((device) => ({
				id: String(device.id),
				display: device.name,
				value: device,
			})),
});

export const lightDeviceProperty = {
	name: "Light",
	resource: LightDevice,
} satisfies PropertyDef;
