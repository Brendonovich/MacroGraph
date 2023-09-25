import { Core, Package } from "@macrograph/core";

import { createCtx } from "./ctx";

export function pkg(core: Core) {
  const pkg = new Package({
    name: "Spotify",
    ctx: createCtx(core),
    SettingsUI: () => import("./Settings"),
  });

  return pkg;
}
