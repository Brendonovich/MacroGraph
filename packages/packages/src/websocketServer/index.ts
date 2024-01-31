import { Package, WsProvider } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

import { createCtx } from "./ctx";

export function pkg<TServer>(ws: WsProvider<TServer>) {
  const ctx = createCtx(ws, (e) => pkg.emitEvent(e));

  const pkg = new Package({
    name: "WebSocket Server",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  pkg.createEventSchema({
    name: "WSS Client Connected",
    event: "WSSConnect",
    createIO({ io }) {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        port: io.dataOutput({
          id: "port",
          name: "Port",
          type: t.int(),
        }),
        client: io.dataOutput({
          id: "client",
          name: "Client",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io, data }) {
      ctx.setOutput(io.port, data.port);
      ctx.setOutput(io.client, data.client);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "WSS Client Disconnected",
    event: "WSSDisconnect",
    createIO({ io }) {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        port: io.dataOutput({
          id: "port",
          name: "Port",
          type: t.int(),
        }),
        client: io.dataOutput({
          id: "client",
          name: "Client",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io, data }) {
      ctx.setOutput(io.port, data.port);
      ctx.setOutput(io.client, data.client);
      ctx.exec(io.exec);
    },
  });

  pkg.createNonEventSchema({
    name: "WSS Emit",
    variant: "Exec",
    createIO({ io }) {
      return {
        port: io.dataInput({
          id: "port",
          name: "Port",
          type: t.int(),
        }),
        client: io.dataInput({
          id: "client",
          name: "Client",
          type: t.option(t.int()),
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
        client: ctx.getInput(io.client).toNullable(),
        data: ctx.getInput(io.data),
      });
    },
  });

  pkg.createEventSchema({
    event: "wsEvent",
    name: "WSS Event",
    createIO({ io }) {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        port: io.dataOutput({
          id: "port",
          name: "Port",
          type: t.int(),
        }),
        client: io.dataOutput({
          id: "client",
          name: "Client",
          type: t.int(),
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
      ctx.setOutput(io.client, data.client);
      ctx.setOutput(io.data, data.data);
      ctx.exec(io.exec);
    },
  });

  return pkg;
}
