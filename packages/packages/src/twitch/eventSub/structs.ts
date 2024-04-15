import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

export const PredictionStatus = createEnum("Prediction Status", (e) => [
	e.variant("resolved"),
	e.variant("canceled"),
]);

export const OutcomesBegin = createStruct("Outcomes Begin", (s) => ({
	id: s.field("id", t.string()),
	title: s.field("title", t.string()),
	color: s.field("Color", t.string()),
}));

export const TopPredictors = createStruct("Top Predictors", (s) => ({
	user_name: s.field("User Name", t.string()),
	user_login: s.field("User Login", t.string()),
	user_id: s.field("User ID", t.string()),
	channel_points_won: s.field("Channel Points Won", t.option(t.int())),
	channel_points_used: s.field("Channel Points Used", t.int()),
}));

export const OutcomesProgress = createStruct("Outcomes Progress", (s) => ({
	id: s.field("id", t.string()),
	title: s.field("title", t.string()),
	color: s.field("Color", t.string()),
	users: s.field("Users", t.int()),
	channel_points: s.field("Channel Points", t.int()),
	top_predictors: s.field("Top Predictors", t.list(t.struct(TopPredictors))),
}));

export const PollChoice = createStruct("Choice", (s) => ({
	id: s.field("id", t.string()),
	title: s.field("title", t.string()),
	channel_points_votes: s.field("Channel Points Votes", t.int()),
	votes: s.field("votes", t.int()),
}));
