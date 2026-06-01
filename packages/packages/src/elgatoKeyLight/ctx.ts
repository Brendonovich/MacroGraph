import { type OnEvent } from "@macrograph/runtime";
import { createSignal, onCleanup } from "solid-js";

import type { Events, ElgatoDevice } from "./index";

export type Ctx = ReturnType<typeof createCtx>;

function getBridge() {
	const api = typeof window !== "undefined" ? (window as any).electronAPI : null;
	return api?.elgatoKeyLight ?? null;
}

export function createCtx(onEvent: OnEvent<Events>) {
	const [state, setState] = createSignal<"idle" | "discovering" | "ready">("idle");
	const [devices, setDevices] = createSignal<Map<string, ElgatoDevice>>(new Map());

	let unlistenDeviceUpdate: (() => void) | null = null;
	let unlistenError: (() => void) | null = null;

	async function discover() {
		const bridge = getBridge();
		if (!bridge) return;

		setState("discovering");

		try {
			const result: ElgatoDevice[] = await bridge.discover();
			setDevices(new Map(result.map((d: ElgatoDevice) => [d.id, d])));
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
			"elgatoKeyLight:deviceUpdate",
			(devices: ElgatoDevice[]) => {
				setDevices(new Map(devices.map((d: ElgatoDevice) => [d.id, d])));
			},
		);

		unlistenError = window.electronAPI.onEvent("elgatoKeyLight:error", () => {});

		await bridge.startObserving();
		await discover();
		localStorage.setItem("elgatoKeyLight-was-observing", "true");
	}

	async function stopObserving() {
		const bridge = getBridge();
		if (bridge) await bridge.stopObserving();
		unlistenDeviceUpdate?.();
		unlistenError?.();
		localStorage.setItem("elgatoKeyLight-was-observing", "false");
	}

	if (localStorage.getItem("elgatoKeyLight-was-observing") === "true") {
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
