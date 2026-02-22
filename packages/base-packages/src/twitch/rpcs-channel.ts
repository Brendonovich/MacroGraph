import { Rpc } from "@effect/rpc";
import { Schema as S } from "effect";

import {
	Channel,
	ChannelEditor,
	ChannelFollow,
	ChannelInformation,
	FollowedChannel,
} from "./helix";
import { Pagination } from "./helix/schemas/common";
import { AccountId, RpcError } from "./new-types";

export const ChannelRpcs = [
	Rpc.make("GetChannelInformation", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.optional(S.Array(S.String)),
		}),
		success: S.Struct({ data: S.Array(ChannelInformation) }),
		error: RpcError,
	}),

	Rpc.make("ModifyChannelInformation", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			game_id: S.optional(S.String),
			broadcaster_language: S.optional(S.String),
			title: S.optional(S.String),
			delay: S.optional(S.Int),
			tags: S.optional(S.Array(S.String)),
		}),
		success: S.Void,
		error: RpcError,
	}),

	Rpc.make("GetChannelEditors", {
		payload: S.Struct({ account_id: AccountId, broadcaster_id: S.String }),
		success: S.Struct({ data: S.Array(ChannelEditor) }),
		error: RpcError,
	}),

	Rpc.make("GetChannelFollowers", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			user_id: S.optional(S.String),
			first: S.optional(S.String),
			after: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(ChannelFollow),
			pagination: S.optional(Pagination),
			total: S.Int,
		}),
		error: RpcError,
	}),

	Rpc.make("GetFollowedChannels", {
		payload: S.Struct({
			account_id: AccountId,
			user_id: S.String,
			broadcaster_id: S.optional(S.String),
			first: S.optional(S.String),
			after: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(FollowedChannel),
			pagination: S.optional(Pagination),
			total: S.Int,
		}),
		error: RpcError,
	}),

	Rpc.make("SearchChannels", {
		payload: S.Struct({
			account_id: AccountId,
			query: S.String,
			after: S.optional(S.String),
			first: S.optional(S.String),
			live_only: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(Channel),
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),
] as const;
