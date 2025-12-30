import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const Goal = S.Struct({
	id: S.String,
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	broadcaster_login: S.String,
	type: S.String,
	description: S.String,
	current_amount: S.Int,
	target_amount: S.Int,
	created_at: S.DateFromString,
});

export const GoalsGroup = HttpApiGroup.make("goals")
	.add(
		HttpApiEndpoint.get("getCreatorGoals", "/")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(Goal),
						pagination: S.Struct({ cursor: S.String }),
					}),
				}),
			),
	)
	.prefix("/goals");
