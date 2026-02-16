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
			accountId: AccountId,
			broadcasterId: S.String,
			title: S.String,
			choices: S.Array(PollChoiceParam),
			duration: S.Int,
			bitsVotingEnabled: S.optional(S.Boolean),
			bitsPerVote: S.optional(S.Int),
			channelPointsVotingEnabled: S.optional(S.Boolean),
			channelPointsPerVote: S.optional(S.Int),
		}),
		success: S.Struct({ data: S.Array(Poll) }),
		error: RpcError,
	}),

	Rpc.make("EndPoll", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			id: S.String,
			status: S.Union(S.Literal("TERMINATED"), S.Literal("ARCHIVED")),
		}),
		success: S.Struct({ data: S.Array(Poll) }),
		error: RpcError,
	}),

	Rpc.make("GetPolls", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
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
			accountId: AccountId,
			broadcasterId: S.String,
			title: S.String,
			outcomes: S.Array(S.Struct({ title: S.String })),
			predictionWindow: S.Int,
		}),
		success: S.Struct({ data: S.Array(Prediction) }),
		error: RpcError,
	}),

	Rpc.make("EndPrediction", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			id: S.String,
			status: S.Union(S.Literal("RESOLVED"), S.Literal("CANCELED")),
			winningOutcomeId: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(Prediction) }),
		error: RpcError,
	}),

	Rpc.make("GetPredictions", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
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
			accountId: AccountId,
			broadcasterId: S.String,
			id: S.optional(S.String),
			onlyManageableRewards: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(ChannelCustomReward) }),
		error: RpcError,
	}),

	Rpc.make("CreateCustomReward", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			title: S.String,
			cost: S.Int,
			prompt: S.optional(S.String),
			isEnabled: S.optional(S.Boolean),
			backgroundColor: S.optional(S.String),
			isUserInputRequired: S.optional(S.Boolean),
			isMaxPerStreamEnabled: S.optional(S.Boolean),
			maxPerStream: S.optional(S.Int),
			isMaxPerUserPerStreamEnabled: S.optional(S.Boolean),
			maxPerUserPerStream: S.optional(S.Int),
			isGlobalCooldownEnabled: S.optional(S.Boolean),
			globalCooldownSeconds: S.optional(S.Int),
			shouldRedemptionsSkipRequestQueue: S.optional(S.Boolean),
		}),
		success: S.Struct({ data: S.Array(ChannelCustomReward) }),
		error: RpcError,
	}),

	Rpc.make("UpdateCustomReward", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			id: S.String,
			title: S.optional(S.String),
			cost: S.optional(S.Int),
			prompt: S.optional(S.String),
			isEnabled: S.optional(S.Boolean),
			backgroundColor: S.optional(S.String),
			isUserInputRequired: S.optional(S.Boolean),
			isMaxPerStreamEnabled: S.optional(S.Boolean),
			maxPerStream: S.optional(S.Int),
			isMaxPerUserPerStreamEnabled: S.optional(S.Boolean),
			maxPerUserPerStream: S.optional(S.Int),
			isGlobalCooldownEnabled: S.optional(S.Boolean),
			globalCooldownSeconds: S.optional(S.Int),
			shouldRedemptionsSkipRequestQueue: S.optional(S.Boolean),
		}),
		success: S.Struct({ data: S.Array(ChannelCustomReward) }),
		error: RpcError,
	}),

	Rpc.make("DeleteCustomRewards", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			id: S.String,
		}),
		success: S.Void,
		error: RpcError,
	}),

	Rpc.make("GetCustomRewardsRedemptions", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			rewardId: S.String,
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
			accountId: AccountId,
			id: S.String,
			broadcasterId: S.String,
			rewardId: S.String,
			status: S.String,
		}),
		success: S.Struct({ data: S.Array(ChannelCustomRewardsRedemption) }),
		error: RpcError,
	}),

	// Raids
	Rpc.make("StartRaid", {
		payload: S.Struct({
			accountId: AccountId,
			fromBroadcasterId: S.String,
			toBroadcasterId: S.String,
		}),
		success: S.Struct({ data: RaidInfo }),
		error: RpcError,
	}),

	Rpc.make("CancelRaid", {
		payload: S.Struct({ accountId: AccountId, broadcasterId: S.String }),
		success: S.Void,
		error: RpcError,
	}),

	// Ads
	Rpc.make("StartCommercial", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			length: S.String,
		}),
		success: S.Struct({ data: S.Struct({ data: S.Array(AdDetails) }) }),
		error: RpcError,
	}),

	// Schedule
	Rpc.make("GetSchedule", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.optional(S.String),
			id: S.optional(S.String),
			startTime: S.optional(S.String),
			utcOffset: S.optional(S.String),
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
			accountId: AccountId,
			broadcasterId: S.String,
			startTime: S.String,
			timezone: S.String,
			duration: S.String,
			isRecurring: S.Boolean,
			categoryId: S.optional(S.String),
			title: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Struct({ data: ScheduleData }) }),
		error: RpcError,
	}),

	Rpc.make("UpdateScheduleSegment", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			id: S.String,
			startTime: S.optional(S.String),
			duration: S.optional(S.String),
			categoryId: S.optional(S.String),
			title: S.optional(S.String),
			isCanceled: S.optional(S.Boolean),
			timezone: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Struct({ data: ScheduleData }) }),
		error: RpcError,
	}),

	Rpc.make("DeleteScheduleSegment", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			id: S.String,
		}),
		success: S.Void,
		error: RpcError,
	}),

	Rpc.make("UpdateSchedule", {
		payload: S.Struct({
			accountId: AccountId,
			broadcasterId: S.String,
			isVacationEnabled: S.optional(S.Boolean),
			vacationStartTime: S.optional(S.String),
			vacationEndTime: S.optional(S.String),
			timezone: S.optional(S.String),
		}),
		success: S.Void,
		error: RpcError,
	}),

	// Games/Categories
	Rpc.make("GetGames", {
		payload: S.Struct({
			accountId: AccountId,
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
			accountId: AccountId,
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
			accountId: AccountId,
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
			accountId: AccountId,
			id: S.optional(S.Array(S.String)),
			login: S.optional(S.Array(S.String)),
		}),
		success: S.Struct({ data: S.Array(User) }),
		error: RpcError,
	}),

	Rpc.make("UpdateUser", {
		payload: S.Struct({
			accountId: AccountId,
			description: S.optional(S.String),
		}),
		success: S.Struct({ data: S.Array(User) }),
		error: RpcError,
	}),

	Rpc.make("GetUsersFollows", {
		payload: S.Struct({
			accountId: AccountId,
			fromId: S.optional(S.String),
			toId: S.optional(S.String),
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
			accountId: AccountId,
			broadcasterId: S.String,
			userId: S.optional(S.Array(S.String)),
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
			accountId: AccountId,
			broadcasterId: S.String,
			userId: S.String,
		}),
		success: S.Struct({ data: S.Struct({ data: S.Array(UserSubscription) }) }),
		error: RpcError,
	}),

	// Bits
	Rpc.make("GetBitsLeaderboard", {
		payload: S.Struct({
			accountId: AccountId,
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
			startedAt: S.optional(S.String),
			userId: S.optional(S.String),
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
			accountId: AccountId,
			broadcasterId: S.String,
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
			accountId: AccountId,
			broadcasterId: S.String,
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
		payload: S.Struct({ accountId: AccountId, broadcasterId: S.String }),
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
			accountId: AccountId,
			broadcasterId: S.String,
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
			accountId: AccountId,
			fromUserId: S.String,
			toUserId: S.String,
			message: S.String,
		}),
		success: S.Void,
		error: RpcError,
	}),

	// EventSub
	Rpc.make("GetEventSubSubscriptions", {
		payload: S.Struct({
			accountId: AccountId,
			status: S.optional(S.String),
			type: S.optional(S.String),
			userId: S.optional(S.String),
			subscriptionId: S.optional(S.String),
			after: S.optional(S.String),
		}),
		success: S.Struct({
			data: S.Array(EventSubSubscription),
			total: S.Int,
			totalCost: S.Int,
			maxTotalCost: S.Int,
			pagination: S.optional(Pagination),
		}),
		error: RpcError,
	}),

	Rpc.make("DeleteEventSubSubscription", {
		payload: S.Struct({ accountId: AccountId, id: S.String }),
		success: S.Void,
		error: RpcError,
	}),

	// Analytics
	Rpc.make("GetExtensionAnalytics", {
		payload: S.Struct({
			accountId: AccountId,
			extensionId: S.String,
			first: S.optional(S.String),
			after: S.optional(S.String),
			startedAt: S.optional(S.String),
			endedAt: S.optional(S.String),
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
			accountId: AccountId,
			gameId: S.String,
			first: S.optional(S.String),
			after: S.optional(S.String),
			startedAt: S.optional(S.String),
			endedAt: S.optional(S.String),
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
			accountId: AccountId,
			id: S.optional(S.String),
			userId: S.optional(S.String),
			gameId: S.optional(S.String),
			fulfillmentStatus: S.optional(S.Literal("CLAIMED", "FULFILLED")),
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
			accountId: AccountId,
			entitlementIds: S.Array(S.String),
			fulfillmentStatus: S.Literal("CLAIMED", "FULFILLED"),
		}),
		success: S.Struct({
			data: S.Struct({ data: S.Array(UpdatedEntitlementSet) }),
		}),
		error: RpcError,
	}),
] as const;
