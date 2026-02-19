import { Rpc } from "@effect/rpc";
import { Schema as S } from "effect";

import { Pagination } from "./helix/schemas/common";
import { ChannelVips, UserBlocked } from "./new-helix";
import { AccountId, RpcError } from "./new-types";

export const ModerationRpcs = [
	Rpc.make("AddChannelVip", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			user_id: S.String,
		}),
		error: RpcError,
	}),
	Rpc.make("RemoveChannelVip", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			user_id: S.String,
		}),
		error: RpcError,
	}),
	Rpc.make("GetChannelVips", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			user_id: S.optional(S.String),
			first: S.optional(S.String),
			after: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(ChannelVips),
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),
	Rpc.make("BlockUser", {
		payload: S.Struct({
			account_id: AccountId,
			target_user_id: S.String,
			source_context: S.optional(
				S.Union(S.Literal("chat"), S.Literal("whisper")),
			),
			reason: S.optional(
				S.Union(S.Literal("spam"), S.Literal("harassment"), S.Literal("other")),
			),
		}),
		error: RpcError,
	}),
	Rpc.make("UnblockUser", {
		payload: S.Struct({ account_id: AccountId, target_user_id: S.String }),
		error: RpcError,
	}),
	Rpc.make("GetUsersBlocked", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			after: S.optional(S.String),
			first: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(UserBlocked),
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),
] as const;
