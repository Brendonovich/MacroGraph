import { Rpc } from "@effect/rpc";
import { Schema as S } from "effect";

import { Pagination } from "./helix/schemas/common";
import {
	ChatBadge,
	ChatChatter,
	ChatMessage,
	ChatSettings,
	Cheermotes,
	Emote,
	EmoteWithOwner,
	GetUserChatColorUser,
} from "./new-helix";
import { RpcError, TwitchAPIError } from "./new-shared";

export const ChatRpcs = [
	Rpc.make("SendChatMessage", {
		payload: S.Struct({
			accountId: S.String,
			broadcasterId: S.String,
			senderId: S.String,
			message: S.String,
			replyParentMessageId: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Struct({ data: S.Array(ChatMessage) }) }),
		error: RpcError,
	}),

	Rpc.make("SendChatAnnouncement", {
		payload: S.Struct({
			accountId: S.String,
			broadcasterId: S.String,
			moderatorId: S.String,
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
			accountId: S.String,
			broadcasterId: S.String,
			moderatorId: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(ChatSettings) }),
		error: RpcError,
	}),

	Rpc.make("UpdateChatSettings", {
		payload: S.Struct({
			accountId: S.String,
			broadcasterId: S.String,
			moderatorId: S.String,
			emoteMode: S.optional(S.Boolean),
			followerMode: S.optional(S.Boolean),
			followerModeDuration: S.optional(S.Int),
			nonModeratorChatDelay: S.optional(S.Boolean),
			nonModeratorChatDelayDuration: S.optional(
				S.Union(S.Literal(2), S.Literal(4), S.Literal(6)),
			),
			slowMode: S.optional(S.Boolean),
			slowModeWaitTime: S.optional(S.Int),
			subscriberMode: S.optional(S.Boolean),
			uniqueChatMode: S.optional(S.Boolean),
		}),
		success: S.Struct({ data: S.Array(ChatSettings) }),
		error: RpcError,
	}),

	Rpc.make("GetChatChatters", {
		payload: S.Struct({
			accountId: S.String,
			broadcasterId: S.String,
			moderatorId: S.String,
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
		payload: S.Struct({ accountId: S.String, broadcasterId: S.String }),
		success: S.Struct({ data: S.Array(ChatBadge) }),
		error: RpcError,
	}),

	Rpc.make("GetGlobalChatBadges", {
		payload: S.Struct({ accountId: S.String }),
		success: S.Struct({ data: S.Array(ChatBadge) }),
		error: RpcError,
	}),

	Rpc.make("GetChannelEmotes", {
		payload: S.Struct({ accountId: S.String, broadcasterId: S.String }),
		success: S.Struct({ data: S.Array(Emote) }),
		error: RpcError,
	}),

	Rpc.make("GetGlobalEmotes", {
		payload: S.Struct({ accountId: S.String }),
		success: S.Struct({ data: S.Array(Emote) }),
		error: RpcError,
	}),

	Rpc.make("GetEmoteSets", {
		payload: S.Struct({ accountId: S.String, emoteSetId: S.Array(S.String) }),
		success: S.Struct({ data: S.Array(EmoteWithOwner) }),
		error: RpcError,
	}),

	Rpc.make("GetCheermotes", {
		payload: S.Struct({
			accountId: S.String,
			broadcasterId: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(Cheermotes) }),
		error: RpcError,
	}),

	Rpc.make("GetUserChatColor", {
		payload: S.Struct({ accountId: S.String, userId: S.String }),
		success: S.Struct({
			data: S.Struct({ data: S.Array(GetUserChatColorUser) }),
		}),
		error: RpcError,
	}),

	Rpc.make("UpdateUserChatColor", {
		payload: S.Struct({
			accountId: S.String,
			userId: S.String,
			color: S.String,
		}),
		error: RpcError,
	}),
] as const;
