import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const ChannelInformation = S.Struct({
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	broadcaster_language: S.String,
	game_id: S.String,
	game_name: S.String,
	title: S.String,
	delay: S.Int,
	tags: S.Array(S.String),
});

export const EditChannelInformationParams = S.Struct({
	game_id: S.optional(S.String),
	broadcaster_language: S.optional(S.String),
	title: S.optional(S.String),
	delay: S.optional(S.Int),
	tags: S.optional(S.Array(S.String)),
});

export const ChannelFollow = S.Struct({
	user_id: S.String,
	user_name: S.String,
	user_login: S.String,
	followed_at: S.DateFromString,
});

export const Channel = S.Struct({
	id: S.String,
	game_id: S.String,
	game_name: S.String,
	broadcaster_login: S.String,
	display_name: S.String,
	language: S.String,
	title: S.String,
	tags: S.Array(S.String),
	thumbnail_url: S.String,
	is_live: S.Boolean,
	started_at: S.optional(S.DateFromString),
	tag_ids: S.Array(S.String),
});

export const ChannelEditor = S.Struct({
	user_id: S.String,
	user_name: S.String,
	created_at: S.DateFromString,
});

export const ChannelVips = S.Struct({
	user_id: S.String,
	user_name: S.String,
	user_login: S.String,
});

export const FollowedChannel = S.Struct({
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	broadcaster_login: S.String,
	followed_at: S.DateFromString,
});

export const Pagination = S.Struct({
	cursor: S.String,
});

export const ChannelsGroup = HttpApiGroup.make("channels")
	.add(
		HttpApiEndpoint.get("getChannelInformation", "/channels")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.optional(S.Array(S.String)),
				}),
			)
			.addSuccess(S.Struct({ data: S.Array(ChannelInformation) })),
	)
	.add(
		HttpApiEndpoint.patch("modifyChannelInformation", "/channels")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
				}),
			)
			.setPayload(EditChannelInformationParams)
			.addSuccess(S.Void, { status: 204 }),
	)
	.add(
		HttpApiEndpoint.get("getChannelFollowers", "/channels/followers")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					user_id: S.optional(S.String),
					first: S.optional(S.String),
					after: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(ChannelFollow),
					pagination: S.optional(Pagination),
					total: S.Int,
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("getFollowedChannels", "/channels/followed")
			.setUrlParams(
				S.Struct({
					user_id: S.String,
					broadcaster_id: S.optional(S.String),
					first: S.optional(S.String),
					after: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(FollowedChannel),
					pagination: S.optional(Pagination),
					total: S.Int,
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("searchChannels", "/search/channels")
			.setUrlParams(
				S.Struct({
					query: S.String,
					after: S.optional(S.String),
					first: S.optional(S.String),
					live_only: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(Channel),
					pagination: S.optional(Pagination),
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("getChannelEditors", "/channels/editors")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
				}),
			)
			.addSuccess(S.Struct({ data: S.Array(ChannelEditor) })),
	)
	.add(
		HttpApiEndpoint.get("getChannelVips", "/channels/vips")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					user_id: S.optional(S.String),
					first: S.optional(S.String),
					after: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(ChannelVips),
					pagination: S.optional(Pagination),
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("addChannelVip", "/channels/vips")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					user_id: S.String,
				}),
			)
			.addSuccess(S.Void, { status: 204 }),
	)
	.add(
		HttpApiEndpoint.del("removeChannelVip", "/channels/vips")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					user_id: S.String,
				}),
			)
			.addSuccess(S.Void, { status: 204 }),
	)
	.prefix("/channels");
