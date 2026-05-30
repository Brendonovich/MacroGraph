import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";

export type AudioOutputDevice = {
	deviceId: string;
	label: string;
};

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
	const [devices, setDevices] = createStore<AudioOutputDevice[]>([]);

	async function refresh() {
		try {
			const all = await navigator.mediaDevices.enumerateDevices();
			let outputs = all.filter((d) => d.kind === "audiooutput");

			if (outputs.every((d) => !d.label)) {
				try {
					const stream = await navigator.mediaDevices.getUserMedia({
						audio: true,
					});
					stream.getTracks().forEach((t) => t.stop());
				} catch {}
				const retry = await navigator.mediaDevices.enumerateDevices();
				outputs = retry.filter((d) => d.kind === "audiooutput");
			}

			setDevices(
				outputs.map((d, i) => ({
					deviceId: d.deviceId,
					label: d.label || `Audio Output ${i + 1}`,
				})),
			);
		} catch {
			// enumerateDevices may not be available in all environments
		}
	}

	createEffect(() => {
		if (!navigator.mediaDevices) return;
		refresh();
		navigator.mediaDevices.addEventListener("devicechange", refresh);
		return () =>
			navigator.mediaDevices.removeEventListener("devicechange", refresh);
	});

	return { devices };
}
