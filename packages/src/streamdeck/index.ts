import { Package } from "@macrograph/core";

import { createCtx, WsProvider } from "./ctx";

export function pkg(ws: WsProvider) {
  const ctx = createCtx(ws);

  const pkg = new Package({
    name: "Streamdeck",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  return pkg;
}
