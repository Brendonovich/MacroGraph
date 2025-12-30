import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const RewardImage = S.Struct({
	url_1x: S.String,
	url_2x: S.String,
	url_4x: S.String,
});

export const MaxPerStreamSettings = S.Struct({
	is_enabled: S.Boolean,
	max_per_stream: S.Int,
});

export const MaxPerUserPerStreamSettings = S.Struct({
	is_enabled: S.Boolean,
	max_per_user_per_stream: S.Int,
});

export const GlobalCooldownSettings = S.Struct({
	is_enabled: S.Boolean,
	global_cooldown_seconds: S.Int,
});

export const ChannelCustomReward = S.Struct({
	broadcaster_id: S.String,
	broadcaster_login: S.String,
	broadcaster_name: S.String,
	id: S.String,
	title: S.String,
	prompt: S.String,
	cost: S.Int,
	image: RewardImage,
	background_color: S.String,
	default_image: RewardImage,
	is_enabled: S.Boolean,
	is_user_input_required: S.Boolean,
	max_per_stream_setting: MaxPerStreamSettings,
	max_per_user_per_stream_setting: MaxPerUserPerStreamSettings,
	global_cooldown_setting: GlobalCooldownSettings,
	is_paused: S.Boolean,
	is_in_stock: S.Boolean,
	should_redemptions_skip_request_queue: S.Boolean,
	redemptions_redeemed_current_stream: S.Int,
	cooldown_expires_at: S.String,
});

export const ChannelCustomRewardsParams = S.Struct({
	broadcaster_id: S.String,
	title: S.String,
	cost: S.Int,
	prompt: S.optional(S.String),
	is_enabled: S.optional(S.Boolean),
	background_color: S.optional(S.String),
	is_user_input_required: S.optional(S.Boolean),
	is_max_per_stream_enabled: S.optional(S.Boolean),
	max_per_stream: S.optional(S.Int),
	is_max_per_user_per_stream_enabled: S.optional(S.Boolean),
	max_per_user_per_stream: S.optional(S.Int),
	is_global_cooldown_enabled: S.optional(S.Boolean),
	global_cooldown_seconds: S.optional(S.Int),
	should_redemptions_skip_request_queue: S.optional(S.Boolean),
});

export const UpdateChannelCustomRewardsParams = S.Struct({
	title: S.optional(S.String),
	cost: S.optional(S.Int),
	prompt: S.optional(S.String),
	is_enabled: S.optional(S.Boolean),
	background_color: S.optional(S.String),
	is_user_input_required: S.optional(S.Boolean),
	is_max_per_stream_enabled: S.optional(S.Boolean),
	max_per_stream: S.optional(S.Int),
	is_max_per_user_per_stream_enabled: S.optional(S.Boolean),
	max_per_user_per_stream: S.optional(S.Int),
	is_global_cooldown_enabled: S.optional(S.Boolean),
	global_cooldown_seconds: S.optional(S.Int),
	should_redemptions_skip_request_queue: S.optional(S.Boolean),
});

export const UpdateChannelCustomRewardsRedemptionStatusParams = S.Struct({
	status: S.String,
});

export const ChannelCustomRewardsRedemption = S.Struct({
	id: S.String,
	broadcaster_id: S.String,
	broadcaster_login: S.String,
	broadcaster_name: S.String,
	user_id: S.String,
	user_name: S.String,
	user_login: S.String,
	user_input: S.String,
	status: S.String,
	redeemed_at: S.DateFromString,
	reward: ChannelCustomReward,
});

export const ChannelPointsGroup = HttpApiGroup.make("channelPoints")
	.add(
		HttpApiEndpoint.get("getCustomRewards", "/custom_rewards")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					id: S.optional(S.String),
					only_manageable_rewards: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(ChannelCustomReward),
				}),
			),
	)
	.add(
		HttpApiEndpoint.post("createCustomReward", "/custom_rewards")
			.setPayload(ChannelCustomRewardsParams)
			.addSuccess(
				S.Struct({
					data: S.Array(ChannelCustomReward),
				}),
			),
	)
	.add(
		HttpApiEndpoint.patch("updateCustomReward", "/custom_rewards")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					id: S.String,
				}),
			)
			.setPayload(UpdateChannelCustomRewardsParams)
			.addSuccess(
				S.Struct({
					data: S.Array(ChannelCustomReward),
				}),
			),
	)
	.add(
		HttpApiEndpoint.del("deleteCustomRewards", "/custom_rewards").setUrlParams(
			S.Struct({
				broadcaster_id: S.String,
				id: S.String,
			}),
		),
	)
	.add(
		HttpApiEndpoint.get(
			"getCustomRewardsRedemptions",
			"/custom_rewards/redemptions",
		)
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					reward_id: S.String,
					status: S.optional(S.String),
					id: S.optional(S.String),
					sort: S.optional(S.String),
					first: S.optional(S.String),
					after: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Array(ChannelCustomRewardsRedemption),
				}),
			),
	)
	.add(
		HttpApiEndpoint.patch(
			"updateChannelCustomRewardsRedemptionStatus",
			"/custom_rewards/redemptions",
		)
			.setUrlParams(
				S.Struct({
					id: S.String,
					broadcaster_id: S.String,
					reward_id: S.String,
				}),
			)
			.setPayload(UpdateChannelCustomRewardsRedemptionStatusParams)
			.addSuccess(
				S.Struct({
					data: S.Array(ChannelCustomRewardsRedemption),
				}),
			),
	)
	.prefix("/channel_points");
