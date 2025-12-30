import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

import { EVENTSUB_CREATE_SUBSCRIPTION_BODY } from "../../eventSub";

export const Pagination = S.Struct({
	cursor: S.optional(S.String),
});

export const PollChoice = S.Struct({
	id: S.String,
	title: S.String,
	bits_votes: S.Int,
	channel_points_votes: S.Int,
	votes: S.Int,
});

export const Poll = S.Struct({
	id: S.String,
	broadcaster_id: S.String,
	broadcaster_login: S.String,
	broadcaster_name: S.String,
	title: S.String,
	choices: S.Array(PollChoice),
	bits_voting_enabled: S.Boolean,
	bits_per_vote: S.Int,
	channel_points_voting_enabled: S.Boolean,
	channel_points_per_vote: S.Int,
	status: S.String,
	duration: S.Int,
	started_at: S.DateFromString,
	ended_at: S.DateFromString,
});

export const PollChoiceParam = S.Struct({
	title: S.String,
});

export const CreatePollParams = S.Struct({
	broadcaster_id: S.String,
	title: S.String,
	choices: S.Array(PollChoiceParam),
	duration: S.Int,
	bits_voting_enabled: S.optional(S.Boolean),
	bits_per_vote: S.optional(S.Int),
	channel_points_voting_enabled: S.optional(S.Boolean),
	channel_points_per_vote: S.optional(S.Int),
});

export const EndPollParams = S.Struct({
	broadcaster_id: S.String,
	id: S.String,
	status: S.Union(S.Literal("TERMINATED"), S.Literal("ARCHIVED")),
});

export const TopPredictor = S.Struct({
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
	channel_points_won: S.Int,
	channel_points_used: S.Int,
});

export const PredictionOutcome = S.Struct({
	id: S.String,
	title: S.String,
	color: S.String,
	users: S.Int,
	channel_points: S.Int,
	top_predictors: S.Array(TopPredictor),
});

export const Prediction = S.Struct({
	id: S.String,
	broadcaster_id: S.String,
	broadcaster_login: S.String,
	broadcaster_name: S.String,
	title: S.String,
	winning_outcome_id: S.optional(S.String),
	outcomes: S.Array(PredictionOutcome),
	prediction_window: S.Int,
	status: S.Union(
		S.Literal("ACTIVE"),
		S.Literal("LOCKED"),
		S.Literal("RESOLVED"),
		S.Literal("CANCELED"),
	),
	created_at: S.DateFromString,
	ended_at: S.optional(S.DateFromString),
	locked_at: S.optional(S.DateFromString),
});

export const CreatePredictionParams = S.Struct({
	broadcaster_id: S.String,
	title: S.String,
	outcomes: S.Array(
		S.Struct({
			title: S.String,
		}),
	),
	prediction_window: S.Int,
});

export const EndPredictionParams = S.Struct({
	broadcaster_id: S.String,
	id: S.String,
	status: S.Union(S.Literal("RESOLVED"), S.Literal("CANCELED")),
	winning_outcome_id: S.optional(S.String),
});

export const EventSubCondition = S.Struct({
	broadcaster_user_id: S.optional(S.String),
	from_broadcaster_user_id: S.optional(S.String),
	moderator_user_id: S.optional(S.String),
	to_broadcaster_user_id: S.optional(S.String),
	reward_id: S.optional(S.String),
	client_id: S.optional(S.String),
	extension_client_id: S.optional(S.String),
	user_id: S.optional(S.String),
});

export const EventSubTransportWebhook = S.Struct({
	method: S.Literal("webhook"),
	callback: S.String,
});

export const EventSubTransportWebsocket = S.Struct({
	method: S.Literal("websocket"),
	session_id: S.String,
	// connected_at: S.DateFromString,
});

export const EventSubTransport = S.Union(
	EventSubTransportWebhook,
	EventSubTransportWebsocket,
);

export const EventSubTransportInput = EventSubTransport;

export const EventSubSubscription = S.Struct({
	id: S.String,
	type: S.String,
	version: S.String,
	status: S.String,
	condition: EventSubCondition,
	transport: EventSubTransport,
	created_at: S.DateFromString,
	cost: S.Int,
});

export const PollsGroup = HttpApiGroup.make("polls")
	.add(
		HttpApiEndpoint.get("getPolls", "/")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					id: S.optional(S.String),
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(Poll),
					pagination: S.optional(Pagination),
				}),
			),
	)
	.add(HttpApiEndpoint.post("createPoll", "/").setPayload(CreatePollParams))
	.add(HttpApiEndpoint.patch("endPoll", "/").setPayload(EndPollParams))
	.prefix("/polls");

export const PredictionsGroup = HttpApiGroup.make("predictions")
	.add(
		HttpApiEndpoint.get("getPredictions", "/")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					id: S.optional(S.String),
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(Prediction),
					pagination: S.optional(Pagination),
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("createPrediction", "/").setPayload(
			CreatePredictionParams,
		),
	)
	.add(
		HttpApiEndpoint.patch("endPrediction", "/").setPayload(EndPredictionParams),
	)
	.prefix("/predictions");

export const EventSubGroup = HttpApiGroup.make("eventSub")
	.add(
		HttpApiEndpoint.get("getSubscriptions", "/subscriptions")
			.setUrlParams(
				S.Struct({
					status: S.optional(S.String),
					type: S.optional(S.String),
					user_id: S.optional(S.String),
					subscription_id: S.optional(S.String),
					after: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(EventSubSubscription),
					total: S.Int,
					total_cost: S.Int,
					max_total_cost: S.Int,
					pagination: S.optional(Pagination),
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("deleteSubscription", "/subscriptions").setUrlParams(
			S.Struct({
				id: S.String,
			}),
		),
	)
	.add(
		HttpApiEndpoint.post("createSubscription", "/subscriptions")
			.setPayload(
				S.extend(
					EVENTSUB_CREATE_SUBSCRIPTION_BODY,
					S.Struct({ transport: EventSubTransportInput }),
				),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(
						S.Struct({
							// id: S.String,
							// status: S.Literal(
							//   "enabled",
							//   "webhook_callback_verification_pending",
							// ),
							// type: S.String,
							// version: S.String,
							// condition: S.Any,
							// created_at: S.DateFromString,
						}),
					),
					// total: S.Int,
					// total_cost: S.Int,
					// max_total_cost: S.Int,
				}),
				{ status: 202 },
			),
	)
	.prefix("/eventsub");
