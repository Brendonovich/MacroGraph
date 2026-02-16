import { Schema as S } from "effect";

export const AccountId = S.String.pipe(S.brand("AccountId"));
export type AccountId = typeof AccountId.Type;

// ============================================================================
// Twitch EventSub Event Type Definitions
// ============================================================================
// This file contains all Twitch EventSub event type definitions using
// Schema.TaggedClass following the OBS package architecture pattern.
//
// Each event is a dedicated class with its own fields, allowing type-safe
// event handling throughout the MacroGraph runtime.
// ============================================================================

// ----------------------------------------------------------------------------
// EventSub Message Namespace
// ----------------------------------------------------------------------------

export namespace EventSubNotification {
	// ===== Channel Events =====

	export class ChannelBan extends S.TaggedClass<ChannelBan>()("channel.ban", {
		user_id: S.String,
		user_login: S.String,
		user_name: S.String,
		broadcaster_user_id: S.String,
		broadcaster_user_login: S.String,
		broadcaster_user_name: S.String,
		moderator_user_id: S.String,
		moderator_user_login: S.String,
		moderator_user_name: S.String,
		reason: S.String,
		banned_at: S.DateTimeUtc,
		ends_at: S.NullOr(S.DateTimeUtc),
		is_permanent: S.Boolean,
	}) {}

	export class ChannelUnban extends S.TaggedClass<ChannelUnban>()(
		"channel.unban",
		{
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,
		},
	) {}

