import {
	HttpApi,
	HttpApiEndpoint,
	HttpApiGroup,
	OpenApi,
} from "@effect/platform";
import { Schema as S } from "effect";

import { EVENTSUB_CREATE_SUBSCRIPTION_BODY } from "../eventSub.ts";
import {
	CharityCampaignAmount,
	DateRange,
	Pagination,
} from "./schemas/common.ts";

export const AdDetails = S.Struct({
	length: S.Literal(30, 60, 90, 120, 150, 180),
	message: S.String,
	retry_after: S.Int,
});

export const Category = S.Struct({
	id: S.String,
	name: S.String,
	box_art_url: S.String,
});

export const ExtensionAnalytic = S.Struct({
	extension_id: S.String,
	URL: S.String,
	type: S.String,
	date_range: DateRange,
});

export const GameAnalytic = S.Struct({
	game_id: S.String,
	URL: S.String,
	type: S.String,
	date_range: DateRange,
});

export const Video = S.Struct({
	id: S.String,
	stream_id: S.String,
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
	title: S.String,
	description: S.String,
	created_at: S.DateFromString,
	published_at: S.DateFromString,
	url: S.String,
	thumbnail_url: S.String,
	viewable: S.Literal("public", "private"),
	view_count: S.Int,
	language: S.String,
	type: S.Literal("upload", "archive", "highlight"),
	duration: S.String,
	muted_segments: S.Array(
		S.Struct({
			duration: S.Int,
			offset: S.Int,
		}),
	),
});

export const Subscription = S.Struct({
	broadcaster_id: S.String,
	broadcaster_login: S.String,
	broadcaster_name: S.String,
	is_gift: S.Boolean,
	gifter_id: S.optional(S.String),
	gifter_login: S.optional(S.String),
	gifter_name: S.optional(S.String),
	tier: S.String,
	plan_name: S.String,
	user_id: S.String,
	user_name: S.String,
	user_login: S.String,
});

export const UserSubscription = S.Struct({
	broadcaster_id: S.String,
	broadcaster_login: S.String,
	broadcaster_name: S.String,
	is_gift: S.Boolean,
	gifter_login: S.optional(S.String),
	gifter_name: S.optional(S.String),
	tier: S.String,
});

export const AppAccessTokenRequest = S.Struct({
	client_id: S.String,
	client_secret: S.String,
	grant_type: S.Literal("client_credentials"),
	scope: S.optional(S.String),
});

export const UserAccessTokenRequest = S.Struct({
	client_id: S.String,
	client_secret: S.String,
	code: S.String,
	grant_type: S.Literal("authorization_code"),
	redirect_uri: S.String,
});

export const DeviceAccessTokenRequest = S.Struct({
	client_id: S.String,
	device_code: S.String,
	grant_type: S.Literal("urn:ietf:params:oauth:grant-type:device_code"),
	scope: S.optional(S.String),
});

export const RefreshTokenRequest = S.Struct({
	client_id: S.String,
	client_secret: S.String,
	grant_type: S.Literal("refresh_token"),
	refresh_token: S.String,
});

export const RevokeTokenRequest = S.Struct({
	client_id: S.String,
	token: S.String,
});

export const DeviceCodeRequest = S.Struct({
	client_id: S.String,
	scope: S.optional(S.String),
});

export const AccessCredentials = S.Struct({
	access_token: S.String,
	refresh_token: S.optional(S.String),
	expires_in: S.Int,
	scope: S.Array(S.String),
});

export const DeviceVerificationCredentials = S.Struct({
	device_code: S.String,
	expires_in: S.Int,
	interval: S.Int,
	user_code: S.String,
	verification_uri: S.String,
});

export const ValidateTokenResponse = S.Struct({
	client_id: S.String,
	login: S.String,
	scopes: S.Array(S.String),
	user_id: S.String,
	expires_in: S.optional(S.Int),
});

export const GetAuthorizationUrlParams = S.Struct({
	response_type: S.Literal("code", "token"),
	client_id: S.String,
	redirect_uri: S.String,
	scope: S.String,
	state: S.optional(S.String),
	force_verify: S.optional(S.Literal("true", "false")),
});

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

export const ChannelInformation = S.Struct({
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	broadcaster_language: S.String,
	game_id: S.String,
	game_name: S.String,
	title: S.String,
	delay: S.Int,
	tags: S.Array(S.String),
});

export const EditChannelInformationParams = S.Struct({
	game_id: S.optional(S.String),
	broadcaster_language: S.optional(S.String),
	title: S.optional(S.String),
	delay: S.optional(S.Int),
	tags: S.optional(S.Array(S.String)),
});

export const ChannelFollow = S.Struct({
	user_id: S.String,
	user_name: S.String,
	user_login: S.String,
	followed_at: S.DateFromString,
});

export const Channel = S.Struct({
	id: S.String,
	game_id: S.String,
	game_name: S.String,
	broadcaster_login: S.String,
	display_name: S.String,
	language: S.String,
	title: S.String,
	tags: S.Array(S.String),
	thumbnail_url: S.String,
	is_live: S.Boolean,
	started_at: S.optional(S.DateFromString),
	tag_ids: S.Array(S.String),
});

export const ChannelEditor = S.Struct({
	user_id: S.String,
	user_name: S.String,
	created_at: S.DateFromString,
});

