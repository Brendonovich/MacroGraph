import { Package } from "@macrograph/core";

import * as sends from "./sends";

import { createCtx } from "./ctx";

export type Pkg = ReturnType<typeof pkg>;

export function pkg() {
  const ctx = createCtx();

  const pkg = new Package<Event>({
    name: "ChatGPT",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  sends.register(pkg, ctx);

  return pkg;
}