	export class ChannelUpdate extends S.TaggedClass<ChannelUpdate>()(
		"channel.update",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			title: S.String,
			language: S.String,
			category_id: S.String,
			category_name: S.String,
			content_classification_labels: S.Array(S.String),
		},
	) {}

	export class ChannelAdBreakBegin extends S.TaggedClass<ChannelAdBreakBegin>()(
		"channel.ad_break.begin",
		{
			duration_seconds: S.Number,
			started_at: S.DateTimeUtc,
			is_automatic: S.Boolean,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			requester_user_id: S.String,
			requester_user_login: S.String,
			requester_user_name: S.String,
		},
	) {}

	export class ChannelRaid extends S.TaggedClass<ChannelRaid>()(
		"channel.raid",
		{
			from_broadcaster_user_id: S.String,
			from_broadcaster_user_login: S.String,
			from_broadcaster_user_name: S.String,
			to_broadcaster_user_id: S.String,
			to_broadcaster_user_login: S.String,
			to_broadcaster_user_name: S.String,
			viewers: S.Number,
		},
	) {}

	// ===== Chat Events =====

	export class ChannelChatClear extends S.TaggedClass<ChannelChatClear>()(
		"channel.chat.clear",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
		},
	) {}

	export class ChannelChatClearUserMessages extends S.TaggedClass<ChannelChatClearUserMessages>()(
		"channel.chat.clear_user_messages",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			target_user_id: S.String,
			target_user_name: S.String,
			target_user_login: S.String,
		},
	) {}

	export class ChannelChatMessage extends S.TaggedClass<ChannelChatMessage>()(
		"channel.chat.message",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			chatter_user_id: S.String,
			chatter_user_name: S.String,
			chatter_user_login: S.String,
			message_id: S.String,
			message_text: S.String,
			message_type: S.String,
			color: S.String,
			badges: S.String, // JSON array
			cheer_bits: S.NullOr(S.Number),
			reply_parent_message_id: S.NullOr(S.String),
			channel_points_custom_reward_id: S.NullOr(S.String),
		},
	) {}

	export class ChannelChatMessageDelete extends S.TaggedClass<ChannelChatMessageDelete>()(
		"channel.chat.message_delete",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			target_user_id: S.String,
			target_user_name: S.String,
			target_user_login: S.String,
			message_id: S.String,
		},
	) {}

	export class ChannelChatNotification extends S.TaggedClass<ChannelChatNotification>()(
		"channel.chat.notification",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			chatter_user_id: S.String,
			chatter_user_login: S.String,
			chatter_user_name: S.String,
			chatter_is_anonymous: S.Boolean,
			color: S.String,
			system_message: S.String,
			message_id: S.String,
			message_text: S.String,
			notice_type: S.String,
		},
	) {}

	export class ChannelChatSettingsUpdate extends S.TaggedClass<ChannelChatSettingsUpdate>()(
		"channel.chat_settings.update",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			emote_mode: S.Boolean,
			follower_mode: S.Boolean,
			follower_mode_duration_minutes: S.NullOr(S.Number),
			slow_mode: S.Boolean,
			slow_mode_wait_time_seconds: S.NullOr(S.Number),
			subscriber_mode: S.Boolean,
			unique_chat_mode: S.Boolean,
		},
	) {}

	export class ChannelChatUserMessageHold extends S.TaggedClass<ChannelChatUserMessageHold>()(
		"channel.chat.user_message_hold",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			message_id: S.String,
			message_text: S.String,
		},
	) {}

	export class ChannelChatUserMessageUpdate extends S.TaggedClass<ChannelChatUserMessageUpdate>()(
		"channel.chat.user_message_update",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			status: S.String,
			message_id: S.String,
			message_text: S.String,
		},
	) {}

	// ===== Subscription Events =====

	export class ChannelSubscribe extends S.TaggedClass<ChannelSubscribe>()(
		"channel.subscribe",
		{
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			tier: S.String,
			is_gift: S.Boolean,
		},
	) {}

	export class ChannelSubscriptionEnd extends S.TaggedClass<ChannelSubscriptionEnd>()(
		"channel.subscription.end",
		{
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			tier: S.String,
			is_gift: S.Boolean,
		},
	) {}

	export class ChannelSubscriptionGift extends S.TaggedClass<ChannelSubscriptionGift>()(
		"channel.subscription.gift",
		{
			user_id: S.NullOr(S.String),
			user_login: S.NullOr(S.String),
			user_name: S.NullOr(S.String),
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			total: S.Number,
			tier: S.String,
			cumulative_total: S.NullOr(S.Number),
			is_anonymous: S.Boolean,
		},
	) {}

	export class ChannelSubscriptionMessage extends S.TaggedClass<ChannelSubscriptionMessage>()(
		"channel.subscription.message",
		{
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			tier: S.String,
			message_text: S.String,
			cumulative_months: S.Number,
			streak_months: S.NullOr(S.Number),
			duration_months: S.Number,
		},
	) {}

	export class ChannelCheer extends S.TaggedClass<ChannelCheer>()(
		"channel.cheer",
		{
			is_anonymous: S.Boolean,
			user_id: S.NullOr(S.String),
			user_login: S.NullOr(S.String),
			user_name: S.NullOr(S.String),
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			message: S.String,
			bits: S.Number,
		},
	) {}

	// ===== Moderation Events =====

	export class ChannelModeratorAdd extends S.TaggedClass<ChannelModeratorAdd>()(
		"channel.moderator.add",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
		},
	) {}

	export class ChannelModeratorRemove extends S.TaggedClass<ChannelModeratorRemove>()(
		"channel.moderator.remove",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
		},
	) {}

	export class ChannelVipAdd extends S.TaggedClass<ChannelVipAdd>()(
		"channel.vip.add",
		{
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
		},
	) {}

	export class ChannelVipRemove extends S.TaggedClass<ChannelVipRemove>()(
		"channel.vip.remove",
		{
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
		},
	) {}

	export class ChannelModerate extends S.TaggedClass<ChannelModerate>()(
		"channel.moderate",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,
			action: S.String,
			action_details: S.String, // JSON
		},
	) {}

	export class ChannelUnbanRequestCreate extends S.TaggedClass<ChannelUnbanRequestCreate>()(
		"channel.unban_request.create",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			text: S.String,
			created_at: S.DateTimeUtc,
		},
	) {}

	export class ChannelUnbanRequestResolve extends S.TaggedClass<ChannelUnbanRequestResolve>()(
		"channel.unban_request.resolve",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			moderator_id: S.NullOr(S.String),
			moderator_login: S.NullOr(S.String),
			moderator_name: S.NullOr(S.String),
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			resolution_text: S.NullOr(S.String),
			status: S.String,
		},
	) {}

	export class ChannelSuspiciousUserUpdate extends S.TaggedClass<ChannelSuspiciousUserUpdate>()(
		"channel.suspicious_user.update",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			moderator_user_id: S.String,
			moderator_user_name: S.String,
			moderator_user_login: S.String,
			user_id: S.String,
			user_name: S.String,
			user_login: S.String,
			low_trust_status: S.String,
		},
	) {}

	export class ChannelSuspiciousUserMessage extends S.TaggedClass<ChannelSuspiciousUserMessage>()(
		"channel.suspicious_user.message",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			user_id: S.String,
			user_name: S.String,
			user_login: S.String,
			low_trust_status: S.String,
			shared_ban_channel_ids: S.Array(S.String),
			types: S.Array(S.String),
			ban_evasion_evaluation: S.String,
			message_id: S.String,
			message_text: S.String,
		},
	) {}

	export class ChannelWarningAcknowledge extends S.TaggedClass<ChannelWarningAcknowledge>()(
		"channel.warning.acknowledge",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
		},
	) {}

	export class ChannelWarningSend extends S.TaggedClass<ChannelWarningSend>()(
		"channel.warning.send",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			reason: S.NullOr(S.String),
			chat_rules_cited: S.NullOr(S.Array(S.String)),
		},
	) {}

	// ===== AutoMod Events =====

	export class AutomodSettingsUpdate extends S.TaggedClass<AutomodSettingsUpdate>()(
		"automod.settings.update",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,
			bullying: S.Number,
			overall_level: S.NullOr(S.Number),
			disability: S.Number,
			race_ethnicity_or_religion: S.Number,
			misogyny: S.Number,
			sexuality_sex_or_gender: S.Number,
			aggression: S.Number,
			sex_based_terms: S.Number,
			swearing: S.Number,
		},
	) {}

	export class AutomodTermsUpdate extends S.TaggedClass<AutomodTermsUpdate>()(
		"automod.terms.update",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			moderator_user_id: S.String,
			moderator_user_login: S.String,
			moderator_user_name: S.String,
			action: S.String,
			from_automod: S.Boolean,
			terms: S.Array(S.String),
		},
	) {}

	// ===== Poll Events =====

	export class ChannelPollBegin extends S.TaggedClass<ChannelPollBegin>()(
		"channel.poll.begin",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			title: S.String,
			choices: S.String, // JSON array
			started_at: S.DateTimeUtc,
			ends_at: S.DateTimeUtc,
		},
	) {}

	export class ChannelPollProgress extends S.TaggedClass<ChannelPollProgress>()(
		"channel.poll.progress",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			title: S.String,
			choices: S.String, // JSON array
			started_at: S.DateTimeUtc,
			ends_at: S.DateTimeUtc,
		},
	) {}

	export class ChannelPollEnd extends S.TaggedClass<ChannelPollEnd>()(
		"channel.poll.end",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			title: S.String,
			choices: S.String, // JSON array
			status: S.String,
			started_at: S.DateTimeUtc,
			ended_at: S.DateTimeUtc,
		},
	) {}

	// ===== Prediction Events =====

	export class ChannelPredictionBegin extends S.TaggedClass<ChannelPredictionBegin>()(
		"channel.prediction.begin",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			title: S.String,
			outcomes: S.String, // JSON array
			started_at: S.DateTimeUtc,
			locks_at: S.DateTimeUtc,
		},
	) {}

	export class ChannelPredictionProgress extends S.TaggedClass<ChannelPredictionProgress>()(
		"channel.prediction.progress",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			title: S.String,
			outcomes: S.String, // JSON array
			started_at: S.DateTimeUtc,
			locks_at: S.DateTimeUtc,
		},
	) {}

	export class ChannelPredictionLock extends S.TaggedClass<ChannelPredictionLock>()(
		"channel.prediction.lock",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			title: S.String,
			outcomes: S.String, // JSON array
			started_at: S.DateTimeUtc,
			locked_at: S.DateTimeUtc,
		},
	) {}

	export class ChannelPredictionEnd extends S.TaggedClass<ChannelPredictionEnd>()(
		"channel.prediction.end",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			title: S.String,
			winning_outcome_id: S.NullOr(S.String),
			outcomes: S.String, // JSON array
			status: S.String,
			started_at: S.DateTimeUtc,
			ended_at: S.DateTimeUtc,
		},
	) {}

	// ===== Channel Points Events =====

	export class ChannelPointsAutomaticRewardRedemptionAdd extends S.TaggedClass<ChannelPointsAutomaticRewardRedemptionAdd>()(
		"channel.channel_points_automatic_reward_redemption.add",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			id: S.String,
			reward_type: S.String,
			reward_cost: S.Number,
			message_text: S.NullOr(S.String),
			redeemed_at: S.DateTimeUtc,
		},
	) {}

	// ===== Hype Train Events =====

	export class HypeTrainBegin extends S.TaggedClass<HypeTrainBegin>()(
		"channel.hype_train.begin",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			level: S.Number,
			total: S.Number,
			progress: S.Number,
			goal: S.Number,
			top_contributions: S.String, // JSON array
			started_at: S.DateTimeUtc,
			expires_at: S.DateTimeUtc,
		},
	) {}

	export class HypeTrainProgress extends S.TaggedClass<HypeTrainProgress>()(
		"channel.hype_train.progress",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			level: S.Number,
			total: S.Number,
			progress: S.Number,
			goal: S.Number,
			top_contributions: S.String, // JSON array
			started_at: S.DateTimeUtc,
			expires_at: S.DateTimeUtc,
		},
	) {}

	export class HypeTrainEnd extends S.TaggedClass<HypeTrainEnd>()(
		"channel.hype_train.end",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			level: S.Number,
			total: S.Number,
			top_contributions: S.String, // JSON array
			started_at: S.DateTimeUtc,
			ended_at: S.DateTimeUtc,
			cooldown_ends_at: S.DateTimeUtc,
		},
	) {}

	// ===== Charity Events =====

	export class ChannelCharityCampaignDonate extends S.TaggedClass<ChannelCharityCampaignDonate>()(
		"channel.charity_campaign.donate",
		{
			id: S.String,
			campaign_id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			charity_name: S.String,
			charity_description: S.String,
			charity_logo: S.String,
			charity_website: S.String,
			amount_value: S.Number,
			amount_decimal_places: S.Number,
			amount_currency: S.String,
		},
	) {}

	export class ChannelCharityCampaignStart extends S.TaggedClass<ChannelCharityCampaignStart>()(
		"channel.charity_campaign.start",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			charity_name: S.String,
			charity_description: S.String,
			charity_logo: S.String,
			charity_website: S.String,
			current_amount_value: S.Number,
			current_amount_decimal_places: S.Number,
			current_amount_currency: S.String,
			target_amount_value: S.Number,
			target_amount_decimal_places: S.Number,
			target_amount_currency: S.String,
			started_at: S.DateTimeUtc,
		},
	) {}

	export class ChannelCharityCampaignProgress extends S.TaggedClass<ChannelCharityCampaignProgress>()(
		"channel.charity_campaign.progress",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			charity_name: S.String,
			charity_description: S.String,
			charity_logo: S.String,
			charity_website: S.String,
			current_amount_value: S.Number,
			current_amount_decimal_places: S.Number,
			current_amount_currency: S.String,
			target_amount_value: S.Number,
			target_amount_decimal_places: S.Number,
			target_amount_currency: S.String,
		},
	) {}

	export class ChannelCharityCampaignStop extends S.TaggedClass<ChannelCharityCampaignStop>()(
		"channel.charity_campaign.stop",
		{
			id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			charity_name: S.String,
			charity_description: S.String,
			charity_logo: S.String,
			charity_website: S.String,
			current_amount_value: S.Number,
			current_amount_decimal_places: S.Number,
			current_amount_currency: S.String,
			target_amount_value: S.Number,
			target_amount_decimal_places: S.Number,
			target_amount_currency: S.String,
			stopped_at: S.DateTimeUtc,
		},
	) {}

	// ===== Shared Chat Events =====

	export class ChannelSharedChatSessionBegin extends S.TaggedClass<ChannelSharedChatSessionBegin>()(
		"channel.shared_chat.session.begin",
		{
			session_id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			host_broadcaster_user_id: S.String,
			host_broadcaster_user_name: S.String,
			host_broadcaster_user_login: S.String,
			participants: S.String, // JSON array
		},
	) {}

	export class ChannelSharedChatSessionUpdate extends S.TaggedClass<ChannelSharedChatSessionUpdate>()(
		"channel.shared_chat.session.update",
		{
			session_id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			host_broadcaster_user_id: S.String,
			host_broadcaster_user_name: S.String,
			host_broadcaster_user_login: S.String,
			participants: S.String, // JSON array
		},
	) {}

	export class ChannelSharedChatSessionEnd extends S.TaggedClass<ChannelSharedChatSessionEnd>()(
		"channel.shared_chat.session.end",
		{
			session_id: S.String,
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			host_broadcaster_user_id: S.String,
			host_broadcaster_user_name: S.String,
			host_broadcaster_user_login: S.String,
		},
	) {}

	// ===== Guest Star Events =====

	export class ChannelGuestStarSessionBegin extends S.TaggedClass<ChannelGuestStarSessionBegin>()(
		"channel.guest_star_session.begin",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			session_id: S.String,
			started_at: S.DateTimeUtc,
		},
	) {}

	export class ChannelGuestStarSessionEnd extends S.TaggedClass<ChannelGuestStarSessionEnd>()(
		"channel.guest_star_session.end",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			session_id: S.String,
			started_at: S.DateTimeUtc,
			ended_at: S.DateTimeUtc,
			host_user_id: S.String,
			host_user_name: S.String,
			host_user_login: S.String,
		},
	) {}

	export class ChannelGuestStarGuestUpdate extends S.TaggedClass<ChannelGuestStarGuestUpdate>()(
		"channel.guest_star_guest.update",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_name: S.String,
			broadcaster_user_login: S.String,
			session_id: S.String,
			moderator_user_id: S.NullOr(S.String),
			moderator_user_name: S.NullOr(S.String),
			moderator_user_login: S.NullOr(S.String),
			guest_user_id: S.NullOr(S.String),
			guest_user_name: S.NullOr(S.String),
			guest_user_login: S.NullOr(S.String),
			slot_id: S.NullOr(S.String),
			state: S.NullOr(S.String),
			host_user_id: S.String,
			host_user_name: S.String,
			host_user_login: S.String,
			host_video_enabled: S.NullOr(S.Boolean),
			host_audio_enabled: S.NullOr(S.Boolean),
			host_volume: S.NullOr(S.Number),
		},
	) {}

	// ===== Bits Events =====

	export class ChannelBitsUse extends S.TaggedClass<ChannelBitsUse>()(
		"channel.bits.use",
		{
			broadcaster_user_id: S.String,
			broadcaster_user_login: S.String,
			broadcaster_user_name: S.String,
			user_id: S.String,
			user_login: S.String,
			user_name: S.String,
			bits: S.Number,
			use_type: S.String, // "cheer" | "power_up"
			message_text: S.NullOr(S.String),
			power_up_type: S.NullOr(S.String),
		},
	) {}

	// ===== Event Union =====

	export const Any = S.Union(
		ChannelBan,
		ChannelUnban,
		ChannelUpdate,
		ChannelAdBreakBegin,
		ChannelRaid,
		ChannelChatClear,
		ChannelChatClearUserMessages,
		ChannelChatMessage,
		ChannelChatMessageDelete,
		ChannelChatNotification,
		ChannelChatSettingsUpdate,
		ChannelChatUserMessageHold,
		ChannelChatUserMessageUpdate,
		ChannelSubscribe,
		ChannelSubscriptionEnd,
		ChannelSubscriptionGift,
		ChannelSubscriptionMessage,
		ChannelCheer,
		ChannelModeratorAdd,
		ChannelModeratorRemove,
		ChannelVipAdd,
		ChannelVipRemove,
		ChannelModerate,
		ChannelUnbanRequestCreate,
		ChannelUnbanRequestResolve,
		ChannelSuspiciousUserUpdate,
		ChannelSuspiciousUserMessage,
		ChannelWarningAcknowledge,
		ChannelWarningSend,
		AutomodSettingsUpdate,
		AutomodTermsUpdate,
		ChannelPollBegin,
		ChannelPollProgress,
		ChannelPollEnd,
		ChannelPredictionBegin,
		ChannelPredictionProgress,
		ChannelPredictionLock,
		ChannelPredictionEnd,
		ChannelPointsAutomaticRewardRedemptionAdd,
		HypeTrainBegin,
		HypeTrainProgress,
		HypeTrainEnd,
		ChannelCharityCampaignDonate,
		ChannelCharityCampaignStart,
		ChannelCharityCampaignProgress,
		ChannelCharityCampaignStop,
		ChannelSharedChatSessionBegin,
		ChannelSharedChatSessionUpdate,
		ChannelSharedChatSessionEnd,
		ChannelGuestStarSessionBegin,
		ChannelGuestStarSessionEnd,
		ChannelGuestStarGuestUpdate,
		ChannelBitsUse,
	);
	export type Any = S.Schema.Type<typeof Any>;
}

