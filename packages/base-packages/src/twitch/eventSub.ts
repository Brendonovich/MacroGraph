import { Schema as S } from "effect";

export type SubscriptionTypeDefinition = {
	type: string;
	version: number | string;
	condition: S.Struct.Fields;
	event: S.Struct.Fields;
};

function makeCreateSubscriptionBodySchema<
	const TDef extends SubscriptionTypeDefinition,
>(
	def: TDef,
): TDef extends SubscriptionTypeDefinition
	? S.Struct<{
			type: S.Literal<[TDef["type"]]>;
			version: S.Literal<[`${TDef["version"]}`]>;
			condition: S.Struct<TDef["condition"]>;
		}>
	: never {
	return S.Struct({
		type: S.Literal(def.type),
		version: S.Literal(`${def.version}`),
		condition: S.Struct(def.condition),
	}) as any;
}

// interface ESEvent {
// 	type: string;
// 	fields: Schema.Struct.Fields;
// }

// function ESEvent<Self>() {
// 	return <Type extends string, Fields extends Schema.Struct.Fields>(opts: {
// 		type: Type;
// 		fields: Fields;
// 	}) => {
// 		class TestEvent extends Schema.Class<TestEvent>("ABC")({
// 			...opts.fields,
// 		}) {}

// 		return class Event extends Schema.Class<Event>(opts.type)(opts.fields) {};
// 	};
// }

// class ChannelBan extends ESEvent<ChannelBan>()({
// 	type: "channel.ban",
// 	fields: {
// 		user_id: S.String,
// 		user_login: S.String,
// 		user_name: S.String,
// 		broadcaster_user_id: S.String,
// 		broadcaster_user_login: S.String,
// 		broadcaster_user_name: S.String,
// 		moderator_user_id: S.String,
// 		moderator_user_login: S.String,
// 		moderator_user_name: S.String,
// 		reason: S.String,
// 		banned_at: S.DateTimeUtc,
// 		ends_at: S.NullOr(S.DateTimeUtc),
// 		is_permanent: S.Boolean,
// 	},
// }) {}

