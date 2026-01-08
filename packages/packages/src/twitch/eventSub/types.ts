import { t } from "@macrograph/typesystem-old";

import type { Pkg } from "..";

export function createTypes(pkg: Pkg) {
	const PredictionStatus = pkg.createEnum("Prediction Status", (e) => [
		e.variant("resolved"),
		e.variant("canceled"),
	]);

	const OutcomesBegin = pkg.createStruct("Outcomes Begin", (s) => ({
		id: s.field("id", t.string()),
		title: s.field("title", t.string()),
		color: s.field("Color", t.string()),
	}));

	const TopPredictors = pkg.createStruct("Top Predictors", (s) => ({
		user_name: s.field("User Name", t.string()),
		user_login: s.field("User Login", t.string()),
		user_id: s.field("User ID", t.string()),
		channel_points_won: s.field("Channel Points Won", t.option(t.int())),
		channel_points_used: s.field("Channel Points Used", t.int()),
	}));

	const OutcomesProgress = pkg.createStruct("Outcomes Progress", (s) => ({
		id: s.field("id", t.string()),
		title: s.field("title", t.string()),
		color: s.field("Color", t.string()),
		users: s.field("Users", t.int()),
		channel_points: s.field("Channel Points", t.int()),
		top_predictors: s.field("Top Predictors", t.list(t.struct(TopPredictors))),
	}));

	const PollChoice = pkg.createStruct("Choice", (s) => ({
		id: s.field("id", t.string()),
		title: s.field("title", t.string()),
		channel_points_votes: s.field("Channel Points Votes", t.int()),
		votes: s.field("votes", t.int()),
	}));

	const Emotes = pkg.createStruct("Emotes", (s) => ({
		id: s.field("id", t.string()),
		begin: s.field("begin", t.int()),
		end: s.field("end", t.int()),
	}));

	const Participants = pkg.createStruct("Participants", (s) => ({
		broadcaster_user_id: s.field("Broadcaster User ID", t.string()),
		broadcaster_user_name: s.field("Broadcaster User name", t.string()),
		broadcaster_user_login: s.field("Broadcaster User Login", t.string()),
	}));

	const PollBeginChoice = pkg.createStruct("Poll Begin Choice", (s) => ({
		id: s.field("id", t.string()),
		title: s.field("title", t.string()),
	}));

	return {
		Participants,
		PredictionStatus,
		OutcomesBegin,
		TopPredictors,
		OutcomesProgress,
		PollChoice,
		Emotes,
		PollBeginChoice,
	};
}

interface MaxPerStream {
	is_enabled: boolean;
	value: number | null;
}

interface RedemptionReward {
	id: string;
	title: string;
	cost: number;
	prompt: string;
}

interface BeginPollChoice {
	id: string;
	title: string;
}

interface Participants {
	broadcaster_user_id: string;
	broadcaster_user_name: string;
	broadcaster_user_login: string;
}

interface PollChoice extends BeginPollChoice {
	bits_votes: number;
	channel_points_votes: number;
	votes: number;
}

interface Emotes {
	id: string;
	begin: number;
	end: number;
}

interface VoteTypeSettings {
	is_enabled: boolean;
	amount_per_vote: number;
}

type PollEndStatus = "completed" | "archived" | "terminated";

interface PredictionBeginOutcomeData {
	id: string;
	title: string;
	color: PredictionColor;
}

interface PredictionPredictorData {
	user_name: string;
	user_login: string;
	user_id: string;
	channel_points_won: number | null;
	channel_points_used: number;
}

interface PredictionOutcomeData extends PredictionBeginOutcomeData {
	users: number;
	channel_points: number;
	top_predictors: PredictionPredictorData[];
}

type PredictionColor = "blue" | "pink";

type PredictionEndStatus = "resolved" | "canceled";

interface HypeTrainContributionData {
	user_id: string;
	user_login: string;
	user_name: string;
	type: HypeTrainContributionType;
	total: number;
}

type HypeTrainContributionType = "bits" | "subscription" | "other";

type SubscriptionEventTier = "1000" | "2000" | "3000";

type SubscriptionGiftEventTier = "1000" | "2000" | "3000";

interface SubscriptionMessageEmoteData {
	begin: number;
	end: number;
	id: string;
}

interface SubscriptionMessageData {
	text: string;
	emotes: SubscriptionMessageEmoteData[] | null;
}

type SubscriptionMessageEventTier = "1000" | "2000" | "3000";

type SubscriptionEndEventTier = "1000" | "2000" | "3000";

