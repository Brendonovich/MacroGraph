import { Package, t } from "@macrograph/core";

import { createCtx } from "./ctx";

export function pkg() {
  const sockets = createCtx((data) => pkg.emitEvent({ name: "wsEvent", data }));

  const pkg = new Package({
    name: "Websocket",
    ctx: sockets,
    SettingsUI: () => import("./settings"),
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
