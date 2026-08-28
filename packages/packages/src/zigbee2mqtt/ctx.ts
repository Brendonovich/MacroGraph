import { None, Some, makePersistedOption } from "@macrograph/option";
import { type OnEvent } from "@macrograph/runtime";
import { createSignal, onCleanup } from "solid-js";
import type { Events } from "./index";

export type ConnectionState =
	| { type: "disconnected" }
	| { type: "connecting" }
	| { type: "connected" }
	| { type: "error"; message: string };

export type Ctx = ReturnType<typeof createCtx>;

function getBridge() {
	const api =
		typeof window !== "undefined" ? (window as any).electronAPI : null;
	return api?.zigbee2mqtt ?? null;
}

function getOnEvent() {
	const api =
		typeof window !== "undefined" ? (window as any).electronAPI : null;
	return api?.onEvent ?? null;
}

export function createCtx(onEvent: OnEvent<Events>) {
	const [serialPort, setSerialPort] = makePersistedOption<string>(
		createSignal(None),
		"zigbee-serial-port",
	);

	const [adapter, setAdapter] = makePersistedOption<string>(
		createSignal(Some("zstack")),
		"zigbee-adapter",
	);

	const [mqttPort, setMqttPort] = makePersistedOption<number>(
		createSignal(Some(1886)),
		"zigbee-mqtt-port",
	);

	const [frontendPort, setFrontendPort] = makePersistedOption<number>(
		createSignal(Some(8080)),
		"zigbee-frontend-port",
	);

	const [state, setState] = createSignal<ConnectionState>({
		type: "disconnected",
	});

	let unlistenMessage: (() => void) | null = null;
	let unlistenLog: (() => void) | null = null;
	let unlistenError: (() => void) | null = null;

	function listenForEvents() {
		const onEventFn = getOnEvent();
		if (!onEventFn) return;

		unlistenMessage = onEventFn(
			"mqtt:message",
			(data: { topic: string; payload: string }) => {
				const topic = data.topic;
				const payload = data.payload;

				if (!topic.startsWith("zigbee2mqtt/")) return;

				if (topic === "zigbee2mqtt/bridge/state") {
					return;
				}

				if (topic === "zigbee2mqtt/bridge/event") {
					try {
						const parsed = JSON.parse(payload);
						if (parsed.type === "device_joined") {
							onEvent({ name: "deviceEvent", data: { type: "joined", data: parsed } });
						} else if (parsed.type === "device_leave") {
							onEvent({ name: "deviceEvent", data: { type: "left", data: parsed } });
						} else if (parsed.type === "device_interview") {
							onEvent({ name: "deviceEvent", data: { type: "interview", data: parsed } });
						}
					} catch {}
					return;
				}

				const deviceTopic = topic.replace("zigbee2mqtt/", "");
				if (!deviceTopic.includes("/")) {
					try {
						const parsed = JSON.parse(payload);
						onEvent({
							name: "deviceMessage",
							data: {
								device: deviceTopic,
								payload: payload,
								json: parsed,
							},
						});
					} catch {
						onEvent({
							name: "deviceMessage",
							data: { device: deviceTopic, payload, json: null },
						});
					}
				}
			},
		);

		unlistenLog = onEventFn(
			"zigbee2mqtt:log",
			(data: { message: string }) => {
				console.log("[Zigbee2MQTT]", data.message);
			},
		);

		unlistenError = onEventFn(
			"zigbee2mqtt:error",
			(data: { error: string }) => {
				setState({ type: "error", message: data.error });
			},
		);
	}

	async function connect() {
		const bridge = getBridge();
		if (!bridge) {
			setState({
				type: "error",
				message: "Zigbee2MQTT not available (not in Electron?)",
			});
			return;
		}

		const port = serialPort();
		if (port.isNone()) {
			setState({ type: "error", message: "No serial port configured" });
			return;
		}

		setState({ type: "connecting" });

		try {
			const result = await bridge.start({
				serialPort: port.unwrap(),
				adapter: adapter().unwrapOr("zstack"),
				mqttPort: mqttPort().unwrapOr(1886),
				frontendPort: frontendPort().toNullable(),
			});

			if (!result.success) {
				setState({ type: "error", message: result.error });
				return;
			}

			listenForEvents();
			setState({ type: "connected" });
			localStorage.setItem("zigbee-was-connected", "true");
		} catch (err: any) {
			setState({ type: "error", message: err.message ?? String(err) });
		}
	}

	async function disconnect() {
		unlistenMessage?.();
		unlistenMessage = null;
		unlistenLog?.();
		unlistenLog = null;
		unlistenError?.();
		unlistenError = null;

		const bridge = getBridge();
		if (bridge) {
			try {
				await bridge.stop();
			} catch {}
		}
		setState({ type: "disconnected" });
		localStorage.setItem("zigbee-was-connected", "false");
	}

	async function publish(topic: string, message: string) {
		const bridge = getBridge();
		if (!bridge) throw new Error("Zigbee2MQTT not available");
		await bridge.publish(topic, message);
	}

	if (localStorage.getItem("zigbee-was-connected") === "true") {
		connect();
	}

	onCleanup(() => {
		disconnect();
	});

	return {
		serialPort,
		setSerialPort,
		adapter,
		setAdapter,
		mqttPort,
		setMqttPort,
		frontendPort,
		setFrontendPort,
		state,
		connect,
		disconnect,
		publish,
	};
}