type GoalType =
	| "follow"
	| "subscription"
	| "subscription_count"
	| "new_subscription"
	| "new_subscription_count";

type StreamOnlineEventStreamType =
	| "live"
	| "playlist"
	| "watch_party"
	| "premiere"
	| "rerun";

interface Badge {
	set_id: string;
	id: string;
	info: string;
}

interface whisper {
	text: string;
}

interface SubNoticeMetadata {
	sub_tier: "1000" | "2000" | "3000";
	is_prime: boolean;
	duration_months: number;
}

interface ResubNoticeMetadata {
	cumulative_months: number;
	duration_months: number;
	streak_months: number;
	sub_tier: "1000" | "2000" | "3000";
	is_prime: boolean;
	is_gift: boolean;
	gifter_is_anonymous: boolean | null;
	gifter_user_id: string | null;
	gifter_user_name: string | null;
	gifter_user_login: string | null;
}

interface SubGiftNoticeMetadata {
	duration_months: number;
	cumulative_total: number | null;
	recipient_user_id: string;
	recipient_user_name: string;
	recipient_user_login: string;
	sub_tier: "1000" | "2000" | "3000";
	community_gift_id: string | null;
}

interface CommunitySubGiftNoticeMetadata {
	id: string;
	total: number;
	sub_tier: "1000" | "2000" | "3000";
	cumulative_total: number | null;
}

interface GiftPaidUpgradeNoticeMetadata {
	gifter_is_anonymous: boolean;
	gifter_user_id: string | null;
	gifter_user_name: string | null;
	gifter_user_login: string | null;
}

interface PrimePaidUpgradeNoticeMetadata {
	sub_tier: "1000" | "2000" | "3000";
}

type UnraidNoticeMetadata = Record<string, never>;

interface RaidNoticeMetadata {
	user_id: string;
	user_name: string;
	user_login: string;
	viewer_count: number;
	profile_image_url: string;
}

interface PayItForwardNoticeMetadata {
	gifter_is_anonymous: boolean;
	gifter_user_id: string | null;
	gifter_user_name: string | null;
	gifter_user_login: string | null;
}

interface AnnouncementNoticeMetadata {
	color: string;
}

interface Amount {
	value: number;
	decimal_places: number;
	currency: string;
}

interface CharityDonationNoticeMetadata {
	charity_name: string;
	amount: Amount;
}

interface BitsBadgeTierNoticeMetadata {
	tier: number;
}

interface MessageFragmentCheermote {
	prefix: string;
	bits: number;
	tier: number;
}

interface MessageFragmentEmote {
	id: string;
	emote_set_id: string;
	owner_id: string;
	format: string[];
}

interface MessageFragmentMention {
	user_id: string;
	user_name: string;
	user_login: string;
}

interface MessageFragment {
	type: "text" | "cheermote" | "emote" | "mention";
	text: string;
	cheermote: MessageFragmentCheermote | null;
	emote: MessageFragmentEmote | null;
	mention: MessageFragmentMention | null;
}

interface Message {
	text: string;
	fragments: MessageFragment[];
}