export const subscriptionTypes = {
	channelBan: {
		type: "channel.ban",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,
			reason: S.String,
			banned_at: S.DateTimeUtc,
			ends_at: S.NullOr(S.DateTimeUtc),
			is_permanent: S.Boolean,
		},
	},
	hypeTrainProgressV2: {
		type: "channel.hype_train.progress",
		version: 2,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			level: S.Number,
			total: S.Number,
			progress: S.Number,
			goal: S.Number,

			top_contributions: S.Array(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					type: S.String, // bits | subscription | other
					total: S.Number,
				}),
			),

			shared_train_participants: S.NullOr(
				S.Array(
					S.Struct({
						broadcaster_user_id: S.String,
						broadcaster_user_login: S.String,
						broadcaster_user_name: S.String,
					}),
				),
			),
			started_at: S.DateTimeUtc,
			expires_at: S.DateTimeUtc,

			type: S.String, // regular | treasure | golden_kappa
			is_shared_train: S.Boolean,
		},
	},
	channelAdBreakBegin: {
		type: "channel.ad_break.begin",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			duration_seconds: S.Number,
			started_at: S.DateTimeUtc,
			is_automatic: S.Boolean,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			requester_user_id: S.String,
			requester_user_login: S.String,
			requester_user_name: S.String,
		},
	},
	channelBitsUse: {
		type: "channel.bits.use",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			bits: S.Number,
			type: S.String, // cheer | power_up

			message: S.NullOr(
				S.Struct({
					text: S.String,
					fragments: S.Array(
						S.Struct({
							text: S.String,
							type: S.String, // text | cheermote | emote

							emote: S.NullOr(
								S.Struct({
									id: S.String,
									emote_set_id: S.String,
									owner_id: S.String,
									format: S.Array(S.String), // animated | static
								}),
							),

							cheermote: S.NullOr(
								S.Struct({
									prefix: S.String,
									bits: S.Number,
									tier: S.Number,
								}),
							),
						}),
					),
				}),
			),

			power_up: S.NullOr(
				S.Struct({
					type: S.String, // message_effect | celebration | gigantify_an_emote

					emote: S.NullOr(
						S.Struct({
							id: S.String,
							name: S.String,
						}),
					),

					message_effect_id: S.NullOr(S.String),
				}),
			),
		},
	},
	channelChatClear: {
		type: "channel.chat.clear",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
		},
	},
	channelChatClearUserMessages: {
		type: "channel.chat.clear_user_messages",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			target_user_id: S.String,
			target_user_name: S.String,
			target_user_login: S.String,
		},
	},
	channelChatMessage: {
		type: "channel.chat.message",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
			user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			chatter_user_id: S.String,
			chatter_user_name: S.String,
			chatter_user_login: S.String,

			message_id: S.String,

			message: S.Struct({
				text: S.String,
				fragments: S.Array(
					S.Struct({
						type: S.String, // text | cheermote | emote | mention
						text: S.String,

						cheermote: S.NullOr(
							S.Struct({
								prefix: S.String,
								bits: S.Number,
								tier: S.Number,
							}),
						),

						emote: S.NullOr(
							S.Struct({
								id: S.String,
								emote_set_id: S.String,
								owner_id: S.String,
								format: S.Array(S.String), // animated | static
							}),
						),

						mention: S.NullOr(
							S.Struct({
								user_id: S.String,
								user_name: S.String,
								user_login: S.String,
							}),
						),
					}),
				),
			}),

			message_type: S.String,
			// text | channel_points_highlighted | channel_points_sub_only |
			// user_intro | power_ups_message_effect | power_ups_gigantified_emote

			badges: S.Array(
				S.Struct({
					set_id: S.String,
					id: S.String,
					info: S.String,
				}),
			),

			cheer: S.NullOr(
				S.Struct({
					bits: S.Number,
				}),
			),

			color: S.String,

			reply: S.NullOr(
				S.Struct({
					parent_message_id: S.String,
					parent_message_body: S.String,
					parent_user_id: S.String,
					parent_user_name: S.String,
					parent_user_login: S.String,

					thread_message_id: S.String,
					thread_user_id: S.String,
					thread_user_name: S.String,
					thread_user_login: S.String,
				}),
			),

			channel_points_custom_reward_id: S.NullOr(S.String),

			source_broadcaster_user_id: S.NullOr(S.String),
			source_broadcaster_user_name: S.NullOr(S.String),
			source_broadcaster_user_login: S.NullOr(S.String),
			source_message_id: S.NullOr(S.String),

			source_badges: S.NullOr(
				S.Array(
					S.Struct({
						set_id: S.String,
						id: S.String,
						info: S.String,
					}),
				),
			),

			is_source_only: S.NullOr(S.Boolean),
		},
	},
	channelChatMessageDelete: {
		type: "channel.chat.message_delete",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			target_user_id: S.String,
			target_user_name: S.String,
			target_user_login: S.String,

			message_id: S.String,
		},
	},
	channelChatNotification: {
		type: "channel.chat.notification",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
			user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			chatter_user_id: S.String,
			chatter_user_login: S.String,
			chatter_user_name: S.String,
			chatter_is_anonymous: S.Boolean,

			color: S.String,

			badges: S.Array(
				S.Struct({
					set_id: S.String,
					id: S.String,
					info: S.String,
				}),
			),

			system_message: S.String,
			message_id: S.String,

			message: S.Struct({
				// Docs list this as object; actual payload is string
				text: S.String,
				fragments: S.Array(
					S.Struct({
						type: S.String, // text | cheermote | emote | mention
						text: S.String,

						cheermote: S.NullOr(
							S.Struct({
								prefix: S.String,
								bits: S.Number,
								tier: S.Number,
							}),
						),

						emote: S.NullOr(
							S.Struct({
								id: S.String,
								emote_set_id: S.String,
								owner_id: S.String,
								format: S.Array(S.String), // animated | static
							}),
						),

						mention: S.NullOr(
							S.Struct({
								user_id: S.String,
								user_name: S.String,
								user_login: S.String,
							}),
						),
					}),
				),
			}),

			notice_type: S.String,

			sub: S.NullOr(
				S.Struct({
					sub_tier: S.String,
					is_prime: S.Boolean,
					duration_months: S.Number,
				}),
			),

			resub: S.NullOr(
				S.Struct({
					cumulative_months: S.Number,
					duration_months: S.Number,
					streak_months: S.Number,
					sub_tier: S.String,
					is_prime: S.NullOr(S.Boolean),
					is_gift: S.Boolean,
					gifter_is_anonymous: S.NullOr(S.Boolean),
					gifter_user_id: S.NullOr(S.String),
					gifter_user_name: S.NullOr(S.String),
					gifter_user_login: S.NullOr(S.String),
				}),
			),

			sub_gift: S.NullOr(
				S.Struct({
					duration_months: S.Number,
					cumulative_total: S.NullOr(S.Number),
					recipient_user_id: S.String,
					recipient_user_name: S.String,
					recipient_user_login: S.String,
					sub_tier: S.String,
					community_gift_id: S.NullOr(S.String),
				}),
			),

			community_sub_gift: S.NullOr(
				S.Struct({
					id: S.String,
					total: S.Number,
					sub_tier: S.String,
					cumulative_total: S.NullOr(S.Number),
				}),
			),

			gift_paid_upgrade: S.NullOr(
				S.Struct({
					gifter_is_anonymous: S.Boolean,
					gifter_user_id: S.NullOr(S.String),
					gifter_user_name: S.NullOr(S.String),
				}),
			),

			prime_paid_upgrade: S.NullOr(
				S.Struct({
					sub_tier: S.String,
				}),
			),

			pay_it_forward: S.NullOr(
				S.Struct({
					gifter_is_anonymous: S.Boolean,
					gifter_user_id: S.String,
					gifter_user_name: S.NullOr(S.String),
					gifter_user_login: S.String,
				}),
			),

			raid: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_name: S.String,
					user_login: S.String,
					viewer_count: S.Number,
					profile_image_url: S.String,
				}),
			),

			unraid: S.NullOr(S.Struct({})),

			announcement: S.NullOr(
				S.Struct({
					color: S.String,
				}),
			),

			bits_badge_tier: S.NullOr(
				S.Struct({
					tier: S.Number,
				}),
			),

			charity_donation: S.NullOr(
				S.Struct({
					charity_name: S.String,
					amount: S.Struct({
						value: S.Number,
						decimal_place: S.Number,
						currency: S.String,
					}),
				}),
			),

			source_broadcaster_user_id: S.NullOr(S.String),
			source_broadcaster_user_name: S.NullOr(S.String),
			source_broadcaster_user_login: S.NullOr(S.String),
			source_message_id: S.NullOr(S.String),

			source_badges: S.NullOr(
				S.Array(
					S.Struct({
						set_id: S.String,
						id: S.String,
						info: S.String,
					}),
				),
			),

			shared_chat_sub: S.NullOr(
				S.Struct({
					sub_tier: S.String,
					is_prime: S.Boolean,
					duration_months: S.Number,
				}),
			),

			shared_chat_resub: S.NullOr(
				S.Struct({
					cumulative_months: S.Number,
					duration_months: S.Number,
					streak_months: S.Number,
					sub_tier: S.String,
					is_prime: S.NullOr(S.Boolean),
					is_gift: S.Boolean,
					gifter_is_anonymous: S.NullOr(S.Boolean),
					gifter_user_id: S.NullOr(S.String),
					gifter_user_name: S.NullOr(S.String),
					gifter_user_login: S.NullOr(S.String),
				}),
			),

			shared_chat_sub_gift: S.NullOr(
				S.Struct({
					duration_months: S.Number,
					cumulative_total: S.NullOr(S.Number),
					recipient_user_id: S.String,
					recipient_user_name: S.String,
					recipient_user_login: S.String,
					sub_tier: S.String,
					community_gift_id: S.NullOr(S.String),
				}),
			),

			shared_chat_community_sub_gift: S.NullOr(
				S.Struct({
					id: S.String,
					total: S.Number,
					sub_tier: S.String,
					cumulative_total: S.NullOr(S.Number),
				}),
			),

			shared_chat_gift_paid_upgrade: S.NullOr(
				S.Struct({
					gifter_is_anonymous: S.Boolean,
					gifter_user_id: S.NullOr(S.String),
					gifter_user_name: S.NullOr(S.String),
				}),
			),

			shared_chat_prime_paid_upgrade: S.NullOr(
				S.Struct({
					sub_tier: S.String,
				}),
			),

			shared_chat_pay_it_forward: S.NullOr(
				S.Struct({
					gifter_is_anonymous: S.Boolean,
					gifter_user_id: S.String,
					gifter_user_name: S.NullOr(S.String),
					gifter_user_login: S.String,
				}),
			),

			shared_chat_raid: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_name: S.String,
					user_login: S.String,
					viewer_count: S.Number,
					profile_image_url: S.String,
				}),
			),

			shared_chat_announcement: S.NullOr(
				S.Struct({
					color: S.String,
				}),
			),
		},
	},
	channelChatSettingsUpdate: {
		type: "channel.chat_settings.update",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			emote_mode: S.Boolean,

			follower_mode: S.Boolean,
			follower_mode_duration_minutes: S.NullOr(S.Number),

			slow_mode: S.Boolean,
			slow_mode_wait_time_seconds: S.NullOr(S.Number),

			subscriber_mode: S.Boolean,
			unique_chat_mode: S.Boolean,
		},
	},
	channelChatUserMessageHold: {
		type: "channel.chat.user_message_hold",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
			user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			message_id: S.String,

			message: S.Struct({
				text: S.String,
				fragments: S.Array(
					S.Struct({
						text: S.String,

						emote: S.NullOr(
							S.Struct({
								id: S.String,
								emote_set_id: S.String,
							}),
						),

						cheermote: S.NullOr(
							S.Struct({
								prefix: S.String,
								bits: S.Number,
								tier: S.Number,
							}),
						),
					}),
				),
			}),
		},
	},
	channelChatUserMessageUpdate: {
		type: "channel.chat.user_message_update",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
			user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			status: S.String, // approved | denied | invalid

			message_id: S.String,

			message: S.Struct({
				text: S.String,
				fragments: S.Array(
					S.Struct({
						text: S.String,

						emote: S.NullOr(
							S.Struct({
								id: S.String,
								emote_set_id: S.String,
							}),
						),

						cheermote: S.NullOr(
							S.Struct({
								prefix: S.String,
								bits: S.Number,
								tier: S.Number,
							}),
						),
					}),
				),
			}),
		},
	},
	channelSubscribe: {
		type: "channel.subscribe",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			tier: S.String, // 1000 | 2000 | 3000
			is_gift: S.Boolean,
		},
	},
	channelCheer: {
		type: "channel.cheer",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			is_anonymous: S.Boolean,

			user_id: S.NullOr(S.String),
			user_login: S.NullOr(S.String),
			user_name: S.NullOr(S.String),

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			message: S.String,
			bits: S.Number,
		},
	},
	channelUpdate: {
		type: "channel.update",
		version: 2,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			title: S.String,
			language: S.String,

			category_id: S.String,
			category_name: S.String,

			content_classification_labels: S.Array(S.String),
		},
	},
	channelUnban: {
		type: "channel.unban",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,
		},
	},

	channelUnbanRequestCreate: {
		type: "channel.unban_request.create",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			text: S.String,
			created_at: S.DateTimeUtc,
		},
	},

	channelUnbanRequestResolve: {
		type: "channel.unban_request.resolve",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			moderator_id: S.NullOr(S.String),
			moderator_login: S.NullOr(S.String),
			moderator_name: S.NullOr(S.String),

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			resolution_text: S.NullOr(S.String),

			status: S.String, // approved | canceled | denied
		},
	},

	channelRaid: {
		type: "channel.raid",
		version: 1,
		condition: {
			to_broadcaster_user_id: S.String,
		},
		event: {
			from_broadcaster_user_id: S.String,
			from_broadcaster_user_login: S.String,
			from_broadcaster_user_name: S.String,

			to_broadcaster_user_id: S.String,
			to_broadcaster_user_login: S.String,
			to_broadcaster_user_name: S.String,

			viewers: S.Number,
		},
	},

	automodSettingsUpdate: {
		type: "automod.settings.update",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
			moderator_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,

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
	channelModerate: {
		type: "channel.moderate",
		version: 2,
		condition: {
			broadcaster_user_id: S.String,
			moderator_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			source_broadcaster_user_id: S.String,
			source_broadcaster_user_login: S.String,
			source_broadcaster_user_name: S.NullOr(S.String),

			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,

			action: S.String,

			followers: S.NullOr(
				S.Struct({
					follow_duration_minutes: S.Number,
				}),
			),

			slow: S.NullOr(
				S.Struct({
					wait_time_seconds: S.Number,
				}),
			),

			vip: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
				}),
			),

			unvip: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
				}),
			),

			mod: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
				}),
			),

			unmod: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
				}),
			),

			ban: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					reason: S.NullOr(S.String),
				}),
			),

			unban: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
				}),
			),

			timeout: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					reason: S.NullOr(S.String),
					expires_at: S.DateTimeUtc,
				}),
			),

			untimeout: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
				}),
			),

			raid: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					viewer_count: S.Number,
				}),
			),

			unraid: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
				}),
			),

			delete: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					message_id: S.String,
					message_body: S.String,
				}),
			),

			automod_terms: S.NullOr(
				S.Struct({
					action: S.String, // add | remove
					list: S.String, // blocked | permitted
					terms: S.Array(S.String),
					from_automod: S.Boolean,
				}),
			),

			unban_request: S.NullOr(
				S.Struct({
					is_approved: S.Boolean,
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					moderator_message: S.String,
				}),
			),

			warn: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					reason: S.NullOr(S.String),
					chat_rules_cited: S.NullOr(S.Array(S.String)),
				}),
			),

			shared_chat_ban: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					reason: S.NullOr(S.String),
				}),
			),

			shared_chat_unban: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
				}),
			),

			shared_chat_timeout: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					reason: S.NullOr(S.String),
					expires_at: S.DateTimeUtc,
				}),
			),

			shared_chat_untimeout: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
				}),
			),

			shared_chat_delete: S.NullOr(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					message_id: S.String,
					message_body: S.String,
				}),
			),
		},
	},
	channelModeratorAdd: {
		type: "channel.moderator.add",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
		},
	},

	channelModeratorRemove: {
		type: "channel.moderator.remove",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
		},
	},

	channelGuestStarSessionBegin: {
		type: "channel.guest_star_session.begin",
		version: "beta",
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			session_id: S.String,
			started_at: S.DateTimeUtc,
		},
	},

	channelGuestStarSessionEnd: {
		type: "channel.guest_star_session.end",
		version: "beta",
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			session_id: S.String,
			started_at: S.DateTimeUtc,
			ended_at: S.DateTimeUtc,

			host_user_id: S.String,
			host_user_name: S.String,
			host_user_login: S.String,
		},
	},

	automodTermsUpdate: {
		type: "automod.terms.update",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
			moderator_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,

			action: S.String, // add_permitted | remove_permitted | add_blocked | remove_blocked
			from_automod: S.Boolean,
			terms: S.Array(S.String),
		},
	},
	channelGuestStarGuestUpdate: {
		type: "channel.guest_star_guest.update",
		version: "beta",
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			session_id: S.String,

			moderator_user_id: S.NullOr(S.String),
			moderator_user_name: S.NullOr(S.String),
			moderator_user_login: S.NullOr(S.String),

			guest_user_id: S.NullOr(S.String),
			guest_user_name: S.NullOr(S.String),
			guest_user_login: S.NullOr(S.String),

			slot_id: S.NullOr(S.String),
			state: S.NullOr(S.String),

			host_user_id: S.String,
			host_user_name: S.String,
			host_user_login: S.String,

			host_video_enabled: S.NullOr(S.Boolean),
			host_audio_enabled: S.NullOr(S.Boolean),
			host_volume: S.NullOr(S.Number),
		},
	},
	channelPollBegin: {
		type: "channel.poll.begin",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			title: S.String,

			choices: S.Array(
				S.Struct({
					id: S.String,
					title: S.String,
					bits_votes: S.Number,
					channel_points_votes: S.Number,
					votes: S.Number,
				}),
			),

			bits_voting: S.Struct({
				is_enabled: S.Boolean,
				amount_per_vote: S.Number,
			}),

			channel_points_voting: S.Struct({
				is_enabled: S.Boolean,
				amount_per_vote: S.Number,
			}),

			started_at: S.DateTimeUtc,
			ends_at: S.DateTimeUtc,
		},
	},

	channelPollProgress: {
		type: "channel.poll.progress",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			title: S.String,

			choices: S.Array(
				S.Struct({
					id: S.String,
					title: S.String,
					bits_votes: S.Number,
					channel_points_votes: S.Number,
					votes: S.Number,
				}),
			),

			bits_voting: S.Struct({
				is_enabled: S.Boolean,
				amount_per_vote: S.Number,
			}),

			channel_points_voting: S.Struct({
				is_enabled: S.Boolean,
				amount_per_vote: S.Number,
			}),

			started_at: S.DateTimeUtc,
			ends_at: S.DateTimeUtc,
		},
	},

	channelPollEnd: {
		type: "channel.poll.end",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			title: S.String,

			choices: S.Array(
				S.Struct({
					id: S.String,
					title: S.String,
					bits_votes: S.Number,
					channel_points_votes: S.Number,
					votes: S.Number,
				}),
			),

			bits_voting: S.Struct({
				is_enabled: S.Boolean,
				amount_per_vote: S.Number,
			}),

			channel_points_voting: S.Struct({
				is_enabled: S.Boolean,
				amount_per_vote: S.Number,
			}),

			status: S.String, // completed | archived | terminated

			started_at: S.DateTimeUtc,
			ended_at: S.DateTimeUtc,
		},
	},
	channelPointsAutomaticRewardRedemptionAddV2: {
		type: "channel.channel_points_automatic_reward_redemption.add",
		version: 2,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			id: S.String,

			reward: S.Struct({
				type: S.String, // single_message_bypass_sub_mode | send_highlighted_message | random_sub_emote_unlock | chosen_sub_emote_unlock | chosen_modified_sub_emote_unlock
				channel_points: S.Number,

				emote: S.NullOr(
					S.Struct({
						id: S.String,
						name: S.String,
					}),
				),
			}),

			message: S.NullOr(
				S.Struct({
					text: S.String,
					fragments: S.Array(
						S.Struct({
							text: S.String,
							type: S.String, // text | emote
							emote: S.NullOr(
								S.Struct({
									id: S.String,
								}),
							),
						}),
					),
				}),
			),

			redeemed_at: S.DateTimeUtc,
		},
	},
	// ------------------------------------
	// Channel Prediction Begin Event
	// ------------------------------------

	channelPredictionBegin: {
		type: "channel.prediction.begin",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			title: S.String,

			outcomes: S.Array(
				S.Struct({
					id: S.String,
					title: S.String,
					color: S.String, // pink | blue
					users: S.Number,
					channel_points: S.Number,
					top_predictors: S.Array(
						S.Struct({
							user_id: S.String,
							user_login: S.String,
							user_name: S.String,
							channel_points_won: S.Null,
							channel_points_used: S.Number,
						}),
					),
				}),
			),

			started_at: S.DateTimeUtc,
			locks_at: S.DateTimeUtc,
		},
	},

	// ------------------------------------
	// Channel Prediction Progress Event
	// ------------------------------------

	channelPredictionProgress: {
		type: "channel.prediction.progress",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			title: S.String,

			outcomes: S.Array(
				S.Struct({
					id: S.String,
					title: S.String,
					color: S.String, // pink | blue
					users: S.Number,
					channel_points: S.Number,
					top_predictors: S.Array(
						S.Struct({
							user_id: S.String,
							user_login: S.String,
							user_name: S.String,
							channel_points_won: S.Null,
							channel_points_used: S.Number,
						}),
					),
				}),
			),

			started_at: S.DateTimeUtc,
			locks_at: S.DateTimeUtc,
		},
	},

	// ------------------------------------
	// Channel Prediction Lock Event
	// ------------------------------------

	channelPredictionLock: {
		type: "channel.prediction.lock",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			title: S.String,

			outcomes: S.Array(
				S.Struct({
					id: S.String,
					title: S.String,
					color: S.String, // pink | blue
					users: S.Number,
					channel_points: S.Number,
					top_predictors: S.Array(
						S.Struct({
							user_id: S.String,
							user_login: S.String,
							user_name: S.String,
							channel_points_won: S.Null,
							channel_points_used: S.Number,
						}),
					),
				}),
			),

			started_at: S.DateTimeUtc,
			locked_at: S.DateTimeUtc,
		},
	},

	// ------------------------------------
	// Channel Prediction End Event
	// ------------------------------------

	channelPredictionEnd: {
		type: "channel.prediction.end",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			title: S.String,

			winning_outcome_id: S.NullOr(S.String),

			outcomes: S.Array(
				S.Struct({
					id: S.String,
					title: S.String,
					color: S.String, // pink | blue
					users: S.Number,
					channel_points: S.Number,
					top_predictors: S.Array(
						S.Struct({
							user_id: S.String,
							user_login: S.String,
							user_name: S.String,
							channel_points_won: S.Number,
							channel_points_used: S.Number,
						}),
					),
				}),
			),

			status: S.String, // resolved | canceled

			started_at: S.DateTimeUtc,
			ended_at: S.DateTimeUtc,
		},
	},
	channelSharedChatSessionBegin: {
		type: "channel.shared_chat.session.begin",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			session_id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			host_broadcaster_user_id: S.String,
			host_broadcaster_user_name: S.String,
			host_broadcaster_user_login: S.String,

			participants: S.Array(
				S.Struct({
					broadcaster_user_id: S.String,
					broadcaster_user_name: S.String,
					broadcaster_user_login: S.String,
				}),
			),
		},
	},

	channelSharedChatSessionUpdate: {
		type: "channel.shared_chat.session.update",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			session_id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			host_broadcaster_user_id: S.String,
			host_broadcaster_user_name: S.String,
			host_broadcaster_user_login: S.String,

			participants: S.Array(
				S.Struct({
					broadcaster_user_id: S.String,
					broadcaster_user_name: S.String,
					broadcaster_user_login: S.String,
				}),
			),
		},
	},

	channelSharedChatSessionEnd: {
		type: "channel.shared_chat.session.end",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			session_id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			host_broadcaster_user_id: S.String,
			host_broadcaster_user_name: S.String,
			host_broadcaster_user_login: S.String,
		},
	},
	channelSubscriptionEnd: {
		type: "channel.subscription.end",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			tier: S.String, // "1000" | "2000" | "3000"
			is_gift: S.Boolean,
		},
	},

	channelSubscriptionGift: {
		type: "channel.subscription.gift",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			user_id: S.NullOr(S.String),
			user_login: S.NullOr(S.String),
			user_name: S.NullOr(S.String),

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			total: S.Number,
			tier: S.String,
			cumulative_total: S.NullOr(S.Number),
			is_anonymous: S.Boolean,
		},
	},
	channelSubscriptionMessage: {
		type: "channel.subscription.message",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			tier: S.String, // "1000" | "2000" | "3000"

			message: S.Struct({
				text: S.String,
				emotes: S.Array(
					S.Struct({
						id: S.String,
						begin: S.Number,
						end: S.Number,
					}),
				),
			}),

			cumulative_months: S.Number,
			streak_months: S.NullOr(S.Number),
			duration_months: S.Number,
		},
	},
	channelSuspiciousUserUpdate: {
		type: "channel.suspicious_user.update",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			moderator_user_id: S.String,
			moderator_user_name: S.String,
			moderator_user_login: S.String,

			user_id: S.String,
			user_name: S.String,
			user_login: S.String,

			low_trust_status: S.String, // "none" | "active_monitoring" | "restricted"
		},
	},

	channelSuspiciousUserMessage: {
		type: "channel.suspicious_user.message",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			user_id: S.String,
			user_name: S.String,
			user_login: S.String,

			low_trust_status: S.String, // "none" | "active_monitoring" | "restricted"
			shared_ban_channel_ids: S.Array(S.String),
			types: S.Array(S.String), // "manually_added" | "ban_evader" | "banned_in_shared_channel"
			ban_evasion_evaluation: S.String, // "unknown" | "possible" | "likely"

			message: S.Struct({
				message_id: S.String,
				text: S.String,
				fragments: S.Array(
					S.Struct({
						type: S.String, // "text" | "cheermote" | "emote"
						text: S.String,
						cheermote: S.NullOr(
							S.Struct({
								prefix: S.String,
								bits: S.String,
								tier: S.String,
							}),
						),
						emote: S.NullOr(
							S.Struct({
								id: S.String,
								emote_set_id: S.String,
							}),
						),
					}),
				),
			}),
		},
	},
	channelVipAdd: {
		type: "channel.vip.add",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
		},
	},

	channelVipRemove: {
		type: "channel.vip.remove",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
		},
	},

	channelWarningAcknowledge: {
		type: "channel.warning.acknowledge",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
		},
	},

	channelWarningSend: {
		type: "channel.warning.send",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			reason: S.NullOr(S.String),
			chat_rules_cited: S.NullOr(S.Array(S.String)),
		},
	},
	channelCharityCampaignDonate: {
		type: "channel.charity_campaign.donate",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,
			campaign_id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			charity_name: S.String,
			charity_description: S.String,
			charity_logo: S.String,
			charity_website: S.String,

			amount: S.Struct({
				value: S.Number,
				decimal_places: S.Number,
				currency: S.String,
			}),
		},
	},

	channelCharityCampaignStart: {
		type: "channel.charity_campaign.start",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_id: S.String,
			broadcaster_login: S.String,
			broadcaster_name: S.String,

			charity_name: S.String,
			charity_description: S.String,
			charity_logo: S.String,
			charity_website: S.String,

			current_amount: S.Struct({
				value: S.Number,
				decimal_places: S.Number,
				currency: S.String,
			}),

			target_amount: S.Struct({
				value: S.Number,
				decimal_places: S.Number,
				currency: S.String,
			}),

			started_at: S.DateTimeUtc,
		},
	},

	channelCharityCampaignProgress: {
		type: "channel.charity_campaign.progress",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_id: S.String,
			broadcaster_login: S.String,
			broadcaster_name: S.String,

			charity_name: S.String,
			charity_description: S.String,
			charity_logo: S.String,
			charity_website: S.String,

			current_amount: S.Struct({
				value: S.Number,
				decimal_places: S.Number,
				currency: S.String,
			}),

			target_amount: S.Struct({
				value: S.Number,
				decimal_places: S.Number,
				currency: S.String,
			}),
		},
	},

	channelCharityCampaignStop: {
		type: "channel.charity_campaign.stop",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_id: S.String,
			broadcaster_login: S.String,
			broadcaster_name: S.String,

			charity_name: S.String,
			charity_description: S.String,
			charity_logo: S.String,
			charity_website: S.String,

			current_amount: S.Struct({
				value: S.Number,
				decimal_places: S.Number,
				currency: S.String,
			}),

			target_amount: S.Struct({
				value: S.Number,
				decimal_places: S.Number,
				currency: S.String,
			}),

			stopped_at: S.DateTimeUtc,
		},
	},

	dropEntitlementGrant: {
		type: "drop.entitlement.grant",
		version: 1,
		condition: {
			organization_id: S.String,
		},
		event: {
			id: S.String,

			data: S.Array(
				S.Struct({
					organization_id: S.String,
					category_id: S.String,
					category_name: S.String,
					campaign_id: S.String,

					user_id: S.String,
					user_name: S.String,
					user_login: S.String,

					entitlement_id: S.String,
					benefit_id: S.String,

					created_at: S.DateTimeUtc,
				}),
			),
		},
	},
	channelGoalBegin: {
		type: "channel.goal.begin",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			type: S.String, // follow | subscription | subscription_count | new_subscription | new_subscription_count | new_bit | new_cheerer
			description: S.NullOr(S.String),

			current_amount: S.Number,
			target_amount: S.Number,

			started_at: S.DateTimeUtc,
		},
	},

	channelGoalProgress: {
		type: "channel.goal.progress",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			type: S.String,
			description: S.NullOr(S.String),

			current_amount: S.Number,
			target_amount: S.Number,

			started_at: S.DateTimeUtc,
		},
	},

	channelGoalEnd: {
		type: "channel.goal.end",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			type: S.String,
			description: S.NullOr(S.String),

			is_achieved: S.Boolean,

			current_amount: S.Number,
			target_amount: S.Number,

			started_at: S.DateTimeUtc,
			ended_at: S.DateTimeUtc,
		},
	},
	channelHypeTrainBeginV2: {
		type: "channel.hype_train.begin",
		version: 2,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			total: S.Number,
			progress: S.Number,
			goal: S.Number,

			top_contributions: S.Array(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					type: S.String, // bits | subscription | other
					total: S.Number,
				}),
			),

			level: S.Number,
			all_time_high_level: S.Number,
			all_time_high_total: S.Number,

			shared_train_participants: S.NullOr(
				S.Array(
					S.Struct({
						broadcaster_user_id: S.String,
						broadcaster_user_login: S.String,
						broadcaster_user_name: S.String,
					}),
				),
			),

			started_at: S.DateTimeUtc,
			expires_at: S.DateTimeUtc,

			type: S.String, // treasure | golden_kappa | regular
			is_shared_train: S.Boolean,
		},
	},

	channelHypeTrainProgressV2: {
		type: "channel.hype_train.progress",
		version: 2,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			total: S.Number,
			progress: S.Number,
			goal: S.Number,

			top_contributions: S.Array(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					type: S.String, // bits | subscription | other
					total: S.Number,
				}),
			),

			level: S.Number,

			shared_train_participants: S.NullOr(
				S.Array(
					S.Struct({
						broadcaster_user_id: S.String,
						broadcaster_user_login: S.String,
						broadcaster_user_name: S.String,
					}),
				),
			),

			started_at: S.DateTimeUtc,
			expires_at: S.DateTimeUtc,

			type: S.String, // treasure | golden_kappa | regular
			is_shared_train: S.Boolean,
		},
	},

	channelHypeTrainEndV2: {
		type: "channel.hype_train.end",
		version: 2,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			total: S.Number,

			top_contributions: S.Array(
				S.Struct({
					user_id: S.String,
					user_login: S.String,
					user_name: S.String,
					type: S.String, // bits | subscription | other
					total: S.Number,
				}),
			),

			level: S.Number,

			shared_train_participants: S.NullOr(
				S.Array(
					S.Struct({
						broadcaster_user_id: S.String,
						broadcaster_user_login: S.String,
						broadcaster_user_name: S.String,
					}),
				),
			),

			started_at: S.DateTimeUtc,
			cooldown_ends_at: S.DateTimeUtc,
			ended_at: S.DateTimeUtc,

			type: S.String, // treasure | golden_kappa | regular
			is_shared_train: S.Boolean,
		},
	},
	streamOnline: {
		type: "stream.online",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			type: S.String, // live | playlist | watch_party | premiere | rerun
			started_at: S.DateTimeUtc,
		},
	},

	streamOffline: {
		type: "stream.offline",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
		},
	},
	userUpdate: {
		type: "user.update",
		version: 1,
		condition: {
			user_id: S.String,
		},
		event: {
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			email: S.String,
			email_verified: S.Boolean,

			description: S.String,
		},
	},
	userWhisperMessage: {
		type: "user.whisper.message",
		version: 1,
		condition: {
			user_id: S.String,
		},
		event: {
			from_user_id: S.String,
			from_user_name: S.String,
			from_user_login: S.String,

			to_user_id: S.String,
			to_user_name: S.String,
			to_user_login: S.String,

			whisper_id: S.String,

			whisper: S.Struct({
				text: S.String,
			}),
		},
	},
	channelPointsCustomRewardAdd: {
		type: "channel.channel_points_custom_reward.add",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			is_enabled: S.Boolean,
			is_paused: S.Boolean,
			is_in_stock: S.Boolean,

			title: S.String,
			cost: S.Number,
			prompt: S.String,

			is_user_input_required: S.Boolean,
			should_redemptions_skip_request_queue: S.Boolean,

			max_per_stream: S.Struct({
				is_enabled: S.Boolean,
				value: S.Number,
			}),

			max_per_user_per_stream: S.Struct({
				is_enabled: S.Boolean,
				value: S.Number,
			}),

			background_color: S.String,

			image: S.NullOr(
				S.Struct({
					url_1x: S.String,
					url_2x: S.String,
					url_4x: S.String,
				}),
			),

			default_image: S.Struct({
				url_1x: S.String,
				url_2x: S.String,
				url_4x: S.String,
			}),

			global_cooldown: S.Struct({
				is_enabled: S.Boolean,
				seconds: S.Number,
			}),

			cooldown_expires_at: S.NullOr(S.DateTimeUtc),

			redemptions_redeemed_current_stream: S.NullOr(S.Number),
		},
	},
	channelShieldModeBegin: {
		type: "channel.shield_mode.begin",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,

			started_at: S.DateTimeUtc,
		},
	},

	channelShieldModeEnd: {
		type: "channel.shield_mode.end",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,

			ended_at: S.DateTimeUtc,
		},
	},

	channelShoutoutCreate: {
		type: "channel.shoutout.create",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			to_broadcaster_user_id: S.String,
			to_broadcaster_user_login: S.String,
			to_broadcaster_user_name: S.String,

			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,

			viewer_count: S.Number,

			started_at: S.DateTimeUtc,
			cooldown_ends_at: S.DateTimeUtc,
			target_cooldown_ends_at: S.DateTimeUtc,
		},
	},

	channelShoutoutReceive: {
		type: "channel.shoutout.receive",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			from_broadcaster_user_id: S.String,
			from_broadcaster_user_login: S.String,
			from_broadcaster_user_name: S.String,

			viewer_count: S.Number,

			started_at: S.DateTimeUtc,
		},
	},

	channelPointsCustomRewardUpdate: {
		type: "channel.channel_points_custom_reward.update",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			is_enabled: S.Boolean,
			is_paused: S.Boolean,
			is_in_stock: S.Boolean,

			title: S.String,
			cost: S.Number,
			prompt: S.String,

			is_user_input_required: S.Boolean,
			should_redemptions_skip_request_queue: S.Boolean,

			max_per_stream: S.Struct({
				is_enabled: S.Boolean,
				value: S.Number,
			}),

			max_per_user_per_stream: S.Struct({
				is_enabled: S.Boolean,
				value: S.Number,
			}),

			background_color: S.String,

			image: S.NullOr(
				S.Struct({
					url_1x: S.String,
					url_2x: S.String,
					url_4x: S.String,
				}),
			),

			default_image: S.Struct({
				url_1x: S.String,
				url_2x: S.String,
				url_4x: S.String,
			}),

			global_cooldown: S.Struct({
				is_enabled: S.Boolean,
				seconds: S.Number,
			}),

			cooldown_expires_at: S.NullOr(S.DateTimeUtc),

			redemptions_redeemed_current_stream: S.NullOr(S.Number),
		},
	},

	channelPointsCustomRewardRemove: {
		type: "channel.channel_points_custom_reward.remove",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			is_enabled: S.Boolean,
			is_paused: S.Boolean,
			is_in_stock: S.Boolean,

			title: S.String,
			cost: S.Number,
			prompt: S.String,

			is_user_input_required: S.Boolean,
			should_redemptions_skip_request_queue: S.Boolean,

			max_per_stream: S.Struct({
				is_enabled: S.Boolean,
				value: S.Number,
			}),

			max_per_user_per_stream: S.Struct({
				is_enabled: S.Boolean,
				value: S.Number,
			}),

			background_color: S.String,

			image: S.NullOr(
				S.Struct({
					url_1x: S.String,
					url_2x: S.String,
					url_4x: S.String,
				}),
			),

			default_image: S.Struct({
				url_1x: S.String,
				url_2x: S.String,
				url_4x: S.String,
			}),

			global_cooldown: S.Struct({
				is_enabled: S.Boolean,
				seconds: S.Number,
			}),

			cooldown_expires_at: S.NullOr(S.DateTimeUtc),

			redemptions_redeemed_current_stream: S.NullOr(S.Number),
		},
	},
	channelPointsCustomRewardRedemptionAdd: {
		type: "channel.channel_points_custom_reward_redemption.add",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			user_input: S.String,

			status: S.String, // unknown | unfulfilled | fulfilled | canceled

			reward: S.Struct({
				id: S.String,
				title: S.String,
				cost: S.Number,
				prompt: S.String,
			}),

			redeemed_at: S.DateTimeUtc,
		},
	},

	channelPointsCustomRewardRedemptionUpdate: {
		type: "channel.channel_points_custom_reward_redemption.update",
		version: 1,
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			id: S.String,

			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			user_input: S.String,

			status: S.String, // unknown | unfulfilled | fulfilled | canceled

			reward: S.Struct({
				id: S.String,
				title: S.String,
				cost: S.Number,
				prompt: S.String,
			}),

			redeemed_at: S.DateTimeUtc,
		},
	},

	channelGuestStarSettingsUpdate: {
		type: "channel.guest_star_settings.update",
		version: "beta",
		condition: {
			broadcaster_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,

			is_moderator_send_live_enabled: S.Boolean,
			slot_count: S.Number,
			is_browser_source_audio_enabled: S.Boolean,

			group_layout: S.String,
		},
	},

	automodMessageHoldV2: {
		type: "automod.message.hold",
		version: 2,
		condition: {
			broadcaster_user_id: S.String,
			moderator_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			message_id: S.String,

			message: S.Struct({
				text: S.String,
				fragments: S.Array(
					S.Struct({
						type: S.String, // text | emote | cheermote
						text: S.String,

						emote: S.NullOr(
							S.Struct({
								id: S.String,
								emote_set_id: S.String,
							}),
						),

						cheermote: S.NullOr(
							S.Struct({
								prefix: S.String,
								bits: S.Number,
								tier: S.Number,
							}),
						),
					}),
				),
			}),

			held_at: S.DateTimeUtc,

			reason: S.String, // automod | blocked_term

			automod: S.NullOr(
				S.Struct({
					category: S.String,
					level: S.Number,
					boundaries: S.Array(
						S.Struct({
							start_pos: S.Number,
							end_pos: S.Number,
						}),
					),
				}),
			),

			blocked_term: S.NullOr(
				S.Struct({
					terms_found: S.Array(
						S.Struct({
							term_id: S.String,
							boundary: S.Struct({
								start_pos: S.Number,
								end_pos: S.Number,
							}),
							owner_broadcaster_user_id: S.String,
							owner_broadcaster_user_login: S.String,
							owner_broadcaster_user_name: S.String,
						}),
					),
				}),
			),
		},
	},

	automodMessageUpdateV2: {
		type: "automod.message.update",
		version: 2,
		condition: {
			broadcaster_user_id: S.String,
			moderator_user_id: S.String,
		},
		event: {
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,

			user_id: S.String,
			user_login: S.String,
			user_name: S.String,

			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,

			message_id: S.String,

			message: S.Struct({
				text: S.String,
				fragments: S.Array(
					S.Struct({
						type: S.String, // text | emote | cheermote
						text: S.String,

						emote: S.NullOr(
							S.Struct({
								id: S.String,
								emote_set_id: S.String,
							}),
						),

						cheermote: S.NullOr(
							S.Struct({
								prefix: S.String,
								bits: S.Number,
								tier: S.Number,
							}),
						),
					}),
				),
			}),

			status: S.String, // Approved | Denied | Expired

			held_at: S.DateTimeUtc,

			reason: S.String, // automod | blocked_term

			automod: S.NullOr(
				S.Struct({
					category: S.String,
					level: S.Number,
					boundaries: S.Array(
						S.Struct({
							start_pos: S.Number,
							end_pos: S.Number,
						}),
					),
				}),
			),

			blocked_term: S.NullOr(
				S.Struct({
					terms_found: S.Array(
						S.Struct({
							term_id: S.String,
							boundary: S.Struct({
								start_pos: S.Number,
								end_pos: S.Number,
							}),
							owner_broadcaster_user_id: S.String,
							owner_broadcaster_user_login: S.String,
							owner_broadcaster_user_name: S.String,
						}),
					),
				}),
			),
		},
	},

	channelFollow: {
		type: "channel.follow",
		version: 2,
		condition: {
			broadcaster_user_id: S.String,
			moderator_user_id: S.String,
		},
		event: {
			user_id: S.String,
			broadcaster_user_id: S.String,
			followed_at: S.DateFromString,
		},
	},
} as const satisfies Record<string, SubscriptionTypeDefinition>;

