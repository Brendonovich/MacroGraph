import { createEventListener } from "@solid-primitives/event-listener";
import { createEffect, createResource, on } from "solid-js";
import { createStore } from "solid-js/store";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
	const [io, setIo] = createStore({
		inputs: [] as MIDIInput[],
		outputs: [] as MIDIOutput[],
	});

	const [access, accessActions] = createResource(async () => {
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

	return { access, requestAccess, io };
}
