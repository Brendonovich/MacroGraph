import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const DateRange = S.Struct({
	started_at: S.String,
	ended_at: S.String,
});

export const Pagination = S.Struct({
	cursor: S.String,
});

export const ExtensionAnalytic = S.Struct({
	extension_id: S.String,
	URL: S.String,
	type: S.String,
	date_range: DateRange,
});

export const GameAnalytic = S.Struct({
	game_id: S.String,
	URL: S.String,
	type: S.String,
	date_range: DateRange,
});

export const Video = S.Struct({
	id: S.String,
	stream_id: S.String,
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
	title: S.String,
	description: S.String,
	created_at: S.DateFromString,
	published_at: S.DateFromString,
	url: S.String,
	thumbnail_url: S.String,
	viewable: S.Literal("public", "private"),
	view_count: S.Int,
	language: S.String,
	type: S.Literal("upload", "archive", "highlight"),
	duration: S.String,
	muted_segments: S.Array(
		S.Struct({
			duration: S.Int,
			offset: S.Int,
		}),
	),
});

export const Subscription = S.Struct({
	broadcaster_id: S.String,
	broadcaster_login: S.String,
	broadcaster_name: S.String,
	is_gift: S.Boolean,
	gifter_id: S.optional(S.String),
	gifter_login: S.optional(S.String),
	gifter_name: S.optional(S.String),
	tier: S.String,
	plan_name: S.String,
	user_id: S.String,
	user_name: S.String,
	user_login: S.String,
});

export const UserSubscription = S.Struct({
	broadcaster_id: S.String,
	broadcaster_login: S.String,
	broadcaster_name: S.String,
	is_gift: S.Boolean,
	gifter_login: S.optional(S.String),
	gifter_name: S.optional(S.String),
	tier: S.String,
});

export const AnalyticsGroup = HttpApiGroup.make("analytics")
	.add(
		HttpApiEndpoint.get("getExtensionAnalytics", "/extensions")
			.setUrlParams(
				S.Struct({
					extension_id: S.String,
					first: S.optional(S.String),
					after: S.optional(S.String),
					started_at: S.optional(S.String),
					ended_at: S.optional(S.String),
					type: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(ExtensionAnalytic),
						pagination: Pagination,
					}),
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("getGameAnalytics", "/games")
			.setUrlParams(
				S.Struct({
					game_id: S.String,
					first: S.optional(S.String),
					after: S.optional(S.String),
					started_at: S.optional(S.String),
					ended_at: S.optional(S.String),
					type: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(GameAnalytic),
						pagination: Pagination,
					}),
				}),
			),
	)
	.prefix("/analytics");

export const VideosGroup = HttpApiGroup.make("videos")
	.add(
		HttpApiEndpoint.get("getVideos", "/")
			.setUrlParams(
				S.Struct({
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
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(Video),
						pagination: Pagination,
					}),
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("deleteVideos", "/").setUrlParams(
			S.Struct({
				id: S.Array(S.String),
			}),
		),
	)
	.prefix("/videos");

export const SubscriptionsGroup = HttpApiGroup.make("subscriptions")
	.add(
		HttpApiEndpoint.get("getSubscriptions", "/")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					user_id: S.optional(S.Array(S.String)),
					after: S.optional(S.String),
					before: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(Subscription),
						pagination: Pagination,
						total: S.Int,
						points: S.Int,
					}),
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("checkUserSubscription", "/user")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					user_id: S.String,
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(UserSubscription),
					}),
				}),
			),
	)
	.prefix("/subscriptions");
