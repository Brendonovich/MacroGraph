import { Maybe } from "@macrograph/option";
import { ReactiveMap } from "@solid-primitives/map";
import { ApiClient } from "vtubestudio";
import { z } from "zod";

type Instance = { password: string | null } & {
	state: "disconnected" | "connecting" | "connected";
	client: ApiClient;
};

const VTS_INSTANCES = "vtube-studio-instances";

const INSTANCE_SCHEMA = z.object({
	url: z.string(),
	password: z.string().nullable(),
});

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
	const instances = new ReactiveMap<string, Instance>();

	function addInstance(url: string, password?: string | null) {
		removeInstance(url);

		const getInstance = () => instances.get(url);

		const client = new ApiClient({
			url,
			pluginName: "MacroGraph",
			pluginDeveloper: "MacroGraph Inc.",
			authTokenGetter: () => getInstance()?.password ?? null,
			authTokenSetter: async (p) => {
				const i = getInstance();
				if (!i) return;
				i.password = p;
				persistInstances();
			},
			webSocketFactory: (url) => {
				const ws = new WebSocket(url);
				ws.onerror = () => {
					const i = getInstance();
					if (!i) return;
					instances.set(url, { ...i, state: "disconnected" });
					client.disconnect();
				};
				return ws;
			},
		});

		client.on("connect", () => {
			const i = getInstance();
			if (!i) return;
			instances.set(url, { ...i, state: "connected" });
			persistInstances();
		});

		client.on("disconnect", () => {
			const i = getInstance();
			if (!i) return;
			instances.set(url, { ...i, state: "disconnected" });
			persistInstances();
		});

		const instance: Instance = {
			password: password ?? null,
			state: "connecting",
			client,
		};

		instances.set(url, instance);
		persistInstances();
	}

	function removeInstance(url: string) {
		const i = instances.get(url);
		if (!i) return;
		i.client.disconnect();
		instances.delete(url);
		persistInstances();
	}

	function persistInstances() {
		localStorage.setItem(
			VTS_INSTANCES,
			JSON.stringify(
				[...instances].map(([url, instance]) => ({
					url,
					password: instance.password,
				})),
			),
		);
	}

	Maybe(localStorage.getItem(VTS_INSTANCES)).mapAsync(async (jstr) => {
		const instances = z.array(INSTANCE_SCHEMA).parse(JSON.parse(jstr));

		for (const i of instances) {
			addInstance(i.url, i.password);
		}
	});

	return { instances, addInstance, removeInstance };
}
