import { z } from "zod";

export const STREAMLABS_DONATION = z.object({
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
});

export const EVENT = STREAMLABS_DONATION;

export type Event = EventsToObject<z.infer<typeof STREAMLABS_DONATION>>;

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