export const ChannelVips = S.Struct({
	user_id: S.String,
	user_name: S.String,
	user_login: S.String,
});

export const FollowedChannel = S.Struct({
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	broadcaster_login: S.String,
	followed_at: S.DateFromString,
});

export const ChatChatter = S.Struct({
	user_login: S.String,
	user_id: S.String,
	user_name: S.String,
});

export const GetChatChattersResponse = S.Struct({
	data: S.Struct({
		data: S.Array(ChatChatter),
		pagination: Pagination,
		total: S.Int,
	}),
});

export const BadgeVersion = S.Struct({
	id: S.String,
	image_url_1x: S.String,
	image_url_2x: S.String,
	image_url_4x: S.String,
});

export const ChatBadge = S.Struct({
	set_id: S.String,
	versions: S.Array(BadgeVersion),
});

export const GetChatBadgeResponse = S.Struct({
	data: S.Array(ChatBadge),
});

export const EmoteImage = S.Struct({
	url_1x: S.String,
	url_2x: S.String,
	url_4x: S.String,
});

export const Emote = S.Struct({
	id: S.String,
	name: S.String,
	images: EmoteImage,
	tier: S.String,
	emote_type: S.String,
	emote_set_id: S.String,
});

export const EmoteWithOwner = S.Struct({
	id: S.String,
	name: S.String,
	images: EmoteImage,
	tier: S.String,
	emote_type: S.String,
	emote_set_id: S.String,
	owner_id: S.String,
});

export const GetChannelEmotesResponse = S.Struct({
	data: S.Array(Emote),
});

export const GetEmoteSetsResponse = S.Struct({
	data: S.Array(EmoteWithOwner),
});

export const ChatSettings = S.Struct({
	broadcaster_id: S.String,
	emote_mode: S.Boolean,
	follower_mode: S.Boolean,
	follower_mode_duration: S.Int,
	slow_mode: S.Boolean,
	slow_mode_wait_time: S.Int,
	subscriber_mode: S.Boolean,
	unique_chat_mode: S.Boolean,
	moderator_id: S.String,
	non_moderator_chat_delay: S.Boolean,
	non_moderator_chat_delay_duration: S.Int,
});

export const GetChatSettingsResponse = S.Struct({
	data: S.Array(ChatSettings),
});

export const UpdateChatSettingsResponse = S.Struct({
	data: S.Array(ChatSettings),
});

export const GetUserChatColorUser = S.Struct({
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
	color: S.String,
});

export const GetUserChatColorResponse = S.Struct({
	data: S.Struct({
		data: S.Array(GetUserChatColorUser),
	}),
});

export const DropReason = S.Struct({
	code: S.String,
	message: S.String,
});

export const ChatMessage = S.Struct({
	message_id: S.String,
	is_sent: S.Boolean,
	drop_reason: DropReason,
});

export const ChatMessageResponse = S.Struct({
	data: S.Struct({
		data: S.Array(ChatMessage),
	}),
});

export const ChatAnnouncementPayload = S.Struct({
	message: S.String,
	color: S.Union(
		S.Literal("blue"),
		S.Literal("green"),
		S.Literal("orange"),
		S.Literal("purple"),
		S.Literal("primary"),
	),
});

export const UpdateChatSettingsPayload = S.Struct({
	emote_mode: S.optional(S.Boolean),
	follower_mode: S.optional(S.Boolean),
	follower_mode_duration: S.optional(S.Int),
	non_moderator_chat_delay: S.optional(S.Boolean),
	non_moderator_chat_delay_duration: S.optional(
		S.Union(S.Literal(2), S.Literal(4), S.Literal(6)),
	),
	slow_mode: S.optional(S.Boolean),
	slow_mode_wait_time: S.optional(S.Int),
	subscriber_mode: S.optional(S.Boolean),
	unique_chat_mode: S.optional(S.Boolean),
});

export const SendChatMessagePayload = S.Struct({
	broadcaster_id: S.String,
	sender_id: S.String,
	message: S.String,
	reply_parent_message_id: S.optional(S.String),
});

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

export const EntitlementCodeStatus = S.Struct({
	code: S.String,
	status: S.Literal(
		"SUCCESSFULLY_REDEEMED",
		"ALREADY_CLAIMED",
		"EXPIRED",
		"USER_NOT_ELIGIBLE",
		"NOT_FOUND",
		"INACTIVE",
		"UNUSED",
		"INCORRECT_FORMAT",
		"INTERNAL_ERROR",
	),
});

export const EntitlementsUploadUrl = S.Struct({
	url: S.String,
});

export const ProductCost = S.Struct({
	amount: S.Int,
	type: S.String,
});

export const ProductData = S.Struct({
	domain: S.String,
	broadcast: S.Boolean,
	expiration: S.String,
	sku: S.String,
	cost: ProductCost,
	displayName: S.String,
	inDevelopment: S.Boolean,
});

export const ExtensionTransaction = S.Struct({
	id: S.String,
	timestamp: S.DateFromString,
	broadcaster_id: S.String,
	broadcaster_login: S.String,
	broadcaster_name: S.String,
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
	product_type: S.String,
	product_data: ProductData,
});

export const ManyExtensionTransactions = S.Struct({
	data: S.Array(ExtensionTransaction),
	pagination: S.Struct({ cursor: S.String }),
});

