import { Package } from "@macrograph/core";
import { createEffect, createSignal } from "solid-js";

import * as events from "./events";
import * as sends from "./sends";
import { createCtx } from "./ctx";

type Event = {
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
  const [latestEvent, setLatestEvent] = createSignal<any>();

  const ctx = createCtx(setLatestEvent);

  const pkg = new Package<Event>({
    name: "GoXLR",
    ctx,
    settingsUI: () => import("./Settings"),
  });

  createEffect(() => {
    const event = latestEvent();
    if (!event) return;

    pkg.emitEvent(event);
  });

  events.register(pkg);
  sends.register(pkg, ctx);

  return pkg;
}
