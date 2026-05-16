import { createEventListener } from "@solid-primitives/event-listener";
import { getRemoteShellMode } from "@macrograph/runtime";
import { createEffect, createResource, createSignal, on } from "solid-js";
import { createStore } from "solid-js/store";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
	const [hostMirrorMidi, setHostMirrorMidi] = createSignal<{
		inputs: string[];
		outputs: string[];
	} | null>(null);

	const [io, setIo] = createStore({
		inputs: [] as MIDIInput[],
		outputs: [] as MIDIOutput[],
	});

	const [access, accessActions] = createResource(async () => {
		if (getRemoteShellMode()) return null;
		try {
			return await navigator.requestMIDIAccess({ sysex: true });
		} catch {
			return null;
		}
	});

	createEffect(
		on(access, (access) => {
			if (!access) return;

			setIo({
				inputs: Array.from(access.inputs.values()),
				outputs: Array.from(access.outputs.values()),
			});

			createEventListener(access, "statechange", () => {
				setIo({
					inputs: Array.from(access.inputs.values()),
					outputs: Array.from(access.outputs.values()),
				});
			});
		}),
	);

	function requestAccess() {
		accessActions.refetch();
	}

	return {
		access,
		requestAccess,
		io,
		hostMirrorMidi,
		collectHostMirror() {
			return {
				inputs: io.inputs.map((i) => i.name),
				outputs: io.outputs.map((o) => o.name),
			};
		},
		applyHostMirror(data: unknown) {
			if (!getRemoteShellMode()) return;
			if (!data || typeof data !== "object") {
				setHostMirrorMidi(null);
				return;
			}
			const d = data as { inputs?: string[]; outputs?: string[] };
			setHostMirrorMidi({
				inputs: Array.isArray(d.inputs) ? d.inputs : [],
				outputs: Array.isArray(d.outputs) ? d.outputs : [],
			});
		},
		clearHostMirror() {
			if (!getRemoteShellMode()) return;
			setHostMirrorMidi(null);
		},
	};
}
