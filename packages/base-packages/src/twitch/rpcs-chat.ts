import { Rpc } from "@effect/rpc";
import { Schema as S } from "effect";

import {
	ChatBadge,
	ChatChatter,
	ChatMessage,
	ChatSettings,
	Cheermotes,
	Emote,
	EmoteWithOwner,
	GetUserChatColorUser,
} from "./helix";
import { Pagination } from "./helix/schemas/common";
import { AccountId, RpcError } from "./new-types";

export const ChatRpcs = [
	Rpc.make("SendChatMessage", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			sender_id: S.String,
			message: S.String,
			reply_parent_message_id: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Struct({ data: S.Array(ChatMessage) }) }),
		error: RpcError,
	}),

	Rpc.make("SendChatAnnouncement", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			moderator_id: S.String,
			message: S.String,
			color: S.Union(
				S.Literal("blue"),
				S.Literal("green"),
				S.Literal("orange"),
				S.Literal("purple"),
				S.Literal("primary"),
			),
		}),
		error: RpcError,
	}),

	Rpc.make("GetChatSettings", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			moderator_id: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(ChatSettings) }),
		error: RpcError,
	}),

	Rpc.make("UpdateChatSettings", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			moderator_id: S.String,
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
		}),
		success: S.Struct({ data: S.Array(ChatSettings) }),
		error: RpcError,
	}),

	Rpc.make("GetChatChatters", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			moderator_id: S.String,
			after: S.optional(S.String),
			first: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Struct({
				data: S.Array(ChatChatter),
				pagination: Pagination,
				total: S.Int,
			}),
		}),
		error: RpcError,
	}),

	Rpc.make("GetChannelChatBadges", {
		payload: S.Struct({ account_id: AccountId, broadcaster_id: S.String }),
		success: S.Struct({ data: S.Array(ChatBadge) }),
		error: RpcError,
	}),

	Rpc.make("GetGlobalChatBadges", {
		payload: S.Struct({ account_id: AccountId }),
		success: S.Struct({ data: S.Array(ChatBadge) }),
		error: RpcError,
	}),

	Rpc.make("GetChannelEmotes", {
		payload: S.Struct({ account_id: AccountId, broadcaster_id: S.String }),
		success: S.Struct({ data: S.Array(Emote) }),
		error: RpcError,
	}),

	Rpc.make("GetGlobalEmotes", {
		payload: S.Struct({ account_id: AccountId }),
		success: S.Struct({ data: S.Array(Emote) }),
		error: RpcError,
	}),

	Rpc.make("GetEmoteSets", {
		payload: S.Struct({
			account_id: AccountId,
			emote_set_id: S.Array(S.String),
		}),
		success: S.Struct({ data: S.Array(EmoteWithOwner) }),
		error: RpcError,
	}),

	Rpc.make("GetCheermotes", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(Cheermotes) }),
		error: RpcError,
	}),

	Rpc.make("GetUserChatColor", {
		payload: S.Struct({ account_id: AccountId, user_id: S.String }),
		success: S.Struct({
			data: S.Struct({ data: S.Array(GetUserChatColorUser) }),
		}),
		error: RpcError,
	}),

	Rpc.make("UpdateUserChatColor", {
		payload: S.Struct({
			account_id: AccountId,
			user_id: S.String,
			color: S.String,
		}),
		error: RpcError,
	}),
] as const;
