import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const User = S.Struct({
	id: S.String,
	login: S.String,
	display_name: S.String,
	type: S.String,
	broadcaster_type: S.String,
	description: S.String,
	profile_image_url: S.String,
	offline_image_url: S.String,
	view_count: S.Int,
	email: S.optional(S.String),
	created_at: S.DateFromString,
});

export const UserBlocked = S.Struct({
	user_id: S.String,
	user_login: S.String,
	display_name: S.String,
});

export const UserFollow = S.Struct({
	from_id: S.String,
	from_login: S.String,
	from_name: S.String,
	to_id: S.String,
	to_name: S.String,
	followed_at: S.DateFromString,
});

export const Pagination = S.Struct({
	cursor: S.String,
});

export const UsersGroup = HttpApiGroup.make("users")
	.add(
		HttpApiEndpoint.get("getUsers", "/")
			.setUrlParams(
				S.Struct({
					id: S.optional(S.Array(S.String)),
					login: S.optional(S.Array(S.String)),
				}),
			)
			.addSuccess(S.Struct({ data: S.Array(User) })),
	)
	.add(
		HttpApiEndpoint.put("updateUser", "/")
			.setUrlParams(
				S.Struct({
					description: S.optional(S.String),
				}),
			)
			.addSuccess(S.Struct({ data: S.Array(User) })),
	)
	.add(
		HttpApiEndpoint.get("getUsersBlocked", "/blocks")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(UserBlocked),
					pagination: S.optional(Pagination),
				}),
			),
	)
	.add(
		HttpApiEndpoint.put("blockUser", "/blocks").setUrlParams(
			S.Struct({
				target_user_id: S.String,
				source_context: S.optional(
					S.Union(S.Literal("chat"), S.Literal("whisper")),
				),
				reason: S.optional(
					S.Union(
						S.Literal("spam"),
						S.Literal("harassment"),
						S.Literal("other"),
					),
				),
			}),
		),
	)
	.add(
		HttpApiEndpoint.del("unblockUser", "/blocks").setUrlParams(
			S.Struct({
				target_user_id: S.String,
			}),
		),
	)
	.add(
		HttpApiEndpoint.get("getUsersFollows", "/follows")
			.setUrlParams(
				S.Struct({
					from_id: S.optional(S.String),
					to_id: S.optional(S.String),
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					total: S.Int,
					data: S.Array(UserFollow),
					pagination: S.optional(Pagination),
				}),
			),
	)
	.prefix("/users");