export const ExtensionTransactionsResponse = S.Struct({
	data: ManyExtensionTransactions,
});

export const ExtensionSendChatMessageBody = S.Struct({
	text: S.String,
	extension_version: S.String,
	extension_id: S.String,
});

export const ExtensionSendChatMessageResponse = S.Struct({});

export const ExtensionLiveChannel = S.Struct({
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	game_name: S.String,
	game_id: S.String,
	title: S.String,
});

export const ManyExtensionLiveChannels = S.Struct({
	data: S.Array(ExtensionLiveChannel),
	pagination: S.String,
});

export const ExtensionLiveChannelsResponse = S.Struct({
	data: ManyExtensionLiveChannels,
});

export const ExtensionSetConfigurationParams = S.Struct({
	segment: S.Union(
		S.Literal("broadcaster"),
		S.Literal("developer"),
		S.Literal("global"),
	),
	extension_id: S.String,
	broadcaster_id: S.optional(S.String),
	version: S.String,
	content: S.String,
});

export const ExtensionConfigurationSegment = S.Struct({
	segment: S.String,
	version: S.String,
	content: S.String,
});

export const ManyExtensionConfigurationSegments = S.Struct({
	data: S.Array(ExtensionConfigurationSegment),
});

export const ExtensionGetConfigurationSegmentResponse = S.Struct({
	data: ManyExtensionConfigurationSegments,
});

export const ExtensionSetConfigurationResponse = S.Struct({});

export const ExtensionSetRequiredConfigurationBody = S.Struct({
	extension_id: S.String,
	required_version: S.String,
	extension_version: S.String,
	configuration_version: S.String,
});

export const ExtensionSetRequiredConfigurationResponse = S.Struct({});

export const ExtensionSendPubSubMessageParams = S.Struct({
	broadcaster_id: S.String,
	message: S.String,
	target: S.Array(S.String),
	is_global_broadcast: S.optional(S.Boolean),
});

export const ExtensionSendPubSubMessageResponse = S.Struct({});

export const Secret = S.Struct({
	active_at: S.DateFromString,
	content: S.String,
	expires_at: S.DateFromString,
});

export const SecretsInformation = S.Struct({
	format_version: S.Int,
	secrets: S.Array(Secret),
});

export const ManyExtensionSecrets = S.Struct({
	data: S.Array(SecretsInformation),
});

export const ExtensionSecretCreationResponse = S.Struct({
	data: ManyExtensionSecrets,
});

export const GetExtensionSecretParams = S.Struct({
	extension_id: S.String,
});

export const GetExtensionSecretResponse = S.Struct({
	data: ManyExtensionSecrets,
});

export const Goal = S.Struct({
	id: S.String,
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	broadcaster_login: S.String,
	type: S.String,
	description: S.String,
	current_amount: S.Int,
	target_amount: S.Int,
	created_at: S.DateFromString,
});

export const HypeTrainContribution = S.Struct({
	user: S.String,
	type: S.String,
	total: S.Int,
});

export const HypeTrainEvent = S.Struct({
	id: S.String,
	event_type: S.String,
	event_timestamp: S.DateFromString,
	version: S.String,
	event_data: S.Struct({
		id: S.String,
		broadcaster_id: S.String,
		cooldown_end_time: S.DateFromString,
		expires_at: S.DateFromString,
		goal: S.Int,
		last_contribution: HypeTrainContribution,
		level: S.Int,
		started_at: S.DateFromString,
		top_contributions: S.Array(HypeTrainContribution),
		total: S.Int,
	}),
});

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

export const Stream = S.Struct({
	id: S.String,
	user_id: S.String,
	user_login: S.String,
	user_name: S.String,
	game_id: S.String,
	game_name: S.String,
	tag_ids: S.Array(S.String),
	tags: S.Array(S.String),
	is_mature: S.Boolean,
	type: S.Literal("live", "vodcast"),
	title: S.String,
	viewer_count: S.Int,
	started_at: S.DateFromString,
	language: S.String,
	thumbnail_url: S.String,
});

export const ManyStreams = S.Struct({
	data: S.Array(Stream),
	pagination: Pagination,
});

export const StreamsResponse = S.Struct({
	data: ManyStreams,
});

export const StreamKey = S.Struct({
	stream_key: S.String,
});

export const ManyStreamKeys = S.Struct({
	data: S.Array(StreamKey),
});

export const StreamKeysResponse = S.Struct({
	data: ManyStreamKeys,
});

export const Marker = S.Struct({
	id: S.String,
	created_at: S.DateFromString,
	description: S.String,
	position_seconds: S.Int,
	URL: S.String,
});

export const VideoMarker = S.Struct({
	video_id: S.String,
	markers: S.Array(Marker),
});

export const StreamMarker = S.Struct({
	user_id: S.String,
	user_name: S.String,
	user_login: S.String,
	videos: S.Array(VideoMarker),
});

export const ManyStreamMarkers = S.Struct({
	data: S.Array(StreamMarker),
	pagination: Pagination,
});

export const StreamMarkersResponse = S.Struct({
	data: ManyStreamMarkers,
});

export const CreateStreamMarker = S.Struct({
	id: S.String,
	created_at: S.DateFromString,
	description: S.String,
	position_seconds: S.Int,
});

