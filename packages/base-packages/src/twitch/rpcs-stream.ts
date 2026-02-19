import { Rpc } from "@effect/rpc";
import { Schema as S } from "effect";

import { Pagination } from "./helix/schemas/common";
import {
	Clip,
	ClipEditURL,
	CreateStreamMarker,
	Stream,
	StreamKey,
	StreamMarker,
	Video,
} from "./new-helix";
import { AccountId, RpcError } from "./new-types";

const IntFromString = S.NumberFromString.pipe(S.int());

export const StreamRpcs = [
	Rpc.make("GetStreams", {
		payload: S.Struct({
			account_id: AccountId,
			after: S.optional(S.String),
			before: S.optional(S.String),
			first: S.optional(IntFromString),
			game_id: S.optional(S.Array(S.String)),
			language: S.optional(S.Array(S.String)),
			type: S.optional(S.Literal("all", "live", "vodcast")),
			user_id: S.optional(S.Array(S.String)),
			user_login: S.optional(S.Array(S.String)),
		}),
		success: S.Struct({
			data: S.Struct({ data: S.Array(Stream), pagination: Pagination }),
		}),
		error: RpcError,
	}),
	Rpc.make("GetFollowedStreams", {
		payload: S.Struct({
			account_id: AccountId,
			after: S.optional(S.String),
			before: S.optional(S.String),
			first: S.optional(IntFromString),
			user_id: S.String,
		}),
		success: S.Struct({
			data: S.Struct({ data: S.Array(Stream), pagination: Pagination }),
		}),
		error: RpcError,
	}),
	Rpc.make("GetStreamKey", {
		payload: S.Struct({ account_id: AccountId, broadcaster_id: S.String }),
		success: S.Struct({ data: S.Struct({ data: S.Array(StreamKey) }) }),
		error: RpcError,
	}),
	Rpc.make("GetStreamMarkers", {
		payload: S.Struct({
			account_id: AccountId,
			user_id: S.optional(S.String),
			video_id: S.optional(S.String),
			after: S.optional(S.String),
			before: S.optional(S.String),
			first: S.optional(IntFromString),
		}),
		success: S.Struct({
			data: S.Struct({ data: S.Array(StreamMarker), pagination: Pagination }),
		}),
		error: RpcError,
	}),
	Rpc.make("CreateStreamMarker", {
		payload: S.Struct({
			account_id: AccountId,
			user_id: S.String,
			description: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Struct({ data: S.Array(CreateStreamMarker) }),
		}),
		error: RpcError,
	}),
	Rpc.make("GetVideos", {
		payload: S.Struct({
			account_id: AccountId,
			id: S.optional(S.Array(S.String)),
			user_id: S.optional(S.String),
			game_id: S.optional(S.String),
			after: S.optional(S.String),
			before: S.optional(S.String),
			first: S.optional(S.String),
			language: S.optional(S.String),
			period: S.optional(S.Literal("all", "day", "week", "month")),
			sort: S.optional(S.Literal("time", "trending", "views")),
			type: S.optional(S.Literal("all", "upload", "archive", "highlight")),
		}),
		success: S.Struct({
			data: S.Struct({ data: S.Array(Video), pagination: Pagination }),
		}),
		error: RpcError,
	}),
	Rpc.make("DeleteVideos", {
		payload: S.Struct({ account_id: AccountId, id: S.Array(S.String) }),
		success: S.Void,
		error: RpcError,
	}),
	Rpc.make("GetClips", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.optional(S.String),
			game_id: S.optional(S.String),
			id: S.optional(S.Array(S.String)),
			first: S.optional(S.String),
			after: S.optional(S.String),
			before: S.optional(S.String),
			started_at: S.optional(S.String),
			ended_at: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(Clip),
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),
	Rpc.make("CreateClip", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			has_delay: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(ClipEditURL) }),
		error: RpcError,
	}),
] as const;
