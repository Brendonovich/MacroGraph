import {
	getRemoteShellMode,
	registerWebviewReloadCleanup,
	type ObsNativeBridge,
} from "@macrograph/runtime";

import { requestHostMirrorSync } from "../hostMirror/sync";
import { Maybe } from "@macrograph/option";
import { parseJsonWithContext } from "@macrograph/runtime-serde";
import { ReactiveMap } from "@solid-primitives/map";
import OBS, { EventSubscription } from "obs-websocket-js";
import { createSignal } from "solid-js";
import * as v from "valibot";

import { NativeObsClient } from "./nativeClient";

type ObsSocket = OBS | NativeObsClient;

type InstanceState = { password: string | null } & (
	| { state: "disconnected" | "connecting" }
	| { state: "connected"; obs: ObsSocket }
);

const OBS_INSTANCES = "obs-instances";
const INSTANCE_SCHEMA = v.object({
	url: v.string(),
	password: v.nullable(v.string()),
});

export function createCtx(obsNative?: ObsNativeBridge) {
	const instances = new ReactiveMap<string, InstanceState>();
	const eventUnsubs = new Map<string, () => void>();
	const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
	let reloading = false;

	const [hostMirrorRows, setHostMirrorRows] = createSignal<
		Array<{ url: string; state: string; hasPassword: boolean }>
	>([]);

	async function addInstance(ip: string, password?: string | null) {
		if (getRemoteShellMode()) return;
		await disconnectInstance(ip);

		instances.set(ip, { state: "connecting", password: password ?? null });
		persistInstances();

		await connectInstance(ip);
	}

	async function connectInstance(ip: string) {
		const maybeInstance = instances.get(ip);
		if (!maybeInstance) return;

		const instance = maybeInstance;
		function setDisconnected() {
			if (obsNative) {
				void obsNative.disconnect({ url: ip });
			}
			eventUnsubs.get(ip)?.();
			eventUnsubs.delete(ip);

			instances.set(ip, {
				state: "disconnected",
				password: instance.password,
			});
			requestHostMirrorSync();

			if (reloading) return;
			const prev = reconnectTimers.get(ip);
			if (prev !== undefined) clearTimeout(prev);
			reconnectTimers.set(
				ip,
				setTimeout(() => {
					reconnectTimers.delete(ip);
					if (reloading || !instances.has(ip)) return;
					void connectInstance(ip);
				}, 10_000),
			);
		}

		if (obsNative) {
			const obs = new NativeObsClient(obsNative, ip);
			obs.on("ConnectionClosed", setDisconnected);
			obs.on("ConnectionError", setDisconnected);
			try {
				await obsNative.connect({
					url: ip,
					password: instance.password,
				});
			} catch {
				setDisconnected();
				return;
			}
			if (!instances.has(ip)) {
				void obsNative.disconnect({ url: ip });
				return;
			}
			const unsub = obsNative.subscribeEvents(ip, (msg) => {
				if (msg.lifecycle === "closed" || msg.lifecycle === "not_connected") {
					obs.emit("ConnectionClosed");
				} else if (msg.eventType) {
					(obs as any).emit(msg.eventType, msg.eventData);
				}
			});
			eventUnsubs.set(ip, unsub);
			instances.set(ip, { state: "connected", obs, password: instance.password });
			persistInstances();
			return;
		}

		const obs = new OBS();

		try {
			await obs.connect(ip, instance.password ?? undefined, {
				eventSubscriptions:
					EventSubscription.All |
					EventSubscription.SceneItemTransformChanged |
					EventSubscription.InputActiveStateChanged |
					EventSubscription.InputShowStateChanged,
			});
		} catch {
			setDisconnected();
			return;
		}

		if (!instances.has(ip)) {
			await obs.disconnect();
			return;
		}

		obs.on("ConnectionClosed", setDisconnected);
		obs.on("ConnectionError", setDisconnected);

		instances.set(ip, { state: "connected", obs, password: instance.password });
		persistInstances();
	}

	async function disconnectInstance(ip: string) {
		const instance = instances.get(ip);
		if (!instance) return;
		if (instance.state !== "connected") return;

		instances.set(ip, { state: "disconnected", password: instance.password });
		eventUnsubs.get(ip)?.();
		eventUnsubs.delete(ip);
		await instance.obs.disconnect();
	}

	async function removeInstance(ip: string) {
		await disconnectInstance(ip);
		instances.delete(ip);
		eventUnsubs.delete(ip);
		persistInstances();
	}

	async function shutdownAll() {
		reloading = true;
		for (const t of reconnectTimers.values()) {
			clearTimeout(t);
		}
		reconnectTimers.clear();
		for (const ip of [...instances.keys()]) {
			eventUnsubs.get(ip)?.();
			eventUnsubs.delete(ip);
			const inst = instances.get(ip);
			if (inst?.state === "connected") {
				await inst.obs.disconnect();
			}
			if (inst) {
				instances.set(ip, {
					state: "disconnected",
					password: inst.password,
				});
			}
		}
		if (obsNative?.disconnectAll) {
			await obsNative.disconnectAll();
		}
	}

	async function bootstrapFromStorage() {
		if (getRemoteShellMode()) return;
		await shutdownAll();
		const jstr = localStorage.getItem(OBS_INSTANCES);
		if (!jstr) {
			reloading = false;
			return;
		}
		const rows = parseJsonWithContext(
			"packages/obs createCtx: localStorage key obs-instances",
			v.array(INSTANCE_SCHEMA),
			jstr,
		);
		reloading = false;
		for (const i of rows) {
			instances.set(i.url, {
				state: "disconnected",
				password: i.password,
			});
		}
		for (const i of rows) {
			await addInstance(i.url, i.password);
		}
	}

	registerWebviewReloadCleanup(() => shutdownAll());
	void bootstrapFromStorage();

	function persistInstances() {
		if (reloading) return;
		localStorage.setItem(
			OBS_INSTANCES,
			JSON.stringify(
				[...instances].map(([url, instance]) => ({
					url,
					password: instance.password,
				})),
			),
		);
		requestHostMirrorSync();
	}

	return {
		instances,
		hostMirrorRows,
		addInstance,
		connectInstance,
		disconnectInstance,
		removeInstance,
		collectHostMirror() {
			return [...instances].map(([url, inst]) => ({
				url,
				state: inst.state,
				hasPassword: inst.password != null && inst.password !== "",
			}));
		},
		applyHostMirror(data: unknown) {
			if (!getRemoteShellMode()) return;
			if (!Array.isArray(data)) {
				setHostMirrorRows([]);
				return;
			}
			setHostMirrorRows(
				data
					.filter(
						(r): r is { url: string; state: string; hasPassword?: boolean } =>
							typeof r === "object" &&
							r !== null &&
							typeof (r as { url?: unknown }).url === "string" &&
							typeof (r as { state?: unknown }).state === "string",
					)
					.map((r) => ({
						url: r.url,
						state: r.state,
						hasPassword: Boolean(r.hasPassword),
					})),
			);
		},
		clearHostMirror() {
			if (!getRemoteShellMode()) return;
			setHostMirrorRows([]);
		},
	};
}

export type Ctx = ReturnType<typeof createCtx>;