export const ManyCreateStreamMarkers = S.Struct({
	data: S.Array(CreateStreamMarker),
});

export const CreateStreamMarkerResponse = S.Struct({
	data: ManyCreateStreamMarkers,
});

export const GetScheduleSegmentCategory = S.Struct({
	id: S.String,
	name: S.String,
});

export const GetScheduleSegment = S.Struct({
	id: S.String,
	start_time: S.DateFromString,
	end_time: S.DateFromString,
	title: S.String,
	canceled_until: S.optional(S.String),
	category: S.optional(GetScheduleSegmentCategory),
	is_recurring: S.Boolean,
});

export const GetScheduleVacation = S.Struct({
	start_time: S.DateFromString,
	end_time: S.DateFromString,
});

export const ScheduleData = S.Struct({
	segments: S.Array(GetScheduleSegment),
	broadcaster_id: S.String,
	broadcaster_name: S.String,
	broadcaster_login: S.String,
	vacation: S.optional(GetScheduleVacation),
});

export const GetSchedulePagination = S.Struct({
	cursor: S.String,
});

export const GetScheduleData = S.Struct({
	data: ScheduleData,
	pagination: GetSchedulePagination,
});

export const GetScheduleResponse = S.Struct({
	data: GetScheduleData,
});

export const CreateScheduleSegmentData = S.Struct({
	data: ScheduleData,
});

export const CreateScheduleSegmentResponse = S.Struct({
	data: CreateScheduleSegmentData,
});

export const UpdateScheduleSegmentData = S.Struct({
	data: ScheduleData,
});

export const UpdateScheduleSegmentResponse = S.Struct({
	data: UpdateScheduleSegmentData,
});

export const User = S.Struct({
	id: S.String,
	login: S.String,
	display_name: S.String,
	type: S.String,
	broadcaster_type: S.String,
	description: S.String,
	profile_image_url: S.String,
	offline_image_url: S.String,
	view_count: S.Int,
	email: S.optional(S.String),
	created_at: S.DateFromString,
});

export const UserBlocked = S.Struct({
	user_id: S.String,
	user_login: S.String,
	display_name: S.String,
});

export const UserFollow = S.Struct({
	from_id: S.String,
	from_login: S.String,
	from_name: S.String,
	to_id: S.String,
	to_name: S.String,
	followed_at: S.DateFromString,
});

export const WebhookSubscription = S.Struct({
	topic: S.String,
	callback: S.String,
	expires_at: S.DateFromString,
});

export const WebhookSubscriptionPayload = S.Struct({
	"hub.mode": S.Literal("subscribe", "unsubscribe"),
	"hub.topic": S.String,
	"hub.callback": S.String,
	"hub.lease_seconds": S.optional(S.Int),
	"hub.secret": S.optional(S.String),
});

export const SendWhisperBody = S.Struct({
	message: S.String,
});

