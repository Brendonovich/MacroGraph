import { type OnEvent } from "@macrograph/runtime";
import { createSignal, onCleanup } from "solid-js";

import type { Events, LifxDevice } from "./index";

export type Ctx = ReturnType<typeof createCtx>;

function getBridge() {
	const api =
		typeof window !== "undefined" ? (window as any).electronAPI : null;
	return api?.lifx ?? null;
}

export function createCtx(onEvent: OnEvent<Events>) {
	const [state, setState] = createSignal<"idle" | "discovering" | "ready">("idle");
	const [devices, setDevices] = createSignal<Map<string, LifxDevice>>(new Map());

	let unlistenDeviceUpdate: (() => void) | null = null;
	let unlistenError: (() => void) | null = null;
	let prevDevices = new Map<string, LifxDevice>();

	async function discover() {
		const bridge = getBridge();
		if (!bridge) return;

		setState("discovering");

		try {
			const result: LifxDevice[] = await bridge.discover();
			processDeviceUpdate(result);
			setState("ready");
		} catch {
			setState("idle");
		}
	}

	function processDeviceUpdate(updated: LifxDevice[]) {
		const next = new Map(updated.map((d: LifxDevice) => [d.id, d]));
		setDevices(next);

		for (const device of updated) {
			const prev = prevDevices.get(device.id);
			if (
				prev &&
				(prev.power !== device.power ||
				 prev.brightness !== device.brightness ||
				 prev.hue !== device.hue ||
				 prev.saturation !== device.saturation ||
				 prev.kelvin !== device.kelvin)
			) {
				onEvent({
					name: "lightStateChanged",
					data: {
						id: device.id,
						label: device.label,
						power: device.power > 0,
						brightness: Math.round((device.brightness / 65535) * 100),
						hue: Math.round((device.hue / 65535) * 360),
						saturation: Math.round((device.saturation / 65535) * 100),
						kelvin: device.kelvin,
					},
				});
			}
		}

		prevDevices = next;
	}

	async function startObserving() {
		const bridge = getBridge();
		if (!bridge) return;

		unlistenDeviceUpdate?.();
		unlistenError?.();

		unlistenDeviceUpdate = window.electronAPI.onEvent(
			"lifx:deviceUpdate",
			(devices: LifxDevice[]) => {
				processDeviceUpdate(devices);
			},
		);

		unlistenError = window.electronAPI.onEvent(
			"lifx:error",
			(message: string) => {},
		);

		await bridge.startObserving();
		await discover();
		localStorage.setItem("lifx-was-observing", "true");
	}

	async function stopObserving() {
		const bridge = getBridge();
		if (bridge) await bridge.stopObserving();
		unlistenDeviceUpdate?.();
		unlistenError?.();
		localStorage.setItem("lifx-was-observing", "false");
	}

	if (localStorage.getItem("lifx-was-observing") === "true") {
		startObserving();
	}

	onCleanup(() => {
		stopObserving();
		const bridge = getBridge();
		if (bridge) bridge.cleanup().catch(() => {});
	});

	return {
		state,
		devices,
		discover,
		startObserving,
		stopObserving,
	};
}
