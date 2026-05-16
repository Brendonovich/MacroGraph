import { Maybe } from "@macrograph/option";
import { getRemoteShellMode } from "@macrograph/runtime";
import { parseJsonWithContext } from "@macrograph/runtime-serde";
import OBS, { EventSubscription } from "obs-websocket-js";
import { createSignal } from "solid-js";
import * as v from "valibot";

const OBS_WS = "obsWs";

export const AUTH_SCHEMA = v.object({
	url: v.pipe(v.string(), v.url()),
	password: v.optional(v.string()),
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
		if (getRemoteShellMode()) return;
		const { url, password } = parseJsonWithContext(
			"packages/obs createWs: localStorage key obsWs (OBS auth JSON)",
			AUTH_SCHEMA,
			jstr,
		);

		try {
			await connect(url, password);
		} catch {
			localStorage.removeItem(OBS_WS);
		}
	});

	return { connect, disconnect, state, obs };
}