export const EVENTSUB_CREATE_SUBSCRIPTION_BODY = S.Union(
	...Object.values(subscriptionTypes).map(makeCreateSubscriptionBodySchema),
);

const EVENTSUB_NOTIFICATION_MESSAGES = S.Union(
	...Object.values(subscriptionTypes).map(makeNotificationMessageSchema),
);

const EVENTSUB_CONTROL_MESSAGES = S.Union(
	makeMessageSchema({
		message_type: "session_welcome",
		payload: {
			session: S.Struct({
				id: S.String,
				status: S.Literal("connected"),
				connected_at: S.DateFromString,
			}),
		},
	}),
	makeMessageSchema({
		message_type: "session_keepalive",
		payload: {},
	}),
);

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

function makeNotificationMessageSchema<TDef extends SubscriptionTypeDefinition>(
	def: TDef,
): TDef extends SubscriptionTypeDefinition
	? S.Struct<{
			metadata: S.Struct<
				ReturnType<
					typeof makeMessageSchema<"notification", TDef["event"]>
				>["fields"]["metadata"]["fields"] & {
					subscription_type: S.Literal<[TDef["type"]]>;
					subscription_version: typeof S.String;
				}
			>;
			payload: ReturnType<
				typeof makeMessageSchema<
					TDef["type"],
					{
						subscription: S.Struct<{
							id: typeof S.String;
							type: S.Literal<[TDef["type"]]>;
							created_at: typeof S.DateFromString;
						}>;
						event: S.Struct<TDef["event"]>;
					}
				>
			>["fields"]["payload"];
		}>
	: never {
	const s = makeMessageSchema({
		message_type: "notification",
		payload: {
			subscription: S.Struct({
				id: S.String,
				type: S.Literal(def.type as TDef["type"]),
				created_at: S.DateFromString,
			}),
			event: S.Struct(def.event as TDef["event"]),
		},
	});

	return S.Struct({
		metadata: S.Struct({
			...s.fields.metadata.fields,
			subscription_type: S.Literal(def.type as TDef["type"]),
			subscription_version: S.String,
		}),
		payload: s.fields.payload,
	}) as any;
}

export type EventSubMessage = (typeof EVENTSUB_MESSAGE)["Type"];
export const EVENTSUB_MESSAGE = S.Union(
	EVENTSUB_CONTROL_MESSAGES,
	EVENTSUB_NOTIFICATION_MESSAGES,
);

export function isEventSubNotificationMessage(
	msg: EventSubMessage,
): msg is S.Schema.Type<typeof EVENTSUB_NOTIFICATION_MESSAGES> {
	return msg.metadata.message_type === "notification";
}

export function isEventSubMessageType<
	T extends EventSubMessage["metadata"]["message_type"],
>(
	msg: EventSubMessage,
	type: T,
): msg is Extract<EventSubMessage, { metadata: { message_type: T } }> {
	return msg.metadata.message_type === type;
}

type EventSubNotificationMessage = Extract<
	EventSubMessage,
	{ metadata: { message_type: "notification" } }
>;

export function isNotificationType<
	T extends EventSubNotificationMessage["metadata"]["subscription_type"],
>(
	msg: EventSubNotificationMessage,
	type: T,
): msg is Extract<
	EventSubNotificationMessage,
	{ metadata: { subscription_type: T } }
> {
	return msg.metadata.subscription_type === type;
}