export interface Events {
	"channel.ban": {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		moderator_user_id: string;
		moderator_user_login: string;
		moderator_user_name: string;
		reason: string;
		banned_at: string;
		ends_at: string | null;
		is_permanent: boolean;
	};
	"channel.unban": {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		moderator_user_id: string;
		moderator_user_login: string;
		moderator_user_name: string;
	};
	"channel.moderator.add": {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		user_id: string;
		user_login: string;
		user_name: string;
	};
	"channel.moderator.remove": this["channel.moderator.add"];
	"channel.channel_points_custom_reward.add": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		is_enabled: boolean;
		is_paused: boolean;
		is_in_stock: boolean;
		title: string;
		cost: number;
		prompt: string;
		is_user_input_required: boolean;
		should_redemptions_skip_request_queue: boolean;
		cooldown_expires_at: string | null;
		redemptions_redeemed_current_stream: number | null;
		max_per_stream: MaxPerStream;
		max_per_user_per_stream: MaxPerStream;
		global_cooldown: { is_enabled: boolean; seconds: number | null };
		background_color: string;
		image: { url_1x: string; url_2x: string; url_4x: string } | null;
		default_image: 1 | 2 | 4;
	};
	"channel.channel_points_custom_reward.update": this["channel.channel_points_custom_reward.add"];
	"channel.channel_points_custom_reward.remove": this["channel.channel_points_custom_reward.add"];
	"channel.channel_points_custom_reward_redemption.add": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		user_id: string;
		user_login: string;
		user_name: string;
		user_input: string;
		status: "unfulfilled" | "unknown" | "fulfilled" | "canceled";
		reward: RedemptionReward;
		redeemed_at: string;
	};
	"channel.shared_chat.begin": {
		session_id: string;
		host_broadcaster_user_id: string;
		host_broadcaster_user_name: string;
		host_broadcaster_user_login: string;
		participants: Participants[];
	};
	"channel.shared_chat.update": {
		session_id: string;
		host_broadcaster_user_id: string;
		host_broadcaster_user_name: string;
		host_broadcaster_user_login: string;
		participants: Participants[];
	};
	"channel.shared_chat.end": {
		session_id: string;
		host_broadcaster_user_id: string;
		host_broadcaster_user_name: string;
		host_broadcaster_user_login: string;
	};
	"channel.poll.begin": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		title: string;
		choices: BeginPollChoice[];
		bits_voting: VoteTypeSettings;
		channel_points_voting: VoteTypeSettings;
		started_at: string;
		ends_at: string;
	};
	"channel.poll.progress": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		title: string;
		choices: PollChoice[];
		bits_voting: VoteTypeSettings;
		channel_points_voting: VoteTypeSettings;
		started_at: string;
		ends_at: string;
	};
	"channel.channel_points_automatic_reward_redemption.add": {
		user_id: string;
		user_login: string;
		user_name: string;
		reward: { type: string; cost: number; unlocked_emote: null };
		message: { text: string; emotes: Emotes[] };
	};
	"channel.poll.end": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		title: string;
		choices: PollChoice[];
		bits_voting: VoteTypeSettings;
		channel_points_voting: VoteTypeSettings;
		status: PollEndStatus;
		started_at: string;
		ended_at: string;
	};
	"channel.prediction.begin": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		title: string;
		outcomes: PredictionBeginOutcomeData[];
		started_at: string;
		locks_at: string;
	};
	"channel.prediction.progress": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		title: string;
		outcomes: PredictionOutcomeData[];
		started_at: string;
		locks_at: string;
	};
	"channel.prediction.lock": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		title: string;
		outcomes: PredictionOutcomeData[];
		started_at: string;
		locked_at: string;
	};
	"channel.prediction.end": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		title: string;
		winning_outcome_id: string | null;
		outcomes: PredictionOutcomeData[];
		status: PredictionEndStatus;
		started_at: string;
		ended_at: string;
	};
	"channel.hype_train.begin": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		level: number;
		total: number;
		progress: number;
		goal: number;
		top_contributions: HypeTrainContributionData[];
		last_contribution: HypeTrainContributionData;
		started_at: string;
		expires_at: string;
	};
	"channel.hype_train.progress": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		level: number;
		total: number;
		progress: number;
		goal: number;
		top_contributions: HypeTrainContributionData[];
		last_contribution: HypeTrainContributionData;
		started_at: string;
		expires_at: string;
	};
	"channel.hype_train.end": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		level: number;
		total: number;
		top_contributions: HypeTrainContributionData[];
		started_at: string;
		ended_at: string;
		cooldown_ends_at: string;
	};
	"channel.update": {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		title: string;
		language: string;
		category_id: string;
		category_name: string;
		content_classification_labels: string[];
	};
	"channel.subscribe": {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		tier: SubscriptionEventTier;
		is_gift: boolean;
	};
	"channel.subscription.end": {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		tier: SubscriptionEndEventTier;
		is_gift: boolean;
	};
	"channel.subscription.gift": {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		total: number;
		tier: SubscriptionGiftEventTier;
		cumulative_total: number | null;
		is_anonymous: boolean;
	};
	"channel.subscription.message": {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		tier: SubscriptionMessageEventTier;
		message: SubscriptionMessageData;
		cumulative_months: number;
		streak_months: number | null;
		duration_months: number;
	};
	"channel.cheer": {
		is_anonymous: boolean;
		user_id: string | null;
		user_login: string | null;
		user_name: string | null;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		message: string;
		bits: number;
	};
	"channel.raid": {
		from_broadcaster_user_id: string;
		from_broadcaster_user_login: string;
		from_broadcaster_user_name: string;
		to_broadcaster_user_id: string;
		to_broadcaster_user_login: string;
		to_broadcaster_user_name: string;
		viewers: number;
	};
	"channel.ad_break.begin": {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		requester_user_id: string;
		requester_user_login: string;
		requester_user_name: string;
		started_at: string;
		duration_seconds: number;
		is_automatic: boolean;
	};
	"channel.follow": {
		user_id: string;
		user_login: string;
		user_name: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		followed_at: string;
	};
	"channel.shoutout.receive": {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		from_broadcaster_user_id: string;
		from_broadcaster_user_login: string;
		from_broadcaster_user_name: string;
		viewer_count: number;
		started_at: string;
	};
	"channel.shoutout.create": {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		to_broadcaster_user_id: string;
		to_broadcaster_user_login: string;
		to_broadcaster_user_name: string;
		moderator_user_id: string;
		moderator_user_login: string;
		moderator_user_name: string;
		viewer_count: number;
		started_at: string;
		cooldown_ends_at: string;
		target_cooldown_ends_at: string;
	};
	"channel.goal.begin": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		type: GoalType;
		description: string;
		current_amount: number;
		target_amount: number;
		started_at: Date;
	};
	"channel.goal.progress": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		type: GoalType;
		description: string;
		current_amount: number;
		target_amount: number;
		started_at: Date;
	};
	"channel.goal.end": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		type: GoalType;
		description: string;
		is_achieved: boolean;
		current_amount: number;
		target_amount: number;
		started_at: Date;
		ended_at: Date;
	};
	"stream.online": {
		id: string;
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		type: StreamOnlineEventStreamType;
		started_at: string;
	};
	"stream.offline": {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
	};
	"channel.chat.message": {
		broadcaster_user_id: string;
		broadcaster_user_name: string;
		broadcaster_user_login: string;
		chatter_user_id: string;
		chatter_user_name: string;
		chatter_user_login: string;
		message_id: string;
		message: {
			text: string;
			fragments: {
				type: "text" | "cheermote" | "emote" | "mention";
				text: string;
				cheermote?: { prefix: string; bits: number; tier: number };
				emote?: {
					id: string;
					emote_set_id: string;
					owner_id: string;
					format: ("static" | "animated")[];
				};
				mention?: { user_id: string; user_name: string; user_login: string };
			}[];
		};
		message_type:
			| "text"
			| "channel_points_highlighted"
			| "channel_points_sub_only"
			| "user_intro"
			| "power_ups_message_effect"
			| "power_ups_gigantified_emote";
		badges: { set_id: string; id: string; info: string }[];
		cheer?: { bits: number };
		color: string;
		reply?: {
			parent_message_id: string;
			parent_message_body: string;
			parent_user_id: string;
			parent_user_name: string;
			parent_user_login: string;
			thread_message_id: string;
			thread_user_id: string;
			thread_user_name: string;
			thread_user_login: string;
		};
		channel_points_custom_reward_id?: string;
		source_broadcaster_user_id?: string;
		source_broadcaster_user_name?: string;
		source_broadcaster_user_login?: string;
		source_message_id?: string;
		source_badges?: { set_id: string; id: string; info: string }[];
		is_source_only?: boolean;
	};
	"user.whisper.message": {
		from_user_id: string;
		from_user_name: string;
		from_user_login: string;
		to_user_id: string;
		to_user_name: string;
		to_user_login: string;
		whisper_id: string;
		whisper: whisper;
	};
	"channel.chat.clear_user_messages": {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		target_user_id: string;
		target_user_login: string;
		target_user_name: string;
	};
	"channel.chat.message_delete": {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
		target_user_id: string;
		target_user_login: string;
		target_user_name: string;
		message_id: string;
	};
	"channel.chat.clear": {
		broadcaster_user_id: string;
		broadcaster_user_login: string;
		broadcaster_user_name: string;
	};
	"channel.chat.notification": {
		broadcaster_user_id: string;
		broadcaster_user_name: string;
		broadcaster_user_login: string;
		chatter_user_id: string;
		chatter_user_name: string;
		chatter_user_login: string;
		chatter_is_anonymous: boolean;
		color: string;
		badges: Badge[];
		system_message: string;
		message_id: string;
		message: Message;
		notice_type: string;
		sub: SubNoticeMetadata | null;
		resub: ResubNoticeMetadata | null;
		sub_gift: SubGiftNoticeMetadata | null;
		community_sub_gift: CommunitySubGiftNoticeMetadata | null;
		gift_paid_upgrade: GiftPaidUpgradeNoticeMetadata | null;
		prime_paid_upgrade: PrimePaidUpgradeNoticeMetadata | null;
		raid: RaidNoticeMetadata | null;
		unraid: UnraidNoticeMetadata | null;
		pay_it_forward: PayItForwardNoticeMetadata | null;
		announcement: AnnouncementNoticeMetadata | null;
		charity_donation: CharityDonationNoticeMetadata | null;
		bits_badge_tier: BitsBadgeTierNoticeMetadata | null;
	};
}
