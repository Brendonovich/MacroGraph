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
import { RpcError, TwitchAPIError } from "./new-shared";

const IntFromString = S.NumberFromString.pipe(S.int());

export const StreamRpcs = [
	Rpc.make("GetStreams", {
		payload: S.Struct({
			accountId: S.String,
			after: S.optional(S.String),
			before: S.optional(S.String),
			first: S.optional(IntFromString),
			gameId: S.optional(S.Array(S.String)),
			language: S.optional(S.Array(S.String)),
			type: S.optional(S.Literal("all", "live", "vodcast")),
			userId: S.optional(S.Array(S.String)),
			userLogin: S.optional(S.Array(S.String)),
		}),
		success: S.Struct({
			data: S.Struct({ data: S.Array(Stream), pagination: Pagination }),
		}),
		error: RpcError,
	}),
	Rpc.make("GetFollowedStreams", {
		payload: S.Struct({
			accountId: S.String,
			after: S.optional(S.String),
			before: S.optional(S.String),
			first: S.optional(IntFromString),
			userId: S.String,
		}),
		success: S.Struct({
			data: S.Struct({ data: S.Array(Stream), pagination: Pagination }),
		}),
		error: RpcError,
	}),
	Rpc.make("GetStreamKey", {
		payload: S.Struct({ accountId: S.String, broadcasterId: S.String }),
		success: S.Struct({ data: S.Struct({ data: S.Array(StreamKey) }) }),
		error: RpcError,
	}),
	Rpc.make("GetStreamMarkers", {
		payload: S.Struct({
			accountId: S.String,
			userId: S.optional(S.String),
			videoId: S.optional(S.String),
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
			accountId: S.String,
			userId: S.String,
			description: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Struct({ data: S.Array(CreateStreamMarker) }),
		}),
		error: RpcError,
	}),
	Rpc.make("GetVideos", {
		payload: S.Struct({
			accountId: S.String,
			id: S.optional(S.Array(S.String)),
			userId: S.optional(S.String),
			gameId: S.optional(S.String),
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
		payload: S.Struct({ accountId: S.String, id: S.Array(S.String) }),
		success: S.Void,
		error: RpcError,
	}),
	Rpc.make("GetClips", {
		payload: S.Struct({
			accountId: S.String,
			broadcasterId: S.optional(S.String),
			gameId: S.optional(S.String),
			id: S.optional(S.Array(S.String)),
			first: S.optional(S.String),
			after: S.optional(S.String),
			before: S.optional(S.String),
			startedAt: S.optional(S.String),
			endedAt: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(Clip),
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),
	Rpc.make("CreateClip", {
		payload: S.Struct({
			accountId: S.String,
			broadcasterId: S.String,
			hasDelay: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(ClipEditURL) }),
		error: RpcError,
	}),
] as const;
