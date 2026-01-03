import { createResourceType, type PropertyDef } from "@macrograph/runtime";

import type { Pkg } from ".";

export const MIDIInput = createResourceType({
	name: "MIDI Input",
	sources: (pkg: Pkg) =>
		[...pkg.ctx!.io.inputs].map((input) => ({
			id: input.id,
			display: input.name ?? "",
			value: input,
		})),
});

export const midiInputProperty = {
	name: "MIDI Input",
	resource: MIDIInput,
} satisfies PropertyDef;

export const MIDIOutput = createResourceType({
	name: "MIDI Output",
	sources: (pkg: Pkg) =>
		[...pkg.ctx!.io.outputs].map((output) => ({
			id: output.id,
			display: output.name ?? "",
			value: output,
		})),
});

export const midiOutputProperty = {
	name: "MIDI Output",
	resource: MIDIOutput,
} satisfies PropertyDef;
