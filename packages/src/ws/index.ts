import { Core, Package, t, Maybe, createEnum } from "@macrograph/core";
import { ReactiveMap } from "@solid-primitives/map";
import { createCtx } from "./ctx";
import { createEffect, createSignal } from "solid-js";

export function pkg(core: Core) {
  const [latestEvent, setLatestEvent] = createSignal<any | null>(null);

  const sockets = createCtx(setLatestEvent);

  const pkg = new Package({
    name: "Websocket",
    ctx: sockets,
    SettingsUI: () => import("./settings"),
  });

  createEffect(() => {
    const data = latestEvent();

    if (!data) return;

    pkg.emitEvent({ name: "wsEvent", data });
  });

  pkg.createNonEventSchema({
    name: "WS Emit",
    variant: "Exec",
    generateIO(io) {
      return {
        ip: io.dataInput({
          id: "ip",
          name: "WS IP",
          type: t.string(),
        }),
        data: io.dataInput({
          id: "data",
          name: "Data",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      let ws = sockets.websockets.get(ctx.getInput(io.ip));
      ws?.send(ctx.getInput(io.data));
    },
  });

  pkg.createEventSchema({
    event: "wsEvent",
    name: "WS Event",
    generateIO(io) {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        ip: io.dataOutput({
          id: "ip",
          name: "WS IP",
          type: t.string(),
        }),
        data: io.dataOutput({
          id: "data",
          name: "Data",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.ip, data.ip);
      ctx.setOutput(io.data, data.data);
      ctx.exec(io.exec);
    },
  });

  return pkg;
}
