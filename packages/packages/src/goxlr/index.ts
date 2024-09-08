import { Package } from "@macrograph/runtime";

import { createCtx } from "./ctx";
import * as events from "./events";
import * as sends from "./sends";
import { createTypes } from "./types";

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
  effects: {
    dial: string;
    amount: number;
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

  const types = createTypes(pkg);

  events.register(pkg);
  sends.register(pkg, ctx, types);

  return pkg;
}