export const HelixApi = HttpApi.make("HELIX")
	.prefix("/helix")
	.annotate(
		OpenApi.Description,
		"Twitch Helix API for interacting with Twitch platform features",
	)
	.annotate(OpenApi.Summary, "Twitch Helix API")
	.annotate(OpenApi.License, {
		name: "MIT",
		url: "https://opensource.org/licenses/MIT",
	})
	.annotate(OpenApi.Servers, [{ url: "https://api.twitch.tv/helix" }])
	.add(
		HttpApiGroup.make("Helix", { topLevel: true })
			.add(
				HttpApiEndpoint.post("startCommercial", "/channels/commercial")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							length: S.String,
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Struct({
								data: S.Array(AdDetails),
							}),
						}),
					),
			)
			.add(
				HttpApiEndpoint.get("searchCategories", "/search/categories")
					.setUrlParams(
						S.Struct({
							query: S.String,
							after: S.optional(S.String),
							first: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Struct({
								data: S.Array(Category),
								pagination: S.optional(Pagination),
							}),
						}),
					),
			)
			.add(
				HttpApiEndpoint.get("getExtensionAnalytics", "/analytics/extensions")
					.setUrlParams(
						S.Struct({
							extension_id: S.String,
							first: S.optional(S.String),
							after: S.optional(S.String),
							started_at: S.optional(S.String),
							ended_at: S.optional(S.String),
							type: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Struct({
								data: S.Array(ExtensionAnalytic),
								pagination: Pagination,
							}),
						}),
					),
			)
			.add(
				HttpApiEndpoint.get("getGameAnalytics", "/analytics/games")
					.setUrlParams(
						S.Struct({
							game_id: S.String,
							first: S.optional(S.String),
							after: S.optional(S.String),
							started_at: S.optional(S.String),
							ended_at: S.optional(S.String),
							type: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Struct({
								data: S.Array(GameAnalytic),
								pagination: Pagination,
							}),
						}),
					),
			)
			.add(
				HttpApiEndpoint.get("getVideos", "/videos")
					.setUrlParams(
						S.Struct({
							id: S.optional(S.Array(S.String)),
							user_id: S.optional(S.String),
							game_id: S.optional(S.String),
							after: S.optional(S.String),
							before: S.optional(S.String),
							first: S.optional(S.String),
							language: S.optional(S.String),
							period: S.optional(S.Literal("all", "day", "week", "month")),
							sort: S.optional(S.Literal("time", "trending", "views")),
							type: S.optional(
								S.Literal("all", "upload", "archive", "highlight"),
							),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Struct({
								data: S.Array(Video),
								pagination: Pagination,
							}),
						}),
					),
			)
			.add(
				HttpApiEndpoint.del("deleteVideos", "/videos").setUrlParams(
					S.Struct({
						id: S.Array(S.String),
					}),
				),
			)
			.add(
				HttpApiEndpoint.get("getSubscriptions", "/subscriptions")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							user_id: S.optional(S.Array(S.String)),
							after: S.optional(S.String),
							before: S.optional(S.String),
							first: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Struct({
								data: S.Array(Subscription),
								pagination: Pagination,
								total: S.Int,
								points: S.Int,
							}),
						}),
					),
			)
			.add(
				HttpApiEndpoint.get("checkUserSubscription", "/subscriptions/user")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							user_id: S.String,
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Struct({
								data: S.Array(UserSubscription),
							}),
						}),
					),
			)
			.add(
				HttpApiEndpoint.get(
					"getAuthorizationUrl",
					"/oauth2/authorize",
				).setUrlParams(GetAuthorizationUrlParams),
			)
			.add(
				HttpApiEndpoint.post("getAccessToken", "/oauth2/token")
					.setPayload(
						S.Union(
							AppAccessTokenRequest,
							UserAccessTokenRequest,
							DeviceAccessTokenRequest,
							RefreshTokenRequest,
						),
					)
					.addSuccess(AccessCredentials),
			)
			.add(
				HttpApiEndpoint.get("validateToken", "/oauth2/validate").addSuccess(
					ValidateTokenResponse,
				),
			)
			.add(
				HttpApiEndpoint.post("revokeToken", "/oauth2/revoke").setPayload(
					RevokeTokenRequest,
				),
			)
			.add(
				HttpApiEndpoint.post("requestDeviceCode", "/device")
					.setPayload(DeviceCodeRequest)
					.addSuccess(DeviceVerificationCredentials),
			)
			.add(
				HttpApiEndpoint.get(
					"getCustomRewards",
					"/channel_points/custom_rewards",
				)
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
				HttpApiEndpoint.post(
					"createCustomReward",
					"/channel_points/custom_rewards",
				)
					.setPayload(ChannelCustomRewardsParams)
					.addSuccess(
						S.Struct({
							data: S.Array(ChannelCustomReward),
						}),
					),
			)
			.add(
				HttpApiEndpoint.patch(
					"updateCustomReward",
					"/channel_points/custom_rewards",
				)
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
				HttpApiEndpoint.del(
					"deleteCustomRewards",
					"/channel_points/custom_rewards",
				).setUrlParams(
					S.Struct({
						broadcaster_id: S.String,
						id: S.String,
					}),
				),
			)
			.add(
				HttpApiEndpoint.get(
					"getCustomRewardsRedemptions",
					"/channel_points/custom_rewards/redemptions",
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
					"/channel_points/custom_rewards/redemptions",
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
			.add(
				HttpApiEndpoint.get("getChannelInformation", "/channels")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.optional(S.Array(S.String)),
						}),
					)
					.addSuccess(S.Struct({ data: S.Array(ChannelInformation) })),
			)
			.add(
				HttpApiEndpoint.patch("modifyChannelInformation", "/channels")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
						}),
					)
					.setPayload(EditChannelInformationParams)
					.addSuccess(S.Void, { status: 204 }),
			)
			.add(
				HttpApiEndpoint.get("getChannelFollowers", "/channels/followers")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							user_id: S.optional(S.String),
							first: S.optional(S.String),
							after: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Array(ChannelFollow),
							pagination: S.optional(Pagination),
							total: S.Int,
						}),
					),
			)
			.add(
				HttpApiEndpoint.get("getFollowedChannels", "/channels/followed")
					.setUrlParams(
						S.Struct({
							user_id: S.String,
							broadcaster_id: S.optional(S.String),
							first: S.optional(S.String),
							after: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Array(FollowedChannel),
							pagination: S.optional(Pagination),
							total: S.Int,
						}),
					),
			)
			.add(
				HttpApiEndpoint.get("searchChannels", "/search/channels")
					.setUrlParams(
						S.Struct({
							query: S.String,
							after: S.optional(S.String),
							first: S.optional(S.String),
							live_only: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Array(Channel),
							pagination: S.optional(Pagination),
						}),
					),
			)
			.add(
				HttpApiEndpoint.get("getChannelEditors", "/channels/editors")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
						}),
					)
					.addSuccess(S.Struct({ data: S.Array(ChannelEditor) })),
			)
			.add(
				HttpApiEndpoint.get("getChannelVips", "/channels/vips")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							user_id: S.optional(S.String),
							first: S.optional(S.String),
							after: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Array(ChannelVips),
							pagination: S.optional(Pagination),
						}),
					),
			)
			.add(
				HttpApiEndpoint.post("addChannelVip", "/channels/vips")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							user_id: S.String,
						}),
					)
					.addSuccess(S.Void, { status: 204 }),
			)
			.add(
				HttpApiEndpoint.del("removeChannelVip", "/channels/vips")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							user_id: S.String,
						}),
					)
					.addSuccess(S.Void, { status: 204 }),
			)
			.add(
				HttpApiEndpoint.get("getChatChatters", "/chat/chatters")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							moderator_id: S.String,
							after: S.optional(S.String),
							first: S.optional(S.String),
						}),
					)
					.addSuccess(GetChatChattersResponse),
			)
			.add(
				HttpApiEndpoint.get("getChannelChatBadges", "/chat/badges")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
						}),
					)
					.addSuccess(GetChatBadgeResponse),
			)
			.add(
				HttpApiEndpoint.get(
					"getGlobalChatBadges",
					"/chat/badges/global",
				).addSuccess(GetChatBadgeResponse),
			)
			.add(
				HttpApiEndpoint.get("getChannelEmotes", "/chat/emotes")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
						}),
					)
					.addSuccess(GetChannelEmotesResponse),
			)
			.add(
				HttpApiEndpoint.get(
					"getGlobalEmotes",
					"/chat/emotes/global",
				).addSuccess(GetChannelEmotesResponse),
			)
			.add(
				HttpApiEndpoint.get("getEmoteSets", "/chat/emotes/set")
					.setUrlParams(
						S.Struct({
							emote_set_id: S.Array(S.String),
						}),
					)
					.addSuccess(GetEmoteSetsResponse),
			)
			.add(
				HttpApiEndpoint.post("sendChatAnnouncement", "/chat/announcements")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							moderator_id: S.String,
						}),
					)
					.setPayload(ChatAnnouncementPayload)
					.addSuccess(S.Void, { status: 200 }),
			)
			.add(
				HttpApiEndpoint.get("getChatSettings", "/chat/settings")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							moderator_id: S.optional(S.String),
						}),
					)
					.addSuccess(GetChatSettingsResponse),
			)
			.add(
				HttpApiEndpoint.patch("updateChatSettings", "/chat/settings")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							moderator_id: S.String,
						}),
					)
					.setPayload(UpdateChatSettingsPayload)
					.addSuccess(UpdateChatSettingsResponse),
			)
			.add(
				HttpApiEndpoint.get("getUserChatColor", "/chat/color")
					.setUrlParams(
						S.Struct({
							user_id: S.String,
						}),
					)
					.addSuccess(GetUserChatColorResponse),
			)
			.add(
				HttpApiEndpoint.put("updateUserChatColor", "/chat/color")
					.setUrlParams(
						S.Struct({
							user_id: S.String,
							color: S.String,
						}),
					)
					.addSuccess(S.Void, { status: 200 }),
			)
			.add(
				HttpApiEndpoint.post("sendChatMessage", "/chat/messages")
					.setPayload(SendChatMessagePayload)
					.addSuccess(ChatMessageResponse),
			)
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
			.add(
				HttpApiEndpoint.get("getCharityCampaigns", "/charity/campaigns")
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
				HttpApiEndpoint.get("getCharityDonations", "/charity/donations")
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
			.add(
				HttpApiEndpoint.get("getBitsLeaderboard", "/bits/leaderboard")
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
				HttpApiEndpoint.get("getCheermotes", "/bits/cheermotes")
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
			.add(
				HttpApiEndpoint.get("getPolls", "/polls")
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
			.add(
				HttpApiEndpoint.post("createPoll", "/polls").setPayload(
					CreatePollParams,
				),
			)
			.add(HttpApiEndpoint.patch("endPoll", "/polls").setPayload(EndPollParams))
			.add(
				HttpApiEndpoint.get("getPredictions", "/predictions")
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
				HttpApiEndpoint.post("createPrediction", "/predictions").setPayload(
					CreatePredictionParams,
				),
			)
			.add(
				HttpApiEndpoint.patch("endPrediction", "/predictions").setPayload(
					EndPredictionParams,
				),
			)
			.add(
				HttpApiEndpoint.get(
					"getEventSubSubscriptions",
					"/eventsub/subscriptions",
				)
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
				HttpApiEndpoint.del(
					"deleteEventSubSubscription",
					"/eventsub/subscriptions",
				).setUrlParams(
					S.Struct({
						id: S.String,
					}),
				),
			)
			.add(
				HttpApiEndpoint.post(
					"createEventSubSubscription",
					"/eventsub/subscriptions",
				)
					.setPayload(
						S.extend(
							EVENTSUB_CREATE_SUBSCRIPTION_BODY,
							S.Struct({ transport: EventSubTransportInput }),
						),
					)
					.addSuccess(
						S.Struct({
							data: S.Array(S.Struct({})),
						}),
						{ status: 202 },
					),
			)
			.add(
				HttpApiEndpoint.get("getEntitlementCodeStatus", "/entitlements/codes")
					.setUrlParams(
						S.Struct({
							user_id: S.optional(S.String),
							code: S.optional(S.Array(S.String)),
						}),
					)
					.addSuccess(S.Struct({ data: S.Array(EntitlementCodeStatus) })),
			)
			.add(
				HttpApiEndpoint.post("redeemEntitlementCode", "/entitlements/code")
					.setUrlParams(
						S.Struct({
							user_id: S.String,
							code: S.Array(S.String),
						}),
					)
					.addSuccess(S.Struct({ data: S.Array(EntitlementCodeStatus) })),
			)
			.add(
				HttpApiEndpoint.post(
					"createEntitlementsUploadUrl",
					"/entitlements/upload",
				)
					.setUrlParams(
						S.Struct({
							manifest_id: S.String,
							type: S.String,
						}),
					)
					.addSuccess(S.Struct({ data: S.Array(EntitlementsUploadUrl) })),
			)
			.add(
				HttpApiEndpoint.get(
					"getExtensionTransactions",
					"/extensions/transactions",
				)
					.setUrlParams(
						S.Struct({
							extension_id: S.String,
							id: S.optional(S.Array(S.String)),
							after: S.optional(S.String),
							first: S.optional(S.String),
						}),
					)
					.addSuccess(ExtensionTransactionsResponse),
			)
			.add(
				HttpApiEndpoint.post("sendExtensionChatMessage", "/extensions/chat")
					.setUrlParams(S.Struct({ broadcaster_id: S.String }))
					.setPayload(ExtensionSendChatMessageBody)
					.addSuccess(ExtensionSendChatMessageResponse),
			)
			.add(
				HttpApiEndpoint.get("getExtensionLiveChannels", "/extensions/live")
					.setUrlParams(
						S.Struct({
							extension_id: S.String,
							after: S.optional(S.String),
							first: S.optional(S.String),
						}),
					)
					.addSuccess(ExtensionLiveChannelsResponse),
			)
			.add(
				HttpApiEndpoint.get(
					"getExtensionConfigurationSegment",
					"/extensions/configurations",
				)
					.setUrlParams(
						S.Struct({
							extension_id: S.String,
							broadcaster_id: S.optional(S.String),
							segment: S.optional(S.Array(S.String)),
						}),
					)
					.addSuccess(ExtensionGetConfigurationSegmentResponse),
			)
			.add(
				HttpApiEndpoint.put(
					"setExtensionSegmentConfig",
					"/extensions/configurations",
				)
					.setPayload(ExtensionSetConfigurationParams)
					.addSuccess(ExtensionSetConfigurationResponse),
			)
			.add(
				HttpApiEndpoint.put(
					"setExtensionRequiredConfiguration",
					"/extensions/configurations/required_configuration",
				)
					.setUrlParams(S.Struct({ broadcaster_id: S.String }))
					.setPayload(ExtensionSetRequiredConfigurationBody)
					.addSuccess(ExtensionSetRequiredConfigurationResponse),
			)
			.add(
				HttpApiEndpoint.post("sendExtensionPubSubMessage", "/extensions/pubsub")
					.setPayload(ExtensionSendPubSubMessageParams)
					.addSuccess(ExtensionSendPubSubMessageResponse),
			)
			.add(
				HttpApiEndpoint.post("createExtensionSecret", "/extensions/jwt/secrets")
					.setUrlParams(
						S.Struct({
							extension_id: S.String,
							delay: S.optional(S.String),
						}),
					)
					.addSuccess(ExtensionSecretCreationResponse),
			)
			.add(
				HttpApiEndpoint.post(
					"getExtensionSecrets",
					"/extensions/jwt/secrets/get",
				)
					.setPayload(GetExtensionSecretParams)
					.addSuccess(GetExtensionSecretResponse),
			)
			.add(
				HttpApiEndpoint.get("getCreatorGoals", "/goals")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Struct({
								data: S.Array(Goal),
								pagination: S.Struct({ cursor: S.String }),
							}),
						}),
					),
			)
			.add(
				HttpApiEndpoint.get("getHypeTrainEvents", "/hypetrain/events")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							after: S.optional(S.String),
							first: S.optional(S.String),
							id: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Array(HypeTrainEvent),
							pagination: S.Struct({ cursor: S.String }),
						}),
					),
			)
			.add(
				HttpApiEndpoint.post("startRaid", "/raids")
					.setPayload(StartRaidParams)
					.addSuccess(S.Struct({ data: RaidInfo })),
			)
			.add(
				HttpApiEndpoint.post("cancelRaid", "/raids/cancel").setPayload(
					CancelRaidParams,
				),
			)
			.add(
				HttpApiEndpoint.get("getGames", "/games")
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
				HttpApiEndpoint.get("getTopGames", "/games/top")
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
			.add(
				HttpApiEndpoint.get("getStreams", "/streams")
					.setUrlParams(
						S.Struct({
							after: S.optional(S.String),
							before: S.optional(S.String),
							first: S.optional(S.Int),
							game_id: S.optional(S.Array(S.String)),
							language: S.optional(S.Array(S.String)),
							type: S.optional(S.Literal("all", "live", "vodcast")),
							user_id: S.optional(S.Array(S.String)),
							user_login: S.optional(S.Array(S.String)),
						}),
					)
					.addSuccess(StreamsResponse),
			)
			.add(
				HttpApiEndpoint.get("getFollowedStreams", "/streams/followed")
					.setUrlParams(
						S.Struct({
							after: S.optional(S.String),
							before: S.optional(S.String),
							first: S.optional(S.Int),
							user_id: S.String,
						}),
					)
					.addSuccess(StreamsResponse),
			)
			.add(
				HttpApiEndpoint.get("getStreamKey", "/streams/key")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
						}),
					)
					.addSuccess(StreamKeysResponse),
			)
			.add(
				HttpApiEndpoint.get("getStreamMarkers", "/streams/markers")
					.setUrlParams(
						S.Struct({
							user_id: S.optional(S.String),
							video_id: S.optional(S.String),
							after: S.optional(S.String),
							before: S.optional(S.String),
							first: S.optional(S.Int),
						}),
					)
					.addSuccess(StreamMarkersResponse),
			)
			.add(
				HttpApiEndpoint.post("createStreamMarker", "/streams/markers")
					.setUrlParams(
						S.Struct({
							user_id: S.String,
							description: S.optional(S.String),
						}),
					)
					.addSuccess(CreateStreamMarkerResponse),
			)
			.add(
				HttpApiEndpoint.get("getSchedule", "/schedule")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.optional(S.String),
							id: S.optional(S.String),
							start_time: S.optional(S.String),
							utc_offset: S.optional(S.String),
							first: S.optional(S.Int),
							after: S.optional(S.String),
						}),
					)
					.addSuccess(GetScheduleResponse),
			)
			.add(
				HttpApiEndpoint.post("createScheduleSegment", "/schedule/segment")
					.setPayload(
						S.Struct({
							broadcaster_id: S.String,
							start_time: S.String,
							timezone: S.String,
							duration: S.String,
							is_recurring: S.Boolean,
							category_id: S.optional(S.String),
							title: S.optional(S.String),
						}),
					)
					.addSuccess(CreateScheduleSegmentResponse),
			)
			.add(
				HttpApiEndpoint.patch("updateScheduleSegment", "/schedule/segment")
					.setPayload(
						S.Struct({
							broadcaster_id: S.String,
							id: S.String,
							start_time: S.optional(S.String),
							duration: S.optional(S.String),
							category_id: S.optional(S.String),
							title: S.optional(S.String),
							is_canceled: S.optional(S.Boolean),
							timezone: S.optional(S.String),
						}),
					)
					.addSuccess(UpdateScheduleSegmentResponse),
			)
			.add(
				HttpApiEndpoint.del(
					"deleteScheduleSegment",
					"/schedule/segment",
				).setUrlParams(
					S.Struct({
						broadcaster_id: S.String,
						id: S.String,
					}),
				),
			)
			.add(
				HttpApiEndpoint.patch("updateSchedule", "/schedule/settings")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							is_vacation_enabled: S.optional(S.Boolean),
							vacation_start_time: S.optional(S.String),
							vacation_end_time: S.optional(S.String),
							timezone: S.optional(S.String),
						}),
					)
					.addSuccess(S.Void),
			)
			.add(
				HttpApiEndpoint.get("getUsers", "/users")
					.setUrlParams(
						S.Struct({
							id: S.optional(S.Array(S.String)),
							login: S.optional(S.Array(S.String)),
						}),
					)
					.addSuccess(S.Struct({ data: S.Array(User) })),
			)
			.add(
				HttpApiEndpoint.put("updateUser", "/users")
					.setUrlParams(
						S.Struct({
							description: S.optional(S.String),
						}),
					)
					.addSuccess(S.Struct({ data: S.Array(User) })),
			)
			.add(
				HttpApiEndpoint.get("getUsersBlocked", "/users/blocks")
					.setUrlParams(
						S.Struct({
							broadcaster_id: S.String,
							after: S.optional(S.String),
							first: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Array(UserBlocked),
							pagination: S.optional(Pagination),
						}),
					),
			)
			.add(
				HttpApiEndpoint.put("blockUser", "/users/blocks").setUrlParams(
					S.Struct({
						target_user_id: S.String,
						source_context: S.optional(
							S.Union(S.Literal("chat"), S.Literal("whisper")),
						),
						reason: S.optional(
							S.Union(
								S.Literal("spam"),
								S.Literal("harassment"),
								S.Literal("other"),
							),
						),
					}),
				),
			)
			.add(
				HttpApiEndpoint.del("unblockUser", "/users/blocks").setUrlParams(
					S.Struct({
						target_user_id: S.String,
					}),
				),
			)
			.add(
				HttpApiEndpoint.get("getUsersFollows", "/users/follows")
					.setUrlParams(
						S.Struct({
							from_id: S.optional(S.String),
							to_id: S.optional(S.String),
							after: S.optional(S.String),
							first: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							total: S.Int,
							data: S.Array(UserFollow),
							pagination: S.optional(Pagination),
						}),
					),
			)
			.add(
				HttpApiEndpoint.get(
					"getWebhookSubscriptions",
					"/webhooks/subscriptions",
				)
					.setUrlParams(
						S.Struct({
							after: S.optional(S.String),
							first: S.optional(S.String),
						}),
					)
					.addSuccess(
						S.Struct({
							data: S.Struct({
								total: S.Int,
								data: S.Array(WebhookSubscription),
								pagination: S.Struct({ cursor: S.String }),
							}),
						}),
					),
			)
			.add(
				HttpApiEndpoint.post("createWebhookSubscription", "/webhooks/hub")
					.setPayload(WebhookSubscriptionPayload)
					.addSuccess(S.Void, { status: 202 }),
			)
			.add(
				HttpApiEndpoint.post("sendWhisper", "/whispers")
					.setUrlParams(
						S.Struct({
							from_user_id: S.String,
							to_user_id: S.String,
						}),
					)
					.setPayload(SendWhisperBody)
					.addSuccess(S.Void, { status: 204 }),
			),
	);
