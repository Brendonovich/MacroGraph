import { Core, Package } from "@macrograph/runtime";
import { createCtx } from "./ctx";
import * as api from "./api";

export function pkg(core: Core) {
  const ctx = createCtx(core);

  const pkg = new Package({
    name: "Hue",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  api.register(pkg, ctx);
  return pkg;
}
