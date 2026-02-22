import { Schema as S } from "effect";

const SubscriptionType =
	<Self>() =>
	<
		const Type extends string,
		Event extends S.Struct.Fields,
		Condition extends S.Struct.Fields,
	>(opts: {
		type: Type;
		version: number | string;
		condition: Condition;
		event: Event;
	}): S.TaggedClass<Self, Type, { readonly _tag: S.tag<Type> } & Event> & {
		type: Type;
		condition: Condition;
		version: number | string;
	} => {
		return Object.assign(
			S.TaggedClass<Event>()(opts.type, opts.event) as any,
			opts,
		);
	};

const UTCTime = S.Union(S.DateTimeUtc, S.DateTimeUtcFromSelf);

// Common field patterns for reuse
const BroadcasterUser = {
	broadcaster_user_id: S.String,
	broadcaster_user_login: S.String,
	broadcaster_user_name: S.String,
};

const User = { user_id: S.String, user_login: S.String, user_name: S.String };

const NullableUser = {
	user_id: S.NullOr(S.String),
	user_login: S.NullOr(S.String),
	user_name: S.NullOr(S.String),
};

const ModeratorUser = {
	moderator_user_id: S.String,
	moderator_user_login: S.String,
	moderator_user_name: S.String,
};

const ChatterUser = {
	chatter_user_id: S.String,
	chatter_user_name: S.String,
	chatter_user_login: S.String,
};

const FromBroadcasterUser = {
	from_broadcaster_user_id: S.String,
	from_broadcaster_user_login: S.String,
	from_broadcaster_user_name: S.String,
};

const ToBroadcasterUser = {
	to_broadcaster_user_id: S.String,
	to_broadcaster_user_login: S.String,
	to_broadcaster_user_name: S.String,
};

const HostBroadcasterUser = {
	host_broadcaster_user_id: S.String,
	host_broadcaster_user_name: S.String,
	host_broadcaster_user_login: S.String,
};

const TargetUser = {
	target_user_id: S.String,
	target_user_name: S.String,
	target_user_login: S.String,
};

const RequesterUser = {
	requester_user_id: S.String,
	requester_user_login: S.String,
	requester_user_name: S.String,
};

const SourceBroadcasterUser = {
	source_broadcaster_user_id: S.String,
	source_broadcaster_user_login: S.String,
	source_broadcaster_user_name: S.NullOr(S.String),
};

// Common structures
const DonationAmount = S.Struct({
	value: S.Number,
	decimal_places: S.Number,
	currency: S.String,
});

const EmoteFragment = S.Struct({
	id: S.String,
	emote_set_id: S.String,
	owner_id: S.String,
	format: S.Literal("animated", "static"),
});

const CheermoteFragment = S.Struct({
	prefix: S.String,
	bits: S.Number,
	tier: S.Number,
});

const MentionFragment = S.Struct({
	user_id: S.String,
	user_name: S.String,
	user_login: S.String,
});

const MessageFragment = S.Struct({
	type: S.Literal("text", "cheermote", "emote", "mention"),
	text: S.String,
	cheermote: S.NullOr(CheermoteFragment),
	emote: S.NullOr(EmoteFragment),
	mention: S.NullOr(MentionFragment),
});

const SimpleMessageFragment = S.Struct({
	text: S.String,
	emote: S.NullOr(S.Struct({ id: S.String, emote_set_id: S.String })),
	cheermote: S.NullOr(CheermoteFragment),
});

const Badge = S.Struct({ set_id: S.String, id: S.String, info: S.String });

const ReplyInfo = S.Struct({
	parent_message_id: S.String,
	parent_message_body: S.String,
	parent_user_id: S.String,
	parent_user_name: S.String,
	parent_user_login: S.String,
	thread_message_id: S.String,
	thread_user_id: S.String,
	thread_user_name: S.String,
	thread_user_login: S.String,
});

const PollChoice = S.Struct({
	id: S.String,
	title: S.String,
	bits_votes: S.Number,
	channel_points_votes: S.Number,
	votes: S.Number,
});

const PredictionOutcome = S.Struct({
	id: S.String,
	title: S.String,
	color: S.String,
	users: S.Number,
	channel_points: S.Number,
	top_predictors: S.Array(
		S.Struct({
			...User,
			channel_points_won: S.Null,
			channel_points_used: S.Number,
		}),
	),
});

const PredictionOutcomeWithWinner = S.Struct({
	id: S.String,
	title: S.String,
	color: S.String,
	users: S.Number,
	channel_points: S.Number,
	top_predictors: S.Array(
		S.Struct({
			...User,
			channel_points_won: S.Number,
			channel_points_used: S.Number,
		}),
	),
});

export namespace SubscriptionEvent {
	export class ChannelBan extends SubscriptionType<ChannelBan>()({
		type: "channel.ban",
		version: 1,
		condition: { broadcaster_user_id: S.String },
		event: {
			...User,
			...BroadcasterUser,
			...ModeratorUser,
			reason: S.String,
			banned_at: UTCTime,
			ends_at: S.NullOr(UTCTime),
			is_permanent: S.Boolean,
		},
	}) {}

	export class ChannelUnban extends SubscriptionType<ChannelUnban>()({
		type: "channel.unban",
		version: 1,
		condition: { broadcaster_user_id: S.String },
		event: { ...User, ...BroadcasterUser, ...ModeratorUser },
	}) {}

