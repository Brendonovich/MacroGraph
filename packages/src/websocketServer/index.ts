import { Package, WsProvider, t } from "@macrograph/core";

import { createCtx } from "./ctx";

export function pkg<TServer>(ws: WsProvider<TServer>) {
  const ctx = createCtx(ws, (e) => pkg.emitEvent(e));

  const pkg = new Package({
    name: "WebSocket Server",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  pkg.createNonEventSchema({
    name: "WSS Emit",
    variant: "Exec",
    generateIO({ io }) {
      return {
        port: io.dataInput({
          id: "port",
          name: "WS port",
          type: t.int(),
        }),
        data: io.dataInput({
          id: "data",
          name: "Data",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ws.sendMessage({
        port: ctx.getInput(io.port),
        data: ctx.getInput(io.data),
      });
    },
  });

  pkg.createEventSchema({
    event: "wsEvent",
    name: "WSS Event",
    generateIO({ io }) {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        port: io.dataOutput({
          id: "port",
          name: "WS Port",
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
      ctx.setOutput(io.port, data.port);
      ctx.setOutput(io.data, data.data);
      ctx.exec(io.exec);
    },
  });

  return pkg;
}
