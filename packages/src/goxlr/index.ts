import { Package } from "@macrograph/core";

import * as events from "./events";
import * as sends from "./sends";
import { createCtx } from "./ctx";

export type Event = {
  levelsChange: {
    channel: string;
    value: number;
  };
  buttonDown: {
    buttonName: string;
    state: boolean;
  };
  faderStatus: {
    channel: string;
    state: boolean;
  };
};

export type Pkg = ReturnType<typeof pkg>;

export function pkg() {
  const ctx = createCtx((e) => pkg.emitEvent(e));

  const pkg = new Package<Event>({
    name: "GoXLR",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  events.register(pkg);
  sends.register(pkg, ctx);

  return pkg;
}
