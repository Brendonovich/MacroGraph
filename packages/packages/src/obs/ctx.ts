import { Maybe } from "@macrograph/option";
import { ReactiveMap } from "@solid-primitives/map";
import OBS, { EventSubscription } from "obs-websocket-js";
import { z } from "zod";

type InstanceState = { password: string | null } & (
	| { state: "disconnected" | "connecting" }
	| { state: "connected"; obs: OBS }
);

const OBS_INSTANCES = "obs-instances";
const INSTANCE_SCHEMA = z.object({
	url: z.string(),
	password: z.string().optional(),
});

export function createCtx() {
	const instances = new ReactiveMap<string, InstanceState>();

	async function addInstance(ip: string, password?: string) {
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
			instances.set(ip, {
				state: "disconnected",
				password: instance.password,
			});

			setTimeout(() => {
				console.log("disconnect running");
				connectInstance(ip);
			}, 10000);
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
		await instance.obs.disconnect();
	}

	async function removeInstance(ip: string) {
		instances.delete(ip);
		persistInstances();
		await disconnectInstance(ip);
	}

	Maybe(localStorage.getItem(OBS_INSTANCES)).mapAsync(async (jstr) => {
		const instances = z.array(INSTANCE_SCHEMA).parse(JSON.parse(jstr));

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
