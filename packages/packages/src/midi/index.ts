import { Package } from "@macrograph/runtime";

import { createCtx, Ctx } from "./ctx";

import * as resources from "./resource";
import * as events from "./events";
import * as requests from "./requests";

export type Pkg = Package<{}, Ctx>;

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

  const pkg = new Package<{}, Ctx>({
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
