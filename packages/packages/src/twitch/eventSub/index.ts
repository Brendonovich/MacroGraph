import { Maybe } from "@macrograph/option";
import type {
	Core,
	CreateEventSchema,
	Package,
	PropertyDef,
	SchemaProperties,
} from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { createEventBus } from "@solid-primitives/event-bus";
import { createEventListener } from "@solid-primitives/event-listener";
import { ReactiveMap } from "@solid-primitives/map";

import type { Ctx } from "../ctx";
import type { Helix } from "../helix";
import { defaultProperties } from "../resource";
import type { Events } from "./types";
import type { Types } from "../types";

export * from "./types";

export function createEventSub(core: Core, helixClient: Helix) {
	const sockets = new ReactiveMap<string, WebSocket>();

	async function connectSocket(userId: string, shouldRetry = true) {
		let retry = shouldRetry;
		const credential = await core.getCredential("twitch", userId);
		if (!credential || sockets.has(userId)) return;

		await new Promise<void>((res) => {
			const ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

			ws.onmessage = async (data) => {
				const info: any = JSON.parse(data.data);

				if (info.metadata.message_type === "session_welcome") {
					sockets.set(userId, ws);
					retry = true;

					await Promise.allSettled(
						SubTypes.map((type) =>
							helixClient.call("POST /eventsub/subscriptions", credential, {
								body: JSON.stringify({
									type,
									version: type === "channel.follow" ? "2" : "1",
									condition: {
										broadcaster_user_id: userId,
										moderator_user_id: userId,
										to_broadcaster_user_id: userId,
										user_id: userId,
									},
									transport: {
										method: "websocket",
										session_id: info.payload.session.id,
									},
								}),
							}),
						),
					);

					res();
				}
			};

			ws.onclose = (e) => {
				sockets.delete(userId);
				if (!retry && e.code !== 1000) connectSocket(userId, false);
			};
		});
	}

	function disconnectSocket(userId: string) {
		const ws = sockets.get(userId);
		if (!ws) return;

		ws.close();
	}

	return { sockets, connectSocket, disconnectSocket };
}

