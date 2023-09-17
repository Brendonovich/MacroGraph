import { z } from "zod";

export const EVENT = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("donation"),
    message: z.tuple([
      z.object({
        name: z.string(),
        amount: z.coerce.number(),
        currency: z.string(),
        formattedAmount: z.string(),
        message: z.string(),
        from: z.string(),
        fromId: z.string(),
      }),
    ]),
  }),
  z.object({
    type: z.literal("subscription"),
    message: z.tuple([
      z.object({
        name: z.string(),
        months: z.coerce.number(),
        message: z.string(),
        membershipLevelName: z.string(),
      }),
    ]),
  }),
  z.object({
    for: z.literal("youtube_account"),
    type: z.literal("superchat"),
    message: z.tuple([
      z.object({
        name: z.string(),
        currency: z.string(),
        displayString: z.string(),
        amount: z.string(),
        comment: z.string(),
      }),
    ]),
  }),
  z.object({
    for: z.literal("youtube_account"),
    type: z.literal("membershipGift"),
    message: z.tuple([
      z
        .object({
          id: z.string(),
          name: z.string(),
          channelUrl: z.string(),
          _id: z.string(),
          event_id: z.string(),
        })
        .and(
          z.union([
            z.object({
              sponsorSince: z.string(),
              membershipLevelName: z.string(),
              message: z.string().nullable(),
              youtubeMembershipGiftId: z.string(),
            }),
            z.object({
              giftMembershipsLevelName: z.string(),
              giftMembershipsCount: z.number(),
              membershipMessageId: z.string(),
            }),
          ])
        ),
    ]),
  }),
]);

export type Event = EventsToObject<z.infer<typeof EVENT>>;

type EventsToObject<T extends { type: string; message: [any] }> = {
  [K in T["type"]]: Extract<T, { type: K }>["message"][0];
};

type EventToKey<T extends object> = T extends {
  type: infer Type extends string;
}
  ? T extends { for: infer For extends string }
    ? `${For}.${Type}`
    : `${Type}`
  : never;
