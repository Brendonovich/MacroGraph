import type { ObsNativeBridge } from "@macrograph/runtime";
import { Maybe } from "@macrograph/option";
import { parseJsonWithContext } from "@macrograph/runtime-serde";
import { ReactiveMap } from "@solid-primitives/map";
import OBS, { EventSubscription } from "obs-websocket-js";
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

	async function addInstance(ip: string, password?: string | null) {
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

			setTimeout(() => {
				console.log("disconnect running");
				connectInstance(ip);
			}, 10000);
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

	Maybe(localStorage.getItem(OBS_INSTANCES)).mapAsync(async (jstr) => {
		const instances = parseJsonWithContext(
			"packages/obs createCtx: localStorage key obs-instances",
			v.array(INSTANCE_SCHEMA),
			jstr,
		);

		for (const i of instances) {
			addInstance(i.url, i.password);
		}
	});

	function persistInstances() {
		localStorage.setItem(
			OBS_INSTANCES,
			JSON.stringify(
				[...instances].map(([url, instance]) => ({
					url,
					password: instance.password,
				})),
			),
		);
	}

	return {
		instances,
		addInstance,
		connectInstance,
		disconnectInstance,
		removeInstance,
	};
}

export type Ctx = ReturnType<typeof createCtx>;