export function register(pkg: Package, { eventSub }: Ctx, types: Types) {
	function createEventSubEventSchema<
		TEvent extends keyof Events,
		TProperties extends Record<string, PropertyDef> = never,
		TIO = void,
	>({
		event,
		...s
	}: Omit<
		CreateEventSchema<
			TProperties & typeof defaultProperties,
			TIO,
			Events[TEvent]
		>,
		"type" | "createListener"
	> & {
		properties?: TProperties;
		event: TEvent;
	}) {
		pkg.createSchema({
			...s,
			type: "event",
			properties: { ...s.properties, ...defaultProperties } as any,
			createListener({ ctx, properties }) {
				const socket = ctx
					.getProperty(
						properties.account as SchemaProperties<
							typeof defaultProperties
						>["account"],
					)
					.andThen((account) => Maybe(eventSub.sockets.get(account.data.id)))
					.expect("No account available");

				const bus = createEventBus<Events[TEvent]>();

				createEventListener(socket, "message", (msg: MessageEvent) => {
					const data: any = JSON.parse(msg.data);

					if (
						data.metadata.message_type === "notification" &&
						data.metadata.subscription_type === event
					)
						bus.emit(data.payload.event);
				});

				return bus;
			},
		});
	}

	createEventSubEventSchema({
		name: "User Banned",
		event: "channel.ban",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			channelId: io.dataOutput({
				id: "channelId",
				name: "Channel ID",
				type: t.string(),
			}),
			channelName: io.dataOutput({
				id: "channelName",
				name: "Channel Name",
				type: t.string(),
			}),
			modId: io.dataOutput({
				id: "modId",
				name: "Mod Who Banned ID",
				type: t.string(),
			}),
			modName: io.dataOutput({
				id: "modName",
				name: "Mod Who Banned Name",
				type: t.string(),
			}),
			bannedUserID: io.dataOutput({
				id: "bannedUserID",
				name: "Banned User ID",
				type: t.string(),
			}),
			bannedUserLogin: io.dataOutput({
				id: "bannedUserLogin",
				name: "Banned Username",
				type: t.string(),
			}),
			reason: io.dataOutput({
				id: "reason",
				name: "Ban Reason",
				type: t.string(),
			}),
			permanent: io.dataOutput({
				id: "permanent",
				name: "Perma Ban",
				type: t.bool(),
			}),
			ends: io.dataOutput({
				id: "ends",
				name: "End Time",
				type: t.option(t.string()),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.channelId, data.broadcaster_user_id);
			ctx.setOutput(io.channelName, data.broadcaster_user_login);
			ctx.setOutput(io.modId, data.moderator_user_id);
			ctx.setOutput(io.modName, data.moderator_user_login);
			ctx.setOutput(io.bannedUserID, data.user_id);
			ctx.setOutput(io.bannedUserLogin, data.user_login);
			ctx.setOutput(io.reason, data.reason);
			ctx.setOutput(io.permanent, data.is_permanent);
			ctx.setOutput(io.ends, Maybe(data.ends_at));
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "User Unbanned",
		event: "channel.unban",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			userId: io.dataOutput({
				id: "userId",
				name: "User ID",
				type: t.string(),
			}),
			userLogin: io.dataOutput({
				id: "userLogin",
				name: "User Name",
				type: t.string(),
			}),
			modName: io.dataOutput({
				id: "modName",
				name: "Mod Name",
				type: t.string(),
			}),
			modId: io.dataOutput({
				id: "modId",
				name: "Mod ID",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.modName, data.moderator_user_login);
			ctx.setOutput(io.modId, data.moderator_user_id);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Moderator Add",
		event: "channel.moderator.add",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			userId: io.dataOutput({
				id: "userId",
				name: "userID",
				type: t.string(),
			}),
			userLogin: io.dataOutput({
				id: "userLogin",
				name: "Username",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Moderator Remove",
		event: "channel.moderator.remove",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			userId: io.dataOutput({
				id: "userId",
				name: "userID",
				type: t.string(),
			}),
			userLogin: io.dataOutput({
				id: "userLogin",
				name: "Username",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Point Reward Add",
		event: "channel.channel_points_custom_reward.add",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			id: io.dataOutput({
				id: "id",
				name: "ID",
				type: t.string(),
			}),
			enabled: io.dataOutput({
				id: "enabled",
				name: "Enabled",
				type: t.bool(),
			}),
			paused: io.dataOutput({
				id: "paused",
				name: "Paused",
				type: t.bool(),
			}),
			inStock: io.dataOutput({
				id: "inStock",
				name: "In Stock",
				type: t.bool(),
			}),
			title: io.dataOutput({
				id: "title",
				name: "Title",
				type: t.string(),
			}),
			cost: io.dataOutput({
				id: "cost",
				name: "Cost",
				type: t.int(),
			}),
			prompt: io.dataOutput({
				id: "prompt",
				name: "Prompt",
				type: t.string(),
			}),
			inputRequired: io.dataOutput({
				id: "inputRequired",
				name: "Input Required",
				type: t.bool(),
			}),
			skipQueue: io.dataOutput({
				id: "skipQueue",
				name: "Skip Request Queue",
				type: t.bool(),
			}),
			cooldownExpire: io.dataOutput({
				id: "cooldownExpire",
				name: "Cooldown Expire Timestamp",
				type: t.option(t.string()),
			}),
			redemptTotalStream: io.dataOutput({
				id: "redemptTotalStream",
				name: "Current Stream Total Redemptions",
				type: t.option(t.int()),
			}),
			maxPerStream: io.dataOutput({
				id: "maxPerStream",
				name: "Max Per Stream",
				type: t.option(t.int()),
			}),
			maxUserPerStream: io.dataOutput({
				id: "maxUserPerStreamValue",
				name: "Max User Per Stream",
				type: t.option(t.int()),
			}),
			globalCooldown: io.dataOutput({
				id: "globalCooldown",
				name: "Global Cooldown",
				type: t.option(t.int()),
			}),
			backgroundColor: io.dataOutput({
				id: "backgroundColor",
				name: "Background Color",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.id);
			ctx.setOutput(io.enabled, data.is_enabled);
			ctx.setOutput(io.paused, data.is_paused);
			ctx.setOutput(io.inStock, data.is_in_stock);
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(io.cost, data.cost);
			ctx.setOutput(io.prompt, data.prompt);
			ctx.setOutput(io.inputRequired, data.is_user_input_required);
			ctx.setOutput(io.skipQueue, data.should_redemptions_skip_request_queue);
			ctx.setOutput(io.cooldownExpire, Maybe(data.cooldown_expires_at));
			ctx.setOutput(
				io.redemptTotalStream,
				Maybe(data.redemptions_redeemed_current_stream),
			);
			ctx.setOutput(io.maxPerStream, Maybe(data.max_per_stream.value));
			ctx.setOutput(
				io.maxUserPerStream,
				Maybe(data.max_per_user_per_stream.value),
			);
			ctx.setOutput(io.globalCooldown, Maybe(data.global_cooldown.seconds));
			ctx.setOutput(io.backgroundColor, data.background_color);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Point Reward Updated",
		event: "channel.channel_points_custom_reward.update",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			id: io.dataOutput({
				id: "id",
				name: "ID",
				type: t.string(),
			}),
			title: io.dataOutput({
				id: "title",
				name: "Title",
				type: t.string(),
			}),
			cost: io.dataOutput({
				id: "cost",
				name: "Cost",
				type: t.int(),
			}),
			prompt: io.dataOutput({
				id: "prompt",
				name: "Prompt",
				type: t.string(),
			}),
			enabled: io.dataOutput({
				id: "enabled",
				name: "Enabled",
				type: t.bool(),
			}),
			inputRequired: io.dataOutput({
				id: "inputRequired",
				name: "Input Required",
				type: t.bool(),
			}),
			backgroundColor: io.dataOutput({
				id: "backgroundColor",
				name: "Background Color",
				type: t.string(),
			}),
			maxPerStream: io.dataOutput({
				id: "maxPerStreamValue",
				name: "Max Per Stream",
				type: t.option(t.int()),
			}),
			maxUserPerStream: io.dataOutput({
				id: "maxUserPerStream",
				name: "Max User Per Stream",
				type: t.option(t.int()),
			}),
			globalCooldown: io.dataOutput({
				id: "globalCooldown",
				name: "Global Cooldown",
				type: t.option(t.int()),
			}),
			paused: io.dataOutput({
				id: "paused",
				name: "Paused",
				type: t.bool(),
			}),
			inStock: io.dataOutput({
				id: "inStock",
				name: "In Stock",
				type: t.bool(),
			}),
			skipQueue: io.dataOutput({
				id: "skipQueue",
				name: "Skip Request Queue",
				type: t.bool(),
			}),
			redemptTotalStream: io.dataOutput({
				id: "redemptTotalStream",
				name: "Current Stream Total Redemptions",
				type: t.option(t.int()),
			}),
			cooldownExpire: io.dataOutput({
				id: "cooldownExpire",
				name: "Cooldown Expire Timestamp",
				type: t.option(t.string()),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.id);
			ctx.setOutput(io.enabled, data.is_enabled);
			ctx.setOutput(io.paused, data.is_paused);
			ctx.setOutput(io.inStock, data.is_in_stock);
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(io.cost, data.cost);
			ctx.setOutput(io.prompt, data.prompt);
			ctx.setOutput(io.inputRequired, data.is_user_input_required);
			ctx.setOutput(io.skipQueue, data.should_redemptions_skip_request_queue);
			ctx.setOutput(io.cooldownExpire, Maybe(data.cooldown_expires_at));
			ctx.setOutput(
				io.redemptTotalStream,
				Maybe(data.redemptions_redeemed_current_stream),
			);
			ctx.setOutput(
				io.maxPerStream,
				Maybe(
					data.max_per_stream.is_enabled ? data.max_per_stream.value : null,
				),
			);
			ctx.setOutput(
				io.maxUserPerStream,
				Maybe(
					data.max_per_user_per_stream.is_enabled
						? data.max_per_user_per_stream.value
						: null,
				),
			);
			ctx.setOutput(
				io.globalCooldown,
				Maybe(
					data.global_cooldown.is_enabled ? data.global_cooldown.seconds : null,
				),
			);
			ctx.setOutput(io.backgroundColor, data.background_color);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Point Reward Removed",
		event: "channel.channel_points_custom_reward.remove",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			id: io.dataOutput({
				id: "id",
				name: "ID",
				type: t.string(),
			}),
			enabled: io.dataOutput({
				id: "enabled",
				name: "Enabled",
				type: t.bool(),
			}),
			paused: io.dataOutput({
				id: "paused",
				name: "Paused",
				type: t.bool(),
			}),
			inStock: io.dataOutput({
				id: "inStock",
				name: "In Stock",
				type: t.bool(),
			}),
			title: io.dataOutput({
				id: "title",
				name: "Title",
				type: t.string(),
			}),
			cost: io.dataOutput({
				id: "cost",
				name: "Cost",
				type: t.int(),
			}),
			prompt: io.dataOutput({
				id: "prompt",
				name: "Prompt",
				type: t.string(),
			}),
			inputRequired: io.dataOutput({
				id: "inputRequired",
				name: "Input Required",
				type: t.bool(),
			}),
			skipQueue: io.dataOutput({
				id: "skipQueue",
				name: "Skip Request Queue",
				type: t.bool(),
			}),
			cooldownExpire: io.dataOutput({
				id: "cooldownExpire",
				name: "Cooldown Expire Timestamp",
				type: t.option(t.string()),
			}),
			redemptTotalStream: io.dataOutput({
				id: "redemptTotalStream",
				name: "Current Stream Total Redemptions",
				type: t.option(t.int()),
			}),
			maxPerStream: io.dataOutput({
				id: "maxPerStreamValue",
				name: "Max Per Stream",
				type: t.option(t.int()),
			}),
			maxUserPerStream: io.dataOutput({
				id: "maxUserPerStream",
				name: "Max User Per Stream",
				type: t.option(t.int()),
			}),
			globalCooldown: io.dataOutput({
				id: "globalCooldown",
				name: "Global Cooldown",
				type: t.option(t.int()),
			}),
			backgroundColor: io.dataOutput({
				id: "backgroundColor",
				name: "Background Color",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.id);
			ctx.setOutput(io.enabled, data.is_enabled);
			ctx.setOutput(io.paused, data.is_paused);
			ctx.setOutput(io.inStock, data.is_in_stock);
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(io.cost, data.cost);
			ctx.setOutput(io.prompt, data.prompt);
			ctx.setOutput(io.inputRequired, data.is_user_input_required);
			ctx.setOutput(io.skipQueue, data.should_redemptions_skip_request_queue);
			ctx.setOutput(io.cooldownExpire, Maybe(data.cooldown_expires_at));
			ctx.setOutput(
				io.redemptTotalStream,
				Maybe(data.redemptions_redeemed_current_stream),
			);
			ctx.setOutput(io.maxPerStream, Maybe(data.max_per_stream.value));
			ctx.setOutput(
				io.maxUserPerStream,
				Maybe(data.max_per_user_per_stream.value),
			);
			ctx.setOutput(io.globalCooldown, Maybe(data.global_cooldown.seconds));
			ctx.setOutput(io.backgroundColor, data.background_color);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Points Automatic Redemption Redeemed",
		event: "channel.channel_points_automatic_reward_redemption.add",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			rewardId: io.dataOutput({
				id: "rewardId",
				name: "Reward ID",
				type: t.string(),
			}),
			userId: io.dataOutput({
				id: "userId",
				name: "User ID",
				type: t.string(),
			}),
			userLogin: io.dataOutput({
				id: "userLogin",
				name: "User Login",
				type: t.string(),
			}),
			userName: io.dataOutput({
				id: "userName",
				name: "User Name",
				type: t.string(),
			}),
			text: io.dataOutput({
				id: "text",
				name: "Text",
				type: t.string(),
			}),
			emotes: io.dataOutput({
				id: "emotes",
				name: "emotes",
				type: t.option(t.list(t.struct(types.Emotes))),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.rewardId, data.reward.type);
			ctx.setOutput(io.text, data.message.text);
			ctx.setOutput(
				io.emotes,
				Maybe(
					data.message.emotes
						? data.message.emotes.map((emote) =>
								types.Emotes.create({
									id: emote.id,
									begin: emote.begin,
									end: emote.end,
								}),
							)
						: null,
				),
			);
			return ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Point Reward Redeemed",
		event: "channel.channel_points_custom_reward_redemption.add",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			id: io.dataOutput({
				id: "id",
				name: "Redemption ID",
				type: t.string(),
			}),
			userId: io.dataOutput({
				id: "userId",
				name: "User ID",
				type: t.string(),
			}),
			userLogin: io.dataOutput({
				id: "userLogin",
				name: "User Login",
				type: t.string(),
			}),
			userName: io.dataOutput({
				id: "userName",
				name: "User Name",
				type: t.string(),
			}),
			userInput: io.dataOutput({
				id: "userInput",
				name: "User Input",
				type: t.string(),
			}),
			status: io.dataOutput({
				id: "status",
				name: "Status",
				type: t.string(),
			}),
			rewardId: io.dataOutput({
				id: "rewardId",
				name: "Reward Id",
				type: t.string(),
			}),
			rewardTitle: io.dataOutput({
				id: "rewardTitle",
				name: "Reward Title",
				type: t.string(),
			}),
			rewardCost: io.dataOutput({
				id: "rewardCost",
				name: "Reward Cost",
				type: t.int(),
			}),
			rewardPrompt: io.dataOutput({
				id: "rewardPrompt",
				name: "Reward Prompt",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.id);
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.userInput, data.user_input);
			ctx.setOutput(io.status, data.status);
			ctx.setOutput(io.rewardId, data.reward.id);
			ctx.setOutput(io.rewardTitle, data.reward.title);
			ctx.setOutput(io.rewardCost, data.reward.cost);
			ctx.setOutput(io.rewardPrompt, data.reward.prompt);
			return ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Shared Chat Begin",
		event: "channel.shared_chat.begin",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			session_id: io.dataOutput({
				id: "sessionId",
				name: "Session ID",
				type: t.string(),
			}),
			hostBroadcasterId: io.dataOutput({
				id: "hostBroadcasterId",
				name: "Host Broadcaster ID",
				type: t.string(),
			}),
			hostBroadcasterUserName: io.dataOutput({
				id: "hostBroadcasterUserName",
				name: "Host Broadcaster Username",
				type: t.string(),
			}),
			hostBroadcasterUserLogin: io.dataOutput({
				id: "hostBroadcasterUserLogin",
				name: "Host Broadcaster User Login",
				type: t.string(),
			}),
			participants: io.dataOutput({
				id: "participants",
				name: "Participants",
				type: t.list(t.struct(types.Participants)),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.hostBroadcasterId, data.host_broadcaster_user_id);
			ctx.setOutput(
				io.hostBroadcasterUserLogin,
				data.host_broadcaster_user_login,
			);
			ctx.setOutput(
				io.hostBroadcasterUserName,
				data.host_broadcaster_user_name,
			);
			ctx.setOutput(
				io.participants,
				data.participants.map((participant) =>
					types.Participants.create(participant),
				),
			);
			ctx.setOutput(io.session_id, data.session_id);
			return ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Shared Chat Update",
		event: "channel.shared_chat.update",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			session_id: io.dataOutput({
				id: "sessionId",
				name: "Session ID",
				type: t.string(),
			}),
			hostBroadcasterId: io.dataOutput({
				id: "hostBroadcasterId",
				name: "Host Broadcaster ID",
				type: t.string(),
			}),
			hostBroadcasterUserName: io.dataOutput({
				id: "hostBroadcasterUserName",
				name: "Host Broadcaster Username",
				type: t.string(),
			}),
			hostBroadcasterUserLogin: io.dataOutput({
				id: "hostBroadcasterUserLogin",
				name: "Host Broadcaster User Login",
				type: t.string(),
			}),
			participants: io.dataOutput({
				id: "participants",
				name: "Participants",
				type: t.list(t.struct(types.Participants)),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.hostBroadcasterId, data.host_broadcaster_user_id);
			ctx.setOutput(
				io.hostBroadcasterUserLogin,
				data.host_broadcaster_user_login,
			);
			ctx.setOutput(
				io.hostBroadcasterUserName,
				data.host_broadcaster_user_name,
			);
			ctx.setOutput(
				io.participants,
				data.participants.map((participant) =>
					types.Participants.create(participant),
				),
			);
			ctx.setOutput(io.session_id, data.session_id);
			return ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Shared Chat End",
		event: "channel.shared_chat.end",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			session_id: io.dataOutput({
				id: "sessionId",
				name: "Session ID",
				type: t.string(),
			}),
			hostBroadcasterId: io.dataOutput({
				id: "hostBroadcasterId",
				name: "Host Broadcaster ID",
				type: t.string(),
			}),
			hostBroadcasterUserName: io.dataOutput({
				id: "hostBroadcasterUserName",
				name: "Host Broadcaster Username",
				type: t.string(),
			}),
			hostBroadcasterUserLogin: io.dataOutput({
				id: "hostBroadcasterUserLogin",
				name: "Host Broadcaster User Login",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.hostBroadcasterId, data.host_broadcaster_user_id);
			ctx.setOutput(
				io.hostBroadcasterUserLogin,
				data.host_broadcaster_user_login,
			);
			ctx.setOutput(
				io.hostBroadcasterUserName,
				data.host_broadcaster_user_name,
			);
			ctx.setOutput(io.session_id, data.session_id);
			return ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Poll Begin",
		event: "channel.poll.begin",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			title: io.dataOutput({
				id: "title",
				name: "Title",
				type: t.string(),
			}),
			choices: io.dataOutput({
				id: "choices",
				name: "Choices",
				type: t.list(t.struct(types.PollBeginChoice)),
			}),
			channelPointVotingEnabled: io.dataOutput({
				id: "channelPointVotingEnabled",
				name: "Channel Point Voting Enabled",
				type: t.bool(),
			}),
			channelPointVotingCost: io.dataOutput({
				id: "channelPointVotingCost",
				name: "Channel Point Voting Cost",
				type: t.int(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(
				io.choices,
				data.choices.map((choice) => types.PollBeginChoice.create(choice)),
			);
			ctx.setOutput(
				io.channelPointVotingEnabled,
				data.channel_points_voting.is_enabled,
			);
			ctx.setOutput(
				io.channelPointVotingCost,
				data.channel_points_voting.amount_per_vote,
			);
			return ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Poll Progress",
		event: "channel.poll.progress",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				title: io.dataOutput({
					id: "title",
					name: "Title",
					type: t.string(),
				}),
				choices: io.dataOutput({
					id: "choices",
					name: "Choices",
					type: t.list(t.struct(types.PollChoice)),
				}),
				channelPointVotingEnabled: io.dataOutput({
					id: "channelPointVotingEnabled",
					name: "Channel Point Voting Enabled",
					type: t.bool(),
				}),
				channelPointVotingCost: io.dataOutput({
					id: "channelPointVotingCost",
					name: "Channel Point Voting Cost",
					type: t.int(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(io.choices, data.choices);
			ctx.setOutput(
				io.channelPointVotingEnabled,
				data.channel_points_voting.is_enabled,
			);
			ctx.setOutput(
				io.channelPointVotingCost,
				data.channel_points_voting.amount_per_vote,
			);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Poll End",
		event: "channel.poll.end",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				title: io.dataOutput({
					id: "title",
					name: "Title",
					type: t.string(),
				}),
				choices: io.dataOutput({
					id: "choices",
					name: "Choices",
					type: t.list(t.struct(types.PollChoice)),
				}),
				channelPointVotingEnabled: io.dataOutput({
					id: "channelPointVotingEnabled",
					name: "Channel Point Voting Enabled",
					type: t.bool(),
				}),
				channelPointVotingCost: io.dataOutput({
					id: "channelPointVotingCost",
					name: "Channel Point Voting Cost",
					type: t.int(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(io.choices, data.choices);
			ctx.setOutput(
				io.channelPointVotingEnabled,
				data.channel_points_voting.is_enabled,
			);
			ctx.setOutput(
				io.channelPointVotingCost,
				data.channel_points_voting.amount_per_vote,
			);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Prediction Begin",
		event: "channel.prediction.begin",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				title: io.dataOutput({
					id: "title",
					name: "Title",
					type: t.string(),
				}),
				outcomes: io.dataOutput({
					id: "outcomes",
					name: "Outcomes",
					type: t.list(t.struct(types.OutcomesBegin)),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(io.outcomes, data.outcomes);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Prediction Progress",
		event: "channel.prediction.progress",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				title: io.dataOutput({
					id: "title",
					name: "Title",
					type: t.string(),
				}),
				outcomes: io.dataOutput({
					id: "outcomes",
					name: "Outcomes",
					type: t.list(t.struct(types.OutcomesProgress)),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(
				io.outcomes,
				data.outcomes.map((outcome) =>
					types.OutcomesProgress.create({
						...outcome,
						top_predictors: outcome.top_predictors.map((predictor) =>
							types.TopPredictors.create({
								...predictor,
								channel_points_won: Maybe(predictor.channel_points_won),
							}),
						),
					}),
				),
			);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Prediction Lock",
		event: "channel.prediction.lock",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			title: io.dataOutput({
				id: "title",
				name: "Title",
				type: t.string(),
			}),
			outcomes: io.dataOutput({
				id: "outcomes",
				name: "Outcomes",
				type: t.list(t.struct(types.OutcomesProgress)),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(
				io.outcomes,
				data.outcomes.map((outcome) =>
					types.OutcomesProgress.create({
						...outcome,
						top_predictors: outcome.top_predictors.map((predictor) =>
							types.TopPredictors.create({
								...predictor,
								channel_points_won: Maybe(predictor.channel_points_won),
							}),
						),
					}),
				),
			);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Prediction End",
		event: "channel.prediction.end",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				title: io.dataOutput({
					id: "title",
					name: "Title",
					type: t.string(),
				}),
				outcomes: io.dataOutput({
					id: "outcomes",
					name: "Outcomes",
					type: t.list(t.struct(types.OutcomesProgress)),
				}),
				winningOutcomeId: io.dataOutput({
					id: "winningOutcomeId",
					name: "Winning Outcome ID",
					type: t.option(t.string()),
				}),
				status: io.dataOutput({
					id: "status",
					name: "Status",
					type: t.enum(types.PredictionStatus),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(
				io.outcomes,
				data.outcomes.map((outcome) =>
					types.OutcomesProgress.create({
						...outcome,
						top_predictors: outcome.top_predictors.map((predictor) =>
							types.TopPredictors.create({
								...predictor,
								channel_points_won: Maybe(predictor.channel_points_won),
							}),
						),
					}),
				),
			);
			ctx.setOutput(io.winningOutcomeId, Maybe(data.winning_outcome_id));
			ctx.setOutput(io.status, types.PredictionStatus.variant(data.status));
			ctx.exec(io.exec);
		},
	});

	const HypeTrainContributionTypeEnum = pkg.createEnum(
		"Hype Train Contribution Type",
		(e) => [e.variant("bits"), e.variant("subscription"), e.variant("other")],
	);

	const TopContribution = pkg.createStruct("Contribution", (s) => ({
		user_id: s.field("User ID", t.string()),
		user_login: s.field("User Login", t.string()),
		user_name: s.field("User Name", t.string()),
		type: s.field("Type", t.enum(HypeTrainContributionTypeEnum)),
		total: s.field("Total", t.int()),
	}));

	const LastContribute = pkg.createStruct("Contribution", (s) => ({
		user_id: s.field("User ID", t.string()),
		user_login: s.field("User Login", t.string()),
		user_name: s.field("User Name", t.string()),
		type: s.field("Type", t.enum(HypeTrainContributionTypeEnum)),
		total: s.field("Total", t.int()),
	}));

	createEventSubEventSchema({
		name: "Channel Hype Train Begin",
		event: "channel.hype_train.begin",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				total: io.dataOutput({
					id: "total",
					name: "Total",
					type: t.int(),
				}),
				progress: io.dataOutput({
					id: "progress",
					name: "Progress",
					type: t.int(),
				}),
				goal: io.dataOutput({
					id: "goal",
					name: "Goal",
					type: t.int(),
				}),
				topContributions: io.dataOutput({
					id: "topContributions",
					name: "Top Contributions",
					type: t.list(t.struct(TopContribution)),
				}),
				lastContribution: io.dataOutput({
					id: "lastContribution",
					name: "Last Contribution",
					type: t.struct(LastContribute),
				}),
				level: io.dataOutput({
					id: "level",
					name: "Level",
					type: t.int(),
				}),
			};
		},
		run({ ctx, data, io }) {
			const topContributions = data.top_contributions.map((contribution) =>
				TopContribution.create({
					user_id: contribution.user_id,
					user_login: contribution.user_login,
					user_name: contribution.user_name,
					total: contribution.total,
					type: HypeTrainContributionTypeEnum.variant(contribution.type),
				}),
			);
			ctx.setOutput(io.total, data.total);
			ctx.setOutput(io.progress, data.progress);
			ctx.setOutput(io.goal, data.goal);
			ctx.setOutput(io.level, data.level);
			ctx.setOutput(io.topContributions, topContributions);
			ctx.setOutput(
				io.lastContribution,
				LastContribute.create({
					user_id: data.last_contribution.user_id,
					user_login: data.last_contribution.user_login,
					user_name: data.last_contribution.user_name,
					total: data.last_contribution.total,
					type: HypeTrainContributionTypeEnum.variant(
						data.last_contribution.type,
					),
				}),
			);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Hype Train Progress",
		event: "channel.hype_train.progress",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				total: io.dataOutput({
					id: "total",
					name: "Total",
					type: t.int(),
				}),
				progress: io.dataOutput({
					id: "progress",
					name: "Progress",
					type: t.int(),
				}),
				goal: io.dataOutput({
					id: "goal",
					name: "Goal",
					type: t.int(),
				}),
				topContributions: io.dataOutput({
					id: "topContributions",
					name: "Top Contributions",
					type: t.list(t.struct(TopContribution)),
				}),
				lastContribution: io.dataOutput({
					id: "lastContribution",
					name: "Last Contribution",
					type: t.struct(LastContribute),
				}),
				level: io.dataOutput({
					id: "level",
					name: "Level",
					type: t.int(),
				}),
			};
		},
		run({ ctx, data, io }) {
			const topContributions = data.top_contributions.map((contribution) =>
				TopContribution.create({
					user_id: contribution.user_id,
					user_login: contribution.user_login,
					user_name: contribution.user_name,
					total: contribution.total,
					type: HypeTrainContributionTypeEnum.variant(contribution.type),
				}),
			);

			ctx.setOutput(io.total, data.total);
			ctx.setOutput(io.progress, data.progress);
			ctx.setOutput(io.goal, data.goal);
			ctx.setOutput(io.level, data.level);
			ctx.setOutput(io.topContributions, topContributions);
			ctx.setOutput(
				io.lastContribution,
				LastContribute.create({
					user_id: data.last_contribution.user_id,
					user_login: data.last_contribution.user_login,
					user_name: data.last_contribution.user_name,
					total: data.last_contribution.total,
					type: HypeTrainContributionTypeEnum.variant(
						data.last_contribution.type,
					),
				}),
			);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Hype Train End",
		event: "channel.hype_train.end",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				total: io.dataOutput({
					id: "total",
					name: "Total",
					type: t.int(),
				}),
				level: io.dataOutput({
					id: "level",
					name: "Level",
					type: t.int(),
				}),
				topContributions: io.dataOutput({
					id: "topContributions",
					name: "Top Contributions",
					type: t.list(t.struct(TopContribution)),
				}),
				cooldownEndsAt: io.dataOutput({
					id: "cooldownEndsAt",
					name: "CooldownEndsAt",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			const topContributions = data.top_contributions.map((contribution) =>
				TopContribution.create({
					user_id: contribution.user_id,
					user_login: contribution.user_login,
					user_name: contribution.user_name,
					total: contribution.total,
					type: HypeTrainContributionTypeEnum.variant(contribution.type),
				}),
			);

			ctx.setOutput(io.total, data.total);
			ctx.setOutput(io.level, data.level);
			ctx.setOutput(io.topContributions, topContributions);
			ctx.setOutput(io.cooldownEndsAt, data.cooldown_ends_at);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Updated",
		event: "channel.update",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				channelId: io.dataOutput({
					id: "channelId",
					name: "Channel ID",
					type: t.string(),
				}),
				channelLogin: io.dataOutput({
					id: "channelLogin",
					name: "Channel Name",
					type: t.string(),
				}),
				title: io.dataOutput({
					id: "title",
					name: "Title",
					type: t.string(),
				}),
				categoryId: io.dataOutput({
					id: "categoryId",
					name: "Category Id",
					type: t.string(),
				}),
				categoryName: io.dataOutput({
					id: "categoryName",
					name: "Category Name",
					type: t.string(),
				}),
				contentClassificationLabels: io.dataOutput({
					id: "contentClassificationLabels",
					name: "Classification Labels",
					type: t.list(t.string()),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.channelId, data.broadcaster_user_id);
			ctx.setOutput(io.channelLogin, data.broadcaster_user_login);
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(io.categoryId, data.category_id);
			ctx.setOutput(io.categoryName, data.category_name);
			ctx.setOutput(
				io.contentClassificationLabels,
				data.content_classification_labels,
			);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Subscribe",
		event: "channel.subscribe",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				userId: io.dataOutput({
					id: "userId",
					name: "userID",
					type: t.string(),
				}),
				userLogin: io.dataOutput({
					id: "userLogin",
					name: "Username",
					type: t.string(),
				}),
				tier: io.dataOutput({
					id: "tier",
					name: "Tier",
					type: t.string(),
				}),
				isGift: io.dataOutput({
					id: "isGift",
					name: "Gifted",
					type: t.bool(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.tier, data.tier);
			ctx.setOutput(io.isGift, data.is_gift);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Subscribe End",
		event: "channel.subscription.end",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				userId: io.dataOutput({
					id: "userId",
					name: "userID",
					type: t.string(),
				}),
				userLogin: io.dataOutput({
					id: "userLogin",
					name: "Username",
					type: t.string(),
				}),
				tier: io.dataOutput({
					id: "tier",
					name: "Tier",
					type: t.string(),
				}),
				isGift: io.dataOutput({
					id: "isGift",
					name: "Gifted",
					type: t.bool(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.tier, data.tier);
			ctx.setOutput(io.isGift, data.is_gift);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Subscription Gift",
		event: "channel.subscription.gift",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				userId: io.dataOutput({
					id: "userId",
					name: "userID",
					type: t.string(),
				}),
				userLogin: io.dataOutput({
					id: "userLogin",
					name: "Username",
					type: t.string(),
				}),
				tier: io.dataOutput({
					id: "tier",
					name: "Tier",
					type: t.string(),
				}),
				total: io.dataOutput({
					id: "total",
					name: "Total",
					type: t.int(),
				}),
				cumulative: io.dataOutput({
					id: "cumulative",
					name: "Cumulative Total",
					type: t.option(t.int()),
				}),
				anonymous: io.dataOutput({
					id: "anonymous",
					name: "Anonymous",
					type: t.bool(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.tier, data.tier);
			ctx.setOutput(io.total, data.total);
			ctx.setOutput(io.cumulative, Maybe(data.cumulative_total));
			ctx.setOutput(io.anonymous, data.is_anonymous);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Subscription Message",
		event: "channel.subscription.message",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				userId: io.dataOutput({
					id: "userId",
					name: "userID",
					type: t.string(),
				}),
				userLogin: io.dataOutput({
					id: "userLogin",
					name: "Username",
					type: t.string(),
				}),
				tier: io.dataOutput({
					id: "tier",
					name: "Tier",
					type: t.string(),
				}),
				message: io.dataOutput({
					id: "message",
					name: "Message",
					type: t.string(),
				}),
				streak: io.dataOutput({
					id: "streak",
					name: "Streak Months",
					type: t.option(t.int()),
				}),
				cumulative: io.dataOutput({
					id: "cumulative",
					name: "Cumulative Months",
					type: t.int(),
				}),
				duration: io.dataOutput({
					id: "duration",
					name: "Duration Months",
					type: t.int(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.tier, data.tier);
			ctx.setOutput(io.message, data.message.text);
			ctx.setOutput(io.cumulative, data.cumulative_months);
			ctx.setOutput(io.streak, Maybe(data.streak_months));
			ctx.setOutput(io.duration, data.duration_months);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Whisper Received",
		event: "user.whisper.message",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				fromUserId: io.dataOutput({
					id: "fromUserId",
					name: "From User ID",
					type: t.string(),
				}),
				fromUserLogin: io.dataOutput({
					id: "fromUserLogin",
					name: "From User Login",
					type: t.string(),
				}),
				fromUserName: io.dataOutput({
					id: "fromUserName",
					name: "From User Name",
					type: t.string(),
				}),
				whisperId: io.dataOutput({
					id: "whisperId",
					name: "Whisper ID",
					type: t.string(),
				}),
				whisperText: io.dataOutput({
					id: "whisperText",
					name: "Whisper Message",
					type: t.string(),
				}),
			};
		},
		run({ ctx, io, data }) {
			ctx.setOutput(io.fromUserId, data.from_user_id);
			ctx.setOutput(io.fromUserLogin, data.from_user_login);
			ctx.setOutput(io.fromUserName, data.from_user_name);
			ctx.setOutput(io.whisperId, data.whisper_id);
			ctx.setOutput(io.whisperText, data.whisper.text);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Cheers",
		event: "channel.cheer",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				userId: io.dataOutput({
					id: "userId",
					name: "userID",
					type: t.string(),
				}),
				userLogin: io.dataOutput({
					id: "userLogin",
					name: "Username",
					type: t.string(),
				}),
				displayName: io.dataOutput({
					id: "displayName",
					name: "Display Name",
					type: t.string(),
				}),
				anonymous: io.dataOutput({
					id: "anonymous",
					name: "Anonymous",
					type: t.bool(),
				}),
				message: io.dataOutput({
					id: "message",
					name: "Message",
					type: t.string(),
				}),
				bits: io.dataOutput({
					id: "bits",
					name: "Bits",
					type: t.int(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id ?? "Anonymous");
			ctx.setOutput(io.userLogin, data.user_login ?? "");
			ctx.setOutput(io.displayName, data.user_name ?? "");
			ctx.setOutput(io.anonymous, data.is_anonymous);
			ctx.setOutput(io.message, data.message);
			ctx.setOutput(io.bits, data.bits);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Raid",
		event: "channel.raid",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				userId: io.dataOutput({
					id: "userId",
					name: "userID",
					type: t.string(),
				}),
				userLogin: io.dataOutput({
					id: "userLogin",
					name: "Username",
					type: t.string(),
				}),
				viewers: io.dataOutput({
					id: "viewers",
					name: "Viewers",
					type: t.int(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.from_broadcaster_user_id);
			ctx.setOutput(io.userLogin, data.from_broadcaster_user_login);
			ctx.setOutput(io.viewers, data.viewers);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Ad Break Begin",
		event: "channel.ad_break.begin",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				length: io.dataOutput({
					id: "length",
					name: "Length (seconds)",
					type: t.int(),
				}),
				isAutomatic: io.dataOutput({
					id: "isAutomatic",
					name: "Automatic",
					type: t.bool(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.length, Number(data.duration_seconds));
			ctx.setOutput(io.isAutomatic, data.is_automatic);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "User Followed",
		event: "channel.follow",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				userId: io.dataOutput({
					id: "userID",
					name: "User ID",
					type: t.string(),
				}),
				userLogin: io.dataOutput({
					id: "userLogin",
					name: "Username",
					type: t.string(),
				}),
				username: io.dataOutput({
					id: "username",
					name: "Display Name",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.username, data.user_name);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Shoutout Received",
		event: "channel.shoutout.receive",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				viewerCount: io.dataOutput({
					id: "viewerCount",
					name: "Type",
					type: t.int(),
				}),
				startedAt: io.dataOutput({
					id: "startedAt",
					name: "Started At",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.viewerCount, data.viewer_count);
			ctx.setOutput(io.startedAt, data.started_at);

			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Goal Begin",
		event: "channel.goal.begin",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				id: io.dataOutput({
					id: "id",
					name: "Id",
					type: t.string(),
				}),
				type: io.dataOutput({
					id: "type",
					name: "Type",
					type: t.string(),
				}),
				description: io.dataOutput({
					id: "description",
					name: "Description",
					type: t.string(),
				}),
				currentAmount: io.dataOutput({
					id: "currentAmount",
					name: "Current Amount",
					type: t.int(),
				}),
				targetAmount: io.dataOutput({
					id: "targetAmount",
					name: "Target Amount",
					type: t.int(),
				}),
				startedAt: io.dataOutput({
					id: "startedAt",
					name: "Started At",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.id);
			ctx.setOutput(io.type, data.type);
			ctx.setOutput(io.description, data.description);
			ctx.setOutput(io.currentAmount, data.current_amount);
			ctx.setOutput(io.targetAmount, data.target_amount);
			ctx.setOutput(io.startedAt, data.started_at.toString());

			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Goal Progress",
		event: "channel.goal.progress",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				id: io.dataOutput({
					id: "id",
					name: "Id",
					type: t.string(),
				}),
				type: io.dataOutput({
					id: "type",
					name: "Type",
					type: t.string(),
				}),
				description: io.dataOutput({
					id: "description",
					name: "Description",
					type: t.string(),
				}),
				currentAmount: io.dataOutput({
					id: "currentAmount",
					name: "Current Amount",
					type: t.int(),
				}),
				targetAmount: io.dataOutput({
					id: "targetAmount",
					name: "Target Amount",
					type: t.int(),
				}),
				startedAt: io.dataOutput({
					id: "startedAt",
					name: "Started At",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.id);
			ctx.setOutput(io.type, data.type);
			ctx.setOutput(io.description, data.description);
			ctx.setOutput(io.currentAmount, data.current_amount);
			ctx.setOutput(io.targetAmount, data.target_amount);
			ctx.setOutput(io.startedAt, data.started_at.toString());

			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Goal End",
		event: "channel.goal.end",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				id: io.dataOutput({
					id: "id",
					name: "Id",
					type: t.string(),
				}),
				type: io.dataOutput({
					id: "type",
					name: "Type",
					type: t.string(),
				}),
				description: io.dataOutput({
					id: "description",
					name: "Description",
					type: t.string(),
				}),
				isAchieved: io.dataOutput({
					id: "isAchieved",
					name: "Is Achieved",
					type: t.bool(),
				}),
				currentAmount: io.dataOutput({
					id: "currentAmount",
					name: "Current Amount",
					type: t.int(),
				}),
				targetAmount: io.dataOutput({
					id: "targetAmount",
					name: "Target Amount",
					type: t.int(),
				}),
				startedAt: io.dataOutput({
					id: "startedAt",
					name: "Started At",
					type: t.string(),
				}),
				endedAt: io.dataOutput({
					id: "endedAt",
					name: "Ended At",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.id);
			ctx.setOutput(io.type, data.type);
			ctx.setOutput(io.description, data.description);
			ctx.setOutput(io.isAchieved, data.is_achieved);
			ctx.setOutput(io.currentAmount, data.current_amount);
			ctx.setOutput(io.targetAmount, data.target_amount);
			ctx.setOutput(io.startedAt, data.started_at.toString());
			ctx.setOutput(io.endedAt, data.ended_at.toString());

			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Stream Online",
		event: "stream.online",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				id: io.dataOutput({
					id: "id",
					name: "Id",
					type: t.string(),
				}),
				type: io.dataOutput({
					id: "type",
					name: "Type",
					type: t.string(),
				}),
				startedAt: io.dataOutput({
					id: "startedAt",
					name: "Started At",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.id);
			ctx.setOutput(io.type, data.type);
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Stream Offline",
		event: "stream.offline",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
			};
		},
		run({ ctx, io }) {
			ctx.exec(io.exec);
		},
	});

	const MessageType = pkg.createEnum("MessageType", (e) => [
		e.variant("Text", { value: t.string() }),
		e.variant("Channel Points Highlighted", { value: t.string() }),
		e.variant("Channel Points Sub Only", { value: t.string() }),
		e.variant("User Intro", { value: t.string() }),
		e.variant("Power Ups Message Effect", { value: t.string() }),
		e.variant("Power Ups Gigantified Emote", { value: t.string() }),
	]);

	const ReplyStruct = pkg.createStruct("Reply", (s) => ({
		parent_message_id: s.field("Parent Message Id", t.string()),
		parent_message_body: s.field("Parent Message Body", t.string()),
		parent_user_id: s.field("Parent User Id", t.string()),
		parent_user_name: s.field("Parent User Name", t.string()),
		parent_user_login: s.field("Parent User Login", t.string()),
		thread_message_id: s.field("Thread Message Id", t.string()),
		thread_user_id: s.field("Thread User Id", t.string()),
		thread_user_name: s.field("Thread User Name", t.string()),
		thread_user_login: s.field("Thread User Login", t.string()),
	}));

	createEventSubEventSchema({
		name: "Channel Chat Message",
		event: "channel.chat.message",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				chatterUserId: io.dataOutput({
					id: "chatterUserId",
					name: "Chatter User Id",
					type: t.string(),
				}),
				chatterUserName: io.dataOutput({
					id: "chatterUserName",
					name: "Chatter User Name",
					type: t.string(),
				}),
				chatterUserLogin: io.dataOutput({
					id: "chatterUserLogin",
					name: "Chatter User Login",
					type: t.string(),
				}),
				messageId: io.dataOutput({
					id: "messageId",
					name: "Message Id",
					type: t.string(),
				}),
				message: io.dataOutput({
					id: "message",
					name: "Message",
					type: t.struct(MessageStruct),
				}),
				messageType: io.dataOutput({
					id: "messageType",
					name: "Message Type",
					type: t.enum(MessageType),
				}),
				broadcaster: io.dataOutput({
					id: "broadcaster",
					name: "Broadcaster",
					type: t.bool(),
				}),
				moderator: io.dataOutput({
					id: "moderator",
					name: "Moderator",
					type: t.bool(),
				}),
				vip: io.dataOutput({
					id: "vip",
					name: "VIP",
					type: t.bool(),
				}),
				subscriber: io.dataOutput({
					id: "subscriber",
					name: "Subscriber",
					type: t.bool(),
				}),
				badges: io.dataOutput({
					id: "badges",
					name: "Badges",
					type: t.list(t.struct(BadgesStruct)),
				}),
				cheer: io.dataOutput({
					id: "cheer",
					name: "Cheer",
					type: t.option(t.int()),
				}),
				color: io.dataOutput({
					id: "color",
					name: "Color",
					type: t.string(),
				}),
				reply: io.dataOutput({
					id: "reply",
					name: "Reply",
					type: t.option(t.struct(ReplyStruct)),
				}),
				channelPointsCustomRewardId: io.dataOutput({
					id: "channelPointsCustomRewardId",
					name: "Channel Points Custom Reward Id",
					type: t.option(t.string()),
				}),
				sourceBroadcasterUserId: io.dataOutput({
					id: "sourceBroadcasterUserId",
					name: "Source Broadcaster User Id",
					type: t.option(t.string()),
				}),
				sourceBroadcasterUserName: io.dataOutput({
					id: "sourceBroadcasterUserName",
					name: "Source Broadcaster User Name",
					type: t.option(t.string()),
				}),
				sourceBroadcasterUserLogin: io.dataOutput({
					id: "sourceBroadcasterUserLogin",
					name: "Source Broadcaster User Login",
					type: t.option(t.string()),
				}),
				sourceMessageId: io.dataOutput({
					id: "sourceMessageId",
					name: "Source Message Id",
					type: t.option(t.string()),
				}),
				sourceBadges: io.dataOutput({
					id: "sourceBadges",
					name: "Source Badges",
					type: t.option(t.list(t.struct(BadgesStruct))),
				}),
				isSourceOnly: io.dataOutput({
					id: "isSourceOnly",
					name: "Is Source Only",
					type: t.option(t.bool()),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.chatterUserId, data.chatter_user_id);
			ctx.setOutput(io.chatterUserLogin, data.chatter_user_login);
			ctx.setOutput(io.chatterUserName, data.chatter_user_name);
			ctx.setOutput(io.messageId, data.message_id);
			ctx.setOutput(
				io.message,
				MessageStruct.create({
					text: data.message.text,
					fragments: data.message.fragments.map((fragment) =>
						FragmentsStruct.create({
							type: fragment.type,
							text: fragment.text,
							emote: Maybe(fragment.emote).map((emote) =>
								EmoteStruct.create({
									id: emote.id,
									emote_set_id: emote.emote_set_id,
									owner_id: emote.owner_id,
									format: emote.format,
								}),
							),
							cheermote: Maybe(fragment.cheermote).map((cheermote) =>
								CheermoteStruct.create({
									prefix: cheermote.prefix,
									bits: cheermote.bits,
									tier: cheermote.tier,
								}),
							),
							mention: Maybe(fragment.mention).map((mention) =>
								MentionStruct.create({
									user_id: mention.user_id,
									user_login: mention.user_login,
									user_name: mention.user_name,
								}),
							),
						}),
					),
				}),
			);
			ctx.setOutput(
				io.messageType,
				(() => {
					switch (data.message_type) {
						case "text": {
							return MessageType.variant(["Text", { value: "text" }]);
						}
						case "channel_points_highlighted": {
							return MessageType.variant([
								"Channel Points Highlighted",
								{ value: "channel_points_highlighted" },
							]);
						}
						case "channel_points_sub_only": {
							return MessageType.variant([
								"Channel Points Sub Only",
								{ value: "channel_points_sub_only" },
							]);
						}
						case "power_ups_gigantified_emote": {
							return MessageType.variant([
								"Power Ups Gigantified Emote",
								{ value: "power_ups_gigantified_emote" },
							]);
						}
						case "power_ups_message_effect": {
							return MessageType.variant([
								"Power Ups Message Effect",
								{ value: "power_ups_message_effect" },
							]);
						}
						case "user_intro": {
							return MessageType.variant([
								"User Intro",
								{ value: "user_intro" },
							]);
						}
					}
				})(),
			);
			ctx.setOutput(
				io.badges,
				data.badges.map((badge) =>
					BadgesStruct.create({
						set_id: badge.set_id,
						id: badge.id,
						info: badge.info,
					}),
				),
			);
			ctx.setOutput(
				io.reply,
				Maybe(data.reply).map((reply) =>
					ReplyStruct.create({
						parent_message_id: reply.parent_message_id,
						parent_message_body: reply.parent_message_body,
						parent_user_id: reply.parent_user_id,
						parent_user_login: reply.parent_user_login,
						parent_user_name: reply.parent_user_name,
						thread_message_id: reply.thread_message_id,
						thread_user_id: reply.thread_user_id,
						thread_user_login: reply.thread_user_login,
						thread_user_name: reply.thread_user_name,
					}),
				),
			);
			ctx.setOutput(io.cheer, Maybe(data.cheer?.bits));
			ctx.setOutput(io.color, data.color);
			ctx.setOutput(
				io.channelPointsCustomRewardId,
				Maybe(data.channel_points_custom_reward_id),
			);
			ctx.setOutput(
				io.sourceBroadcasterUserId,
				Maybe(data.source_broadcaster_user_id),
			);
			ctx.setOutput(
				io.sourceBroadcasterUserLogin,
				Maybe(data.source_broadcaster_user_login),
			);
			ctx.setOutput(
				io.sourceBroadcasterUserName,
				Maybe(data.source_broadcaster_user_name),
			);
			ctx.setOutput(io.sourceMessageId, Maybe(data.source_message_id));
			ctx.setOutput(
				io.sourceBadges,
				Maybe(data.source_badges).map((badges) =>
					badges.map((badge) =>
						BadgesStruct.create({
							set_id: badge.set_id,
							id: badge.id,
							info: badge.info,
						}),
					),
				),
			);
			ctx.setOutput(
				io.broadcaster,
				data.badges.some((badge) => badge.set_id === "broadcaster"),
			);
			ctx.setOutput(
				io.moderator,
				data.badges.some((badge) => badge.set_id === "moderator"),
			);
			ctx.setOutput(
				io.subscriber,
				data.badges.some((badge) => badge.set_id === "subscriber"),
			);
			ctx.setOutput(
				io.vip,
				data.badges.some((badge) => badge.set_id === "vip"),
			);
			ctx.setOutput(io.isSourceOnly, Maybe(data.is_source_only));
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Chat Clear User Messages",
		event: "channel.chat.clear_user_messages",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				targetUserId: io.dataOutput({
					id: "targetUserId",
					name: "User ID",
					type: t.string(),
				}),
				targetUserName: io.dataOutput({
					id: "targetUserName",
					name: "UserName",
					type: t.string(),
				}),
				targetUserLogin: io.dataOutput({
					id: "targetUserLogin",
					name: "User Login",
					type: t.string(),
				}),
			};
		},
		run({ ctx, io, data }) {
			ctx.setOutput(io.targetUserId, data.target_user_id);
			ctx.setOutput(io.targetUserName, data.target_user_name);
			ctx.setOutput(io.targetUserLogin, data.target_user_login);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Chat Message Deleted Eventsub",
		event: "channel.chat.message_delete",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
				targetUserId: io.dataOutput({
					id: "targetUserId",
					name: "User ID",
					type: t.string(),
				}),
				targetUserName: io.dataOutput({
					id: "targetUserName",
					name: "UserName",
					type: t.string(),
				}),
				targetUserLogin: io.dataOutput({
					id: "targetUserLogin",
					name: "User Login",
					type: t.string(),
				}),
				messageId: io.dataOutput({
					id: "messageId",
					name: "Message ID",
					type: t.string(),
				}),
			};
		},
		run({ ctx, io, data }) {
			ctx.setOutput(io.targetUserId, data.target_user_id);
			ctx.setOutput(io.targetUserName, data.target_user_name);
			ctx.setOutput(io.targetUserLogin, data.target_user_login);
			ctx.setOutput(io.messageId, data.message_id);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Chat Clear",
		event: "channel.chat.clear",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
				}),
			};
		},
		run({ ctx, io }) {
			ctx.exec(io.exec);
		},
	});

	const SubStruct = pkg.createStruct("Sub", (s) => ({
		sub_Tier: s.field("Sub Tier", t.string()),
		is_prime: s.field("Is Prime", t.bool()),
		duration_months: s.field("Duration Months", t.int()),
	}));

	const ReSubStruct = pkg.createStruct("Resub", (s) => ({
		sub_tier: s.field("Sub Tier", t.string()),
		is_prime: s.field("Is Prime", t.bool()),
		is_gift: s.field("Is Gift", t.bool()),
		cumulative_months: s.field("Cumulative Months", t.int()),
		duration_months: s.field("Duration Months", t.int()),
		streak_months: s.field("Streak Months", t.int()),
		gifter_is_anonymous: s.field("Anonymous Gifter", t.option(t.bool())),
		gifter_user_name: s.field("Gifter UserName", t.option(t.string())),
		gifter_user_id: s.field("Gifter User ID", t.option(t.string())),
		gifter_user_login: s.field("Gifter User Login", t.option(t.string())),
	}));

	const SubGiftStruct = pkg.createStruct("Gift Sub", (s) => ({
		sub_tier: s.field("Sub Tier", t.string()),
		cumulative_total: s.field("Cumulative Months", t.option(t.int())),
		duration_months: s.field("Duration Months", t.int()),
		recipient_user_name: s.field("Recipient UserName", t.string()),
		recipient_user_id: s.field("Recipient User ID", t.string()),
		recipient_user_login: s.field("Recipient User Login", t.string()),
		community_gift_id: s.field("Community Gift ID", t.option(t.string())),
	}));

	const CommunitySubGiftStruct = pkg.createStruct(
		"Community Gift Sub",
		(s) => ({
			sub_tier: s.field("Sub Tier", t.string()),
			id: s.field("ID", t.string()),
			total: s.field("Total", t.int()),
			cumulative_total: s.field("Cumulative Total", t.option(t.int())),
		}),
	);

	const GiftPaidUpgradeStruct = pkg.createStruct("Gift Paid Upgrade", (s) => ({
		gifter_is_anonymous: s.field("Gifter Is Anonymous", t.bool()),
		gifter_user_id: s.field("Gifter User ID", t.option(t.string())),
		gifter_user_name: s.field("Gifter UserName", t.option(t.string())),
		gifter_user_login: s.field("Gifter User Login", t.option(t.string())),
	}));

	const RaidStruct = pkg.createStruct("Raid", (s) => ({
		user_id: s.field("User ID", t.string()),
		user_name: s.field("UserName", t.string()),
		user_login: s.field("User Login", t.string()),
		viewer_count: s.field("Viewer Count", t.int()),
		profile_image_url: s.field("Profile Image URL", t.string()),
	}));

	const PayItForwardStruct = pkg.createStruct("Pay It Forward", (s) => ({
		gifter_is_anonymous: s.field("Gifter Is Anonymous", t.bool()),
		gifter_user_id: s.field("Gifter User ID", t.option(t.string())),
		gifter_user_name: s.field("Gifter UserName", t.option(t.string())),
		gifter_user_login: s.field("Gifter UserLogin", t.option(t.string())),
	}));

	const AmountStruct = pkg.createStruct("Amount", (s) => ({
		value: s.field("Value", t.int()),
		decimal_places: s.field("Decimal Places", t.int()),
		currency: s.field("Currency", t.string()),
	}));

	const CharityDonationStruct = pkg.createStruct("Charity Donation", (s) => ({
		charity_name: s.field("Charity Name", t.string()),
		amount: s.field("Gifter User ID", t.struct(AmountStruct)),
	}));

	const BroadcasterInfoStruct = pkg.createStruct("Broadcaster", (s) => ({
		broadcaster_user_id: s.field("User ID", t.string()),
		broadcaster_user_name: s.field("UserName", t.string()),
		broadcaster_user_login: s.field("User Login", t.string()),
	}));

	const EmoteStruct = pkg.createStruct("Emote", (s) => ({
		id: s.field("ID", t.string()),
		emote_set_id: s.field("Emote Set ID", t.string()),
		owner_id: s.field("Owner ID", t.string()),
		format: s.field("Format", t.list(t.string())),
	}));

	const MentionStruct = pkg.createStruct("Mention", (s) => ({
		user_id: s.field("User ID", t.string()),
		user_name: s.field("UserName", t.string()),
		user_login: s.field("User Login", t.string()),
	}));

	const CheermoteStruct = pkg.createStruct("Cheermote", (s) => ({
		prefix: s.field("Prefix", t.string()),
		bits: s.field("Bits", t.int()),
		tier: s.field("Tier", t.int()),
	}));

	const FragmentsStruct = pkg.createStruct("MessageFragment", (s) => ({
		type: s.field("Type", t.string()),
		text: s.field("Text", t.string()),
		cheermote: s.field("Cheermote", t.option(t.struct(CheermoteStruct))),
		emote: s.field("Emote", t.option(t.struct(EmoteStruct))),
		mention: s.field("Mention", t.option(t.struct(MentionStruct))),
	}));

	const BadgesStruct = pkg.createStruct("Badges", (s) => ({
		set_id: s.field("Set ID", t.string()),
		id: s.field("ID", t.string()),
		info: s.field("Info", t.string()),
	}));

	const MessageStruct = pkg.createStruct("Message", (s) => ({
		text: s.field("Text", t.string()),
		fragments: s.field("Fragments", t.list(t.struct(FragmentsStruct))),
	}));

	interface Badge {
		set_id: string;
		id: string;
		info: string;
	}

	interface Fragment {
		type: string;
		text: string;
		cheermote: Cheermote | null;
		emote: Emote | null;
		mention: Mention | null;
	}

	interface Cheermote {
		prefix: string;
		bits: number;
		tier: number;
	}

	interface Emote {
		id: string;
		emote_set_id: string;
		owner_id: string;
		format: string[];
	}

	interface Mention {
		user_id: string;
		user_name: string;
		user_login: string;
	}

	const ChannelChatNotificationEnum = pkg.createEnum(
		"Channel Chat Notification",
		(e) => [
			e.variant("Sub", {
				value: t.struct(SubStruct),
			}),
			e.variant("Resub", {
				value: t.struct(ReSubStruct),
			}),
			e.variant("Sub Gift", {
				value: t.struct(SubGiftStruct),
			}),
			e.variant("Community Sub Gift", {
				value: t.struct(CommunitySubGiftStruct),
			}),
			e.variant("Gift Paid Upgrade", {
				value: t.struct(GiftPaidUpgradeStruct),
			}),
			e.variant("Prime Paid Upgrade", {
				value: t.string(),
			}),
			e.variant("Raid", {
				value: t.struct(RaidStruct),
			}),
			e.variant("Pay It Forward", {
				value: t.struct(PayItForwardStruct),
			}),
			e.variant("Announcement", {
				value: t.string(),
			}),
			e.variant("Charity Donation", {
				value: t.struct(CharityDonationStruct),
			}),
			e.variant("Bits Badge Tier", {
				value: t.int(),
			}),
		],
	);

	createEventSubEventSchema({
		name: "Channel Chat Notification",
		event: "channel.chat.notification",
		createIO: ({ io }) => ({
			exec: io.execOutput({
				id: "exec",
			}),
			broadcaster: io.dataOutput({
				id: "broadcaster",
				name: "Broadcaster",
				type: t.struct(BroadcasterInfoStruct),
			}),
			chatter: io.dataOutput({
				id: "chatter",
				name: "Chatter",
				type: t.struct(types.Chatter),
			}),
			chatterIsAnonymous: io.dataOutput({
				id: "chatterAnonymous",
				name: "Chatter is Anonymous",
				type: t.bool(),
			}),
			color: io.dataOutput({
				id: "color",
				name: "Color",
				type: t.string(),
			}),
			badges: io.dataOutput({
				id: "badges",
				name: "Badges",
				type: t.list(t.struct(BadgesStruct)),
			}),
			systemMessage: io.dataOutput({
				id: "systemMessage",
				name: "System Message",
				type: t.string(),
			}),
			message_id: io.dataOutput({
				id: "messageid",
				name: "Message ID",
				type: t.string(),
			}),
			message: io.dataOutput({
				id: "message",
				name: "Message",
				type: t.struct(MessageStruct),
			}),
			noticeType: io.dataOutput({
				id: "noticeType",
				name: "Notice Type",
				type: t.string(),
			}),
			notice: io.dataOutput({
				id: "notice",
				name: "Notice",
				type: t.enum(ChannelChatNotificationEnum),
			}),
		}),
		run({ ctx, io, data }) {
			ctx.setOutput(io.chatterIsAnonymous, data.chatter_is_anonymous);
			ctx.setOutput(io.color, data.color);
			ctx.setOutput(io.message_id, data.message_id);
			ctx.setOutput(io.noticeType, data.notice_type);
			ctx.setOutput(
				io.broadcaster,
				BroadcasterInfoStruct.create({
					broadcaster_user_id: data.broadcaster_user_id,
					broadcaster_user_name: data.broadcaster_user_name,
					broadcaster_user_login: data.broadcaster_user_login,
				}),
			);
			ctx.setOutput(
				io.chatter,
				types.Chatter.create({
					user_id: data.chatter_user_id,
					user_name: data.chatter_user_name,
					user_login: data.chatter_user_login,
				}),
			);
			ctx.setOutput(
				io.badges,
				(data.badges as Badge[]).map((badge) =>
					BadgesStruct.create({
						set_id: badge.set_id,
						id: badge.id,
						info: badge.info,
					}),
				),
			);

			ctx.setOutput(
				io.message,
				MessageStruct.create({
					text: data.message.text,
					fragments: (data.message.fragments as Fragment[]).map((fragment) =>
						FragmentsStruct.create({
							type: Maybe(fragment.type),
							text: Maybe(fragment.text),
							cheermote: Maybe(fragment.cheermote).map((cheermote) =>
								CheermoteStruct.create({
									prefix: cheermote.prefix,
									bits: cheermote.bits,
									tier: cheermote.tier,
								}),
							),
							emote: Maybe(fragment.emote).map((emote) =>
								EmoteStruct.create({
									id: emote.id,
									emote_set_id: emote.emote_set_id,
									owner_id: emote.owner_id,
									format: emote.format,
								}),
							),
							mention: Maybe(fragment.mention).map((mention) =>
								MentionStruct.create({
									user_id: mention.user_id,
									user_name: mention.user_name,
									user_login: mention.user_login,
								}),
							),
						}),
					),
				}),
			);

			ctx.setOutput(
				io.notice,
				(() => {
					switch (data.notice_type) {
						case "sub": {
							return ChannelChatNotificationEnum.variant([
								"Sub",
								{
									value: {
										sub_Tier: data.sub!.sub_tier,
										is_prime: data.sub!.is_prime,
										duration_months: data.sub!.duration_months,
									},
								},
							]);
						}
						case "resub": {
							return ChannelChatNotificationEnum.variant([
								"Resub",
								{
									value: {
										cumulative_months: data.resub!.cumulative_months,
										duration_months: data.resub!.duration_months,
										streak_months: data.resub!.streak_months,
										sub_tier: data.resub!.sub_tier,
										is_prime: data.resub!.is_prime,
										is_gift: data.resub!.is_gift,
										gifter_is_anonymous: Maybe(data.resub!.gifter_is_anonymous),
										gifter_user_id: Maybe(data.resub!.gifter_user_id),
										gifter_user_name: Maybe(data.resub!.gifter_user_name),
										gifter_user_login: Maybe(data.resub!.gifter_user_login),
									},
								},
							]);
						}
						case "sub_gift": {
							return ChannelChatNotificationEnum.variant([
								"Sub Gift",
								{
									value: {
										cumulative_total: Maybe(data.sub_gift!.cumulative_total),
										duration_months: data.sub_gift!.duration_months,
										sub_tier: data.sub_gift!.sub_tier,
										recipient_user_id: data.sub_gift!.recipient_user_id,
										recipient_user_name: data.sub_gift!.recipient_user_name,
										recipient_user_login: data.sub_gift!.recipient_user_login,
										community_gift_id: Maybe(data.sub_gift!.community_gift_id),
									},
								},
							]);
						}
						case "community_sub_gift": {
							return ChannelChatNotificationEnum.variant([
								"Community Sub Gift",
								{
									value: {
										id: data.community_sub_gift!.id,
										total: data.community_sub_gift!.total,
										sub_tier: data.community_sub_gift!.sub_tier,
										cumulative_total: Maybe(
											data.community_sub_gift!.cumulative_total,
										),
									},
								},
							]);
						}
						case "gift_paid_upgrade": {
							return ChannelChatNotificationEnum.variant([
								"Gift Paid Upgrade",
								{
									value: {
										gifter_is_anonymous:
											data.gift_paid_upgrade!.gifter_is_anonymous,
										gifter_user_id: Maybe(
											data.gift_paid_upgrade!.gifter_user_id,
										),
										gifter_user_name: Maybe(
											data.gift_paid_upgrade!.gifter_user_name,
										),
										gifter_user_login: Maybe(
											data.gift_paid_upgrade!.gifter_user_login,
										),
									},
								},
							]);
						}
						case "prime_paid_upgrade": {
							return ChannelChatNotificationEnum.variant([
								"Prime Paid Upgrade",
								{
									value: data.prime_paid_upgrade!.sub_tier,
								},
							]);
						}
						case "raid": {
							return ChannelChatNotificationEnum.variant([
								"Raid",
								{
									value: {
										user_id: data.raid!.user_id,
										user_name: data.raid!.user_name,
										user_login: data.raid!.user_login,
										viewer_count: data.raid!.viewer_count,
										profile_image_url: data.raid!.profile_image_url,
									},
								},
							]);
						}
						case "charity_donation": {
							return ChannelChatNotificationEnum.variant([
								"Charity Donation",
								{
									value: {
										charity_name: data.charity_donation!.charity_name,
										amount: AmountStruct.create({
											value: data.charity_donation!.amount.value,
											decimal_places:
												data.charity_donation!.amount.decimal_places,
											currency: data.charity_donation!.amount.currency,
										}),
									},
								},
							]);
						}
						case "bits_badge_tier": {
							return ChannelChatNotificationEnum.variant([
								"Bits Badge Tier",
								{
									value: data.bits_badge_tier!.tier,
								},
							]);
						}
						case "announcement": {
							return ChannelChatNotificationEnum.variant([
								"Announcement",
								{ value: data.announcement!.color },
							]);
						}
						default: {
							throw new Error(`Unknown notice type "${data.notice_type}"`);
						}
					}
				})(),
			);
			ctx.exec(io.exec);
		},
	});
}

const SubTypes = [
	"channel.update",
	"channel.follow",
	"channel.ad_break.begin",
	"channel.chat.clear",
	"channel.chat.notification",
	"channel.chat.message_delete",
	"channel.shared_chat.begin",
	"channel.shared_chat.update",
	"channel.shared_chat.end",
	"channel.chat.clear_user_messages",
	"channel.chat.message",
	"channel.subscribe",
	"channel.subscription.end",
	"channel.subscription.gift",
	"channel.subscription.message",
	"channel.cheer",
	"channel.raid",
	"channel.ban",
	"channel.unban",
	"channel.moderator.add",
	"channel.moderator.remove",
	"channel.channel_points_custom_reward.add",
	"channel.channel_points_custom_reward.update",
	"channel.channel_points_custom_reward.remove",
	"channel.channel_points_custom_reward_redemption.add",
	"channel.channel_points_custom_reward_redemption.update",
	"channel.channel_points_automatic_reward_redemption.add",
	"channel.poll.begin",
	"channel.poll.progress",
	"channel.poll.end",
	"channel.prediction.begin",
	"channel.prediction.progress",
	"channel.prediction.lock",
	"channel.prediction.end",
	"channel.goal.begin",
	"channel.goal.progress",
	"channel.goal.end",
	"channel.hype_train.begin",
	"channel.hype_train.progress",
	"channel.hype_train.end",
	"channel.shield_mode.begin",
	"channel.shield_mode.end",
	"channel.shoutout.create",
	"channel.shoutout.receive",
	"stream.online",
	"stream.offline",
	"user.whisper.message",
];
