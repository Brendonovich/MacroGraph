import { Core, Package, t } from "@macrograph/core";
import { createEffect, createSignal } from "solid-js";

import { createCtx } from "./ctx";
import { Event } from "./events";

export function pkg(core: Core) {
  const [latestEvent, setLatestEvent] = createSignal<any | null>(null);

  const pkg = new Package<Event>({
    name: "Streamlabs",
    ctx: createCtx(core, setLatestEvent),
    SettingsUI: () => import("./Settings"),
  });

  createEffect(() => {
    const event = latestEvent();

    if (!event) return;

    pkg.emitEvent(event);
  });

  pkg.createEventSchema({
    name: "Streamlabs Donation",
    event: "donation",
    generateIO(io) {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        name: io.dataOutput({
          name: "Name",
          id: "name",
          type: t.string(),
        }),
        amount: io.dataOutput({
          name: "Amount",
          id: "amount",
          type: t.float(),
        }),
        message: io.dataOutput({
          name: "Message",
          id: "message",
          type: t.string(),
        }),
        currency: io.dataOutput({
          name: "Currency",
          id: "currency",
          type: t.string(),
        }),
        from: io.dataOutput({
          name: "From",
          id: "from",
          type: t.string(),
        }),
        fromId: io.dataOutput({
          name: "From User Id",
          id: "fromId",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.name, data.name);
      ctx.setOutput(io.amount, data.amount);
      ctx.setOutput(io.message, data.message);
      ctx.setOutput(io.currency, data.currency);
      ctx.setOutput(io.from, data.from);
      ctx.setOutput(io.fromId, data.fromId);

      ctx.exec(io.exec);
    },
  });

  return pkg;
}
