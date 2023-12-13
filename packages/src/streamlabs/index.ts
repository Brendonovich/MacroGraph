import { Core, Package, t } from "@macrograph/core";

import { createCtx } from "./ctx";
import { Event } from "./events";

export type Events = {
  donation: Event["donation"];
  subscription: Event["subscription"];
  superchat: Event["superchat"];
  membershipGift: Extract<Event["membershipGift"], { message?: any }>;
  membershipGiftStart: Extract<
    Event["membershipGift"],
    { giftMembershipsCount?: any }
  >;
};

export function pkg(core: Core) {
  const ctx = createCtx(core, (e) => pkg.emitEvent(e));

  const pkg = new Package<Events>({
    name: "Streamlabs",
    ctx,
    SettingsUI: () => import("./Settings"),
  });

  pkg.createEventSchema({
    name: "Youtube Membership",
    event: "subscription",
    generateIO({ io }) {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        name: io.dataOutput({
          name: "Name",
          id: "name",
          type: t.string(),
        }),
        months: io.dataOutput({
          name: "Months",
          id: "months",
          type: t.float(),
        }),
        message: io.dataOutput({
          name: "Message",
          id: "message",
          type: t.string(),
        }),
        membershipLevelName: io.dataOutput({
          name: "Membership Level Name",
          id: "membershipLevelName",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.name, data.name ?? "");
      ctx.setOutput(io.months, data.months ?? 0);
      ctx.setOutput(io.message, data.message ?? "");
      ctx.setOutput(io.membershipLevelName, data.membershipLevelName ?? "");
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Youtube Membership Giftee",
    event: "membershipGift",
    generateIO({ io }) {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        name: io.dataOutput({
          name: "Name",
          id: "name",
          type: t.string(),
        }),
        membershipLevelName: io.dataOutput({
          name: "Membership Level Name",
          id: "membershipLevelName",
          type: t.string(),
        }),
        membershipGiftId: io.dataOutput({
          name: "Membership Gift ID",
          id: "membershipGiftId",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.name, data.name ?? "");
      ctx.setOutput(io.membershipLevelName, data.membershipLevelName ?? "");
      ctx.setOutput(io.membershipGiftId, data.youtubeMembershipGiftId ?? "");
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Youtube Membership Gifter",
    event: "membershipGiftStart",
    generateIO({ io }) {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        name: io.dataOutput({
          name: "Name",
          id: "name",
          type: t.string(),
        }),
        giftMembershipsLevelName: io.dataOutput({
          name: "Membership Level Name",
          id: "giftMembershipsLevelName",
          type: t.string(),
        }),
        giftMembershipsCount: io.dataOutput({
          name: "Membership Count",
          id: "giftMembershipsCount",
          type: t.int(),
        }),
        membershipMessageId: io.dataOutput({
          name: "Membership Gift ID",
          id: "membershipMessageId",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.name, data.name ?? "");
      ctx.setOutput(
        io.giftMembershipsLevelName,
        data.giftMembershipsLevelName ?? ""
      );
      ctx.setOutput(io.membershipMessageId, data.membershipMessageId ?? "");
      ctx.setOutput(
        io.giftMembershipsCount,
        Number(data.giftMembershipsCount ?? "0")
      );
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Streamlabs Donation",
    event: "donation",
    generateIO({ io }) {
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
        formattedAmount: io.dataOutput({
          name: "Formatted Amount",
          id: "formattedAmount",
          type: t.string(),
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
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.name, data.name ?? "");
      ctx.setOutput(io.amount, data.amount ?? 0);
      ctx.setOutput(io.formattedAmount, data.formattedAmount ?? "");
      ctx.setOutput(io.message, data.message ?? "");
      ctx.setOutput(io.currency, data.currency ?? "");
      ctx.setOutput(io.from, data.from ?? "");

      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    name: "Youtube Superchat",
    event: "superchat",
    generateIO({ io }) {
      return {
        exec: io.execOutput({
          id: "exec",
        }),
        name: io.dataOutput({
          name: "Name",
          id: "name",
          type: t.string(),
        }),
        currency: io.dataOutput({
          name: "Currency",
          id: "currency",
          type: t.string(),
        }),
        displayString: io.dataOutput({
          name: "Display String",
          id: "displayString",
          type: t.string(),
        }),
        amount: io.dataOutput({
          name: "Amount",
          id: "amount",
          type: t.string(),
        }),
        comment: io.dataOutput({
          name: "Comment",
          id: "comment",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.name, data.name ?? "");
      ctx.setOutput(io.currency, data.currency ?? "");
      ctx.setOutput(io.displayString, data.displayString ?? "");
      ctx.setOutput(io.amount, data.amount ?? "");
      ctx.setOutput(io.comment, data.comment ?? "");
      ctx.exec(io.exec);
    },
  });

  return pkg;
}
