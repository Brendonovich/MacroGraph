import { Maybe } from "@macrograph/option";
import OBS, { EventSubscription } from "obs-websocket-js";
import { createSignal } from "solid-js";
import { z } from "zod";

const OBS_WS = "obsWs";

export const AUTH_SCHEMA = z.object({
	url: z.string().url(),
	password: z.string().optional(),
});

export function createWs() {
	const obs = new OBS();

	const [state, setState] = createSignal<
		"disconnected" | "connecting" | "connected"
	>("disconnected");

	const disconnect = async () => {
		setState("disconnected");
		await obs.disconnect();
	};

	const connect = async (url: string, password?: string) => {
		await disconnect();

		await obs.connect(url, password, {
			eventSubscriptions:
				EventSubscription.All |
				EventSubscription.SceneItemTransformChanged |
				EventSubscription.InputActiveStateChanged |
				EventSubscription.InputShowStateChanged,
		});

		localStorage.setItem(OBS_WS, JSON.stringify({ url, password }));

		setState("connected");
	};

	obs.on("ConnectionClosed", () => setState("disconnected"));
	obs.on("ConnectionError", () => setState("disconnected"));

	Maybe(localStorage.getItem(OBS_WS)).mapAsync(async (jstr) => {
		const { url, password } = AUTH_SCHEMA.parse(JSON.parse(jstr));

		try {
			await connect(url, password);
		} catch {
			localStorage.removeItem(OBS_WS);
		}
	});

	return { connect, disconnect, state, obs };
}
