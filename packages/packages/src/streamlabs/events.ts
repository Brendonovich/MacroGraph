import * as v from "valibot";

function maybe<T extends v.BaseSchema<any, any, any>>(t: T) {
	return v.optional(v.nullable(t));
}

export const EVENT = v.variant("type", [
	v.object({
		type: v.literal("donation"),
		message: v.tuple([
			v.object({
				name: maybe(v.string()),
				amount: maybe(v.pipe(v.string(), v.transform(Number))),
				currency: maybe(v.string()),
				formattedAmount: maybe(v.string()),
				message: maybe(v.string()),
				from: maybe(v.string()),
				fromId: maybe(v.string()),
			}),
		]),
	}),
	v.object({
		for: v.literal("youtube_account"),
		type: v.literal("subscription"),
		message: v.tuple([
			v.object({
				name: maybe(v.string()),
				months: maybe(v.pipe(v.string(), v.transform(Number))),
				message: maybe(v.string()),
				membershipLevelName: maybe(v.string()),
			}),
		]),
	}),
	v.object({
		for: v.literal("youtube_account"),
		type: v.literal("superchat"),
		message: v.tuple([
			v.object({
				name: maybe(v.string()),
				currency: maybe(v.string()),
				displayString: maybe(v.string()),
				amount: maybe(v.string()),
				comment: maybe(v.string()),
			}),
		]),
	}),
	v.object({
		for: v.literal("youtube_account"),
		type: v.literal("membershipGift"),
		message: v.tuple([
			v.intersect([
				v.object({
					name: maybe(v.string()),
					channelUrl: maybe(v.string()),
				}),
				v.union([
					v.object({
						giftMembershipsLevelName: maybe(v.string()),
						giftMembershipsCount: maybe(
							v.pipe(v.string(), v.transform(Number)),
						),
						membershipMessageId: maybe(v.string()),
					}),
					v.object({
						membershipLevelName: maybe(v.string()),
						message: maybe(v.string()),
						youtubeMembershipGiftId: maybe(v.string()),
						membershipMessageId: maybe(v.string()),
					}),
				]),
			]),
		]),
	}),
]);

export type Event = EventsToObject<v.InferOutput<typeof EVENT>>;

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
