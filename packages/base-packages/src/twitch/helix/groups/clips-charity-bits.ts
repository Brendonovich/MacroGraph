import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const Clip = S.Struct({
	id: S.String,
	url: S.String,
	embed_url: S.String,
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	creator_id: S.String,
	creator_name: S.String,
	duration: S.Number,
	video_id: S.String,
	game_id: S.String,
	language: S.String,
	title: S.String,
	view_count: S.Int,
	created_at: S.String,
	thumbnail_url: S.String,
	vod_offset: S.Int,
});

export const ClipEditURL = S.Struct({
	id: S.String,
	edit_url: S.String,
});

export const CharityCampaignAmount = S.Struct({
	value: S.Int,
	decimal_places: S.Int,
	currency: S.String,
});

export const CharityCampaign = S.Struct({
	id: S.String,
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	broadcaster_login: S.String,
	charity_name: S.String,
	charity_description: S.String,
	charity_logo: S.String,
	charity_website: S.String,
	target_amount: CharityCampaignAmount,
	current_amount: CharityCampaignAmount,
});

export const CharityDonation = S.Struct({
	id: S.String,
	campaign_id: S.String,
	user_id: S.String,
	user_name: S.String,
	user_login: S.String,
	amount: CharityCampaignAmount,
});

export const UserBitTotal = S.Struct({
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
	rank: S.Int,
	score: S.Int,
});

export const TierImages = S.Struct({
	"1": S.optional(S.String),
	"1.5": S.optional(S.String),
	"2": S.optional(S.String),
	"3": S.optional(S.String),
	"4": S.optional(S.String),
});

export const TierImageTypes = S.Struct({
	animated: S.optional(TierImages),
	static: S.optional(TierImages),
});

export const CheermoteTierImages = S.Struct({
	dark: S.optional(TierImageTypes),
	light: S.optional(TierImageTypes),
});

export const CheermoteTiers = S.Struct({
	min_bits: S.Int,
	id: S.String,
	color: S.String,
	images: CheermoteTierImages,
	can_cheer: S.Boolean,
	show_in_bits_card: S.Boolean,
});

export const Cheermotes = S.Struct({
	prefix: S.String,
	tiers: S.Array(CheermoteTiers),
	type: S.Union(
		S.Literal("global_first_party"),
		S.Literal("global_third_party"),
		S.Literal("channel_custom"),
		S.Literal("display_only"),
		S.Literal("sponsored"),
	),
	order: S.Int,
	last_updated: S.String,
	is_charitable: S.Boolean,
});

export const DateRange = S.Struct({
	started_at: S.String,
	ended_at: S.String,
});

export const Pagination = S.Struct({
	cursor: S.String,
});

export const ClipsGroup = HttpApiGroup.make("clips")
	.add(
		HttpApiEndpoint.get("getClips", "/clips")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.optional(S.String),
					game_id: S.optional(S.String),
					id: S.optional(S.Array(S.String)),
					first: S.optional(S.String),
					after: S.optional(S.String),
					before: S.optional(S.String),
					started_at: S.optional(S.String),
					ended_at: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(Clip),
					pagination: S.optional(Pagination),
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("createClip", "/clips")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					has_delay: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(ClipEditURL),
				}),
				{ status: 202 },
			),
	)
	.prefix("/clips");

export const CharityGroup = HttpApiGroup.make("charity")
	.add(
		HttpApiEndpoint.get("getCharityCampaigns", "/campaigns")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(CharityCampaign),
					pagination: S.optional(Pagination),
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("getCharityDonations", "/donations")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(CharityDonation),
					pagination: S.optional(Pagination),
				}),
			),
	)
	.prefix("/charity");

export const BitsGroup = HttpApiGroup.make("bits")
	.add(
		HttpApiEndpoint.get("getBitsLeaderboard", "/leaderboard")
			.setUrlParams(
				S.Struct({
					count: S.optional(S.String),
					period: S.optional(
						S.Union(
							S.Literal("all"),
							S.Literal("day"),
							S.Literal("week"),
							S.Literal("month"),
							S.Literal("year"),
						),
					),
					started_at: S.optional(S.String),
					user_id: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						date_range: S.optional(DateRange),
						total: S.Int,
						data: S.Array(UserBitTotal),
					}),
				}),
			),
	)
	.add(
		HttpApiEndpoint.get("getCheermotes", "/cheermotes")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(Cheermotes),
				}),
			),
	)
	.prefix("/bits");
