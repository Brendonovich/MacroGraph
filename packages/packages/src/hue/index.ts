import { Core, Package } from "@macrograph/runtime";
import { createCtx } from "./ctx";

export function pkg(core: Core) {
  const ctx = createCtx(core);

  const pkg = new Package({
    name: "Hue",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  return pkg;
}
