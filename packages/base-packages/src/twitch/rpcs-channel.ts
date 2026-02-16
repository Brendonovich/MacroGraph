import { Rpc } from "@effect/rpc";
import { Schema as S } from "effect";

import { Pagination } from "./helix/schemas/common";
import {
	Channel,
	ChannelEditor,
	ChannelFollow,
	ChannelInformation,
	FollowedChannel,
} from "./new-helix";
import { AccountId, RpcError } from "./new-types";

export const ChannelRpcs = [
	Rpc.make("GetChannelInformation", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.optional(S.Array(S.String)),
		}),
		success: S.Struct({ data: S.Array(ChannelInformation) }),
		error: RpcError,
	}),

	Rpc.make("ModifyChannelInformation", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			gameId: S.optional(S.String),
			broadcasterLanguage: S.optional(S.String),
			title: S.optional(S.String),
			delay: S.optional(S.Int),
			tags: S.optional(S.Array(S.String)),
		}),
		success: S.Void,
		error: RpcError,
	}),

	Rpc.make("GetChannelEditors", {
		payload: S.Struct({ accountId: AccountId, broadcasterId: S.String }),
		success: S.Struct({ data: S.Array(ChannelEditor) }),
		error: RpcError,
	}),

	Rpc.make("GetChannelFollowers", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			userId: S.optional(S.String),
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
			accountId: AccountId,
			userId: S.String,
			broadcasterId: S.optional(S.String),
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
			accountId: AccountId,
			query: S.String,
			after: S.optional(S.String),
			first: S.optional(S.String),
			liveOnly: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(Channel),
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),
] as const;
