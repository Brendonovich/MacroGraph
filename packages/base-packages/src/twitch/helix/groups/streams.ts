import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const Pagination = S.Struct({
	cursor: S.String,
});

export const Stream = S.Struct({
	id: S.String,
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
	game_id: S.String,
	game_name: S.String,
	tag_ids: S.Array(S.String),
	tags: S.Array(S.String),
	is_mature: S.Boolean,
	type: S.Literal("live", "vodcast"),
	title: S.String,
	viewer_count: S.Int,
	started_at: S.DateFromString,
	language: S.String,
	thumbnail_url: S.String,
});

export const ManyStreams = S.Struct({
	data: S.Array(Stream),
	pagination: Pagination,
});

export const StreamsResponse = S.Struct({
	data: ManyStreams,
});

export const StreamKey = S.Struct({
	stream_key: S.String,
});

export const ManyStreamKeys = S.Struct({
	data: S.Array(StreamKey),
});

export const StreamKeysResponse = S.Struct({
	data: ManyStreamKeys,
});

export const Marker = S.Struct({
	id: S.String,
	created_at: S.DateFromString,
	description: S.String,
	position_seconds: S.Int,
	URL: S.String,
});

export const VideoMarker = S.Struct({
	video_id: S.String,
	markers: S.Array(Marker),
});

export const StreamMarker = S.Struct({
	user_id: S.String,
	user_name: S.String,
	user_login: S.String,
	videos: S.Array(VideoMarker),
});

export const ManyStreamMarkers = S.Struct({
	data: S.Array(StreamMarker),
	pagination: Pagination,
});

export const StreamMarkersResponse = S.Struct({
	data: ManyStreamMarkers,
});

export const CreateStreamMarker = S.Struct({
	id: S.String,
	created_at: S.DateFromString,
	description: S.String,
	position_seconds: S.Int,
});

export const ManyCreateStreamMarkers = S.Struct({
	data: S.Array(CreateStreamMarker),
});

export const CreateStreamMarkerResponse = S.Struct({
	data: ManyCreateStreamMarkers,
});

export const GetScheduleSegmentCategory = S.Struct({
	id: S.String,
	name: S.String,
});

export const GetScheduleSegment = S.Struct({
	id: S.String,
	start_time: S.DateFromString,
	end_time: S.DateFromString,
	title: S.String,
	canceled_until: S.optional(S.String),
	category: S.optional(GetScheduleSegmentCategory),
	is_recurring: S.Boolean,
});

export const GetScheduleVacation = S.Struct({
	start_time: S.DateFromString,
	end_time: S.DateFromString,
});

export const ScheduleData = S.Struct({
	segments: S.Array(GetScheduleSegment),
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	broadcaster_login: S.String,
	vacation: S.optional(GetScheduleVacation),
});

export const GetSchedulePagination = S.Struct({
	cursor: S.String,
});

export const GetScheduleData = S.Struct({
	data: ScheduleData,
	pagination: GetSchedulePagination,
});

export const GetScheduleResponse = S.Struct({
	data: GetScheduleData,
});

export const CreateScheduleSegmentData = S.Struct({
	data: ScheduleData,
});

export const CreateScheduleSegmentResponse = S.Struct({
	data: CreateScheduleSegmentData,
});

export const UpdateScheduleSegmentData = S.Struct({
	data: ScheduleData,
});

export const UpdateScheduleSegmentResponse = S.Struct({
	data: UpdateScheduleSegmentData,
});

export const StreamsGroup = HttpApiGroup.make("streams")
	.add(
		HttpApiEndpoint.get("getStreams", "/")
			.setUrlParams(
				S.Struct({
					after: S.optional(S.String),
					before: S.optional(S.String),
					first: S.optional(S.Int),
					game_id: S.optional(S.Array(S.String)),
					language: S.optional(S.Array(S.String)),
					type: S.optional(S.Literal("all", "live", "vodcast")),
					user_id: S.optional(S.Array(S.String)),
					user_login: S.optional(S.Array(S.String)),
				}),
			)
			.addSuccess(StreamsResponse),
	)
	.add(
		HttpApiEndpoint.get("getFollowedStreams", "/followed")
			.setUrlParams(
				S.Struct({
					after: S.optional(S.String),
					before: S.optional(S.String),
					first: S.optional(S.Int),
					user_id: S.String,
				}),
			)
			.addSuccess(StreamsResponse),
	)
	.add(
		HttpApiEndpoint.get("getStreamKey", "/key")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
				}),
			)
			.addSuccess(StreamKeysResponse),
	)
	.add(
		HttpApiEndpoint.get("getStreamMarkers", "/markers")
			.setUrlParams(
				S.Struct({
					user_id: S.optional(S.String),
					video_id: S.optional(S.String),
					after: S.optional(S.String),
					before: S.optional(S.String),
					first: S.optional(S.Int),
				}),
			)
			.addSuccess(StreamMarkersResponse),
	)
	.add(
		HttpApiEndpoint.post("createStreamMarker", "/markers")
			.setUrlParams(
				S.Struct({
					user_id: S.String,
					description: S.optional(S.String),
				}),
			)
			.addSuccess(CreateStreamMarkerResponse),
	)
	.prefix("/streams");

export const ScheduleGroup = HttpApiGroup.make("schedule")
	.add(
		HttpApiEndpoint.get("getSchedule", "/")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.optional(S.String),
					id: S.optional(S.String),
					start_time: S.optional(S.String),
					utc_offset: S.optional(S.String),
					first: S.optional(S.Int),
					after: S.optional(S.String),
				}),
			)
			.addSuccess(GetScheduleResponse),
	)
	.add(
		HttpApiEndpoint.post("createScheduleSegment", "/segment")
			.setPayload(
				S.Struct({
					broadcaster_id: S.String,
					start_time: S.String,
					timezone: S.String,
					duration: S.String,
					is_recurring: S.Boolean,
					category_id: S.optional(S.String),
					title: S.optional(S.String),
				}),
			)
			.addSuccess(CreateScheduleSegmentResponse),
	)
	.add(
		HttpApiEndpoint.patch("updateScheduleSegment", "/segment")
			.setPayload(
				S.Struct({
					broadcaster_id: S.String,
					id: S.String,
					start_time: S.optional(S.String),
					duration: S.optional(S.String),
					category_id: S.optional(S.String),
					title: S.optional(S.String),
					is_canceled: S.optional(S.Boolean),
					timezone: S.optional(S.String),
				}),
			)
			.addSuccess(UpdateScheduleSegmentResponse),
	)
	.add(
		HttpApiEndpoint.del("deleteScheduleSegment", "/segment").setPayload(
			S.Struct({
				broadcaster_id: S.String,
				id: S.String,
			}),
		),
	)
	.add(
		HttpApiEndpoint.patch("updateSchedule", "/settings")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					is_vacation_enabled: S.optional(S.Boolean),
					vacation_start_time: S.optional(S.String),
					vacation_end_time: S.optional(S.String),
					timezone: S.optional(S.String),
				}),
			)
			.addSuccess(S.Void),
	)
	.prefix("/schedule");
