import { Package } from "@macrograph/runtime";

import { type Ctx, createCtx } from "./ctx";

import * as events from "./events";
import * as requests from "./requests";
import * as resources from "./resource";

export type Pkg = Package<Record<string, never>, Ctx>;

export const STATUS_BYTES = {
	noteOff: 0x8,
	noteOn: 0x9,
	polyphonicAftertouch: 0xa,
	controlChange: 0xb,
	programChange: 0xc,
	channelAftertouch: 0xd,
	pitchBend: 0xe,
};

export function pkg(): Pkg {
	const ctx = createCtx();

	const pkg: Pkg = new Package({
		name: "MIDI",
		ctx,
		SettingsUI: () => import("./Settings"),
	});

	pkg.registerResourceType(resources.MIDIInput);
	pkg.registerResourceType(resources.MIDIOutput);

	events.register(pkg);
	requests.register(pkg);

	return pkg;
}
