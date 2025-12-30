import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const ChatChatter = S.Struct({
	user_login: S.String,
	user_id: S.String,
	user_name: S.String,
});

export const Pagination = S.Struct({
	cursor: S.String,
});

export const GetChatChattersResponse = S.Struct({
	data: S.Struct({
		data: S.Array(ChatChatter),
		pagination: Pagination,
		total: S.Int,
	}),
});

export const BadgeVersion = S.Struct({
	id: S.String,
	image_url_1x: S.String,
	image_url_2x: S.String,
	image_url_4x: S.String,
});

export const ChatBadge = S.Struct({
	set_id: S.String,
	versions: S.Array(BadgeVersion),
});

export const GetChatBadgeResponse = S.Struct({
	data: S.Array(ChatBadge),
});

export const EmoteImage = S.Struct({
	url_1x: S.String,
	url_2x: S.String,
	url_4x: S.String,
});

export const Emote = S.Struct({
	id: S.String,
	name: S.String,
	images: EmoteImage,
	tier: S.String,
	emote_type: S.String,
	emote_set_id: S.String,
});

export const EmoteWithOwner = S.Struct({
	id: S.String,
	name: S.String,
	images: EmoteImage,
	tier: S.String,
	emote_type: S.String,
	emote_set_id: S.String,
	owner_id: S.String,
});

export const GetChannelEmotesResponse = S.Struct({
	data: S.Array(Emote),
});

export const GetEmoteSetsResponse = S.Struct({
	data: S.Array(EmoteWithOwner),
});

export const ChatSettings = S.Struct({
	broadcaster_id: S.String,
	emote_mode: S.Boolean,
	follower_mode: S.Boolean,
	follower_mode_duration: S.Int,
	slow_mode: S.Boolean,
	slow_mode_wait_time: S.Int,
	subscriber_mode: S.Boolean,
	unique_chat_mode: S.Boolean,
	moderator_id: S.String,
	non_moderator_chat_delay: S.Boolean,
	non_moderator_chat_delay_duration: S.Int,
});

export const GetChatSettingsResponse = S.Struct({
	data: S.Array(ChatSettings),
});

export const UpdateChatSettingsResponse = S.Struct({
	data: S.Array(ChatSettings),
});

export const GetUserChatColorUser = S.Struct({
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
	color: S.String,
});

export const GetUserChatColorResponse = S.Struct({
	data: S.Struct({
		data: S.Array(GetUserChatColorUser),
	}),
});

export const DropReason = S.Struct({
	code: S.String,
	message: S.String,
});

export const ChatMessage = S.Struct({
	message_id: S.String,
	is_sent: S.Boolean,
	drop_reason: DropReason,
});

export const ChatMessageResponse = S.Struct({
	data: S.Struct({
		data: S.Array(ChatMessage),
	}),
});

export const ChatAnnouncementPayload = S.Struct({
	message: S.String,
	color: S.Union(
		S.Literal("blue"),
		S.Literal("green"),
		S.Literal("orange"),
		S.Literal("purple"),
		S.Literal("primary"),
	),
});

export const UpdateChatSettingsPayload = S.Struct({
	emote_mode: S.optional(S.Boolean),
	follower_mode: S.optional(S.Boolean),
	follower_mode_duration: S.optional(S.Int),
	non_moderator_chat_delay: S.optional(S.Boolean),
	non_moderator_chat_delay_duration: S.optional(
		S.Union(S.Literal(2), S.Literal(4), S.Literal(6)),
	),
	slow_mode: S.optional(S.Boolean),
	slow_mode_wait_time: S.optional(S.Int),
	subscriber_mode: S.optional(S.Boolean),
	unique_chat_mode: S.optional(S.Boolean),
});

export const SendChatMessagePayload = S.Struct({
	broadcaster_id: S.String,
	sender_id: S.String,
	message: S.String,
	reply_parent_message_id: S.optional(S.String),
});

export const ChatGroup = HttpApiGroup.make("chat")
	.add(
		HttpApiEndpoint.get("getChatChatters", "/chatters")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					moderator_id: S.String,
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(GetChatChattersResponse),
	)
	.add(
		HttpApiEndpoint.get("getChannelChatBadges", "/badges")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
				}),
			)
			.addSuccess(GetChatBadgeResponse),
	)
	.add(
		HttpApiEndpoint.get("getGlobalChatBadges", "/badges/global").addSuccess(
			GetChatBadgeResponse,
		),
	)
	.add(
		HttpApiEndpoint.get("getChannelEmotes", "/emotes")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
				}),
			)
			.addSuccess(GetChannelEmotesResponse),
	)
	.add(
		HttpApiEndpoint.get("getGlobalEmotes", "/emotes/global").addSuccess(
			GetChannelEmotesResponse,
		),
	)
	.add(
		HttpApiEndpoint.get("getEmoteSets", "/emotes/set")
			.setUrlParams(
				S.Struct({
					emote_set_id: S.Array(S.String),
				}),
			)
			.addSuccess(GetEmoteSetsResponse),
	)
	.add(
		HttpApiEndpoint.post("sendChatAnnouncement", "/announcements")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					moderator_id: S.String,
				}),
			)
			.setPayload(ChatAnnouncementPayload)
			.addSuccess(S.Void, { status: 200 }),
	)
	.add(
		HttpApiEndpoint.get("getChatSettings", "/settings")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					moderator_id: S.optional(S.String),
				}),
			)
			.addSuccess(GetChatSettingsResponse),
	)
	.add(
		HttpApiEndpoint.patch("updateChatSettings", "/settings")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					moderator_id: S.String,
				}),
			)
			.setPayload(UpdateChatSettingsPayload)
			.addSuccess(UpdateChatSettingsResponse),
	)
	.add(
		HttpApiEndpoint.get("getUserChatColor", "/color")
			.setUrlParams(
				S.Struct({
					user_id: S.String,
				}),
			)
			.addSuccess(GetUserChatColorResponse),
	)
	.add(
		HttpApiEndpoint.put("updateUserChatColor", "/color")
			.setUrlParams(
				S.Struct({
					user_id: S.String,
					color: S.String,
				}),
			)
			.addSuccess(S.Void, { status: 200 }),
	)
	.add(
		HttpApiEndpoint.post("sendChatMessage", "/messages")
			.setPayload(SendChatMessagePayload)
			.addSuccess(ChatMessageResponse),
	)
	.prefix("/chat");
