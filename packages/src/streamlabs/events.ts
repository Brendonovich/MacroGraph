import { z } from "zod";

export const STREAMLABS_EVENT = z.discriminatedUnion("type", [
  z.object({
    message: z.array(
      z.object({
        name: z.string(),
        amount: z.coerce.number(),
        currency: z.string(),
        formattedAmount: z.string(),
        message: z.string(),
        from: z.string(),
        fromId: z.string(),
      })
    ),
    type: z.literal("donation"),
  }),
  z.object({
    message: z.array(
      z.object({
        name: z.string(),
        months: z.coerce.number(),
        message: z.string(),
        membershipLevelName: z.string(),
      })
    ),
    type: z.literal("subscription"),
  }),
  z.object({
    message: z.array(
      z.object({
        name: z.string(),
        currency: z.string(),
        displayString: z.string(),
        amount: z.string(),
        comment: z.string(),
      })
    ),
    type: z.literal("superchat"),
  }),
  z.object({
    message: z.array(
      z.object({
        name: z.string(),
        currency: z.string(),
        displayString: z.string(),
        amount: z.string(),
        comment: z.string(),
      })
    ),
    type: z.literal("membershipGift"),
  }),
]);

export const EVENT = STREAMLABS_EVENT;

export type Event = EventsToObject<z.infer<typeof STREAMLABS_EVENT>>;

type EventsToObject<T extends object> = T extends {
  message: any[];
}
  ? { [key in EventToKey<T>]: T["message"][number] }
  : never;

type EventToKey<T extends object> = T extends {
  type: infer Type extends string;
}
  ? T extends { for: infer For extends string }
    ? `${For}.${Type}`
    : `${Type}`
  : never;
