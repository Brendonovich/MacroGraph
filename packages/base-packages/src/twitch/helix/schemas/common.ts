import { Schema as S } from "effect";

export const Pagination = S.Struct({
	cursor: S.String,
});

export const DateRange = S.Struct({
	started_at: S.String,
	ended_at: S.String,
});

export const ResponseCommon = S.Struct({
	status: S.Int,
	error: S.optional(S.String),
	message: S.optional(S.String),
});
