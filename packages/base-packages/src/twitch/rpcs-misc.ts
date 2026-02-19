import { Rpc } from "@effect/rpc";
import { Schema as S } from "effect";

import { DateRange, Pagination } from "./helix/schemas/common";
import {
	AdDetails,
	Category,
	ChannelCustomReward,
	ChannelCustomRewardsRedemption,
	CharityCampaign,
	CharityDonation,
	Entitlement,
	EventSubSubscription,
	ExtensionAnalytic,
	Game,
	GameAnalytic,
	GetSchedulePagination,
	Goal,
	HypeTrainEvent,
	Poll,
	PollChoiceParam,
	Prediction,
	RaidInfo,
	ScheduleData,
	Subscription,
	UpdatedEntitlementSet,
	User,
	UserBitTotal,
	UserFollow,
	UserSubscription,
} from "./new-helix";
import { AccountId, RpcError } from "./new-types";

export const MiscRpcs = [
	// Polls
	Rpc.make("CreatePoll", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			title: S.String,
			choices: S.Array(PollChoiceParam),
			duration: S.Int,
			bits_voting_enabled: S.optional(S.Boolean),
			bits_per_vote: S.optional(S.Int),
			channel_points_voting_enabled: S.optional(S.Boolean),
			channel_points_per_vote: S.optional(S.Int),
		}),
		success: S.Struct({ data: S.Array(Poll) }),
		error: RpcError,
	}),

	Rpc.make("EndPoll", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			id: S.String,
			status: S.Union(S.Literal("TERMINATED"), S.Literal("ARCHIVED")),
		}),
		success: S.Struct({ data: S.Array(Poll) }),
		error: RpcError,
	}),

	Rpc.make("GetPolls", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			id: S.optional(S.String),
			after: S.optional(S.String),
			first: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(Poll),
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),

	// Predictions
	Rpc.make("CreatePrediction", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			title: S.String,
			outcomes: S.Array(S.Struct({ title: S.String })),
			prediction_window: S.Int,
		}),
		success: S.Struct({ data: S.Array(Prediction) }),
		error: RpcError,
	}),

	Rpc.make("EndPrediction", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			id: S.String,
			status: S.Union(S.Literal("RESOLVED"), S.Literal("CANCELED")),
			winning_outcome_id: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(Prediction) }),
		error: RpcError,
	}),

	Rpc.make("GetPredictions", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			id: S.optional(S.String),
			after: S.optional(S.String),
			first: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(Prediction),
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),

	// Custom Rewards
	Rpc.make("GetCustomRewards", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			id: S.optional(S.String),
			only_manageable_rewards: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(ChannelCustomReward) }),
		error: RpcError,
	}),

	Rpc.make("CreateCustomReward", {
		payload: S.Struct({
			account_id: AccountId,
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
		}),
		success: S.Struct({ data: S.Array(ChannelCustomReward) }),
		error: RpcError,
	}),

	Rpc.make("UpdateCustomReward", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			id: S.String,
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
		}),
		success: S.Struct({ data: S.Array(ChannelCustomReward) }),
		error: RpcError,
	}),

	Rpc.make("DeleteCustomRewards", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			id: S.String,
		}),
		success: S.Void,
		error: RpcError,
	}),

	Rpc.make("GetCustomRewardsRedemptions", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			reward_id: S.String,
			status: S.optional(S.String),
			id: S.optional(S.String),
			sort: S.optional(S.String),
			first: S.optional(S.String),
			after: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(ChannelCustomRewardsRedemption) }),
		error: RpcError,
	}),

	Rpc.make("UpdateChannelCustomRewardsRedemptionStatus", {
		payload: S.Struct({
			account_id: AccountId,
			id: S.String,
			broadcaster_id: S.String,
			reward_id: S.String,
			status: S.String,
		}),
		success: S.Struct({ data: S.Array(ChannelCustomRewardsRedemption) }),
		error: RpcError,
	}),

	// Raids
	Rpc.make("StartRaid", {
		payload: S.Struct({
			account_id: AccountId,
			from_broadcaster_id: S.String,
			to_broadcaster_id: S.String,
		}),
		success: S.Struct({ data: RaidInfo }),
		error: RpcError,
	}),

	Rpc.make("CancelRaid", {
		payload: S.Struct({ account_id: AccountId, broadcaster_id: S.String }),
		success: S.Void,
		error: RpcError,
	}),

	// Ads
	Rpc.make("StartCommercial", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			length: S.String,
		}),
		success: S.Struct({ data: S.Struct({ data: S.Array(AdDetails) }) }),
		error: RpcError,
	}),

	// Schedule
	Rpc.make("GetSchedule", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.optional(S.String),
			id: S.optional(S.String),
			start_time: S.optional(S.String),
			utc_offset: S.optional(S.String),
			first: S.optional(S.Int),
			after: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Struct({ data: ScheduleData, pagination: GetSchedulePagination }),
		}),
		error: RpcError,
	}),

	Rpc.make("CreateScheduleSegment", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			start_time: S.String,
			timezone: S.String,
			duration: S.String,
			is_recurring: S.Boolean,
			category_id: S.optional(S.String),
			title: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Struct({ data: ScheduleData }) }),
		error: RpcError,
	}),

	Rpc.make("UpdateScheduleSegment", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			id: S.String,
			start_time: S.optional(S.String),
			duration: S.optional(S.String),
			category_id: S.optional(S.String),
			title: S.optional(S.String),
			is_canceled: S.optional(S.Boolean),
			timezone: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Struct({ data: ScheduleData }) }),
		error: RpcError,
	}),

	Rpc.make("DeleteScheduleSegment", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			id: S.String,
		}),
		success: S.Void,
		error: RpcError,
	}),

	Rpc.make("UpdateSchedule", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			is_vacation_enabled: S.optional(S.Boolean),
			vacation_start_time: S.optional(S.String),
			vacation_end_time: S.optional(S.String),
			timezone: S.optional(S.String),
		}),
		success: S.Void,
		error: RpcError,
	}),

	// Games/Categories
	Rpc.make("GetGames", {
		payload: S.Struct({
			account_id: AccountId,
			id: S.optional(S.Array(S.String)),
			name: S.optional(S.Array(S.String)),
		}),
		success: S.Struct({
			data: S.Struct({
				data: S.Array(Game),
				pagination: S.optional(Pagination),
			}),
		}),
		error: RpcError,
	}),

	Rpc.make("GetTopGames", {
		payload: S.Struct({
			account_id: AccountId,
			after: S.optional(S.String),
			before: S.optional(S.String),
			first: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Struct({
				data: S.Array(Game),
				pagination: S.optional(Pagination),
			}),
		}),
		error: RpcError,
	}),

	Rpc.make("SearchCategories", {
		payload: S.Struct({
			account_id: AccountId,
			query: S.String,
			after: S.optional(S.String),
			first: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Struct({
				data: S.Array(Category),
				pagination: S.optional(Pagination),
			}),
		}),
		error: RpcError,
	}),

	// Users
	Rpc.make("GetUsers", {
		payload: S.Struct({
			account_id: AccountId,
			id: S.optional(S.Array(S.String)),
			login: S.optional(S.Array(S.String)),
		}),
		success: S.Struct({ data: S.Array(User) }),
		error: RpcError,
	}),

	Rpc.make("UpdateUser", {
		payload: S.Struct({
			account_id: AccountId,
			description: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(User) }),
		error: RpcError,
	}),

	Rpc.make("GetUsersFollows", {
		payload: S.Struct({
			account_id: AccountId,
			from_id: S.optional(S.String),
			to_id: S.optional(S.String),
			after: S.optional(S.String),
			first: S.optional(S.String),
		}),
		success: S.Struct({
			total: S.Int,
			data: S.Array(UserFollow),
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),

	// Subscriptions
	Rpc.make("GetSubscriptions", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			user_id: S.optional(S.Array(S.String)),
			after: S.optional(S.String),
			before: S.optional(S.String),
			first: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Struct({
				data: S.Array(Subscription),
				pagination: Pagination,
				total: S.Int,
				points: S.Int,
			}),
		}),
		error: RpcError,
	}),

	Rpc.make("CheckUserSubscription", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			user_id: S.String,
		}),
		success: S.Struct({ data: S.Struct({ data: S.Array(UserSubscription) }) }),
		error: RpcError,
	}),

	// Bits
	Rpc.make("GetBitsLeaderboard", {
		payload: S.Struct({
			account_id: AccountId,
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
		success: S.Struct({
			data: S.Struct({
				dateRange: S.optional(DateRange),
				total: S.Int,
				data: S.Array(UserBitTotal),
			}),
		}),
		error: RpcError,
	}),

	// Charity
	Rpc.make("GetCharityCampaigns", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			after: S.optional(S.String),
			first: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(CharityCampaign),
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),

	Rpc.make("GetCharityDonations", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			after: S.optional(S.String),
			first: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(CharityDonation),
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),

	// Goals
	Rpc.make("GetCreatorGoals", {
		payload: S.Struct({ account_id: AccountId, broadcaster_id: S.String }),
		success: S.Struct({
			data: S.Struct({
				data: S.Array(Goal),
				pagination: S.Struct({ cursor: S.String }),
			}),
		}),
		error: RpcError,
	}),

	// HypeTrain
	Rpc.make("GetHypeTrainEvents", {
		payload: S.Struct({
			account_id: AccountId,
			broadcaster_id: S.String,
			after: S.optional(S.String),
			first: S.optional(S.String),
			id: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(HypeTrainEvent),
			pagination: S.Struct({ cursor: S.String }),
		}),
		error: RpcError,
	}),

	// Whispers
	Rpc.make("SendWhisper", {
		payload: S.Struct({
			account_id: AccountId,
			from_user_id: S.String,
			to_user_id: S.String,
			message: S.String,
		}),
		success: S.Void,
		error: RpcError,
	}),

	// EventSub
	Rpc.make("GetEventSubSubscriptions", {
		payload: S.Struct({
			account_id: AccountId,
			status: S.optional(S.String),
			type: S.optional(S.String),
			user_id: S.optional(S.String),
			subscription_id: S.optional(S.String),
			after: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(EventSubSubscription),
			total: S.Int,
			total_cost: S.Int,
			max_total_cost: S.Int,
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),

	Rpc.make("DeleteEventSubSubscription", {
		payload: S.Struct({ account_id: AccountId, id: S.String }),
		success: S.Void,
		error: RpcError,
	}),

	// Analytics
	Rpc.make("GetExtensionAnalytics", {
		payload: S.Struct({
			account_id: AccountId,
			extension_id: S.String,
			first: S.optional(S.String),
			after: S.optional(S.String),
			started_at: S.optional(S.String),
			ended_at: S.optional(S.String),
			type: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Struct({
				data: S.Array(ExtensionAnalytic),
				pagination: Pagination,
			}),
		}),
		error: RpcError,
	}),

	Rpc.make("GetGameAnalytics", {
		payload: S.Struct({
			account_id: AccountId,
			game_id: S.String,
			first: S.optional(S.String),
			after: S.optional(S.String),
			started_at: S.optional(S.String),
			ended_at: S.optional(S.String),
			type: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Struct({ data: S.Array(GameAnalytic), pagination: Pagination }),
		}),
		error: RpcError,
	}),

	// Entitlements/Drops
	Rpc.make("GetDropsEntitlements", {
		payload: S.Struct({
			account_id: AccountId,
			id: S.optional(S.String),
			user_id: S.optional(S.String),
			game_id: S.optional(S.String),
			fulfillment_status: S.optional(S.Literal("CLAIMED", "FULFILLED")),
			after: S.optional(S.String),
			first: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Struct({
				data: S.Array(Entitlement),
				pagination: S.optional(Pagination),
			}),
		}),
		error: RpcError,
	}),

	Rpc.make("UpdateDropsEntitlements", {
		payload: S.Struct({
			account_id: AccountId,
			entitlement_ids: S.Array(S.String),
			fulfillment_status: S.Literal("CLAIMED", "FULFILLED"),
		}),
		success: S.Struct({
			data: S.Struct({ data: S.Array(UpdatedEntitlementSet) }),
		}),
		error: RpcError,
	}),
] as const;
