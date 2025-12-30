import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const RaidInfo = S.Struct({
	created_at: S.DateFromString,
	is_mature: S.Boolean,
});

export const StartRaidParams = S.Struct({
	from_broadcaster_id: S.String,
	to_broadcaster_id: S.String,
});

export const CancelRaidParams = S.Struct({
	broadcaster_id: S.String,
});

export const Game = S.Struct({
	id: S.String,
	name: S.String,
	box_art_url: S.String,
	igdb_id: S.optional(S.String),
});

export const Entitlement = S.Struct({
	id: S.String,
	benefit_id: S.String,
	timestamp: S.DateFromString,
	user_id: S.String,
	game_id: S.String,
	fulfillment_status: S.Literal("CLAIMED", "FULFILLED"),
	updated_at: S.DateFromString,
});

export const UpdateDropsEntitlementsParams = S.Struct({
	entitlement_ids: S.Array(S.String),
	fulfillment_status: S.Literal("CLAIMED", "FULFILLED"),
});

export const UpdatedEntitlementSet = S.Struct({
	status: S.Literal(
		"SUCCESS",
		"INVALID_ID",
		"NOT_FOUND",
		"UNAUTHORIZED",
		"UPDATE_FAILED",
	),
	ids: S.Array(S.String),
});

export const Pagination = S.Struct({
	cursor: S.String,
});

export const RaidsGroup = HttpApiGroup.make("raids")
	.add(
		HttpApiEndpoint.post("startRaid", "/")
			.setPayload(StartRaidParams)
			.addSuccess(S.Struct({ data: RaidInfo })),
	)
	.add(
		HttpApiEndpoint.post("cancelRaid", "/cancel").setPayload(CancelRaidParams),
	)
	.prefix("/raids");

export const GamesGroup = HttpApiGroup.make("games")
	.add(
		HttpApiEndpoint.get("getGames", "/")
			.setUrlParams(
				S.Struct({
					id: S.optional(S.Array(S.String)),
					name: S.optional(S.Array(S.String)),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(Game),
						pagination: S.optional(Pagination),
					}),
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("getTopGames", "/top")
			.setUrlParams(
				S.Struct({
					after: S.optional(S.String),
					before: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(Game),
						pagination: S.optional(Pagination),
					}),
				}),
			),
	)
	.prefix("/games");

export const DropsGroup = HttpApiGroup.make("drops")
	.add(
		HttpApiEndpoint.get("getDropsEntitlements", "/entitlements/drops")
			.setUrlParams(
				S.Struct({
					id: S.optional(S.String),
					user_id: S.optional(S.String),
					game_id: S.optional(S.String),
					fulfillment_status: S.optional(S.Literal("CLAIMED", "FULFILLED")),
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(Entitlement),
						pagination: S.optional(Pagination),
					}),
				}),
			),
	)
	.add(
		HttpApiEndpoint.patch("updateDropsEntitlements", "/entitlements/drops")
			.setPayload(UpdateDropsEntitlementsParams)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(UpdatedEntitlementSet),
					}),
				}),
			),
	)
	.prefix("/entitlements");
