import { z } from "zod";

export const EVENT = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("donation"),
    message: z.tuple([
      z.object({
        name: z.string().nullable().optional(),
        amount: z.coerce.number().nullable().optional(),
        currency: z.string().nullable().optional(),
        formattedAmount: z.string().nullable().optional(),
        message: z.string().nullable().optional(),
        from: z.string().nullable().optional(),
        fromId: z.string().nullable().optional(),
      }),
    ]),
  }),
  z.object({
    for: z.literal("youtube_account"),
    type: z.literal("subscription"),
    message: z.tuple([
      z.object({
        name: z.string().nullable().optional(),
        months: z.coerce.number().nullable().optional(),
        message: z.string().nullable().optional(),
        membershipLevelName: z.string().nullable().optional(),
      }),
    ]),
  }),
  z.object({
    for: z.literal("youtube_account"),
    type: z.literal("superchat"),
    message: z.tuple([
      z.object({
        name: z.string().nullable().optional(),
        currency: z.string().nullable().optional(),
        displayString: z.string().nullable().optional(),
        amount: z.string().nullable().optional(),
        comment: z.string().nullable().optional(),
      }),
    ]),
  }),
  z.object({
    for: z.literal("youtube_account"),
    type: z.literal("membershipGift"),
    message: z.tuple([
      z
        .object({
          name: z.string().nullable().optional(),
          channelUrl: z.string().nullable().optional(),
        })
        .and(
          z.union([
            z.object({
              giftMembershipsLevelName: z.string().nullable().optional(),
              giftMembershipsCount: z.coerce.number().nullable().optional(),
              membershipMessageId: z.string().nullable().optional(),
            }),
            z.object({
              membershipLevelName: z.string().nullable().optional(),
              message: z.string().nullable().optional(),
              youtubeMembershipGiftId: z.string().nullable().optional(),
              membershipMessageId: z.string().nullable().optional(),
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
