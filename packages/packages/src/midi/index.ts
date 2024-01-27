import { Package } from "@macrograph/runtime";

import { createCtx, Ctx } from "./ctx";

export type Pkg = Package<{}, Ctx>;

export function pkg(): Pkg {
  const ctx = createCtx();

  const pkg = new Package<{}, Ctx>({
    name: "MIDI",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  return pkg;
}
