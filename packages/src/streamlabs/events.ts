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

export const YOUTUBE_MEMBERSHIP = z.object({
  message: z.array(
    z.object({
      name: z.string(),
      months: z.coerce.number(),
      message: z.string(),
      membershipLevelName: z.string(),
    })
  ),
  type: z.literal("subscription"),
});

export const SUPERCHAT = z.object({
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
});

export const MEMBERSHIP = YOUTUBE_MEMBERSHIP;

export const DONATION = STREAMLABS_DONATION;

export type Membership = EventsToObject<z.infer<typeof YOUTUBE_MEMBERSHIP>>;

export type Superchat = EventsToObject<z.infer<typeof SUPERCHAT>>;

export type Donation = EventsToObject<z.infer<typeof STREAMLABS_DONATION>>;

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