	export class ChannelUpdate extends SubscriptionType<ChannelUpdate>()({
		type: "channel.update",
		version: 2,
		condition: { broadcaster_user_id: S.String },
		event: {
			...BroadcasterUser,
			title: S.String,
			language: S.String,
			category_id: S.String,
			category_name: S.String,
			content_classification_labels: S.Array(S.String),
		},
	}) {}

	export class ChannelAdBreakBegin extends SubscriptionType<ChannelAdBreakBegin>()(
		{
			type: "channel.ad_break.begin",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				duration_seconds: S.Number,
				started_at: UTCTime,
				is_automatic: S.Boolean,
				...BroadcasterUser,
				...RequesterUser,
			},
		},
	) {}

	export class ChannelRaid extends SubscriptionType<ChannelRaid>()({
		type: "channel.raid",
		version: 1,
		condition: { to_broadcaster_user_id: S.String },
		event: { ...FromBroadcasterUser, ...ToBroadcasterUser, viewers: S.Number },
	}) {}

	export class ChannelChatClear extends SubscriptionType<ChannelChatClear>()({
		type: "channel.chat.clear",
		version: 1,
		condition: { broadcaster_user_id: S.String, user_id: S.String },
		event: { ...BroadcasterUser },
	}) {}

	export class ChannelChatClearUserMessages extends SubscriptionType<ChannelChatClearUserMessages>()(
		{
			type: "channel.chat.clear_user_messages",
			version: 1,
			condition: { broadcaster_user_id: S.String, user_id: S.String },
			event: { ...BroadcasterUser, ...TargetUser },
		},
	) {}

	export class ChannelChatMessage extends SubscriptionType<ChannelChatMessage>()(
		{
			type: "channel.chat.message",
			version: 1,
			condition: { broadcaster_user_id: S.String, user_id: S.String },
			event: {
				...BroadcasterUser,
				...ChatterUser,
				message_id: S.String,

				message: S.Struct({
					text: S.String,
					fragments: S.Array(MessageFragment),
				}),

				message_type: S.Literal(
					"text",
					"channel_points_highlighted",
					"channel_points_sub_only",
					"user_intro",
					"power_ups_message_effect",
					"power_ups_gigantified_emote",
				),

				badges: S.Array(Badge),

				cheer: S.NullOr(S.Struct({ bits: S.Number })),

				color: S.String,

				reply: S.NullOr(ReplyInfo),

				channel_points_custom_reward_id: S.NullOr(S.String),

				source_broadcaster_user_id: S.NullOr(S.String),
				source_broadcaster_user_login: S.NullOr(S.String),
				source_broadcaster_user_name: S.NullOr(S.String),
				source_message_id: S.NullOr(S.String),

				source_badges: S.NullOr(S.Array(Badge)),

				is_source_only: S.NullOr(S.Boolean),
			},
		},
	) {}

	export class ChannelChatMessageDelete extends SubscriptionType<ChannelChatMessageDelete>()(
		{
			type: "channel.chat.message_delete",
			version: 1,
			condition: { broadcaster_user_id: S.String, user_id: S.String },
			event: { ...BroadcasterUser, ...TargetUser, message_id: S.String },
		},
	) {}

	const SubTier = S.Literal("1000", "2000", "3000");
	const ChatNotification = {
		sub: S.Struct({
			sub_tier: SubTier,
			is_prime: S.Boolean,
			duration_months: S.Number,
		}),
		resub: S.Struct({
			cumulative_months: S.Number,
			duration_months: S.Number,
			streak_months: S.Number,
			sub_tier: S.Literal("1000", "2000", "3000"),
			is_prime: S.NullOr(S.Boolean),
			is_gift: S.Boolean,
			gifter_is_anonymous: S.NullOr(S.Boolean),
			gifter_user_id: S.String,
			gifter_user_name: S.String,
			gifter_user_login: S.NullOr(S.String),
		}),
		sub_gift: S.Struct({
			duration_months: S.Number,
			cumulative_total: S.NullOr(S.Number),
			recipient_user_id: S.String,
			recipient_user_name: S.String,
			recipient_user_login: S.String,
			sub_tier: SubTier,
			community_gift_id: S.NullOr(S.String),
		}),
		community_sub_gift: S.Struct({
			id: S.String,
			total: S.Number,
			sub_tier: SubTier,
			cumulative_total: S.NullOr(S.Number),
		}),
		gift_paid_upgrade: S.Struct({
			gifter_is_anonymous: S.Boolean,
			gifter_user_id: S.NullOr(S.String),
			gifter_user_name: S.NullOr(S.String),
		}),
		prime_paid_upgrade: S.Struct({ sub_tier: SubTier }),
		pay_it_forward: S.Struct({
			gifter_is_anonymous: S.Boolean,
			gifter_user_id: S.String,
			gifter_user_name: S.NullOr(S.String),
			gifter_user_login: S.String,
		}),
		raid: S.Struct({
			user_id: S.String,
			user_name: S.String,
			user_login: S.String,
			viewer_count: S.Number,
			profile_image_url: S.String,
		}),
		announcement: S.Struct({ color: S.String }),
	};

	export class ChannelChatNotification extends SubscriptionType<ChannelChatNotification>()(
		{
			type: "channel.chat.notification",
			version: 1,
			condition: { broadcaster_user_id: S.String, user_id: S.String },
			event: {
				...BroadcasterUser,
				...ChatterUser,
				color: S.String,
				badges: S.Array(Badge),
				system_message: S.String,
				message_id: S.String,
				message: S.Struct({
					text: S.String,
					fragments: S.Array(MessageFragment),
				}),

				notice_type: S.Literal(
					"sub",
					"resub",
					"sub_gift",
					"community_sub_gift",
					"gift_paid_upgrade",
					"prime_paid_upgrade",
					"raid",
					"unraid",
					"pay_it_forward",
					"announcement",
					"bits_badge_tier",
					"charity_donation",
					"shared_chat_sub",
					"shared_chat_resub",
					"shared_chat_sub_gift",
					"shared_chat_community_sub_gift",
					"shared_chat_gift_paid_upgrade",
					"shared_chat_prime_paid_upgrade",
					"shared_chat_raid",
					"shared_chat_pay_it_forward",
					"shared_chat_announcement",
				),

				sub: S.NullOr(ChatNotification.sub),
				resub: S.NullOr(ChatNotification.resub),
				sub_gift: S.NullOr(ChatNotification.sub_gift),
				community_sub_gift: S.NullOr(ChatNotification.community_sub_gift),
				gift_paid_upgrade: S.NullOr(ChatNotification.gift_paid_upgrade),
				prime_paid_upgrade: S.NullOr(ChatNotification.prime_paid_upgrade),
				pay_it_forward: S.NullOr(ChatNotification.pay_it_forward),
				raid: S.NullOr(ChatNotification.raid),
				unraid: S.NullOr(S.Struct({})),
				announcement: S.NullOr(ChatNotification.announcement),

				bits_badge_tier: S.NullOr(S.Struct({ tier: S.Number })),

				charity_donation: S.NullOr(
					S.Struct({ charity_name: S.String, amount: DonationAmount }),
				),

				source_broadcaster_user_id: S.NullOr(S.String),
				source_broadcaster_user_login: S.NullOr(S.String),
				source_broadcaster_user_name: S.NullOr(S.String),
				source_message_id: S.NullOr(S.String),

				source_badges: S.NullOr(S.Array(Badge)),

				shared_chat_sub: S.NullOr(ChatNotification.sub),
				shared_chat_resub: S.NullOr(ChatNotification.resub),
				shared_chat_sub_gift: S.NullOr(ChatNotification.sub_gift),
				shared_chat_community_sub_gift: S.NullOr(
					ChatNotification.community_sub_gift,
				),
				shared_chat_gift_paid_upgrade: S.NullOr(
					ChatNotification.gift_paid_upgrade,
				),
				shared_chat_prime_paid_upgrade: S.NullOr(
					ChatNotification.prime_paid_upgrade,
				),
				shared_chat_pay_it_forward: S.NullOr(ChatNotification.pay_it_forward),
				shared_chat_raid: S.NullOr(ChatNotification.raid),
				shared_chat_announcement: S.NullOr(ChatNotification.announcement),
			},
		},
	) {}

	export class ChannelChatSettingsUpdate extends SubscriptionType<ChannelChatSettingsUpdate>()(
		{
			type: "channel.chat_settings.update",
			version: 1,
			condition: { broadcaster_user_id: S.String, user_id: S.String },
			event: {
				...BroadcasterUser,
				emote_mode: S.Boolean,
				follower_mode: S.Boolean,
				follower_mode_duration_minutes: S.NullOr(S.Number),
				slow_mode: S.Boolean,
				slow_mode_wait_time_seconds: S.NullOr(S.Number),
				subscriber_mode: S.Boolean,
				unique_chat_mode: S.Boolean,
			},
		},
	) {}

	export class ChannelChatUserMessageHold extends SubscriptionType<ChannelChatUserMessageHold>()(
		{
			type: "channel.chat.user_message_hold",
			version: 1,
			condition: { broadcaster_user_id: S.String, user_id: S.String },
			event: {
				...BroadcasterUser,
				...User,

				message_id: S.String,
				message: S.Struct({
					text: S.String,
					fragments: S.Array(SimpleMessageFragment),
				}),
			},
		},
	) {}

	export class ChannelChatUserMessageUpdate extends SubscriptionType<ChannelChatUserMessageUpdate>()(
		{
			type: "channel.chat.user_message_update",
			version: 1,
			condition: { broadcaster_user_id: S.String, user_id: S.String },
			event: {
				...BroadcasterUser,
				...User,
				status: S.Literal("approved", "denied", "invalid"),
				message_id: S.String,
				message: S.Struct({
					text: S.String,
					fragments: S.Array(SimpleMessageFragment),
				}),
			},
		},
	) {}

	export class ChannelSubscribe extends SubscriptionType<ChannelSubscribe>()({
		type: "channel.subscribe",
		version: 1,
		condition: { broadcaster_user_id: S.String },
		event: { ...User, ...BroadcasterUser, tier: SubTier, is_gift: S.Boolean },
	}) {}

	export class ChannelSubscriptionEnd extends SubscriptionType<ChannelSubscriptionEnd>()(
		{
			type: "channel.subscription.end",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: { ...User, ...BroadcasterUser, tier: SubTier, is_gift: S.Boolean },
		},
	) {}

	export class ChannelSubscriptionGift extends SubscriptionType<ChannelSubscriptionGift>()(
		{
			type: "channel.subscription.gift",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				...NullableUser,
				...BroadcasterUser,
				total: S.Number,
				tier: SubTier,
				cumulative_total: S.NullOr(S.Number),
				is_anonymous: S.Boolean,
			},
		},
	) {}

	const Message = S.Struct({
		text: S.String,
		emotes: S.Array(S.Struct({ begin: S.Number, end: S.Number, id: S.String })),
	});

	export class ChannelSubscriptionMessage extends SubscriptionType<ChannelSubscriptionMessage>()(
		{
			type: "channel.subscription.message",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				...User,
				...BroadcasterUser,
				tier: S.String,
				message: Message,
				cumulative_months: S.Number,
				streak_months: S.NullOr(S.Number),
				duration_months: S.Number,
			},
		},
	) {}

	export class ChannelCheer extends SubscriptionType<ChannelCheer>()({
		type: "channel.cheer",
		version: 1,
		condition: { broadcaster_user_id: S.String },
		event: {
			is_anonymous: S.Boolean,
			...NullableUser,
			...BroadcasterUser,
			message: S.String,
			bits: S.Number,
		},
	}) {}

	export class ChannelModeratorAdd extends SubscriptionType<ChannelModeratorAdd>()(
		{
			type: "channel.moderator.add",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: { ...BroadcasterUser, ...User },
		},
	) {}

	export class ChannelModeratorRemove extends SubscriptionType<ChannelModeratorRemove>()(
		{
			type: "channel.moderator.remove",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: { ...BroadcasterUser, ...User },
		},
	) {}

	export class ChannelVipAdd extends SubscriptionType<ChannelVipAdd>()({
		type: "channel.vip.add",
		version: 1,
		condition: { broadcaster_user_id: S.String },
		event: { ...User, ...BroadcasterUser },
	}) {}

	export class ChannelVipRemove extends SubscriptionType<ChannelVipRemove>()({
		type: "channel.vip.remove",
		version: 1,
		condition: { broadcaster_user_id: S.String },
		event: { ...User, ...BroadcasterUser },
	}) {}

	export class ChannelModerate extends SubscriptionType<ChannelModerate>()({
		type: "channel.moderate",
		version: 2,
		condition: { broadcaster_user_id: S.String, moderator_user_id: S.String },
		event: {
			...BroadcasterUser,
			...ModeratorUser,
			...SourceBroadcasterUser,
			action: S.Literal(
				"ban",
				"timeout",
				"unban",
				"untimeout",
				"clear",
				"emoteonly",
				"emoteonlyoff",
				"followers",
				"followersoff",
				"uniquechat",
				"uniquechatoff",
				"slow",
				"slowoff",
				"subscribers",
				"subscribersoff",
				"unraid",
				"delete",
				"unvip",
				"vip",
				"raid",
				"add_blocked_term",
				"add_permitted_term",
				"remove_blocked_term",
				"remove_permitted_term",
				"mod",
				"unmod",
				"approve_unban_request",
				"deny_unban_request",
				"warn",
				"shared_chat_ban",
				"shared_chat_timeout",
				"shared_chat_unban",
				"shared_chat_untimeout",
				"shared_chat_delete",
			),
			followers: S.NullOr(S.Struct({ follow_duration_minutes: S.Number })),
			slow: S.NullOr(S.Struct({ wait_time_seconds: S.Number })),
			vip: S.NullOr(S.Struct(User)),
			unvip: S.NullOr(S.Struct(User)),
			mod: S.NullOr(S.Struct(User)),
			unmod: S.NullOr(S.Struct(User)),
			ban: S.NullOr(S.Struct({ ...User, reason: S.NullOr(S.String) })),
			unban: S.NullOr(S.Struct(User)),
			timeout: S.NullOr(
				S.Struct({ ...User, reason: S.NullOr(S.String), expires_at: UTCTime }),
			),
			untimeout: S.NullOr(S.Struct(User)),
			raid: S.NullOr(S.Struct({ ...User, viewer_count: S.Number })),
			unraid: S.NullOr(S.Struct(User)),
			delete: S.NullOr(
				S.Struct({ ...User, message_id: S.String, message_body: S.String }),
			),
			automod_terms: S.NullOr(
				S.Struct({
					action: S.Literal("add", "remove"),
					list: S.Literal("blocked", "permitted"),
					terms: S.Array(S.String),
					from_automod: S.Boolean,
				}),
			),
			unban_request: S.NullOr(
				S.Struct({
					is_approved: S.Boolean,
					...User,
					moderator_message: S.String,
				}),
			),
			warn: S.NullOr(
				S.Struct({
					...User,
					reason: S.NullOr(S.String),
					chat_rules_cited: S.NullOr(S.Array(S.String)),
				}),
			),
			shared_chat_ban: S.NullOr(
				S.Struct({ ...User, reason: S.NullOr(S.String) }),
			),
			shared_chat_unban: S.NullOr(S.Struct(User)),
			shared_chat_timeout: S.NullOr(
				S.Struct({ ...User, reason: S.NullOr(S.String), expires_at: UTCTime }),
			),
			shared_chat_untimeout: S.NullOr(S.Struct(User)),
			shared_chat_delete: S.NullOr(
				S.Struct({ ...User, message_id: S.String, message_body: S.String }),
			),
		},
	}) {}

	export class ChannelUnbanRequestCreate extends SubscriptionType<ChannelUnbanRequestCreate>()(
		{
			type: "channel.unban_request.create",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				id: S.String,
				...BroadcasterUser,
				...User,
				text: S.String,
				created_at: UTCTime,
			},
		},
	) {}

	export class ChannelUnbanRequestResolve extends SubscriptionType<ChannelUnbanRequestResolve>()(
		{
			type: "channel.unban_request.resolve",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				id: S.String,
				...BroadcasterUser,
				moderator_id: S.NullOr(S.String),
				moderator_login: S.NullOr(S.String),
				moderator_name: S.NullOr(S.String),
				...User,
				resolution_text: S.NullOr(S.String),
				status: S.Literal("approved", "canceled", "denied"),
			},
		},
	) {}

	export class ChannelSuspiciousUserUpdate extends SubscriptionType<ChannelSuspiciousUserUpdate>()(
		{
			type: "channel.suspicious_user.update",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				...BroadcasterUser,
				...ModeratorUser,
				...User,
				low_trust_status: S.String,
			},
		},
	) {}

	export class ChannelSuspiciousUserMessage extends SubscriptionType<ChannelSuspiciousUserMessage>()(
		{
			type: "channel.suspicious_user.message",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				...BroadcasterUser,
				...User,
				low_trust_status: S.String,
				shared_ban_channel_ids: S.Array(S.String),
				types: S.Array(S.String),
				ban_evasion_evaluation: S.String,
				message: S.Struct({
					message_id: S.String,
					text: S.String,
					fragments: S.Array(
						S.Struct({
							type: S.String,
							text: S.String,
							cheermote: S.NullOr(
								S.Struct({ prefix: S.String, bits: S.String, tier: S.String }),
							),
							emote: S.NullOr(
								S.Struct({ id: S.String, emote_set_id: S.String }),
							),
						}),
					),
				}),
			},
		},
	) {}

	export class ChannelWarningAcknowledge extends SubscriptionType<ChannelWarningAcknowledge>()(
		{
			type: "channel.warning.acknowledge",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: { ...BroadcasterUser, ...User },
		},
	) {}

	export class ChannelWarningSend extends SubscriptionType<ChannelWarningSend>()(
		{
			type: "channel.warning.send",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				...BroadcasterUser,
				...ModeratorUser,
				...User,
				reason: S.NullOr(S.String),
				chat_rules_cited: S.NullOr(S.Array(S.String)),
			},
		},
	) {}

	// ===== AutoMod Events =====

	export class AutomodSettingsUpdate extends SubscriptionType<AutomodSettingsUpdate>()(
		{
			type: "automod.settings.update",
			version: 1,
			condition: { broadcaster_user_id: S.String, moderator_user_id: S.String },
			event: {
				...BroadcasterUser,
				...ModeratorUser,
				bullying: S.Number,
				overall_level: S.NullOr(S.Number),
				disability: S.Number,
				race_ethnicity_or_religion: S.Number,
				misogyny: S.Number,
				sexuality_sex_or_gender: S.Number,
				aggression: S.Number,
				sex_based_terms: S.Number,
				swearing: S.Number,
			},
		},
	) {}

	export class AutomodTermsUpdate extends SubscriptionType<AutomodTermsUpdate>()(
		{
			type: "automod.terms.update",
			version: 1,
			condition: { broadcaster_user_id: S.String, moderator_user_id: S.String },
			event: {
				...BroadcasterUser,
				...ModeratorUser,
				action: S.String,
				from_automod: S.Boolean,
				terms: S.Array(S.String),
			},
		},
	) {}

	// ===== Poll Events =====

	export class ChannelPollBegin extends SubscriptionType<ChannelPollBegin>()({
		type: "channel.poll.begin",
		version: 1,
		condition: { broadcaster_user_id: S.String },
		event: {
			id: S.String,
			...BroadcasterUser,
			title: S.String,
			choices: S.Array(PollChoice),
			bits_voting: S.Struct({
				is_enabled: S.Boolean,
				amount_per_vote: S.Number,
			}),
			channel_points_voting: S.Struct({
				is_enabled: S.Boolean,
				amount_per_vote: S.Number,
			}),
			started_at: UTCTime,
			ends_at: UTCTime,
		},
	}) {}

	export class ChannelPollProgress extends SubscriptionType<ChannelPollProgress>()(
		{
			type: "channel.poll.progress",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				id: S.String,
				...BroadcasterUser,
				title: S.String,
				choices: S.Array(PollChoice),
				bits_voting: S.Struct({
					is_enabled: S.Boolean,
					amount_per_vote: S.Number,
				}),
				channel_points_voting: S.Struct({
					is_enabled: S.Boolean,
					amount_per_vote: S.Number,
				}),
				started_at: UTCTime,
				ends_at: UTCTime,
			},
		},
	) {}

	export class ChannelPollEnd extends SubscriptionType<ChannelPollEnd>()({
		type: "channel.poll.end",
		version: 1,
		condition: { broadcaster_user_id: S.String },
		event: {
			id: S.String,
			...BroadcasterUser,
			title: S.String,
			choices: S.Array(PollChoice),
			bits_voting: S.Struct({
				is_enabled: S.Boolean,
				amount_per_vote: S.Number,
			}),
			channel_points_voting: S.Struct({
				is_enabled: S.Boolean,
				amount_per_vote: S.Number,
			}),
			status: S.String,
			started_at: UTCTime,
			ended_at: UTCTime,
		},
	}) {}

	// ===== Prediction Events =====

	export class ChannelPredictionBegin extends SubscriptionType<ChannelPredictionBegin>()(
		{
			type: "channel.prediction.begin",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				id: S.String,
				...BroadcasterUser,
				title: S.String,
				outcomes: S.Array(
					S.Struct({
						id: S.String,
						title: S.String,
						color: S.String,
						users: S.Number,
						channel_points: S.Number,
						top_predictors: S.Array(
							S.Struct({
								...User,
								channel_points_won: S.Null,
								channel_points_used: S.Number,
							}),
						),
					}),
				),
				started_at: UTCTime,
				locks_at: UTCTime,
			},
		},
	) {}

	export class ChannelPredictionProgress extends SubscriptionType<ChannelPredictionProgress>()(
		{
			type: "channel.prediction.progress",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				id: S.String,
				...BroadcasterUser,
				title: S.String,
				outcomes: S.Array(
					S.Struct({
						id: S.String,
						title: S.String,
						color: S.String,
						users: S.Number,
						channel_points: S.Number,
						top_predictors: S.Array(
							S.Struct({
								...User,
								channel_points_won: S.Null,
								channel_points_used: S.Number,
							}),
						),
					}),
				),
				started_at: UTCTime,
				locks_at: UTCTime,
			},
		},
	) {}

	export class ChannelPredictionLock extends SubscriptionType<ChannelPredictionLock>()(
		{
			type: "channel.prediction.lock",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				id: S.String,
				...BroadcasterUser,
				title: S.String,
				outcomes: S.Array(
					S.Struct({
						id: S.String,
						title: S.String,
						color: S.String,
						users: S.Number,
						channel_points: S.Number,
						top_predictors: S.Array(
							S.Struct({
								...User,
								channel_points_won: S.Null,
								channel_points_used: S.Number,
							}),
						),
					}),
				),
				started_at: UTCTime,
				locked_at: UTCTime,
			},
		},
	) {}

	export class ChannelPredictionEnd extends SubscriptionType<ChannelPredictionEnd>()(
		{
			type: "channel.prediction.end",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				id: S.String,
				...BroadcasterUser,
				title: S.String,
				winning_outcome_id: S.NullOr(S.String),
				outcomes: S.Array(
					S.Struct({
						id: S.String,
						title: S.String,
						color: S.String,
						users: S.Number,
						channel_points: S.Number,
						top_predictors: S.Array(
							S.Struct({
								...User,
								channel_points_won: S.Number,
								channel_points_used: S.Number,
							}),
						),
					}),
				),
				status: S.String,
				started_at: UTCTime,
				ended_at: UTCTime,
			},
		},
	) {}

	// ===== Channel Points Events =====

	export class ChannelPointsAutomaticRewardRedemptionAdd extends SubscriptionType<ChannelPointsAutomaticRewardRedemptionAdd>()(
		{
			type: "channel.channel_points_automatic_reward_redemption.add",
			version: 2,
			condition: { broadcaster_user_id: S.String },
			event: {
				...BroadcasterUser,
				...User,
				id: S.String,
				reward: S.Struct({
					type: S.Literal(
						"single_message_bypass_sub_mode",
						"send_highlighted_message",
						"random_sub_emote_unlock",
						"chosen_sub_emote_unlock",
						"chosen_modified_sub_emote_unlock",
						"message_effect",
						"gigantify_an_emote",
						"celebration",
					),
					cost: S.Number,
					unlocked_emote: S.NullOr(S.Struct({ id: S.String, name: S.String })),
				}),
				message: S.Struct({
					text: S.String,
					emotes: S.Array(
						S.Struct({ id: S.String, begin: S.Number, end: S.Number }),
					),
				}),
				user_input: S.NullOr(S.String),
				redeemed_at: UTCTime,
			},
		},
	) {}

	// ===== Hype Train Events =====

	const TopContributions = S.Array(
		S.Struct({
			...User,
			type: S.Literal("bits", "subscriptions", "other"),
			total: S.Number,
		}),
	);

	export class HypeTrainBegin extends SubscriptionType<HypeTrainBegin>()({
		type: "channel.hype_train.begin",
		version: 2,
		condition: { broadcaster_user_id: S.String },
		event: {
			id: S.String,
			...BroadcasterUser,
			total: S.Number,
			progress: S.Number,
			goal: S.Number,
			top_contributions: TopContributions,
			level: S.Number,
			all_time_high_level: S.Number,
			all_time_high_total: S.Number,
			shared_train_participants: S.NullOr(S.Array(S.Struct(BroadcasterUser))),
			started_at: UTCTime,
			expires_at: UTCTime,
			type: S.String,
			is_shared_train: S.Boolean,
		},
	}) {}

	export class HypeTrainProgress extends SubscriptionType<HypeTrainProgress>()({
		type: "channel.hype_train.progress",
		version: 2,
		condition: { broadcaster_user_id: S.String },
		event: {
			id: S.String,
			...BroadcasterUser,
			level: S.Number,
			total: S.Number,
			progress: S.Number,
			goal: S.Number,
			top_contributions: TopContributions,
			shared_train_participants: S.NullOr(S.Array(S.Struct(BroadcasterUser))),
			started_at: UTCTime,
			expires_at: UTCTime,
			type: S.Literal("regular", "treasure", "golden_kappa"),
			is_shared_train: S.Boolean,
		},
	}) {}

	export class HypeTrainEnd extends SubscriptionType<HypeTrainEnd>()({
		type: "channel.hype_train.end",
		version: 2,
		condition: { broadcaster_user_id: S.String },
		event: {
			id: S.String,
			...BroadcasterUser,
			total: S.Number,
			top_contributions: TopContributions,
			level: S.Number,
			shared_train_participants: S.NullOr(S.Array(S.Struct(BroadcasterUser))),
			started_at: UTCTime,
			cooldown_ends_at: UTCTime,
			ended_at: UTCTime,
			type: S.String,
			is_shared_train: S.Boolean,
		},
	}) {}

	// ===== Charity Events =====

	export class ChannelCharityCampaignDonate extends SubscriptionType<ChannelCharityCampaignDonate>()(
		{
			type: "channel.charity_campaign.donate",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				id: S.String,
				campaign_id: S.String,
				...BroadcasterUser,
				...User,
				charity_name: S.String,
				charity_description: S.String,
				charity_logo: S.String,
				charity_website: S.String,
				amount: DonationAmount,
			},
		},
	) {}

	export class ChannelCharityCampaignStart extends SubscriptionType<ChannelCharityCampaignStart>()(
		{
			type: "channel.charity_campaign.start",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				id: S.String,
				...BroadcasterUser,
				charity_name: S.String,
				charity_description: S.String,
				charity_logo: S.String,
				charity_website: S.String,
				current_amount: DonationAmount,
				target_amount: DonationAmount,
				started_at: UTCTime,
			},
		},
	) {}

	export class ChannelCharityCampaignProgress extends SubscriptionType<ChannelCharityCampaignProgress>()(
		{
			type: "channel.charity_campaign.progress",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				id: S.String,
				...BroadcasterUser,
				charity_name: S.String,
				charity_description: S.String,
				charity_logo: S.String,
				charity_website: S.String,
				current_amount: DonationAmount,
				target_amount: DonationAmount,
			},
		},
	) {}

	export class ChannelCharityCampaignStop extends SubscriptionType<ChannelCharityCampaignStop>()(
		{
			type: "channel.charity_campaign.stop",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				id: S.String,
				...BroadcasterUser,
				charity_name: S.String,
				charity_description: S.String,
				charity_logo: S.String,
				charity_website: S.String,
				current_amount: DonationAmount,
				target_amount: DonationAmount,
				stopped_at: UTCTime,
			},
		},
	) {}

	// ===== Shared Chat Events =====

	export class ChannelSharedChatSessionBegin extends SubscriptionType<ChannelSharedChatSessionBegin>()(
		{
			type: "channel.shared_chat.session.begin",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				session_id: S.String,
				...BroadcasterUser,
				...HostBroadcasterUser,
				participants: S.Array(S.Struct(BroadcasterUser)),
			},
		},
	) {}

	export class ChannelSharedChatSessionUpdate extends SubscriptionType<ChannelSharedChatSessionUpdate>()(
		{
			type: "channel.shared_chat.session.update",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				session_id: S.String,
				...BroadcasterUser,
				...HostBroadcasterUser,
				participants: S.Array(S.Struct(BroadcasterUser)),
			},
		},
	) {}

	export class ChannelSharedChatSessionEnd extends SubscriptionType<ChannelSharedChatSessionEnd>()(
		{
			type: "channel.shared_chat.session.end",
			version: 1,
			condition: { broadcaster_user_id: S.String },
			event: {
				session_id: S.String,
				...BroadcasterUser,
				...HostBroadcasterUser,
			},
		},
	) {}

	// const HostUser = {
	// 	host_user_id: S.String,
	// 	host_user_name: S.String,
	// 	host_user_login: S.String,
	// };

	// const NullableHostUser = {
	// 	host_user_id: S.NullOr(S.String),
	// 	host_user_name: S.NullOr(S.String),
	// 	host_user_login: S.NullOr(S.String),
	// };

	// const GuestUser = {
	// 	guest_user_id: S.NullOr(S.String),
	// 	guest_user_name: S.NullOr(S.String),
	// 	guest_user_login: S.NullOr(S.String),
	// };

	// const NullableModeratorUser = {
	// 	moderator_user_id: S.NullOr(S.String),
	// 	moderator_user_login: S.NullOr(S.String),
	// 	moderator_user_name: S.NullOr(S.String),
	// };

	// export class ChannelGuestStarSessionBegin extends SubscriptionType<ChannelGuestStarSessionBegin>()(
	// 	{
	// 		type: "channel.guest_star_session.begin",
	// 		version: "beta",
	// 		condition: { broadcaster_user_id: S.String },
	// 		event: { ...BroadcasterUser, session_id: S.String, started_at: UTCTime },
	// 	},
	// ) {}

	// export class ChannelGuestStarSessionEnd extends SubscriptionType<ChannelGuestStarSessionEnd>()(
	// 	{
	// 		type: "channel.guest_star_session.end",
	// 		version: "beta",
	// 		condition: { broadcaster_user_id: S.String },
	// 		event: {
	// 			...BroadcasterUser,
	// 			session_id: S.String,
	// 			started_at: UTCTime,
	// 			ended_at: UTCTime,
	// 			...HostUser,
	// 		},
	// 	},
	// ) {}

	// export class ChannelGuestStarGuestUpdate extends SubscriptionType<ChannelGuestStarGuestUpdate>()(
	// 	{
	// 		type: "channel.guest_star_guest.update",
	// 		version: "beta",
	// 		condition: { broadcaster_user_id: S.String },
	// 		event: {
	// 			...BroadcasterUser,
	// 			session_id: S.String,
	// 			...NullableModeratorUser,
	// 			...GuestUser,
	// 			slot_id: S.NullOr(S.String),
	// 			state: S.NullOr(
	// 				S.Literal(
	// 					"invited",
	// 					"accepted",
	// 					"ready",
	// 					"backstage",
	// 					"live",
	// 					"removed",
	// 				),
	// 			),
	// 			...HostUser,
	// 			host_video_enabled: S.NullOr(S.Boolean),
	// 			host_audio_enabled: S.NullOr(S.Boolean),
	// 			host_volume: S.NullOr(S.Number),
	// 		},
	// 	},
	// ) {}

	export class ChannelBitsUse extends SubscriptionType<ChannelBitsUse>()({
		type: "channel.bits.use",
		version: 1,
		condition: { broadcaster_user_id: S.String },
		event: {
			...BroadcasterUser,
			...User,
			bits: S.Number,
			type: S.Literal("cheer", "power_up"),
			message: S.NullOr(
				S.Struct({
					text: S.String,
					fragments: S.Array(
						S.Struct({
							text: S.String,
							type: S.Literal("text", "cheermote", "emote"),
							emote: S.NullOr(
								S.Struct({
									id: S.String,
									emote_set_id: S.String,
									owner_id: S.String,
									format: S.Array(S.Literal("animated", "static")),
								}),
							),
							cheermote: S.NullOr(
								S.Struct({ prefix: S.String, bits: S.Number, tier: S.Number }),
							),
						}),
					),
				}),
			),
			power_up: S.NullOr(
				S.Struct({
					type: S.String,
					emote: S.NullOr(S.Struct({ id: S.String, name: S.String })),
					message_effect_id: S.NullOr(S.String),
				}),
			),
		},
	}) {}

	// ===== Union of all Subscription Types =====

	export const Any = S.Union(
		ChannelBan,
		ChannelUnban,
		ChannelUpdate,
		ChannelAdBreakBegin,
		ChannelRaid,
		ChannelChatClear,
		ChannelChatClearUserMessages,
		ChannelChatMessage,
		ChannelChatMessageDelete,
		ChannelChatNotification,
		ChannelChatSettingsUpdate,
		ChannelChatUserMessageHold,
		ChannelChatUserMessageUpdate,
		ChannelSubscribe,
		ChannelSubscriptionEnd,
		ChannelSubscriptionGift,
		ChannelSubscriptionMessage,
		ChannelCheer,
		ChannelModeratorAdd,
		ChannelModeratorRemove,
		ChannelVipAdd,
		ChannelVipRemove,
		ChannelModerate,
		ChannelUnbanRequestCreate,
		ChannelUnbanRequestResolve,
		ChannelSuspiciousUserUpdate,
		ChannelSuspiciousUserMessage,
		ChannelWarningAcknowledge,
		ChannelWarningSend,
		AutomodSettingsUpdate,
		AutomodTermsUpdate,
		ChannelPollBegin,
		ChannelPollProgress,
		ChannelPollEnd,
		ChannelPredictionBegin,
		ChannelPredictionProgress,
		ChannelPredictionLock,
		ChannelPredictionEnd,
		ChannelPointsAutomaticRewardRedemptionAdd,
		HypeTrainBegin,
		HypeTrainProgress,
		HypeTrainEnd,
		ChannelCharityCampaignDonate,
		ChannelCharityCampaignStart,
		ChannelCharityCampaignProgress,
		ChannelCharityCampaignStop,
		ChannelSharedChatSessionBegin,
		ChannelSharedChatSessionUpdate,
		ChannelSharedChatSessionEnd,
		// ChannelGuestStarSessionBegin,
		// ChannelGuestStarSessionEnd,
		// ChannelGuestStarGuestUpdate,
		ChannelBitsUse,
	);
	export type Any = S.Schema.Type<typeof Any>;
}

function makeMessageSchema<
	TType extends string,
	TPayload extends S.Struct.Fields,
>(value: { message_type: TType; payload: TPayload }) {
	return S.Struct({
		metadata: S.Struct({
			message_id: S.String,
			message_timestamp: S.DateFromString,
			message_type: S.Literal(value.message_type),
		}),
		payload: S.Struct(value.payload),
	});
}

const EVENTSUB_CONTROL_MESSAGES = S.Union(
	makeMessageSchema({
		message_type: "session_welcome",
		payload: {
			session: S.Struct({
				id: S.String,
				status: S.Literal("connected"),
				// connected_at: S.DateFromString,
			}),
		},
	}),
	makeMessageSchema({ message_type: "session_keepalive", payload: {} }),
);

export type EventSubMessage = (typeof EVENTSUB_MESSAGE)["Type"];
export const EVENTSUB_MESSAGE = S.Union(EVENTSUB_CONTROL_MESSAGES);

export function isEventSubMessageType<
	T extends EventSubMessage["metadata"]["message_type"],
>(
	msg: EventSubMessage,
	type: T,
): msg is Extract<EventSubMessage, { metadata: { message_type: T } }> {
	return msg.metadata.message_type === type;
}
