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

	async function discover() {
		const bridge = getBridge();
		if (!bridge) return;

		setState("discovering");

		try {
			const result: LifxDevice[] = await bridge.discover();
			setDevices(new Map(result.map((d: LifxDevice) => [d.id, d])));
			setState("ready");
		} catch {
			setState("idle");
		}
	}

	async function startObserving() {
		const bridge = getBridge();
		if (!bridge) return;

		unlistenDeviceUpdate?.();
		unlistenError?.();

		unlistenDeviceUpdate = window.electronAPI.onEvent(
			"lifx:deviceUpdate",
			(devices: LifxDevice[]) => {
				setDevices(new Map(devices.map((d: LifxDevice) => [d.id, d])));
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
