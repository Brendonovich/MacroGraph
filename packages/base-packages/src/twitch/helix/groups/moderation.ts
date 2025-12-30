import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const Ban = S.Struct({
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
	expires_at: S.String,
});

export const BanUserRequestBody = S.Struct({
	user_id: S.String,
	reason: S.String,
	duration: S.optional(S.String),
});

export const BanUser = S.Struct({
	broadcaster_id: S.String,
	created_at: S.String,
	end_time: S.String,
	moderator_id: S.String,
	user_id: S.String,
});

export const BlockedTerm = S.Struct({
	broadcaster_id: S.String,
	created_at: S.String,
	expires_at: S.String,
	id: S.String,
	moderator_id: S.String,
	text: S.String,
	updated_at: S.String,
});

export const AddBlockedTermRequestBody = S.Struct({
	text: S.String,
});

export const RemoveBlockedTermRequestBody = S.Struct({
	broadcaster_id: S.String,
	moderator_id: S.String,
	id: S.String,
});

export const Moderator = S.Struct({
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
});

export const ModeratedChannel = S.Struct({
	broadcaster_id: S.String,
	broadcaster_login: S.String,
	broadcaster_name: S.String,
});

export const ModeratorWarnChatMessage = S.Struct({
	broadcaster_id: S.String,
	moderator_id: S.String,
	user_id: S.String,
	reason: S.String,
});

export const SendModeratorWarnMessageRequestBody = S.Struct({
	user_id: S.String,
	reason: S.String,
});

export const Pagination = S.Struct({
	cursor: S.String,
});

export const GetBannedUsersResponse = S.Struct({
	data: S.Struct({
		data: S.Array(Ban),
		pagination: Pagination,
	}),
});

export const BanUserResponse = S.Struct({
	data: S.Array(BanUser),
});

export const GetBlockedTermsResponse = S.Struct({
	data: S.Struct({
		data: S.Array(BlockedTerm),
		pagination: Pagination,
	}),
});

export const AddBlockedTermResponse = S.Struct({
	data: S.Array(BlockedTerm),
});

export const GetModeratorsResponse = S.Struct({
	data: S.Struct({
		data: S.Array(Moderator),
		pagination: Pagination,
	}),
});

export const GetModeratedChannelsResponse = S.Struct({
	data: S.Struct({
		data: S.Array(ModeratedChannel),
		pagination: Pagination,
	}),
});

export const SendModeratorWarnMessageResponse = S.Struct({
	data: S.Array(ModeratorWarnChatMessage),
});

export const ModerationGroup = HttpApiGroup.make("moderation")
	.add(
		HttpApiEndpoint.get("getBannedUsers", "/banned")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					user_id: S.optional(S.Array(S.String)),
					after: S.optional(S.String),
					before: S.optional(S.String),
				}),
			)
			.addSuccess(GetBannedUsersResponse),
	)
	.add(
		HttpApiEndpoint.post("banUser", "/banned")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					moderator_id: S.String,
				}),
			)
			.setPayload(BanUserRequestBody)
			.addSuccess(BanUserResponse),
	)
	.add(
		HttpApiEndpoint.del("unbanUser", "/banned").setUrlParams(
			S.Struct({
				broadcaster_id: S.String,
				moderator_id: S.String,
				user_id: S.String,
			}),
		),
	)
	.add(
		HttpApiEndpoint.get("getBlockedTerms", "/blocked_terms")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					moderator_id: S.String,
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(GetBlockedTermsResponse),
	)
	.add(
		HttpApiEndpoint.post("addBlockedTerm", "/blocked_terms")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					moderator_id: S.String,
				}),
			)
			.setPayload(AddBlockedTermRequestBody)
			.addSuccess(AddBlockedTermResponse),
	)
	.add(
		HttpApiEndpoint.del("removeBlockedTerm", "/blocked_terms").setPayload(
			RemoveBlockedTermRequestBody,
		),
	)
	.add(
		HttpApiEndpoint.del("deleteChatMessage", "/chat").setUrlParams(
			S.Struct({
				broadcaster_id: S.String,
				moderator_id: S.String,
				message_id: S.String,
			}),
		),
	)
	.add(
		HttpApiEndpoint.get("getModerators", "/moderators")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					user_id: S.optional(S.Array(S.String)),
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(GetModeratorsResponse),
	)
	.add(
		HttpApiEndpoint.post("addChannelModerator", "/moderators").setUrlParams(
			S.Struct({
				broadcaster_id: S.String,
				user_id: S.String,
			}),
		),
	)
	.add(
		HttpApiEndpoint.del("removeChannelModerator", "/moderators").setUrlParams(
			S.Struct({
				broadcaster_id: S.String,
				user_id: S.String,
			}),
		),
	)
	.add(
		HttpApiEndpoint.get("getModeratedChannels", "/channels")
			.setUrlParams(
				S.Struct({
					user_id: S.String,
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(GetModeratedChannelsResponse),
	)
	.add(
		HttpApiEndpoint.post("sendModeratorWarnMessage", "/warnings")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					moderator_id: S.String,
				}),
			)
			.setPayload(SendModeratorWarnMessageRequestBody)
			.addSuccess(SendModeratorWarnMessageResponse),
	)
	.add(
		HttpApiEndpoint.post(
			"moderateHeldMessage",
			"/automod/message",
		).setUrlParams(
			S.Struct({
				user_id: S.String,
				msg_id: S.String,
				action: S.Union(S.Literal("ALLOW"), S.Literal("DENY")),
			}),
		),
	)
	.prefix("/moderation");
