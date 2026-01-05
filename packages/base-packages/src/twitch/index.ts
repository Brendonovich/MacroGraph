/** biome-ignore-all lint/correctness/useYield: generator functions in this file intentionally don't always yield */
import { Effect, Option } from "effect";
import { t } from "@macrograph/package-sdk";
import { Package, PackageEngine } from "@macrograph/package-sdk/updated";

import {
	ClientRpcs,
	ClientState,
	RuntimeRpcs,
	TwitchAccount,
} from "./new-shared";
import { EventSubEvent } from "./new-types";

export class EngineDef extends PackageEngine.define({
	clientRpcs: ClientRpcs,
	runtimeRpcs: RuntimeRpcs,
	events: EventSubEvent.Any.members,
	clientState: ClientState,
	resources: [TwitchAccount],
}) {}

export default Package.define({ name: "Twitch", engine: EngineDef })
	// ========================================================================
	// Event Schemas - EventSub Events
	// ========================================================================
	// NOTE: Twitch uses OAuth for authentication, so there are no "properties"
	// like OBS's socket resource. Events are filtered by _tag only.

	// ===== Chat Events =====

	.addSchema("ChannelChatMessage", {
		type: "event",
		name: "Chat Message",
		description: "Fires when a message is sent in a channel's chat.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.chat.message"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			chatterUserId: c.out.data("chatterUserId", t.String, {
				name: "Chatter User ID",
			}),
			chatterUserName: c.out.data("chatterUserName", t.String, {
				name: "Chatter User Name",
			}),
			chatterUserLogin: c.out.data("chatterUserLogin", t.String, {
				name: "Chatter User Login",
			}),
			messageId: c.out.data("messageId", t.String, { name: "Message ID" }),
			messageText: c.out.data("messageText", t.String, {
				name: "Message Text",
			}),
			messageType: c.out.data("messageType", t.String, {
				name: "Message Type",
			}),
			color: c.out.data("color", t.String, { name: "Color" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.chatterUserId(event.chatter_user_id);
			io.chatterUserName(event.chatter_user_name);
			io.chatterUserLogin(event.chatter_user_login);
			io.messageId(event.message_id);
			io.messageText(event.message_text);
			io.messageType(event.message_type);
			io.color(event.color);
		},
	})

	.addSchema("ChannelChatClear", {
		type: "event",
		name: "Chat Clear",
		description: "Fires when all chat messages are cleared.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.chat.clear"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.broadcasterUserLogin(event.broadcaster_user_login);
		},
	})

	.addSchema("ChannelChatClearUserMessages", {
		type: "event",
		name: "Chat Clear User Messages",
		description: "Fires when a user's messages are cleared.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter(
					(data) => data._tag === "channel.chat.clear_user_messages",
				),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			targetUserId: c.out.data("targetUserId", t.String, {
				name: "Target User ID",
			}),
			targetUserName: c.out.data("targetUserName", t.String, {
				name: "Target User Name",
			}),
			targetUserLogin: c.out.data("targetUserLogin", t.String, {
				name: "Target User Login",
			}),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.targetUserId(event.target_user_id);
			io.targetUserName(event.target_user_name);
			io.targetUserLogin(event.target_user_login);
		},
	})

	.addSchema("ChannelChatMessageDelete", {
		type: "event",
		name: "Chat Message Delete",
		description: "Fires when a chat message is deleted.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.chat.message_delete"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			targetUserId: c.out.data("targetUserId", t.String, {
				name: "Target User ID",
			}),
			targetUserName: c.out.data("targetUserName", t.String, {
				name: "Target User Name",
			}),
			targetUserLogin: c.out.data("targetUserLogin", t.String, {
				name: "Target User Login",
			}),
			messageId: c.out.data("messageId", t.String, { name: "Message ID" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.targetUserId(event.target_user_id);
			io.targetUserName(event.target_user_name);
			io.targetUserLogin(event.target_user_login);
			io.messageId(event.message_id);
		},
	})

	.addSchema("ChannelChatNotification", {
		type: "event",
		name: "Chat Notification",
		description: "Fires when a chat notification occurs.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.chat.notification"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			chatterUserId: c.out.data("chatterUserId", t.String, {
				name: "Chatter User ID",
			}),
			chatterUserName: c.out.data("chatterUserName", t.String, {
				name: "Chatter User Name",
			}),
			chatterUserLogin: c.out.data("chatterUserLogin", t.String, {
				name: "Chatter User Login",
			}),
			messageId: c.out.data("messageId", t.String, { name: "Message ID" }),
			messageText: c.out.data("messageText", t.String, {
				name: "Message Text",
			}),
			systemMessage: c.out.data("systemMessage", t.String, {
				name: "System Message",
			}),
			noticeType: c.out.data("noticeType", t.String, { name: "Notice Type" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.chatterUserId(event.chatter_user_id);
			io.chatterUserName(event.chatter_user_name);
			io.chatterUserLogin(event.chatter_user_login);
			io.messageId(event.message_id);
			io.messageText(event.message_text);
			io.systemMessage(event.system_message);
			io.noticeType(event.notice_type);
		},
	})

	.addSchema("ChannelChatSettingsUpdate", {
		type: "event",
		name: "Chat Settings Update",
		description: "Fires when chat settings are updated.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.chat_settings.update"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			emoteMode: c.out.data("emoteMode", t.Bool, { name: "Emote Mode" }),
			followerMode: c.out.data("followerMode", t.Bool, {
				name: "Follower Mode",
			}),
			slowMode: c.out.data("slowMode", t.Bool, { name: "Slow Mode" }),
			subscriberMode: c.out.data("subscriberMode", t.Bool, {
				name: "Subscriber Mode",
			}),
			uniqueChatMode: c.out.data("uniqueChatMode", t.Bool, {
				name: "Unique Chat Mode",
			}),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.emoteMode(event.emote_mode);
			io.followerMode(event.follower_mode);
			io.slowMode(event.slow_mode);
			io.subscriberMode(event.subscriber_mode);
			io.uniqueChatMode(event.unique_chat_mode);
		},
	})

	.addSchema("ChannelChatUserMessageHold", {
		type: "event",
		name: "Chat User Message Hold",
		description: "Fires when a user's message is held for review.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.chat.user_message_hold"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			messageId: c.out.data("messageId", t.String, { name: "Message ID" }),
			messageText: c.out.data("messageText", t.String, {
				name: "Message Text",
			}),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.messageId(event.message_id);
			io.messageText(event.message_text);
		},
	})

	.addSchema("ChannelChatUserMessageUpdate", {
		type: "event",
		name: "Chat User Message Update",
		description: "Fires when a held message is approved or denied.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter(
					(data) => data._tag === "channel.chat.user_message_update",
				),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			status: c.out.data("status", t.String, { name: "Status" }),
			messageId: c.out.data("messageId", t.String, { name: "Message ID" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.status(event.status);
			io.messageId(event.message_id);
		},
	})

	// ===== Channel Events =====

	.addSchema("ChannelBan", {
		type: "event",
		name: "User Banned",
		description: "Fires when a user is banned from a channel.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.ban"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			moderatorUserId: c.out.data("moderatorUserId", t.String, {
				name: "Moderator User ID",
			}),
			moderatorUserLogin: c.out.data("moderatorUserLogin", t.String, {
				name: "Moderator User Login",
			}),
			moderatorUserName: c.out.data("moderatorUserName", t.String, {
				name: "Moderator User Name",
			}),
			reason: c.out.data("reason", t.String, { name: "Reason" }),
			isPermanent: c.out.data("isPermanent", t.Bool, { name: "Is Permanent" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.moderatorUserId(event.moderator_user_id);
			io.moderatorUserLogin(event.moderator_user_login);
			io.moderatorUserName(event.moderator_user_name);
			io.reason(event.reason);
			io.isPermanent(event.is_permanent);
		},
	})

	.addSchema("ChannelUnban", {
		type: "event",
		name: "User Unbanned",
		description: "Fires when a user is unbanned from a channel.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.unban"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			moderatorUserId: c.out.data("moderatorUserId", t.String, {
				name: "Moderator User ID",
			}),
			moderatorUserLogin: c.out.data("moderatorUserLogin", t.String, {
				name: "Moderator User Login",
			}),
			moderatorUserName: c.out.data("moderatorUserName", t.String, {
				name: "Moderator User Name",
			}),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.moderatorUserId(event.moderator_user_id);
			io.moderatorUserLogin(event.moderator_user_login);
			io.moderatorUserName(event.moderator_user_name);
		},
	})

	.addSchema("ChannelUpdate", {
		type: "event",
		name: "Updated",
		description: "Fires when channel information is updated.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.update"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			title: c.out.data("title", t.String, { name: "Title" }),
			language: c.out.data("language", t.String, { name: "Language" }),
			categoryId: c.out.data("categoryId", t.String, { name: "Category ID" }),
			categoryName: c.out.data("categoryName", t.String, {
				name: "Category Name",
			}),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.title(event.title);
			io.language(event.language);
			io.categoryId(event.category_id);
			io.categoryName(event.category_name);
		},
	})

	.addSchema("ChannelRaid", {
		type: "event",
		name: "Raid",
		description: "Fires when a channel raids another channel.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.raid"),
			),
		io: (c) => ({
			fromBroadcasterUserId: c.out.data("fromBroadcasterUserId", t.String, {
				name: "From Broadcaster User ID",
			}),
			fromBroadcasterUserName: c.out.data("fromBroadcasterUserName", t.String, {
				name: "From Broadcaster User Name",
			}),
			fromBroadcasterUserLogin: c.out.data(
				"fromBroadcasterUserLogin",
				t.String,
				{ name: "From Broadcaster User Login" },
			),
			toBroadcasterUserId: c.out.data("toBroadcasterUserId", t.String, {
				name: "To Broadcaster User ID",
			}),
			toBroadcasterUserName: c.out.data("toBroadcasterUserName", t.String, {
				name: "To Broadcaster User Name",
			}),
			toBroadcasterUserLogin: c.out.data("toBroadcasterUserLogin", t.String, {
				name: "To Broadcaster User Login",
			}),
			viewers: c.out.data("viewers", t.Int, { name: "Viewers" }),
		}),
		run: ({ io, event }) => {
			io.fromBroadcasterUserId(event.from_broadcaster_user_id);
			io.fromBroadcasterUserName(event.from_broadcaster_user_name);
			io.fromBroadcasterUserLogin(event.from_broadcaster_user_login);
			io.toBroadcasterUserId(event.to_broadcaster_user_id);
			io.toBroadcasterUserName(event.to_broadcaster_user_name);
			io.toBroadcasterUserLogin(event.to_broadcaster_user_login);
			io.viewers(event.viewers);
		},
	})

	// ===== Subscription Events =====

	.addSchema("ChannelSubscribe", {
		type: "event",
		name: "Subscribed",
		description: "Fires when a user subscribes to a channel.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.subscribe"),
			),
		io: (c) => ({
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			tier: c.out.data("tier", t.String, { name: "Tier" }),
			isGift: c.out.data("isGift", t.Bool, { name: "Is Gift" }),
		}),
		run: ({ io, event }) => {
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.tier(event.tier);
			io.isGift(event.is_gift);
		},
	})

	.addSchema("ChannelSubscriptionEnd", {
		type: "event",
		name: "Subscription Ended",
		description: "Fires when a user's subscription ends.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.subscription.end"),
			),
		io: (c) => ({
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			tier: c.out.data("tier", t.String, { name: "Tier" }),
			isGift: c.out.data("isGift", t.Bool, { name: "Is Gift" }),
		}),
		run: ({ io, event }) => {
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.tier(event.tier);
			io.isGift(event.is_gift);
		},
	})

	.addSchema("ChannelSubscriptionGift", {
		type: "event",
		name: "Subscription Gifted",
		description: "Fires when a user gifts subscriptions.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.subscription.gift"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			total: c.out.data("total", t.Int, { name: "Total" }),
			tier: c.out.data("tier", t.String, { name: "Tier" }),
			isAnonymous: c.out.data("isAnonymous", t.Bool, { name: "Is Anonymous" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.total(event.total);
			io.tier(event.tier);
			io.isAnonymous(event.is_anonymous);
		},
	})

	.addSchema("ChannelSubscriptionMessage", {
		type: "event",
		name: "Subscription Message",
		description: "Fires when a user resubscribes with a message.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.subscription.message"),
			),
		io: (c) => ({
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			tier: c.out.data("tier", t.String, { name: "Tier" }),
			messageText: c.out.data("messageText", t.String, {
				name: "Message Text",
			}),
			cumulativeMonths: c.out.data("cumulativeMonths", t.Int, {
				name: "Cumulative Months",
			}),
			durationMonths: c.out.data("durationMonths", t.Int, {
				name: "Duration Months",
			}),
		}),
		run: ({ io, event }) => {
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.tier(event.tier);
			io.messageText(event.message_text);
			io.cumulativeMonths(event.cumulative_months);
			io.durationMonths(event.duration_months);
		},
	})

	.addSchema("ChannelCheer", {
		type: "event",
		name: "Cheered",
		description: "Fires when a user cheers bits in a channel.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.cheer"),
			),
		io: (c) => ({
			isAnonymous: c.out.data("isAnonymous", t.Bool, { name: "Is Anonymous" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			message: c.out.data("message", t.String, { name: "Message" }),
			bits: c.out.data("bits", t.Int, { name: "Bits" }),
		}),
		run: ({ io, event }) => {
			io.isAnonymous(event.is_anonymous);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.message(event.message);
			io.bits(event.bits);
		},
	})

	// ===== Moderation Events =====

	.addSchema("ChannelModeratorAdd", {
		type: "event",
		name: "Moderator Added",
		description: "Fires when a moderator is added.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.moderator.add"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
		},
	})

	.addSchema("ChannelModeratorRemove", {
		type: "event",
		name: "Moderator Removed",
		description: "Fires when a moderator is removed.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.moderator.remove"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
		},
	})

	.addSchema("ChannelVipAdd", {
		type: "event",
		name: "VIP Added",
		description: "Fires when a VIP is added.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.vip.add"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
		},
	})

	.addSchema("ChannelVipRemove", {
		type: "event",
		name: "VIP Removed",
		description: "Fires when a VIP is removed.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.vip.remove"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
		},
	})

	.addSchema("ChannelModerate", {
		type: "event",
		name: "Moderated",
		description: "Fires when a moderation action occurs.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.moderate"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			moderatorUserId: c.out.data("moderatorUserId", t.String, {
				name: "Moderator User ID",
			}),
			moderatorUserLogin: c.out.data("moderatorUserLogin", t.String, {
				name: "Moderator User Login",
			}),
			moderatorUserName: c.out.data("moderatorUserName", t.String, {
				name: "Moderator User Name",
			}),
			action: c.out.data("action", t.String, { name: "Action" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.moderatorUserId(event.moderator_user_id);
			io.moderatorUserLogin(event.moderator_user_login);
			io.moderatorUserName(event.moderator_user_name);
			io.action(event.action);
		},
	})

	.addSchema("ChannelUnbanRequestCreate", {
		type: "event",
		name: "Unban Request Created",
		description: "Fires when an unban request is created.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.unban_request.create"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			text: c.out.data("text", t.String, { name: "Text" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.text(event.text);
		},
	})

	.addSchema("ChannelUnbanRequestResolve", {
		type: "event",
		name: "Unban Request Resolved",
		description: "Fires when an unban request is resolved.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.unban_request.resolve"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			status: c.out.data("status", t.String, { name: "Status" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.status(event.status);
		},
	})

	.addSchema("ChannelSuspiciousUserUpdate", {
		type: "event",
		name: "Suspicious User Update",
		description: "Fires when a suspicious user's status is updated.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.suspicious_user.update"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			moderatorUserId: c.out.data("moderatorUserId", t.String, {
				name: "Moderator User ID",
			}),
			moderatorUserLogin: c.out.data("moderatorUserLogin", t.String, {
				name: "Moderator User Login",
			}),
			moderatorUserName: c.out.data("moderatorUserName", t.String, {
				name: "Moderator User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			lowTrustStatus: c.out.data("lowTrustStatus", t.String, {
				name: "Low Trust Status",
			}),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.moderatorUserId(event.moderator_user_id);
			io.moderatorUserLogin(event.moderator_user_login);
			io.moderatorUserName(event.moderator_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.lowTrustStatus(event.low_trust_status);
		},
	})

	.addSchema("ChannelSuspiciousUserMessage", {
		type: "event",
		name: "Suspicious User Message",
		description: "Fires when a suspicious user sends a message.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter(
					(data) => data._tag === "channel.suspicious_user.message",
				),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			lowTrustStatus: c.out.data("lowTrustStatus", t.String, {
				name: "Low Trust Status",
			}),
			banEvasionEvaluation: c.out.data("banEvasionEvaluation", t.String, {
				name: "Ban Evasion Evaluation",
			}),
			messageId: c.out.data("messageId", t.String, { name: "Message ID" }),
			messageText: c.out.data("messageText", t.String, {
				name: "Message Text",
			}),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.lowTrustStatus(event.low_trust_status);
			io.banEvasionEvaluation(event.ban_evasion_evaluation);
			io.messageId(event.message_id);
			io.messageText(event.message_text);
		},
	})

	.addSchema("ChannelWarningAcknowledge", {
		type: "event",
		name: "Warning Acknowledged",
		description: "Fires when a user acknowledges a warning.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.warning.acknowledge"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
		},
	})

	.addSchema("ChannelWarningSend", {
		type: "event",
		name: "Warning Sent",
		description: "Fires when a warning is sent to a user.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.warning.send"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			moderatorUserId: c.out.data("moderatorUserId", t.String, {
				name: "Moderator User ID",
			}),
			moderatorUserLogin: c.out.data("moderatorUserLogin", t.String, {
				name: "Moderator User Login",
			}),
			moderatorUserName: c.out.data("moderatorUserName", t.String, {
				name: "Moderator User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.moderatorUserId(event.moderator_user_id);
			io.moderatorUserLogin(event.moderator_user_login);
			io.moderatorUserName(event.moderator_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
		},
	})

	// ===== AutoMod Events =====

	.addSchema("AutomodSettingsUpdate", {
		type: "event",
		name: "Automod Settings Update",
		description: "Fires when AutoMod settings are updated.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "automod.settings.update"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			moderatorUserId: c.out.data("moderatorUserId", t.String, {
				name: "Moderator User ID",
			}),
			moderatorUserLogin: c.out.data("moderatorUserLogin", t.String, {
				name: "Moderator User Login",
			}),
			moderatorUserName: c.out.data("moderatorUserName", t.String, {
				name: "Moderator User Name",
			}),
			bullying: c.out.data("bullying", t.Int, { name: "Bullying" }),
			disability: c.out.data("disability", t.Int, { name: "Disability" }),
			misogyny: c.out.data("misogyny", t.Int, { name: "Misogyny" }),
			aggression: c.out.data("aggression", t.Int, { name: "Aggression" }),
			swearing: c.out.data("swearing", t.Int, { name: "Swearing" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.moderatorUserId(event.moderator_user_id);
			io.moderatorUserLogin(event.moderator_user_login);
			io.moderatorUserName(event.moderator_user_name);
			io.bullying(event.bullying);
			io.disability(event.disability);
			io.misogyny(event.misogyny);
			io.aggression(event.aggression);
			io.swearing(event.swearing);
		},
	})

	.addSchema("AutomodTermsUpdate", {
		type: "event",
		name: "Automod Terms Update",
		description: "Fires when AutoMod terms are updated.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "automod.terms.update"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			moderatorUserId: c.out.data("moderatorUserId", t.String, {
				name: "Moderator User ID",
			}),
			moderatorUserLogin: c.out.data("moderatorUserLogin", t.String, {
				name: "Moderator User Login",
			}),
			moderatorUserName: c.out.data("moderatorUserName", t.String, {
				name: "Moderator User Name",
			}),
			action: c.out.data("action", t.String, { name: "Action" }),
			fromAutomod: c.out.data("fromAutomod", t.Bool, { name: "From Automod" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.moderatorUserId(event.moderator_user_id);
			io.moderatorUserLogin(event.moderator_user_login);
			io.moderatorUserName(event.moderator_user_name);
			io.action(event.action);
			io.fromAutomod(event.from_automod);
		},
	})

	// ===== Poll Events =====

	.addSchema("ChannelPollBegin", {
		type: "event",
		name: "Poll Began",
		description: "Fires when a poll begins.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.poll.begin"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			title: c.out.data("title", t.String, { name: "Title" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.title(event.title);
		},
	})

	.addSchema("ChannelPollProgress", {
		type: "event",
		name: "Poll Progress",
		description: "Fires when a poll progresses.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.poll.progress"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			title: c.out.data("title", t.String, { name: "Title" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.title(event.title);
		},
	})

	.addSchema("ChannelPollEnd", {
		type: "event",
		name: "Poll End",
		description: "Fires when a poll ends.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.poll.end"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			title: c.out.data("title", t.String, { name: "Title" }),
			status: c.out.data("status", t.String, { name: "Status" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.title(event.title);
			io.status(event.status);
		},
	})

	// ===== Prediction Events =====

	.addSchema("ChannelPredictionBegin", {
		type: "event",
		name: "Prediction Began",
		description: "Fires when a prediction begins.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.prediction.begin"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			title: c.out.data("title", t.String, { name: "Title" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.title(event.title);
		},
	})

	.addSchema("ChannelPredictionProgress", {
		type: "event",
		name: "Prediction Progress",
		description: "Fires when a prediction progresses.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.prediction.progress"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			title: c.out.data("title", t.String, { name: "Title" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.title(event.title);
		},
	})

	.addSchema("ChannelPredictionLock", {
		type: "event",
		name: "Prediction Locked",
		description: "Fires when a prediction locks.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.prediction.lock"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			title: c.out.data("title", t.String, { name: "Title" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.title(event.title);
		},
	})

	.addSchema("ChannelPredictionEnd", {
		type: "event",
		name: "Prediction End",
		description: "Fires when a prediction ends.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.prediction.end"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			title: c.out.data("title", t.String, { name: "Title" }),
			status: c.out.data("status", t.String, { name: "Status" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.title(event.title);
			io.status(event.status);
		},
	})

	// ===== Channel Points Events =====

	.addSchema("ChannelPointsAutomaticRewardRedemptionAdd", {
		type: "event",
		name: "Points Reward Redeemed",
		description: "Fires when a channel points automatic reward is redeemed.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter(
					(data) =>
						data._tag ===
						"channel.channel_points_automatic_reward_redemption.add",
				),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			rewardType: c.out.data("rewardType", t.String, { name: "Reward Type" }),
			rewardCost: c.out.data("rewardCost", t.Int, { name: "Reward Cost" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.rewardType(event.reward_type);
			io.rewardCost(event.reward_cost);
		},
	})

	// ===== Hype Train Events =====

	.addSchema("HypeTrainBegin", {
		type: "event",
		name: "Hype Train Begin",
		description: "Fires when a hype train begins.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.hype_train.begin"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			level: c.out.data("level", t.Int, { name: "Level" }),
			total: c.out.data("total", t.Int, { name: "Total" }),
			progress: c.out.data("progress", t.Int, { name: "Progress" }),
			goal: c.out.data("goal", t.Int, { name: "Goal" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.level(event.level);
			io.total(event.total);
			io.progress(event.progress);
			io.goal(event.goal);
		},
	})

	.addSchema("HypeTrainProgress", {
		type: "event",
		name: "Hype Train Progress",
		description: "Fires when a hype train progresses.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.hype_train.progress"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			level: c.out.data("level", t.Int, { name: "Level" }),
			total: c.out.data("total", t.Int, { name: "Total" }),
			progress: c.out.data("progress", t.Int, { name: "Progress" }),
			goal: c.out.data("goal", t.Int, { name: "Goal" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.level(event.level);
			io.total(event.total);
			io.progress(event.progress);
			io.goal(event.goal);
		},
	})

	.addSchema("HypeTrainEnd", {
		type: "event",
		name: "Hype Train End",
		description: "Fires when a hype train ends.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.hype_train.end"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			level: c.out.data("level", t.Int, { name: "Level" }),
			total: c.out.data("total", t.Int, { name: "Total" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.level(event.level);
			io.total(event.total);
		},
	})

	// ===== Charity Events =====

	.addSchema("ChannelCharityCampaignDonate", {
		type: "event",
		name: "Charity Donation",
		description: "Fires when a donation is made to a charity campaign.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter(
					(data) => data._tag === "channel.charity_campaign.donate",
				),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			campaignId: c.out.data("campaignId", t.String, { name: "Campaign ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			userId: c.out.data("userId", t.String, { name: "User ID" }),
			userLogin: c.out.data("userLogin", t.String, { name: "User Login" }),
			userName: c.out.data("userName", t.String, { name: "User Name" }),
			charityName: c.out.data("charityName", t.String, {
				name: "Charity Name",
			}),
			amountValue: c.out.data("amountValue", t.Int, { name: "Amount Value" }),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.campaignId(event.campaign_id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.userId(event.user_id);
			io.userLogin(event.user_login);
			io.userName(event.user_name);
			io.charityName(event.charity_name);
			io.amountValue(event.amount_value);
		},
	})

	.addSchema("ChannelCharityCampaignStart", {
		type: "event",
		name: "Charity Campaign Started",
		description: "Fires when a charity campaign starts.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.charity_campaign.start"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			charityName: c.out.data("charityName", t.String, {
				name: "Charity Name",
			}),
			currentAmountValue: c.out.data("currentAmountValue", t.Int, {
				name: "Current Amount Value",
			}),
			targetAmountValue: c.out.data("targetAmountValue", t.Int, {
				name: "Target Amount Value",
			}),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.charityName(event.charity_name);
			io.currentAmountValue(event.current_amount_value);
			io.targetAmountValue(event.target_amount_value);
		},
	})

	.addSchema("ChannelCharityCampaignProgress", {
		type: "event",
		name: "Charity Campaign Progress",
		description: "Fires when a charity campaign progresses.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter(
					(data) => data._tag === "channel.charity_campaign.progress",
				),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			charityName: c.out.data("charityName", t.String, {
				name: "Charity Name",
			}),
			currentAmountValue: c.out.data("currentAmountValue", t.Int, {
				name: "Current Amount Value",
			}),
			targetAmountValue: c.out.data("targetAmountValue", t.Int, {
				name: "Target Amount Value",
			}),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.charityName(event.charity_name);
			io.currentAmountValue(event.current_amount_value);
			io.targetAmountValue(event.target_amount_value);
		},
	})

	.addSchema("ChannelCharityCampaignStop", {
		type: "event",
		name: "Charity Campaign Stopped",
		description: "Fires when a charity campaign stops.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.charity_campaign.stop"),
			),
		io: (c) => ({
			id: c.out.data("id", t.String, { name: "ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			charityName: c.out.data("charityName", t.String, {
				name: "Charity Name",
			}),
			currentAmountValue: c.out.data("currentAmountValue", t.Int, {
				name: "Current Amount Value",
			}),
			targetAmountValue: c.out.data("targetAmountValue", t.Int, {
				name: "Target Amount Value",
			}),
		}),
		run: ({ io, event }) => {
			io.id(event.id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.charityName(event.charity_name);
			io.currentAmountValue(event.current_amount_value);
			io.targetAmountValue(event.target_amount_value);
		},
	})

	// ===== Shared Chat Events =====

	.addSchema("ChannelSharedChatSessionBegin", {
		type: "event",
		name: "Shared Chat Session Began",
		description: "Fires when a shared chat session begins.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter(
					(data) => data._tag === "channel.shared_chat.session.begin",
				),
			),
		io: (c) => ({
			sessionId: c.out.data("sessionId", t.String, { name: "Session ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			hostBroadcasterUserId: c.out.data("hostBroadcasterUserId", t.String, {
				name: "Host Broadcaster User ID",
			}),
			hostBroadcasterUserLogin: c.out.data(
				"hostBroadcasterUserLogin",
				t.String,
				{ name: "Host Broadcaster User Login" },
			),
			hostBroadcasterUserName: c.out.data("hostBroadcasterUserName", t.String, {
				name: "Host Broadcaster User Name",
			}),
		}),
		run: ({ io, event }) => {
			io.sessionId(event.session_id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.hostBroadcasterUserId(event.host_broadcaster_user_id);
			io.hostBroadcasterUserLogin(event.host_broadcaster_user_login);
			io.hostBroadcasterUserName(event.host_broadcaster_user_name);
		},
	})

	.addSchema("ChannelSharedChatSessionUpdate", {
		type: "event",
		name: "Shared Chat Session Update",
		description: "Fires when a shared chat session updates.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter(
					(data) => data._tag === "channel.shared_chat.session.update",
				),
			),
		io: (c) => ({
			sessionId: c.out.data("sessionId", t.String, { name: "Session ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			hostBroadcasterUserId: c.out.data("hostBroadcasterUserId", t.String, {
				name: "Host Broadcaster User ID",
			}),
			hostBroadcasterUserLogin: c.out.data(
				"hostBroadcasterUserLogin",
				t.String,
				{ name: "Host Broadcaster User Login" },
			),
			hostBroadcasterUserName: c.out.data("hostBroadcasterUserName", t.String, {
				name: "Host Broadcaster User Name",
			}),
		}),
		run: ({ io, event }) => {
			io.sessionId(event.session_id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.hostBroadcasterUserId(event.host_broadcaster_user_id);
			io.hostBroadcasterUserLogin(event.host_broadcaster_user_login);
			io.hostBroadcasterUserName(event.host_broadcaster_user_name);
		},
	})

	.addSchema("ChannelSharedChatSessionEnd", {
		type: "event",
		name: "Shared Chat Session End",
		description: "Fires when a shared chat session ends.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter(
					(data) => data._tag === "channel.shared_chat.session.end",
				),
			),
		io: (c) => ({
			sessionId: c.out.data("sessionId", t.String, { name: "Session ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			hostBroadcasterUserId: c.out.data("hostBroadcasterUserId", t.String, {
				name: "Host Broadcaster User ID",
			}),
			hostBroadcasterUserLogin: c.out.data(
				"hostBroadcasterUserLogin",
				t.String,
				{ name: "Host Broadcaster User Login" },
			),
			hostBroadcasterUserName: c.out.data("hostBroadcasterUserName", t.String, {
				name: "Host Broadcaster User Name",
			}),
		}),
		run: ({ io, event }) => {
			io.sessionId(event.session_id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.hostBroadcasterUserId(event.host_broadcaster_user_id);
			io.hostBroadcasterUserLogin(event.host_broadcaster_user_login);
			io.hostBroadcasterUserName(event.host_broadcaster_user_name);
		},
	})

	// ===== Guest Star Events =====

	.addSchema("ChannelGuestStarSessionBegin", {
		type: "event",
		name: "Guest Star Session Began",
		description: "Fires when a Guest Star session begins.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter(
					(data) => data._tag === "channel.guest_star_session.begin",
				),
			),
		io: (c) => ({
			sessionId: c.out.data("sessionId", t.String, { name: "Session ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
		}),
		run: ({ io, event }) => {
			io.sessionId(event.session_id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
		},
	})

	.addSchema("ChannelGuestStarSessionEnd", {
		type: "event",
		name: "Guest Star Session End",
		description: "Fires when a Guest Star session ends.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.guest_star_session.end"),
			),
		io: (c) => ({
			sessionId: c.out.data("sessionId", t.String, { name: "Session ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			hostUserId: c.out.data("hostUserId", t.String, { name: "Host User ID" }),
			hostUserLogin: c.out.data("hostUserLogin", t.String, {
				name: "Host User Login",
			}),
			hostUserName: c.out.data("hostUserName", t.String, {
				name: "Host User Name",
			}),
		}),
		run: ({ io, event }) => {
			io.sessionId(event.session_id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.hostUserId(event.host_user_id);
			io.hostUserLogin(event.host_user_login);
			io.hostUserName(event.host_user_name);
		},
	})

	.addSchema("ChannelGuestStarGuestUpdate", {
		type: "event",
		name: "Guest Star Guest Update",
		description: "Fires when a Guest Star guest is updated.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter(
					(data) => data._tag === "channel.guest_star_guest.update",
				),
			),
		io: (c) => ({
			sessionId: c.out.data("sessionId", t.String, { name: "Session ID" }),
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			hostUserId: c.out.data("hostUserId", t.String, { name: "Host User ID" }),
			hostUserLogin: c.out.data("hostUserLogin", t.String, {
				name: "Host User Login",
			}),
			hostUserName: c.out.data("hostUserName", t.String, {
				name: "Host User Name",
			}),
		}),
		run: ({ io, event }) => {
			io.sessionId(event.session_id);
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.hostUserId(event.host_user_id);
			io.hostUserLogin(event.host_user_login);
			io.hostUserName(event.host_user_name);
		},
	})

	// ===== Bits Events =====

	.addSchema("ChannelAdBreakBegin", {
		type: "event",
		name: "Ad Break Begin",
		description: "Fires when an ad break begins.",
		event: (data) =>
			Option.some(data).pipe(
				Option.filter((data) => data._tag === "channel.ad_break.begin"),
			),
		io: (c) => ({
			broadcasterUserId: c.out.data("broadcasterUserId", t.String, {
				name: "Broadcaster User ID",
			}),
			broadcasterUserLogin: c.out.data("broadcasterUserLogin", t.String, {
				name: "Broadcaster User Login",
			}),
			broadcasterUserName: c.out.data("broadcasterUserName", t.String, {
				name: "Broadcaster User Name",
			}),
			requesterUserId: c.out.data("requesterUserId", t.String, {
				name: "Requester User ID",
			}),
			requesterUserLogin: c.out.data("requesterUserLogin", t.String, {
				name: "Requester User Login",
			}),
			requesterUserName: c.out.data("requesterUserName", t.String, {
				name: "Requester User Name",
			}),
			durationSeconds: c.out.data("durationSeconds", t.Int, {
				name: "Duration Seconds",
			}),
			isAutomatic: c.out.data("isAutomatic", t.Bool, { name: "Is Automatic" }),
		}),
		run: ({ io, event }) => {
			io.broadcasterUserId(event.broadcaster_user_id);
			io.broadcasterUserLogin(event.broadcaster_user_login);
			io.broadcasterUserName(event.broadcaster_user_name);
			io.requesterUserId(event.requester_user_id);
			io.requesterUserLogin(event.requester_user_login);
			io.requesterUserName(event.requester_user_name);
			io.durationSeconds(event.duration_seconds);
			io.isAutomatic(event.is_automatic);
		},
	})

	// ========================================================================
	// Exec Schemas - Helix API Operations
	// ========================================================================
	// NOTE: All exec schemas require accountId as the first input parameter
	// since all Twitch API operations require OAuth authentication.

	// ===== Chat Execs =====

	.addSchema("SendChatMessage", {
		type: "exec",
		name: "Send Chat Message",
		description: "Sends a message to a Twitch channel's chat.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			broadcasterId: c.in.data("broadcasterId", t.String, {
				name: "Broadcaster ID",
			}),
			senderId: c.in.data("senderId", t.String, { name: "Sender ID" }),
			message: c.in.data("message", t.String, { name: "Message" }),
		}),
		run: function* ({ io, properties }) {
			yield* properties.account.engine
				.SendChatMessage({
					accountId: io.accountId,
					broadcasterId: io.broadcasterId,
					senderId: io.senderId,
					message: io.message,
				})
				.pipe(Effect.orDie);
		},
	})

	.addSchema("GetChatSettings", {
		type: "exec",
		name: "Get Chat Settings",
		description: "Gets chat settings for a broadcaster's channel.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			broadcasterId: c.in.data("broadcasterId", t.String, {
				name: "Broadcaster ID",
			}),
			emoteMode: c.out.data("emoteMode", t.Bool, { name: "Emote Mode" }),
			followerMode: c.out.data("followerMode", t.Bool, {
				name: "Follower Mode",
			}),
			slowMode: c.out.data("slowMode", t.Bool, { name: "Slow Mode" }),
			subscriberMode: c.out.data("subscriberMode", t.Bool, {
				name: "Subscriber Mode",
			}),
		}),
		run: function* ({ io, properties }) {
			const {
				data: [data],
			} = yield* properties.account.engine
				.GetChatSettings({
					accountId: io.accountId,
					broadcasterId: io.broadcasterId,
				})
				.pipe(Effect.orDie);
			if (!data) return;

			io.emoteMode(data.emote_mode);
			io.followerMode(data.follower_mode);
			io.slowMode(data.slow_mode);
			io.subscriberMode(data.subscriber_mode);
		},
	})

	.addSchema("UpdateChatSettings", {
		type: "exec",
		name: "Update Chat Settings",
		description: "Updates chat settings for a broadcaster's channel.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			broadcasterId: c.in.data("broadcasterId", t.String, {
				name: "Broadcaster ID",
			}),
			moderatorId: c.in.data("moderatorId", t.String, { name: "Moderator ID" }),
			emoteMode: c.in.data("emoteMode", t.Option(t.Bool), {
				name: "Emote Mode",
			}),
			followerMode: c.in.data("followerMode", t.Option(t.Bool), {
				name: "Follower Mode",
			}),
			slowMode: c.in.data("slowMode", t.Option(t.Bool), { name: "Slow Mode" }),
			subscriberMode: c.in.data("subscriberMode", t.Option(t.Bool), {
				name: "Subscriber Mode",
			}),
		}),
		run: function* ({ io, properties }) {
			yield* properties.account.engine
				.UpdateChatSettings({
					accountId: io.accountId,
					broadcasterId: io.broadcasterId,
					moderatorId: io.moderatorId,
					...Option.match(io.emoteMode, {
						onSome: (v) => ({ emoteMode: v }),
						onNone: () => ({}),
					}),
					...Option.match(io.followerMode, {
						onSome: (v) => ({ followerMode: v }),
						onNone: () => ({}),
					}),
					...Option.match(io.slowMode, {
						onSome: (v) => ({ slowMode: v }),
						onNone: () => ({}),
					}),
					...Option.match(io.subscriberMode, {
						onSome: (v) => ({ subscriberMode: v }),
						onNone: () => ({}),
					}),
				})
				.pipe(Effect.orDie);
		},
	})

	// ===== Channel Execs =====

	.addSchema("GetChannelInformation", {
		type: "exec",
		name: "Get Channel Information",
		description: "Gets information about one or more channels.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			broadcasterId: c.in.data("broadcasterId", t.String, {
				name: "Broadcaster ID",
			}),
			broadcasterLogin: c.out.data("broadcasterLogin", t.String, {
				name: "Broadcaster Login",
			}),
			broadcasterName: c.out.data("broadcasterName", t.String, {
				name: "Broadcaster Name",
			}),
			gameName: c.out.data("gameName", t.String, { name: "Game Name" }),
			gameId: c.out.data("gameId", t.String, { name: "Game ID" }),
			title: c.out.data("title", t.String, { name: "Title" }),
			language: c.out.data("language", t.String, { name: "Language" }),
		}),
		run: function* ({ io, properties }) {
			const response = yield* properties.account.engine
				.GetChannelInformation({
					accountId: io.accountId,
					broadcasterId: [io.broadcasterId],
				})
				.pipe(Effect.orDie);
			const result = response.data[0];
			if (!result) return;

			io.broadcasterLogin(result.broadcaster_id);
			io.broadcasterName(result.broadcaster_name);
			io.gameName(result.game_name);
			io.gameId(result.game_id);
			io.title(result.title);
			io.language(result.broadcaster_language);
		},
	})

	.addSchema("ModifyChannelInformation", {
		type: "exec",
		name: "Modify Channel Information",
		description: "Modifies channel information for a broadcaster.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			broadcasterId: c.in.data("broadcasterId", t.String, {
				name: "Broadcaster ID",
			}),
			gameId: c.in.data("gameId", t.Option(t.String), { name: "Game ID" }),
			title: c.in.data("title", t.Option(t.String), { name: "Title" }),
			broadcasterLanguage: c.in.data(
				"broadcasterLanguage",
				t.Option(t.String),
				{ name: "Broadcaster Language" },
			),
		}),
		run: function* ({ io, properties }) {
			yield* properties.account.engine
				.ModifyChannelInformation({
					accountId: io.accountId,
					broadcasterId: io.broadcasterId,
					...Option.match(io.gameId, {
						onSome: (v) => ({ gameId: v }),
						onNone: () => ({}),
					}),
					...Option.match(io.title, {
						onSome: (v) => ({ title: v }),
						onNone: () => ({}),
					}),
					...Option.match(io.broadcasterLanguage, {
						onSome: (v) => ({ broadcasterLanguage: v }),
						onNone: () => ({}),
					}),
				})
				.pipe(Effect.orDie);
		},
	})

	// ===== Stream Execs =====

	.addSchema("GetStreams", {
		type: "exec",
		name: "Get Streams",
		description: "Gets information about active streams.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			userId: c.in.data("userId", t.String, { name: "User ID" }),
			isLive: c.out.data("isLive", t.Bool, { name: "Is Live" }),
			viewerCount: c.out.data("viewerCount", t.Int, { name: "Viewer Count" }),
			gameName: c.out.data("gameName", t.String, { name: "Game Name" }),
			title: c.out.data("title", t.String, { name: "Title" }),
		}),
		run: function* ({ io, properties }) {
			const { data } = yield* properties.account.engine
				.GetStreams({ accountId: io.accountId, userId: [io.userId] })
				.pipe(Effect.orDie);

			const stream = data.data[0];
			if (stream) {
				io.isLive(true);
				io.viewerCount(stream.viewer_count);
				io.gameName(stream.game_name ?? "");
				io.title(stream.title);
			} else {
				io.isLive(false);
				io.viewerCount(0);
				io.gameName("");
				io.title("");
			}
		},
	})

	.addSchema("CreateClip", {
		type: "exec",
		name: "Create Clip",
		description: "Creates a clip from the broadcaster's stream.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			broadcasterId: c.in.data("broadcasterId", t.String, {
				name: "Broadcaster ID",
			}),
			clipId: c.out.data("clipId", t.String, { name: "Clip ID" }),
			editUrl: c.out.data("editUrl", t.String, { name: "Edit URL" }),
		}),
		run: function* ({ io, properties }) {
			const response = yield* properties.account.engine
				.CreateClip({
					accountId: io.accountId,
					broadcasterId: io.broadcasterId,
				})
				.pipe(Effect.orDie);
			const result = response.data[0];
			if (!result) return;

			io.clipId(result.id);
			io.editUrl(result.edit_url);
		},
	})

	// ===== Poll Execs =====

	.addSchema("CreatePoll", {
		type: "exec",
		name: "Create Poll",
		description: "Creates a poll for a broadcaster's channel.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			broadcasterId: c.in.data("broadcasterId", t.String, {
				name: "Broadcaster ID",
			}),
			title: c.in.data("title", t.String, { name: "Title" }),
			choice1: c.in.data("choice1", t.String, { name: "Choice 1" }),
			choice2: c.in.data("choice2", t.String, { name: "Choice 2" }),
			duration: c.in.data("duration", t.Int, { name: "Duration" }),
			pollId: c.out.data("pollId", t.String, { name: "Poll ID" }),
		}),
		run: function* ({ io, properties }) {
			const response = yield* properties.account.engine
				.CreatePoll({
					accountId: io.accountId,
					broadcasterId: io.broadcasterId,
					title: io.title,
					choices: [{ title: io.choice1 }, { title: io.choice2 }],
					duration: io.duration,
				})
				.pipe(Effect.orDie);

			const result = response.data[0];
			if (!result) return;
			io.pollId(result.id);
		},
	})

	.addSchema("EndPoll", {
		type: "exec",
		name: "End Poll",
		description: "Ends a poll that is currently active.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			broadcasterId: c.in.data("broadcasterId", t.String, {
				name: "Broadcaster ID",
			}),
			id: c.in.data("id", t.String, { name: "Poll ID" }),
			status: c.in.data("status", t.String, {
				name: "Status",
				suggestions: () => Effect.succeed(["ARCHIVED", "TERMINATED"]),
			}),
		}),
		run: function* ({ io, properties }) {
			yield* properties.account.engine
				.EndPoll({
					accountId: io.accountId,
					broadcasterId: io.broadcasterId,
					id: io.id,
					status: io.status as any,
				})
				.pipe(Effect.orDie);
		},
	})

	// ===== Prediction Execs =====

	.addSchema("CreatePrediction", {
		type: "exec",
		name: "Create Prediction",
		description: "Creates a prediction for a broadcaster's channel.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			broadcasterId: c.in.data("broadcasterId", t.String, {
				name: "Broadcaster ID",
			}),
			title: c.in.data("title", t.String, { name: "Title" }),
			outcome1: c.in.data("outcome1", t.String, { name: "Outcome 1" }),
			outcome2: c.in.data("outcome2", t.String, { name: "Outcome 2" }),
			predictionWindow: c.in.data("predictionWindow", t.Int, {
				name: "Prediction Window",
			}),
			predictionId: c.out.data("predictionId", t.String, {
				name: "Prediction ID",
			}),
		}),
		run: function* ({ io, properties }) {
			const response = yield* properties.account.engine
				.CreatePrediction({
					accountId: io.accountId,
					broadcasterId: io.broadcasterId,
					title: io.title,
					outcomes: [{ title: io.outcome1 }, { title: io.outcome2 }],
					predictionWindow: io.predictionWindow,
				})
				.pipe(Effect.orDie);

			const result = [...response.data][0];
			if (!result) return;
			io.predictionId(result.id);
		},
	})

	.addSchema("EndPrediction", {
		type: "exec",
		name: "End Prediction",
		description: "Ends a prediction that is currently active.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			broadcasterId: c.in.data("broadcasterId", t.String, {
				name: "Broadcaster ID",
			}),
			id: c.in.data("id", t.String, { name: "Prediction ID" }),
			status: c.in.data("status", t.String, {
				name: "Status",
				suggestions: () => Effect.succeed(["CANCELLED", "RESOLVED"]),
			}),
			winningOutcomeId: c.in.data("winningOutcomeId", t.Option(t.String), {
				name: "Winning Outcome ID",
			}),
		}),
		run: function* ({ io, properties }) {
			yield* properties.account.engine
				.EndPrediction({
					accountId: io.accountId,
					broadcasterId: io.broadcasterId,
					id: io.id,
					status: io.status as any,
					...Option.match(io.winningOutcomeId, {
						onSome: (v) => ({ winningOutcomeId: v }),
						onNone: () => ({}),
					}),
				})
				.pipe(Effect.orDie);
		},
	})

	// ===== Moderation Execs =====

	// .addSchema("BanUser", {
	// 	type: "exec",
	// 	name: "Ban User",
	// 	description: "Bans a user from a broadcaster's channel.",
	// 	properties: { account: { name: "Account", resource: TwitchAccount } },
	// 	io: (c) => ({
	// 		accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
	// 		broadcasterId: c.in.data("broadcasterId", t.String, {
	// 			name: "Broadcaster ID",
	// 		}),
	// 		moderatorId: c.in.data("moderatorId", t.String, { name: "Moderator ID" }),
	// 		userId: c.in.data("userId", t.String, { name: "User ID" }),
	// 		reason: c.in.data("reason", t.Option(t.String), { name: "Reason" }),
	// 		duration: c.in.data("duration", t.Option(t.Int), { name: "Duration" }),
	// 	}),
	// 	run: function* ({ io, properties }) {
	// 		const accountId = io.accountId;
	// 		const broadcasterId = io.broadcasterId;
	// 		const moderatorId = io.moderatorId;
	// 		const userId = io.userId;
	// 		const reason = io.reason;
	// 		const duration = io.duration;

	// 		yield* properties.account.engine
	// 			.BanUser({
	// 				accountId,
	// 				broadcasterId,
	// 				moderatorId,
	// 				userId,
	// 				...Option.match(reason, {
	// 					onSome: (v) => ({ reason: v }),
	// 					onNone: () => ({}),
	// 				}),
	// 				...Option.match(duration, {
	// 					onSome: (v) => ({ duration: v }),
	// 					onNone: () => ({}),
	// 				}),
	// 			})
	// 			.pipe(Effect.orDie);
	// 	},
	// })

	// .addSchema("UnbanUser", {
	// 	type: "exec",
	// 	name: "Unban User",
	// 	description: "Unbans a user from a broadcaster's channel.",
	// 	properties: { account: { name: "Account", resource: TwitchAccount } },
	// 	io: (c) => ({
	// 		accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
	// 		broadcasterId: c.in.data("broadcasterId", t.String, {
	// 			name: "Broadcaster ID",
	// 		}),
	// 		moderatorId: c.in.data("moderatorId", t.String, { name: "Moderator ID" }),
	// 		userId: c.in.data("userId", t.String, { name: "User ID" }),
	// 	}),
	// 	run: function* ({ io, properties }) {
	// 		const accountId = io.accountId;
	// 		const broadcasterId = io.broadcasterId;
	// 		const moderatorId = io.moderatorId;
	// 		const userId = io.userId;

	// 		yield* properties.account.engine
	// 			.UnbanUser({ accountId, broadcasterId, moderatorId, userId })
	// 			.pipe(Effect.orDie);
	// 	},
	// })

	// .addSchema("DeleteChatMessages", {
	// 	type: "exec",
	// 	name: "Delete Chat Messages",
	// 	description: "Deletes one or all messages from a user in chat.",
	// 	properties: { account: { name: "Account", resource: TwitchAccount } },
	// 	io: (c) => ({
	// 		accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
	// 		broadcasterId: c.in.data("broadcasterId", t.String, {
	// 			name: "Broadcaster ID",
	// 		}),
	// 		moderatorId: c.in.data("moderatorId", t.String, { name: "Moderator ID" }),
	// 		messageId: c.in.data("messageId", t.Option(t.String), {
	// 			name: "Message ID",
	// 		}),
	// 	}),
	// 	run: function* ({ io, properties }) {
	// 		const accountId = io.accountId;
	// 		const broadcasterId = io.broadcasterId;
	// 		const moderatorId = io.moderatorId;
	// 		const messageId = io.messageId;

	// 		yield* properties.account.engine
	// 			.DeleteChatMessages({
	// 				accountId,
	// 				broadcasterId,
	// 				moderatorId,
	// 				...Option.match(messageId, {
	// 					onSome: (v) => ({ messageId: v }),
	// 					onNone: () => ({}),
	// 				}),
	// 			})
	// 			.pipe(Effect.orDie);
	// 	},
	// })

	// ===== User Execs =====

	.addSchema("GetUsers", {
		type: "exec",
		name: "Get Users",
		description: "Gets information about one or more users.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			userId: c.in.data("userId", t.Option(t.String), { name: "User ID" }),
			login: c.in.data("login", t.Option(t.String), { name: "Login" }),
			id: c.out.data("id", t.String, { name: "ID" }),
			displayName: c.out.data("displayName", t.String, {
				name: "Display Name",
			}),
			broadcasterType: c.out.data("broadcasterType", t.String, {
				name: "Broadcaster Type",
			}),
			description: c.out.data("description", t.String, { name: "Description" }),
		}),
		run: function* ({ io, properties }) {
			const { data } = yield* properties.account.engine
				.GetUsers({
					accountId: io.accountId,
					...Option.match(io.userId, {
						onSome: (v) => ({ id: [v] }),
						onNone: () => ({}),
					}),
					...Option.match(io.login, {
						onSome: (v) => ({ login: [v] }),
						onNone: () => ({}),
					}),
				})
				.pipe(Effect.orDie);

			const user = data[0];
			if (user) {
				io.id(user.id);
				io.displayName(user.display_name);
				io.broadcasterType(user.broadcaster_type ?? "");
				io.description(user.description ?? "");
			}
		},
	})

	.addSchema("GetFollowers", {
		type: "exec",
		name: "Get Followers",
		description: "Gets a list of users who follow the broadcaster.",
		properties: { account: { name: "Account", resource: TwitchAccount } },
		io: (c) => ({
			accountId: c.in.data("accountId", t.String, { name: "Account ID" }),
			broadcasterId: c.in.data("broadcasterId", t.String, {
				name: "Broadcaster ID",
			}),
			total: c.out.data("total", t.Int, { name: "Total" }),
		}),
		run: function* ({ io, properties }) {
			const result = yield* properties.account.engine
				.GetChannelFollowers({
					accountId: io.accountId,
					broadcasterId: io.broadcasterId,
				})
				.pipe(Effect.orDie);

			io.total(result.total ?? 0);
		},
	});
