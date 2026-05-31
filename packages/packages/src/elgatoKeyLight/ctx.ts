console.warn("[ElgatoKeyLight] ctx.ts module loaded");

import { type OnEvent } from "@macrograph/runtime";
import { createSignal, onCleanup } from "solid-js";

import type { Events, ElgatoDevice } from "./index";

export type Ctx = ReturnType<typeof createCtx>;

function getBridge() {
	const api = typeof window !== "undefined" ? (window as any).electronAPI : null;
	const bridge = api?.elgatoKeyLight ?? null;
	console.log("[ElgatoKeyLight] getBridge() =>", bridge ? "found" : "null");
	return bridge;
}

export function createCtx(onEvent: OnEvent<Events>) {
	const [state, setState] = createSignal<"idle" | "discovering" | "ready">("idle");
	const [devices, setDevices] = createSignal<Map<string, ElgatoDevice>>(new Map());

	let unlistenDeviceUpdate: (() => void) | null = null;
	let unlistenError: (() => void) | null = null;

	async function discover() {
		console.log("[ElgatoKeyLight] discover() called");
		const bridge = getBridge();
		if (!bridge) {
			console.log("[ElgatoKeyLight] discover() - no bridge, aborting");
			return;
		}

		setState("discovering");
		console.log("[ElgatoKeyLight] discover() - calling bridge.discover()");

		try {
			const result: ElgatoDevice[] = await bridge.discover();
			console.log("[ElgatoKeyLight] discover() - result:", JSON.stringify(result));
			setDevices(new Map(result.map((d: ElgatoDevice) => [d.id, d])));
			setState("ready");
			console.log("[ElgatoKeyLight] discover() - done, state=ready, devices=", result.length);
		} catch (e) {
			console.log("[ElgatoKeyLight] discover() - error:", e);
			setState("idle");
		}
	}

	async function startObserving() {
		console.log("[ElgatoKeyLight] startObserving() called");
		const bridge = getBridge();
		if (!bridge) {
			console.log("[ElgatoKeyLight] startObserving() - no bridge, aborting");
			return;
		}

		unlistenDeviceUpdate?.();
		unlistenError?.();

		unlistenDeviceUpdate = window.electronAPI.onEvent(
			"elgatoKeyLight:deviceUpdate",
			(devices: ElgatoDevice[]) => {
				console.log("[ElgatoKeyLight] deviceUpdate event received:", devices?.length, "devices");
				setDevices(new Map(devices.map((d: ElgatoDevice) => [d.id, d])));
			},
		);

		unlistenError = window.electronAPI.onEvent("elgatoKeyLight:error", (_message: string) => {
			console.log("[ElgatoKeyLight] error event:", _message);
		});

		console.log("[ElgatoKeyLight] startObserving() - calling bridge.startObserving()");
		await bridge.startObserving();
		console.log("[ElgatoKeyLight] startObserving() - now calling discover()");
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
