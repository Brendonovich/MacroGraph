import { None, Some, makePersistedOption } from "@macrograph/option";
import { type OnEvent, getRemoteShellMode } from "@macrograph/runtime";
import { createSignal, onCleanup } from "solid-js";

import type { Events, IkeaDevice } from "./index";

export type ConnectionState =
	| { type: "disconnected" }
	| { type: "connecting" }
	| { type: "connected"; host: string }
	| { type: "error"; message: string };

export type Ctx = ReturnType<typeof createCtx>;

function getBridge() {
	const api =
		typeof window !== "undefined" ? (window as any).electronAPI : null;
	return api?.ikea ?? null;
}

export function createCtx(onEvent: OnEvent<Events>) {
	const [host, setHost] = makePersistedOption<string>(
		createSignal(None),
		"ikea-host",
	);

	const [securityCode, setSecurityCode] = makePersistedOption<string>(
		createSignal(None),
		"ikea-security-code",
	);

	const [state, setState] = createSignal<ConnectionState>({
		type: "disconnected",
	});

	const [devices, setDevices] = createSignal<Map<number, IkeaDevice>>(
		new Map(),
	);

	let unlistenDeviceUpdate: (() => void) | null = null;
	let unlistenError: (() => void) | null = null;

	async function connect() {
		const h = host();
		const code = securityCode();
		if (h.isNone() || code.isNone()) return;

		const bridge = getBridge();
		if (!bridge) {
			setState({ type: "error", message: "IKEA bridge not available in this environment" });
			return;
		}

		setState({ type: "connecting" });

		unlistenDeviceUpdate?.();
		unlistenError?.();

		unlistenDeviceUpdate = window.electronAPI.onEvent(
			"ikea:deviceUpdate",
			([eventHost, device]: [string, IkeaDevice]) => {
				if (eventHost !== h.unwrap()) return;
				setDevices((prev) => {
					const next = new Map(prev);
					next.set(device.id, device);
					return next;
				});
				if (device.deviceType === "light" && device.lightState) {
					onEvent({
						name: "lightStateChanged",
						data: {
							deviceId: device.id,
							deviceName: device.name,
							on: device.lightState.on,
							brightness: device.lightState.brightness,
							colorTemp: device.lightState.colorTemp ?? 0,
							hexColor: device.lightState.hexColor ?? "",
						},
					});
				}
			},
		);

		unlistenError = window.electronAPI.onEvent(
			"ikea:error",
			([eventHost, error]: [string, string]) => {
				if (eventHost !== h.unwrap()) return;
				setState({ type: "error", message: error });
			},
		);

		try {
			const result = await bridge.connect(h.unwrap(), code.unwrap());
			setState({ type: "connected", host: h.unwrap() });
			const deviceList: IkeaDevice[] = result.devices ?? [];
			setDevices(new Map(deviceList.map((d: IkeaDevice) => [d.id, d])));
			bridge.startObserving(h.unwrap()).catch(() => {});
			localStorage.setItem("ikea-was-connected", "true");
		} catch (err: any) {
			setState({
				type: "error",
				message: err.message ?? String(err),
			});
		}
	}

	async function disconnect() {
		const h = host();
		if (h.isNone()) return;

		const bridge = getBridge();
		if (bridge) {
			try { await bridge.disconnect(h.unwrap()); } catch {}
		}
		setState({ type: "disconnected" });
		setDevices(new Map());
		localStorage.setItem("ikea-was-connected", "false");
	}

	if (localStorage.getItem("ikea-was-connected") === "true") {
		connect();
	}

	onCleanup(() => {
		unlistenDeviceUpdate?.();
		unlistenError?.();
		const bridge = getBridge();
		if (bridge) {
			const h = host();
			if (h.isSome()) bridge.disconnect(h.unwrap()).catch(() => {});
		}
	});

	return {
		host,
		setHost,
		securityCode,
		setSecurityCode,
		state,
		devices,
		connect,
		disconnect,
	};
}
