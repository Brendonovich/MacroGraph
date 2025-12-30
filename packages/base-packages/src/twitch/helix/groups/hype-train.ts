import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const HypeTrainContribution = S.Struct({
	user: S.String,
	type: S.String,
	total: S.Int,
});

export const HypeTrainEvent = S.Struct({
	id: S.String,
	event_type: S.String,
	event_timestamp: S.DateFromString,
	version: S.String,
	event_data: S.Struct({
		id: S.String,
		broadcaster_id: S.String,
		cooldown_end_time: S.DateFromString,
		expires_at: S.DateFromString,
		goal: S.Int,
		last_contribution: HypeTrainContribution,
		level: S.Int,
		started_at: S.DateFromString,
		top_contributions: S.Array(HypeTrainContribution),
		total: S.Int,
	}),
});

export const HypeTrainGroup = HttpApiGroup.make("hypeTrain")
	.add(
		HttpApiEndpoint.get("getHypeTrainEvents", "/events")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					after: S.optional(S.String),
					first: S.optional(S.String),
					id: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(HypeTrainEvent),
					pagination: S.Struct({ cursor: S.String }),
				}),
			),
	)
	.prefix("/hypetrain");