export namespace EventSubMessage {
	function makeMessageSchema<
		TType extends string,
		TPayload extends S.Struct.Fields,
	>(value: { message_type: TType; payload: TPayload }) {
		return S.Struct({
			metadata: S.Struct({
				message_id: S.String,
				message_timestamp: S.DateFromString,
				message_type: S.Literal(value.message_type),
			}),
			payload: S.Struct(value.payload),
		});
	}

	export const EventSubMessage = S.Union(
		makeMessageSchema({
			message_type: "session_welcome",
			payload: {
				session: S.Struct({
					id: S.String,
					status: S.Literal("connected"),
					// connected_at: S.DateFromString,
				}),
			},
		}),
		makeMessageSchema({ message_type: "session_keepalive", payload: {} }),
		makeMessageSchema({
			message_type: "notification",
			payload: {
				subscription: S.Struct({
					id: S.String,
					type: S.String,
					created_at: S.DateFromString,
				}),
				event: S.Any,
			},
		}),
	);
	export type EventSubMessage = S.Schema.Type<typeof EventSubMessage>;

	export function isType<T extends EventSubMessage["metadata"]["message_type"]>(
		msg: EventSubMessage,
		type: T,
	): msg is Extract<EventSubMessage, { metadata: { message_type: T } }> {
		return msg.metadata.message_type === type;
	}
}

// ============================================================================
// Error Classes
// ============================================================================

export class TwitchAPIError extends S.TaggedError<TwitchAPIError>()(
	"TwitchAPIError",
	{ cause: S.Unknown },
) {}

export class MissingCredential extends S.TaggedError<MissingCredential>()(
	"MissingCredential",
	{},
) {}

export const RpcError = S.Union(TwitchAPIError, MissingCredential);

export class ConnectionFailed extends S.TaggedError<ConnectionFailed>()(
	"ConnectionFailed",
	{ cause: S.Literal("session-welcome-expected") },
) {}
