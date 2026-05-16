import { Maybe } from "@macrograph/option";
import {
	getRemoteShellMode,
	type Core,
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

/** Subscriptions created for each EventSub WebSocket session (`type` + `version`). */
const EVENTSUB_SUBSCRIPTIONS: { type: string; version: string }[] = [
	{ type: "automod.message.hold", version: "1" },
	{ type: "automod.message.hold", version: "2" },
	{ type: "automod.message.update", version: "1" },
	{ type: "automod.message.update", version: "2" },
	{ type: "automod.settings.update", version: "1" },
	{ type: "automod.terms.update", version: "1" },
	{ type: "channel.ad_break.begin", version: "1" },
	{ type: "channel.ban", version: "1" },
	{ type: "channel.bits.use", version: "1" },
	{ type: "channel.channel_points_automatic_reward_redemption.add", version: "1" },
	{ type: "channel.channel_points_custom_reward.add", version: "1" },
	{ type: "channel.channel_points_custom_reward.remove", version: "1" },
	{ type: "channel.channel_points_custom_reward.update", version: "1" },
	{ type: "channel.channel_points_custom_reward_redemption.add", version: "1" },
	{ type: "channel.channel_points_custom_reward_redemption.update", version: "1" },
	{ type: "channel.chat.clear", version: "1" },
	{ type: "channel.chat.clear_user_messages", version: "1" },
	{ type: "channel.chat.message", version: "1" },
	{ type: "channel.chat.message_delete", version: "1" },
	{ type: "channel.chat.notification", version: "1" },
	{ type: "channel.cheer", version: "1" },
	{ type: "channel.custom_power_up_redemption.add", version: "beta" },
	{ type: "channel.follow", version: "2" },
	{ type: "channel.goal.begin", version: "1" },
	{ type: "channel.goal.end", version: "1" },
	{ type: "channel.goal.progress", version: "1" },
	{ type: "channel.guest_star_guest.update", version: "beta" },
	{ type: "channel.guest_star_session.begin", version: "beta" },
	{ type: "channel.guest_star_session.end", version: "beta" },
	{ type: "channel.guest_star_settings.update", version: "beta" },
	{ type: "channel.hype_train.begin", version: "2" },
	{ type: "channel.hype_train.end", version: "2" },
	{ type: "channel.hype_train.progress", version: "2" },
	{ type: "channel.moderate", version: "1" },
	{ type: "channel.moderate", version: "2" },
	{ type: "channel.moderator.add", version: "1" },
	{ type: "channel.moderator.remove", version: "1" },
	{ type: "channel.poll.begin", version: "1" },
	{ type: "channel.poll.end", version: "1" },
	{ type: "channel.poll.progress", version: "1" },
	{ type: "channel.prediction.begin", version: "1" },
	{ type: "channel.prediction.end", version: "1" },
	{ type: "channel.prediction.lock", version: "1" },
	{ type: "channel.prediction.progress", version: "1" },
	{ type: "channel.raid", version: "1" },
	{ type: "channel.shared_chat.begin", version: "1" },
	{ type: "channel.shared_chat.end", version: "1" },
	{ type: "channel.shared_chat.update", version: "1" },
	{ type: "channel.shield_mode.begin", version: "1" },
	{ type: "channel.shield_mode.end", version: "1" },
	{ type: "channel.shoutout.create", version: "1" },
	{ type: "channel.shoutout.receive", version: "1" },
	{ type: "channel.subscription.end", version: "1" },
	{ type: "channel.subscription.gift", version: "1" },
	{ type: "channel.subscription.message", version: "1" },
	{ type: "channel.subscribe", version: "1" },
	{ type: "channel.unban", version: "1" },
	{ type: "channel.update", version: "2" },
	{ type: "channel.vip.add", version: "1" },
	{ type: "channel.vip.remove", version: "1" },
	{ type: "channel.warning.acknowledge", version: "1" },
	{ type: "channel.warning.send", version: "1" },
	{ type: "stream.offline", version: "1" },
	{ type: "stream.online", version: "1" },
	{ type: "user.whisper.message", version: "1" },
];

export function createEventSub(
	core: Core,
	helixClient: Helix,
	isEventSubDesired: (userId: string) => boolean,
) {
	const listenerTargets = new Map<string, EventTarget>();
	const sessions = new ReactiveMap<
		string,
		{ status: "idle" | "connecting" | "live" }
	>();
	const connecting = new Set<string>();
	const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const keepaliveTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const reconnectAttempt = new Map<string, number>();

	/** Sockets we still own (primary and optional in-flight reconnect socket). */
	const activeSockets = new Map<string, Set<WebSocket>>();

	function relayFor(userId: string) {
		let t = listenerTargets.get(userId);
		if (!t) {
			t = new EventTarget();
			listenerTargets.set(userId, t);
		}
		return t;
	}

	function emitToListeners(userId: string, raw: string) {
		relayFor(userId).dispatchEvent(new MessageEvent("message", { data: raw }));
	}

	function clearReconnectTimer(userId: string) {
		const id = reconnectTimers.get(userId);
		if (id !== undefined) {
			clearTimeout(id);
			reconnectTimers.delete(userId);
		}
	}

	function clearKeepaliveTimer(userId: string) {
		const id = keepaliveTimers.get(userId);
		if (id !== undefined) {
			clearTimeout(id);
			keepaliveTimers.delete(userId);
		}
	}

	function armKeepaliveWatchdog(userId: string, timeoutSec: number) {
		clearKeepaliveTimer(userId);
		const ms = Math.max(10, timeoutSec) * 1000 + 2500;
		keepaliveTimers.set(
			userId,
			setTimeout(() => {
				if (!isEventSubDesired(userId)) return;
				const s = sessions.get(userId);
				if (s?.status !== "live") return;
				for (const ws of activeSockets.get(userId) ?? []) {
					if (ws.readyState === WebSocket.OPEN) ws.close();
				}
			}, ms),
		);
	}

	function bumpSession(userId: string, patch: Partial<{ status: "idle" | "connecting" | "live" }>) {
		const prev = sessions.get(userId) ?? { status: "idle" as const };
		sessions.set(userId, { ...prev, ...patch });
	}

	function backoffMs(userId: string) {
		const n = reconnectAttempt.get(userId) ?? 0;
		reconnectAttempt.set(userId, Math.min(16, n + 1));
		return Math.min(60_000, 1000 * 2 ** n);
	}

	function resetBackoff(userId: string) {
		reconnectAttempt.delete(userId);
	}

	function scheduleReconnect(userId: string) {
		if (!isEventSubDesired(userId)) return;
		clearReconnectTimer(userId);
		reconnectTimers.set(
			userId,
			setTimeout(() => {
				reconnectTimers.delete(userId);
				void connectSocket(userId);
			}, backoffMs(userId)),
		);
	}

	function trackSocket(userId: string, ws: WebSocket) {
		let set = activeSockets.get(userId);
		if (!set) {
			set = new Set();
			activeSockets.set(userId, set);
		}
		set.add(ws);
	}

	function forgetSocket(userId: string, ws: WebSocket) {
		const set = activeSockets.get(userId);
		if (!set) return;
		set.delete(ws);
		if (set.size === 0) activeSockets.delete(userId);
	}

	async function subscribeAll(
		credential: NonNullable<Awaited<ReturnType<Core["getCredential"]>>>,
		userId: string,
		sessionId: string,
	) {
		await Promise.allSettled(
			EVENTSUB_SUBSCRIPTIONS.map(({ type, version }) =>
				helixClient.call("POST /eventsub/subscriptions", credential, {
					body: JSON.stringify({
						type,
						version,
						condition: {
							broadcaster_user_id: userId,
							moderator_user_id: userId,
							to_broadcaster_user_id: userId,
							user_id: userId,
						},
						transport: {
							method: "websocket",
							session_id: sessionId,
						},
					}),
				}),
			),
		);
	}

	function isLive(userId: string) {
		return sessions.get(userId)?.status === "live";
	}

	function isConnecting(userId: string) {
		return (
			connecting.has(userId) ||
			sessions.get(userId)?.status === "connecting" ||
			reconnectTimers.has(userId)
		);
	}

	function getListenerTarget(userId: string): EventTarget | undefined {
		if (!isEventSubDesired(userId)) return undefined;
		return relayFor(userId);
	}

	async function connectSocket(userId: string): Promise<void> {
		if (getRemoteShellMode()) return;
		if (!isEventSubDesired(userId)) return;
		const credential = await core.getCredential("twitch", userId);
		if (!credential) return;
		if (isLive(userId)) return;
		if (connecting.has(userId)) return;

		connecting.add(userId);
		bumpSession(userId, { status: "connecting" });
		clearReconnectTimer(userId);

		await new Promise<void>((resolve, reject) => {
			const ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
			trackSocket(userId, ws);
			let settled = false;
			let keepaliveSec = 10;
			let migrationSocket: WebSocket | null = null;

			const finish = (err?: Error) => {
				if (settled) return;
				settled = true;
				connecting.delete(userId);
				if (err) reject(err);
				else resolve();
			};

			const attachLiveSocketClose = (live: WebSocket) => {
				live.onclose = () => {
					forgetSocket(userId, live);
					clearKeepaliveTimer(userId);
					if (sessions.get(userId)?.status === "live")
						bumpSession(userId, { status: "connecting" });
					if (isEventSubDesired(userId)) scheduleReconnect(userId);
					else {
						bumpSession(userId, { status: "idle" });
						sessions.delete(userId);
					}
				};
			};

			const onInitialClose = () => {
				forgetSocket(userId, ws);
				clearKeepaliveTimer(userId);
				if (sessions.get(userId)?.status === "live")
					bumpSession(userId, { status: "connecting" });
				if (!settled) finish(new Error("EventSub closed before welcome"));
				if (isEventSubDesired(userId)) scheduleReconnect(userId);
				else {
					bumpSession(userId, { status: "idle" });
					sessions.delete(userId);
				}
			};

			ws.onmessage = (ev) => {
				void (async () => {
					const raw = String(ev.data);
					let info: any;
					try {
						info = JSON.parse(raw);
					} catch {
						return;
					}
					const mt = info?.metadata?.message_type as string | undefined;
					emitToListeners(userId, raw);

					if (mt === "session_keepalive" || mt === "notification" || mt === "revocation")
						armKeepaliveWatchdog(userId, keepaliveSec);

					if (mt === "session_reconnect") {
						const url = info?.payload?.session?.reconnect_url as string | undefined;
						if (!url) return;

						const next = new WebSocket(url);
						migrationSocket = next;
						trackSocket(userId, next);

						next.onmessage = (e) => {
							void (async () => {
								const r = String(e.data);
								let parsed: any;
								try {
									parsed = JSON.parse(r);
								} catch {
									return;
								}
								const m = parsed?.metadata?.message_type as string | undefined;
								emitToListeners(userId, r);
								if (m === "session_keepalive" || m === "notification" || m === "revocation")
									armKeepaliveWatchdog(userId, keepaliveSec);

								if (m === "session_welcome") {
									keepaliveSec = parsed?.payload?.session?.keepalive_timeout_seconds ?? 10;
									resetBackoff(userId);
									armKeepaliveWatchdog(userId, keepaliveSec);
									ws.onmessage = null;
									ws.onclose = () => forgetSocket(userId, ws);
									if (ws.readyState === WebSocket.OPEN) ws.close(1000);
									forgetSocket(userId, ws);
									migrationSocket = null;
									attachLiveSocketClose(next);
									bumpSession(userId, { status: "live" });
									finish();
								}
							})();
						};

						next.onclose = () => {
							forgetSocket(userId, next);
							if (migrationSocket !== next) return;
							migrationSocket = null;
							if (
								ws.readyState === WebSocket.OPEN ||
								ws.readyState === WebSocket.CONNECTING
							)
								ws.close();
						};
						return;
					}

					if (mt === "session_welcome") {
						keepaliveSec = info?.payload?.session?.keepalive_timeout_seconds ?? 10;
						resetBackoff(userId);
						armKeepaliveWatchdog(userId, keepaliveSec);
						await subscribeAll(credential, userId, info.payload.session.id);
						attachLiveSocketClose(ws);
						bumpSession(userId, { status: "live" });
						finish();
					}
				})();
			};

			ws.onerror = () => {
				if (!settled) finish(new Error("EventSub WebSocket error"));
			};
			ws.onclose = onInitialClose;
		});
	}

	function disconnectSocket(userId: string) {
		clearReconnectTimer(userId);
		clearKeepaliveTimer(userId);
		reconnectAttempt.delete(userId);
		for (const ws of [...(activeSockets.get(userId) ?? [])]) {
			if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close(1000);
		}
		activeSockets.delete(userId);
		sessions.delete(userId);
	}

	return {
		sessions,
		isLive,
		isConnecting,
		getListenerTarget,
		connectSocket,
		disconnectSocket,
	};
}

export function register(pkg: Package, { eventSub }: Ctx, types: Types) {
	function createEventSubEventSchema<
		TEvent extends keyof Events,
		TProperties extends Record<string, PropertyDef> = never,
		TIO = void,
	>({
		event,
		twitchSubscriptionType,
		subscriptionVersion,
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
		/** Twitch `subscription_type` when it differs from the `event` key (e.g. `…hold.v2`). */
		twitchSubscriptionType?: string;
		/** Twitch subscription `version` (`1`, `2`, `beta`, …). */
		subscriptionVersion?: string;
	}) {
		const subscriptionType = twitchSubscriptionType ?? (event as string);
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
					.andThen((account) => Maybe(eventSub.getListenerTarget(account.data.id)))
					.expect("No account available");

				const bus = createEventBus<Events[TEvent]>();

				createEventListener(
					() => socket,
					"message",
					(ev: Event) => {
						const msg = ev as MessageEvent;
						const data: any = JSON.parse(msg.data);

						if (data.metadata.message_type !== "notification") return;
						if (data.metadata.subscription_type !== subscriptionType) return;

						if (subscriptionVersion !== undefined) {
							const metaVersion =
								data.metadata.subscription_version ??
								data.payload?.subscription?.version;
							if (metaVersion === undefined) {
								if (subscriptionVersion !== "1") return;
							} else if (metaVersion !== subscriptionVersion) return;
						}

						bus.emit(data.payload.event);
					},
				);

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
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
				type: t.string(),
			}),
			userId: io.dataOutput({
				id: "userId",
				name: "Banned User ID",
				type: t.string(),
			}),
			userLogin: io.dataOutput({
				id: "userLogin",
				name: "Banned User Login",
				type: t.string(),
			}),
			userName: io.dataOutput({
				id: "userName",
				name: "Banned User Name",
				type: t.string(),
			}),
			reason: io.dataOutput({
				id: "reason",
				name: "Ban Reason",
				type: t.string(),
			}),
			bannedAt: io.dataOutput({
				id: "bannedAt",
				name: "Banned At",
				type: t.string(),
			}),
			isPermanent: io.dataOutput({
				id: "isPermanent",
				name: "Is Permanent",
				type: t.bool(),
			}),
			endsAt: io.dataOutput({
				id: "endsAt",
				name: "Ends At",
				type: t.option(t.string()),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.reason, data.reason);
			ctx.setOutput(io.bannedAt, data.banned_at);
			ctx.setOutput(io.isPermanent, data.is_permanent);
			ctx.setOutput(io.endsAt, Maybe(data.ends_at));
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
				name: "User Login",
				type: t.string(),
			}),
			userName: io.dataOutput({
				id: "userName",
				name: "User Name",
				type: t.string(),
			}),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
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
				name: "Moderator User ID",
				type: t.string(),
			}),
			userLogin: io.dataOutput({
				id: "userLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			userName: io.dataOutput({
				id: "userName",
				name: "Moderator User Name",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
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
				name: "Moderator User ID",
				type: t.string(),
			}),
			userLogin: io.dataOutput({
				id: "userLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			userName: io.dataOutput({
				id: "userName",
				name: "Moderator User Name",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
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
			imageUrl1x: io.dataOutput({
				id: "imageUrl1x",
				name: "Image URL 1x",
				type: t.option(t.string()),
			}),
			imageUrl2x: io.dataOutput({
				id: "imageUrl2x",
				name: "Image URL 2x",
				type: t.option(t.string()),
			}),
			imageUrl4x: io.dataOutput({
				id: "imageUrl4x",
				name: "Image URL 4x",
				type: t.option(t.string()),
			}),
			defaultImage: io.dataOutput({
				id: "defaultImage",
				name: "Default Image Scale",
				type: t.int(),
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
			ctx.setOutput(io.imageUrl1x, Maybe(data.image?.url_1x ?? null));
			ctx.setOutput(io.imageUrl2x, Maybe(data.image?.url_2x ?? null));
			ctx.setOutput(io.imageUrl4x, Maybe(data.image?.url_4x ?? null));
			ctx.setOutput(io.defaultImage, data.default_image);
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
			imageUrl1x: io.dataOutput({
				id: "imageUrl1x",
				name: "Image URL 1x",
				type: t.option(t.string()),
			}),
			imageUrl2x: io.dataOutput({
				id: "imageUrl2x",
				name: "Image URL 2x",
				type: t.option(t.string()),
			}),
			imageUrl4x: io.dataOutput({
				id: "imageUrl4x",
				name: "Image URL 4x",
				type: t.option(t.string()),
			}),
			defaultImage: io.dataOutput({
				id: "defaultImage",
				name: "Default Image Scale",
				type: t.int(),
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
			ctx.setOutput(io.imageUrl1x, Maybe(data.image?.url_1x ?? null));
			ctx.setOutput(io.imageUrl2x, Maybe(data.image?.url_2x ?? null));
			ctx.setOutput(io.imageUrl4x, Maybe(data.image?.url_4x ?? null));
			ctx.setOutput(io.defaultImage, data.default_image);
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
			imageUrl1x: io.dataOutput({
				id: "imageUrl1x",
				name: "Image URL 1x",
				type: t.option(t.string()),
			}),
			imageUrl2x: io.dataOutput({
				id: "imageUrl2x",
				name: "Image URL 2x",
				type: t.option(t.string()),
			}),
			imageUrl4x: io.dataOutput({
				id: "imageUrl4x",
				name: "Image URL 4x",
				type: t.option(t.string()),
			}),
			defaultImage: io.dataOutput({
				id: "defaultImage",
				name: "Default Image Scale",
				type: t.int(),
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
			ctx.setOutput(io.imageUrl1x, Maybe(data.image?.url_1x ?? null));
			ctx.setOutput(io.imageUrl2x, Maybe(data.image?.url_2x ?? null));
			ctx.setOutput(io.imageUrl4x, Maybe(data.image?.url_4x ?? null));
			ctx.setOutput(io.defaultImage, data.default_image);
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
			redemptionId: io.dataOutput({
				id: "redemptionId",
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
			rewardType: io.dataOutput({
				id: "rewardType",
				name: "Reward Type",
				type: t.string(),
			}),
			rewardCost: io.dataOutput({
				id: "rewardCost",
				name: "Reward Cost",
				type: t.int(),
			}),
			text: io.dataOutput({
				id: "text",
				name: "Message Text",
				type: t.string(),
			}),
			emotes: io.dataOutput({
				id: "emotes",
				name: "Emotes",
				type: t.option(t.list(t.struct(types.Emotes))),
			}),
			userInput: io.dataOutput({
				id: "userInput",
				name: "User Input",
				type: t.string(),
			}),
			redeemedAt: io.dataOutput({
				id: "redeemedAt",
				name: "Redeemed At",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.redemptionId, data.id);
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.rewardType, data.reward.type);
			ctx.setOutput(io.rewardCost, data.reward.cost);
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
			ctx.setOutput(io.userInput, data.user_input);
			ctx.setOutput(io.redeemedAt, data.redeemed_at);
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
			redeemedAt: io.dataOutput({
				id: "redeemedAt",
				name: "Redeemed At",
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
			ctx.setOutput(io.redeemedAt, data.redeemed_at);
			return ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Point Reward Updated",
		event: "channel.channel_points_custom_reward_redemption.update",
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
			redeemedAt: io.dataOutput({
				id: "redeemedAt",
				name: "Redeemed At",
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
			ctx.setOutput(io.redeemedAt, data.redeemed_at);
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
			pollId: io.dataOutput({
				id: "pollId",
				name: "Poll ID",
				type: t.string(),
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
			bitsVotingEnabled: io.dataOutput({
				id: "bitsVotingEnabled",
				name: "Bits Voting Enabled",
				type: t.bool(),
			}),
			bitsVotingAmount: io.dataOutput({
				id: "bitsVotingAmount",
				name: "Bits Per Vote",
				type: t.int(),
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
			startedAt: io.dataOutput({
				id: "startedAt",
				name: "Started At",
				type: t.string(),
			}),
			endsAt: io.dataOutput({
				id: "endsAt",
				name: "Ends At",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.pollId, data.id);
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(
				io.choices,
				data.choices.map((choice) => types.PollBeginChoice.create(choice)),
			);
			ctx.setOutput(io.bitsVotingEnabled, data.bits_voting.is_enabled);
			ctx.setOutput(io.bitsVotingAmount, data.bits_voting.amount_per_vote);
			ctx.setOutput(
				io.channelPointVotingEnabled,
				data.channel_points_voting.is_enabled,
			);
			ctx.setOutput(
				io.channelPointVotingCost,
				data.channel_points_voting.amount_per_vote,
			);
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.setOutput(io.endsAt, data.ends_at);
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
				pollId: io.dataOutput({
					id: "pollId",
					name: "Poll ID",
					type: t.string(),
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
				bitsVotingEnabled: io.dataOutput({
					id: "bitsVotingEnabled",
					name: "Bits Voting Enabled",
					type: t.bool(),
				}),
				bitsVotingAmount: io.dataOutput({
					id: "bitsVotingAmount",
					name: "Bits Per Vote",
					type: t.int(),
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
				startedAt: io.dataOutput({
					id: "startedAt",
					name: "Started At",
					type: t.string(),
				}),
				endsAt: io.dataOutput({
					id: "endsAt",
					name: "Ends At",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.pollId, data.id);
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(
				io.choices,
				data.choices.map((c) =>
					types.PollChoice.create({
						id: c.id,
						title: c.title,
						bits_votes: c.bits_votes,
						channel_points_votes: c.channel_points_votes,
						votes: c.votes,
					}),
				),
			);
			ctx.setOutput(io.bitsVotingEnabled, data.bits_voting.is_enabled);
			ctx.setOutput(io.bitsVotingAmount, data.bits_voting.amount_per_vote);
			ctx.setOutput(
				io.channelPointVotingEnabled,
				data.channel_points_voting.is_enabled,
			);
			ctx.setOutput(
				io.channelPointVotingCost,
				data.channel_points_voting.amount_per_vote,
			);
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.setOutput(io.endsAt, data.ends_at);
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
				pollId: io.dataOutput({
					id: "pollId",
					name: "Poll ID",
					type: t.string(),
				}),
				title: io.dataOutput({
					id: "title",
					name: "Title",
					type: t.string(),
				}),
				status: io.dataOutput({
					id: "status",
					name: "Status",
					type: t.string(),
				}),
				choices: io.dataOutput({
					id: "choices",
					name: "Choices",
					type: t.list(t.struct(types.PollChoice)),
				}),
				bitsVotingEnabled: io.dataOutput({
					id: "bitsVotingEnabled",
					name: "Bits Voting Enabled",
					type: t.bool(),
				}),
				bitsVotingAmount: io.dataOutput({
					id: "bitsVotingAmount",
					name: "Bits Per Vote",
					type: t.int(),
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
			ctx.setOutput(io.pollId, data.id);
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(io.status, data.status);
			ctx.setOutput(
				io.choices,
				data.choices.map((c) =>
					types.PollChoice.create({
						id: c.id,
						title: c.title,
						bits_votes: c.bits_votes,
						channel_points_votes: c.channel_points_votes,
						votes: c.votes,
					}),
				),
			);
			ctx.setOutput(io.bitsVotingEnabled, data.bits_voting.is_enabled);
			ctx.setOutput(io.bitsVotingAmount, data.bits_voting.amount_per_vote);
			ctx.setOutput(
				io.channelPointVotingEnabled,
				data.channel_points_voting.is_enabled,
			);
			ctx.setOutput(
				io.channelPointVotingCost,
				data.channel_points_voting.amount_per_vote,
			);
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.setOutput(io.endedAt, data.ended_at);
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
				predictionId: io.dataOutput({
					id: "predictionId",
					name: "Prediction ID",
					type: t.string(),
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
				startedAt: io.dataOutput({
					id: "startedAt",
					name: "Started At",
					type: t.string(),
				}),
				locksAt: io.dataOutput({
					id: "locksAt",
					name: "Locks At",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.predictionId, data.id);
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(
				io.outcomes,
				data.outcomes.map((o) => types.OutcomesBegin.create(o)),
			);
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.setOutput(io.locksAt, data.locks_at);
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
				predictionId: io.dataOutput({
					id: "predictionId",
					name: "Prediction ID",
					type: t.string(),
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
				startedAt: io.dataOutput({
					id: "startedAt",
					name: "Started At",
					type: t.string(),
				}),
				locksAt: io.dataOutput({
					id: "locksAt",
					name: "Locks At",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.predictionId, data.id);
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
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.setOutput(io.locksAt, data.locks_at);
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
			predictionId: io.dataOutput({
				id: "predictionId",
				name: "Prediction ID",
				type: t.string(),
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
			startedAt: io.dataOutput({
				id: "startedAt",
				name: "Started At",
				type: t.string(),
			}),
			lockedAt: io.dataOutput({
				id: "lockedAt",
				name: "Locked At",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.predictionId, data.id);
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
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.setOutput(io.lockedAt, data.locked_at);
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
				predictionId: io.dataOutput({
					id: "predictionId",
					name: "Prediction ID",
					type: t.string(),
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
			ctx.setOutput(io.predictionId, data.id);
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
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.setOutput(io.endedAt, data.ended_at);
			ctx.exec(io.exec);
		},
	});

	const HypeTrainContributionTypeEnum = pkg.createEnum(
		"Hype Train Contribution Type",
		(e) => [
			e.variant("bits"),
			e.variant("subscription"),
			e.variant("other"),
		],
	);
	
	const HypeTrainTypeEnum = pkg.createEnum(
		"Hype Train Type",
		(e) => [
			e.variant("regular"),
			e.variant("treasure"),
			e.variant("golden_kappa"),
		],
	);
	
	const Contribution = pkg.createStruct("Contribution", (s) => ({
		user_id: s.field("User ID", t.string()),
		user_login: s.field("User Login", t.string()),
		user_name: s.field("User Name", t.string()),
		type: s.field("Type", t.enum(HypeTrainContributionTypeEnum)),
		total: s.field("Total", t.int()),
	}));
	
	const SharedTrainParticipant = pkg.createStruct(
		"Shared Train Participant",
		(s) => ({
			broadcaster_user_id: s.field("Broadcaster User ID", t.string()),
			broadcaster_user_login: s.field("Broadcaster User Login", t.string()),
			broadcaster_user_name: s.field("Broadcaster User Name", t.string()),
		}),
	);
	
	createEventSubEventSchema({
		name: "Channel Hype Train Begin",
		event: "channel.hype_train.begin",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
	
			id: io.dataOutput({
				id: "id",
				name: "Hype Train ID",
				type: t.string(),
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
			level: io.dataOutput({
				id: "level",
				name: "Level",
				type: t.int(),
			}),
	
			allTimeHighLevel: io.dataOutput({
				id: "allTimeHighLevel",
				name: "All-Time High Level",
				type: t.int(),
			}),
			allTimeHighTotal: io.dataOutput({
				id: "allTimeHighTotal",
				name: "All-Time High Total",
				type: t.int(),
			}),
	
			type: io.dataOutput({
				id: "type",
				name: "Hype Train Type",
				type: t.enum(HypeTrainTypeEnum),
			}),
	
			topContributions: io.dataOutput({
				id: "topContributions",
				name: "Top Contributions",
				type: t.list(t.struct(Contribution)),
			}),
	
			isSharedTrain: io.dataOutput({
				id: "isSharedTrain",
				name: "Is Shared Train",
				type: t.bool(),
			}),
	
			sharedTrainParticipants: io.dataOutput({
				id: "sharedTrainParticipants",
				name: "Shared Train Participants",
				type: t.list(t.struct(SharedTrainParticipant)),
			}),
	
			startedAt: io.dataOutput({
				id: "startedAt",
				name: "Started At",
				type: t.string(),
			}),
			expiresAt: io.dataOutput({
				id: "expiresAt",
				name: "Expires At",
				type: t.string(),
			}),
		}),
	
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.id);
	
			ctx.setOutput(io.total, data.total);
			ctx.setOutput(io.progress, data.progress);
			ctx.setOutput(io.goal, data.goal);
			ctx.setOutput(io.level, data.level);
	
			ctx.setOutput(io.allTimeHighLevel, data.all_time_high_level);
			ctx.setOutput(io.allTimeHighTotal, data.all_time_high_total);
	
			ctx.setOutput(io.type, HypeTrainTypeEnum.variant(data.type));
	
			ctx.setOutput(
				io.topContributions,
				data.top_contributions.map((c) =>
					Contribution.create({
						user_id: c.user_id,
						user_login: c.user_login,
						user_name: c.user_name,
						total: c.total,
						type: HypeTrainContributionTypeEnum.variant(c.type),
					}),
				),
			);
	
			ctx.setOutput(io.isSharedTrain, data.is_shared_train);
	
			ctx.setOutput(
				io.sharedTrainParticipants,
				(data.shared_train_participants ?? []).map((p) =>
					SharedTrainParticipant.create({
						broadcaster_user_id: p.broadcaster_user_id,
						broadcaster_user_login: p.broadcaster_user_login,
						broadcaster_user_name: p.broadcaster_user_name,
					}),
				),
			);
	
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.setOutput(io.expiresAt, data.expires_at);
	
			ctx.exec(io.exec);
		},
	});
	

// Channel Hype Train Progress Node (v2)
createEventSubEventSchema({
	name: "Channel Hype Train Progress",
	event: "channel.hype_train.progress",
	createIO: ({ io }) => ({
		exec: io.execOutput({ id: "exec" }),
		id: io.dataOutput({ id: "id", name: "Hype Train ID", type: t.string() }),
		total: io.dataOutput({ id: "total", name: "Total", type: t.int() }),
		progress: io.dataOutput({ id: "progress", name: "Progress", type: t.int() }),
		goal: io.dataOutput({ id: "goal", name: "Goal", type: t.int() }),
		level: io.dataOutput({ id: "level", name: "Level", type: t.int() }),
		startedAt: io.dataOutput({ id: "startedAt", name: "Started At", type: t.string() }),
		expiresAt: io.dataOutput({ id: "expiresAt", name: "Expires At", type: t.string() }),
		topContributions: io.dataOutput({ id: "topContributions", name: "Top Contributions", type: t.list(t.struct(Contribution)) }),
		type: io.dataOutput({ id: "type", name: "Hype Train Type", type: t.enum(HypeTrainTypeEnum) }),
		isSharedTrain: io.dataOutput({ id: "isSharedTrain", name: "Is Shared Train", type: t.bool() }),
		sharedTrainParticipants: io.dataOutput({ id: "sharedTrainParticipants", name: "Shared Train Participants", type: t.list(t.struct(SharedTrainParticipant)) }),
	}),
	run({ ctx, data, io }) {
		const topContributions = data.top_contributions.map((c) =>
			Contribution.create({
				user_id: c.user_id,
				user_login: c.user_login,
				user_name: c.user_name,
				total: c.total,
				type: HypeTrainContributionTypeEnum.variant(c.type),
			}),
		);

		ctx.setOutput(io.id, data.id);
		ctx.setOutput(io.total, data.total);
		ctx.setOutput(io.progress, data.progress);
		ctx.setOutput(io.goal, data.goal);
		ctx.setOutput(io.level, data.level);
		ctx.setOutput(io.startedAt, data.started_at);
		ctx.setOutput(io.expiresAt, data.expires_at);
		ctx.setOutput(io.topContributions, topContributions);
		ctx.setOutput(io.type, HypeTrainTypeEnum.variant(data.type));
		ctx.setOutput(io.isSharedTrain, data.is_shared_train);
		ctx.setOutput(
			io.sharedTrainParticipants,
			(data.shared_train_participants ?? []).map((p) =>
				SharedTrainParticipant.create({
					broadcaster_user_id: p.broadcaster_user_id,
					broadcaster_user_login: p.broadcaster_user_login,
					broadcaster_user_name: p.broadcaster_user_name,
				}),
			),
		);
		ctx.exec(io.exec);
	},
});

// Channel Hype Train End Node (v2)
createEventSubEventSchema({
	name: "Channel Hype Train End",
	event: "channel.hype_train.end",
	createIO: ({ io }) => ({
		exec: io.execOutput({ id: "exec" }),
		id: io.dataOutput({ id: "id", name: "Hype Train ID", type: t.string() }),
		total: io.dataOutput({ id: "total", name: "Total", type: t.int() }),
		level: io.dataOutput({ id: "level", name: "Level", type: t.int() }),
		startedAt: io.dataOutput({ id: "startedAt", name: "Started At", type: t.string() }),
		endedAt: io.dataOutput({ id: "endedAt", name: "Ended At", type: t.string() }),
		cooldownEndsAt: io.dataOutput({ id: "cooldownEndsAt", name: "Cooldown Ends At", type: t.string() }),
		topContributions: io.dataOutput({ id: "topContributions", name: "Top Contributions", type: t.list(t.struct(Contribution)) }),
		type: io.dataOutput({ id: "type", name: "Hype Train Type", type: t.enum(HypeTrainTypeEnum) }),
		isSharedTrain: io.dataOutput({ id: "isSharedTrain", name: "Is Shared Train", type: t.bool() }),
		sharedTrainParticipants: io.dataOutput({ id: "sharedTrainParticipants", name: "Shared Train Participants", type: t.list(t.struct(SharedTrainParticipant)) }),
	}),
	run({ ctx, data, io }) {
		const topContributions = data.top_contributions.map((c) =>
			Contribution.create({
				user_id: c.user_id,
				user_login: c.user_login,
				user_name: c.user_name,
				total: c.total,
				type: HypeTrainContributionTypeEnum.variant(c.type),
			}),
		);

		ctx.setOutput(io.id, data.id);
		ctx.setOutput(io.total, data.total);
		ctx.setOutput(io.level, data.level);
		ctx.setOutput(io.startedAt, data.started_at);
		ctx.setOutput(io.endedAt, data.ended_at);
		ctx.setOutput(io.cooldownEndsAt, data.cooldown_ends_at);
		ctx.setOutput(io.topContributions, topContributions);
		ctx.setOutput(io.type, HypeTrainTypeEnum.variant(data.type));
		ctx.setOutput(io.isSharedTrain, data.is_shared_train);
		ctx.setOutput(
			io.sharedTrainParticipants,
			(data.shared_train_participants ?? []).map((p) =>
				SharedTrainParticipant.create({
					broadcaster_user_id: p.broadcaster_user_id,
					broadcaster_user_login: p.broadcaster_user_login,
					broadcaster_user_name: p.broadcaster_user_name,
				}),
			),
		);
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
				language: io.dataOutput({
					id: "language",
					name: "Language",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.title, data.title);
			ctx.setOutput(io.language, data.language);
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
				userName: io.dataOutput({
					id: "userName",
					name: "Display Name",
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
			ctx.setOutput(io.userName, data.user_name);
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
				userName: io.dataOutput({
					id: "userName",
					name: "Display Name",
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
			ctx.setOutput(io.userName, data.user_name);
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
				userName: io.dataOutput({
					id: "userName",
					name: "Display Name",
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
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.tier, data.tier);
			ctx.setOutput(io.total, data.total);
			ctx.setOutput(io.cumulative, Maybe(data.cumulative_total));
			ctx.setOutput(io.anonymous, data.is_anonymous);
			ctx.exec(io.exec);
		},
	});

	const SubscriptionMessageEmoteStruct = pkg.createStruct(
		"Subscription Message Emote",
		(s) => ({
			begin: s.field("Begin", t.int()),
			end: s.field("End", t.int()),
			id: s.field("ID", t.string()),
		}),
	);

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
				userName: io.dataOutput({
					id: "userName",
					name: "Display Name",
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
				messageEmotes: io.dataOutput({
					id: "messageEmotes",
					name: "Message Emotes",
					type: t.option(t.list(t.struct(SubscriptionMessageEmoteStruct))),
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
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.tier, data.tier);
			ctx.setOutput(io.message, data.message.text);
			ctx.setOutput(
				io.messageEmotes,
				Maybe(data.message.emotes).map((emotes) =>
					emotes.map((e) =>
						SubscriptionMessageEmoteStruct.create({
							begin: e.begin,
							end: e.end,
							id: e.id,
						}),
					),
				),
			);
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
				toUserId: io.dataOutput({
					id: "toUserId",
					name: "To User ID",
					type: t.string(),
				}),
				toUserLogin: io.dataOutput({
					id: "toUserLogin",
					name: "To User Login",
					type: t.string(),
				}),
				toUserName: io.dataOutput({
					id: "toUserName",
					name: "To User Name",
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
			ctx.setOutput(io.toUserId, data.to_user_id);
			ctx.setOutput(io.toUserLogin, data.to_user_login);
			ctx.setOutput(io.toUserName, data.to_user_name);
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
				userDisplayName: io.dataOutput({
					id: "userDisplayName",
					name: "Display Name",
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
			ctx.setOutput(io.userDisplayName, data.from_broadcaster_user_name);
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
				requesterUserId: io.dataOutput({
					id: "requesterUserId",
					name: "Requester User ID",
					type: t.string(),
				}),
				requesterUserLogin: io.dataOutput({
					id: "requesterUserLogin",
					name: "Requester User Login",
					type: t.string(),
				}),
				requesterUserName: io.dataOutput({
					id: "requesterUserName",
					name: "Requester User Name",
					type: t.string(),
				}),
				startedAt: io.dataOutput({
					id: "startedAt",
					name: "Started At",
					type: t.string(),
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
			ctx.setOutput(io.requesterUserId, data.requester_user_id);
			ctx.setOutput(io.requesterUserLogin, data.requester_user_login);
			ctx.setOutput(io.requesterUserName, data.requester_user_name);
			ctx.setOutput(io.startedAt, data.started_at);
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
				followedAt: io.dataOutput({
					id: "followedAt",
					name: "Followed At",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.username, data.user_name);
			ctx.setOutput(io.followedAt, data.followed_at);
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
				fromBroadcasterUserId: io.dataOutput({
					id: "fromBroadcasterUserId",
					name: "From Broadcaster User ID",
					type: t.string(),
				}),
				fromBroadcasterUserLogin: io.dataOutput({
					id: "fromBroadcasterUserLogin",
					name: "From Broadcaster User Login",
					type: t.string(),
				}),
				fromBroadcasterUserName: io.dataOutput({
					id: "fromBroadcasterUserName",
					name: "From Broadcaster User Name",
					type: t.string(),
				}),
				viewerCount: io.dataOutput({
					id: "viewerCount",
					name: "Viewer Count",
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
			ctx.setOutput(io.fromBroadcasterUserId, data.from_broadcaster_user_id);
			ctx.setOutput(io.fromBroadcasterUserLogin, data.from_broadcaster_user_login);
			ctx.setOutput(io.fromBroadcasterUserName, data.from_broadcaster_user_name);
			ctx.setOutput(io.viewerCount, data.viewer_count);
			ctx.setOutput(io.startedAt, data.started_at);

			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Shoutout Created",
		event: "channel.shoutout.create",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
				type: t.string(),
			}),
			toBroadcasterUserId: io.dataOutput({
				id: "toBroadcasterUserId",
				name: "To Broadcaster User ID",
				type: t.string(),
			}),
			toBroadcasterUserLogin: io.dataOutput({
				id: "toBroadcasterUserLogin",
				name: "To Broadcaster User Login",
				type: t.string(),
			}),
			toBroadcasterUserName: io.dataOutput({
				id: "toBroadcasterUserName",
				name: "To Broadcaster User Name",
				type: t.string(),
			}),
			viewerCount: io.dataOutput({
				id: "viewerCount",
				name: "Viewer Count",
				type: t.int(),
			}),
			startedAt: io.dataOutput({
				id: "startedAt",
				name: "Started At",
				type: t.string(),
			}),
			cooldownEndsAt: io.dataOutput({
				id: "cooldownEndsAt",
				name: "Cooldown Ends At",
				type: t.string(),
			}),
			targetCooldownEndsAt: io.dataOutput({
				id: "targetCooldownEndsAt",
				name: "Target Cooldown Ends At",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
			ctx.setOutput(io.toBroadcasterUserId, data.to_broadcaster_user_id);
			ctx.setOutput(io.toBroadcasterUserLogin, data.to_broadcaster_user_login);
			ctx.setOutput(io.toBroadcasterUserName, data.to_broadcaster_user_name);
			ctx.setOutput(io.viewerCount, data.viewer_count);
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.setOutput(io.cooldownEndsAt, data.cooldown_ends_at);
			ctx.setOutput(io.targetCooldownEndsAt, data.target_cooldown_ends_at);
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
			ctx.setOutput(io.startedAt, data.started_at);

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
			ctx.setOutput(io.startedAt, data.started_at);

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
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.setOutput(io.endedAt, data.ended_at);

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

	createEventSubEventSchema({
		name: "Shield Mode Begin",
		event: "channel.shield_mode.begin",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
				type: t.string(),
			}),
			startedAt: io.dataOutput({
				id: "startedAt",
				name: "Started At",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Shield Mode End",
		event: "channel.shield_mode.end",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
				type: t.string(),
			}),
			endedAt: io.dataOutput({
				id: "endedAt",
				name: "Ended At",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
			ctx.setOutput(io.endedAt, data.ended_at);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Automod Message Hold (v1)",
		event: "automod.message.hold",
		subscriptionVersion: "1",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
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
				name: "Display Name",
				type: t.string(),
			}),
			messageId: io.dataOutput({
				id: "messageId",
				name: "Message ID",
				type: t.string(),
			}),
			message: io.dataOutput({
				id: "message",
				name: "Message",
				type: t.string(),
			}),
			level: io.dataOutput({
				id: "level",
				name: "Level",
				type: t.int(),
			}),
			category: io.dataOutput({
				id: "category",
				name: "Category",
				type: t.string(),
			}),
			heldAt: io.dataOutput({
				id: "heldAt",
				name: "Held At",
				type: t.string(),
			}),
			fragmentsJson: io.dataOutput({
				id: "fragmentsJson",
				name: "Fragments JSON",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.messageId, data.message_id);
			ctx.setOutput(io.message, data.message);
			ctx.setOutput(io.level, data.level);
			ctx.setOutput(io.category, data.category);
			ctx.setOutput(io.heldAt, data.held_at);
			ctx.setOutput(io.fragmentsJson, JSON.stringify(data.fragments ?? {}));
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Automod Message Hold (v2)",
		event: "automod.message.hold.v2",
		twitchSubscriptionType: "automod.message.hold",
		subscriptionVersion: "2",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
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
				name: "Display Name",
				type: t.string(),
			}),
			messageId: io.dataOutput({
				id: "messageId",
				name: "Message ID",
				type: t.string(),
			}),
			messageText: io.dataOutput({
				id: "messageText",
				name: "Message Text",
				type: t.string(),
			}),
			messageJson: io.dataOutput({
				id: "messageJson",
				name: "Message JSON",
				type: t.string(),
			}),
			reason: io.dataOutput({
				id: "reason",
				name: "Reason",
				type: t.string(),
			}),
			automodJson: io.dataOutput({
				id: "automodJson",
				name: "Automod JSON",
				type: t.string(),
			}),
			blockedTermJson: io.dataOutput({
				id: "blockedTermJson",
				name: "Blocked Term JSON",
				type: t.string(),
			}),
			heldAt: io.dataOutput({
				id: "heldAt",
				name: "Held At",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.messageId, data.message_id);
			ctx.setOutput(io.messageText, data.message.text);
			ctx.setOutput(io.messageJson, JSON.stringify(data.message));
			ctx.setOutput(io.reason, data.reason);
			ctx.setOutput(io.automodJson, JSON.stringify(data.automod));
			ctx.setOutput(io.blockedTermJson, JSON.stringify(data.blocked_term));
			ctx.setOutput(io.heldAt, data.held_at);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Automod Message Update (v1)",
		event: "automod.message.update",
		subscriptionVersion: "1",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
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
				name: "Display Name",
				type: t.string(),
			}),
			messageId: io.dataOutput({
				id: "messageId",
				name: "Message ID",
				type: t.string(),
			}),
			message: io.dataOutput({
				id: "message",
				name: "Message",
				type: t.string(),
			}),
			level: io.dataOutput({
				id: "level",
				name: "Level",
				type: t.int(),
			}),
			category: io.dataOutput({
				id: "category",
				name: "Category",
				type: t.string(),
			}),
			status: io.dataOutput({
				id: "status",
				name: "Status",
				type: t.string(),
			}),
			heldAt: io.dataOutput({
				id: "heldAt",
				name: "Held At",
				type: t.string(),
			}),
			fragmentsJson: io.dataOutput({
				id: "fragmentsJson",
				name: "Fragments JSON",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.messageId, data.message_id);
			ctx.setOutput(io.message, data.message);
			ctx.setOutput(io.level, data.level);
			ctx.setOutput(io.category, data.category);
			ctx.setOutput(io.status, data.status);
			ctx.setOutput(io.heldAt, data.held_at);
			ctx.setOutput(io.fragmentsJson, JSON.stringify(data.fragments ?? {}));
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Automod Message Update (v2)",
		event: "automod.message.update.v2",
		twitchSubscriptionType: "automod.message.update",
		subscriptionVersion: "2",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
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
				name: "Display Name",
				type: t.string(),
			}),
			messageId: io.dataOutput({
				id: "messageId",
				name: "Message ID",
				type: t.string(),
			}),
			messageText: io.dataOutput({
				id: "messageText",
				name: "Message Text",
				type: t.string(),
			}),
			messageJson: io.dataOutput({
				id: "messageJson",
				name: "Message JSON",
				type: t.string(),
			}),
			reason: io.dataOutput({
				id: "reason",
				name: "Reason",
				type: t.string(),
			}),
			automodJson: io.dataOutput({
				id: "automodJson",
				name: "Automod JSON",
				type: t.string(),
			}),
			blockedTermJson: io.dataOutput({
				id: "blockedTermJson",
				name: "Blocked Term JSON",
				type: t.string(),
			}),
			status: io.dataOutput({
				id: "status",
				name: "Status",
				type: t.string(),
			}),
			heldAt: io.dataOutput({
				id: "heldAt",
				name: "Held At",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.messageId, data.message_id);
			ctx.setOutput(io.messageText, data.message.text);
			ctx.setOutput(io.messageJson, JSON.stringify(data.message));
			ctx.setOutput(io.reason, data.reason);
			ctx.setOutput(io.automodJson, JSON.stringify(data.automod));
			ctx.setOutput(io.blockedTermJson, JSON.stringify(data.blocked_term));
			ctx.setOutput(io.status, data.status);
			ctx.setOutput(io.heldAt, data.held_at);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Automod Settings Update",
		event: "automod.settings.update",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			settingsJson: io.dataOutput({
				id: "settingsJson",
				name: "Settings Rows JSON",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.settingsJson, JSON.stringify(data.data));
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Automod Terms Update",
		event: "automod.terms.update",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
				type: t.string(),
			}),
			action: io.dataOutput({
				id: "action",
				name: "Action",
				type: t.string(),
			}),
			fromAutomod: io.dataOutput({
				id: "fromAutomod",
				name: "From Automod",
				type: t.bool(),
			}),
			terms: io.dataOutput({
				id: "terms",
				name: "Terms",
				type: t.list(t.string()),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
			ctx.setOutput(io.action, data.action);
			ctx.setOutput(io.fromAutomod, data.from_automod);
			ctx.setOutput(io.terms, data.terms);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Bits Use",
		event: "channel.bits.use",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
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
				name: "Display Name",
				type: t.string(),
			}),
			bits: io.dataOutput({
				id: "bits",
				name: "Bits",
				type: t.int(),
			}),
			useType: io.dataOutput({
				id: "useType",
				name: "Use Type",
				type: t.string(),
			}),
			messageText: io.dataOutput({
				id: "messageText",
				name: "Message Text",
				type: t.string(),
			}),
			messageJson: io.dataOutput({
				id: "messageJson",
				name: "Message JSON",
				type: t.string(),
			}),
			powerUpJson: io.dataOutput({
				id: "powerUpJson",
				name: "Power-up JSON",
				type: t.string(),
			}),
			customPowerUpJson: io.dataOutput({
				id: "customPowerUpJson",
				name: "Custom Power-up JSON",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.bits, data.bits);
			ctx.setOutput(io.useType, data.type);
			ctx.setOutput(io.messageText, data.message.text);
			ctx.setOutput(io.messageJson, JSON.stringify(data.message));
			ctx.setOutput(io.powerUpJson, JSON.stringify(data.power_up));
			ctx.setOutput(io.customPowerUpJson, JSON.stringify(data.custom_power_up));
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Moderate (v1)",
		event: "channel.moderate",
		subscriptionVersion: "1",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			action: io.dataOutput({
				id: "action",
				name: "Action",
				type: t.string(),
			}),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
				type: t.string(),
			}),
			sourceBroadcasterUserId: io.dataOutput({
				id: "sourceBroadcasterUserId",
				name: "Source Broadcaster User ID",
				type: t.option(t.string()),
			}),
			sourceBroadcasterUserLogin: io.dataOutput({
				id: "sourceBroadcasterUserLogin",
				name: "Source Broadcaster User Login",
				type: t.option(t.string()),
			}),
			sourceBroadcasterUserName: io.dataOutput({
				id: "sourceBroadcasterUserName",
				name: "Source Broadcaster User Name",
				type: t.option(t.string()),
			}),
			eventJson: io.dataOutput({
				id: "eventJson",
				name: "Event JSON",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			const d = data as Events["channel.moderate"];
			ctx.setOutput(io.action, d.action);
			ctx.setOutput(io.moderatorUserId, d.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, d.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, d.moderator_user_name);
			ctx.setOutput(
				io.sourceBroadcasterUserId,
				Maybe(d.source_broadcaster_user_id as string | undefined),
			);
			ctx.setOutput(
				io.sourceBroadcasterUserLogin,
				Maybe(d.source_broadcaster_user_login as string | undefined),
			);
			ctx.setOutput(
				io.sourceBroadcasterUserName,
				Maybe(d.source_broadcaster_user_name as string | undefined),
			);
			ctx.setOutput(io.eventJson, JSON.stringify(d));
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Channel Moderate (v2)",
		event: "channel.moderate.v2",
		twitchSubscriptionType: "channel.moderate",
		subscriptionVersion: "2",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			action: io.dataOutput({
				id: "action",
				name: "Action",
				type: t.string(),
			}),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
				type: t.string(),
			}),
			sourceBroadcasterUserId: io.dataOutput({
				id: "sourceBroadcasterUserId",
				name: "Source Broadcaster User ID",
				type: t.option(t.string()),
			}),
			sourceBroadcasterUserLogin: io.dataOutput({
				id: "sourceBroadcasterUserLogin",
				name: "Source Broadcaster User Login",
				type: t.option(t.string()),
			}),
			sourceBroadcasterUserName: io.dataOutput({
				id: "sourceBroadcasterUserName",
				name: "Source Broadcaster User Name",
				type: t.option(t.string()),
			}),
			eventJson: io.dataOutput({
				id: "eventJson",
				name: "Event JSON",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			const d = data as Events["channel.moderate.v2"];
			ctx.setOutput(io.action, d.action);
			ctx.setOutput(io.moderatorUserId, d.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, d.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, d.moderator_user_name);
			ctx.setOutput(
				io.sourceBroadcasterUserId,
				Maybe(d.source_broadcaster_user_id as string | undefined),
			);
			ctx.setOutput(
				io.sourceBroadcasterUserLogin,
				Maybe(d.source_broadcaster_user_login as string | undefined),
			);
			ctx.setOutput(
				io.sourceBroadcasterUserName,
				Maybe(d.source_broadcaster_user_name as string | undefined),
			);
			ctx.setOutput(io.eventJson, JSON.stringify(d));
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Guest Star Session Begin",
		event: "channel.guest_star_session.begin",
		subscriptionVersion: "beta",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
				type: t.string(),
			}),
			sessionId: io.dataOutput({
				id: "sessionId",
				name: "Session ID",
				type: t.string(),
			}),
			startedAt: io.dataOutput({
				id: "startedAt",
				name: "Started At",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
			ctx.setOutput(io.sessionId, data.session_id);
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Guest Star Session End",
		event: "channel.guest_star_session.end",
		subscriptionVersion: "beta",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
				type: t.string(),
			}),
			sessionId: io.dataOutput({
				id: "sessionId",
				name: "Session ID",
				type: t.string(),
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
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
			ctx.setOutput(io.sessionId, data.session_id);
			ctx.setOutput(io.startedAt, data.started_at);
			ctx.setOutput(io.endedAt, data.ended_at);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Guest Star Guest Update",
		event: "channel.guest_star_guest.update",
		subscriptionVersion: "beta",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
				type: t.string(),
			}),
			sessionId: io.dataOutput({
				id: "sessionId",
				name: "Session ID",
				type: t.string(),
			}),
			guestUserId: io.dataOutput({
				id: "guestUserId",
				name: "Guest User ID",
				type: t.string(),
			}),
			guestUserLogin: io.dataOutput({
				id: "guestUserLogin",
				name: "Guest User Login",
				type: t.string(),
			}),
			guestUserName: io.dataOutput({
				id: "guestUserName",
				name: "Guest Display Name",
				type: t.string(),
			}),
			slotId: io.dataOutput({
				id: "slotId",
				name: "Slot ID",
				type: t.string(),
			}),
			state: io.dataOutput({
				id: "state",
				name: "State",
				type: t.string(),
			}),
			hostVideoEnabled: io.dataOutput({
				id: "hostVideoEnabled",
				name: "Host Video Enabled",
				type: t.bool(),
			}),
			hostAudioEnabled: io.dataOutput({
				id: "hostAudioEnabled",
				name: "Host Audio Enabled",
				type: t.bool(),
			}),
			hostVolume: io.dataOutput({
				id: "hostVolume",
				name: "Host Volume",
				type: t.int(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
			ctx.setOutput(io.sessionId, data.session_id);
			ctx.setOutput(io.guestUserId, data.guest_user_id);
			ctx.setOutput(io.guestUserLogin, data.guest_user_login);
			ctx.setOutput(io.guestUserName, data.guest_user_name);
			ctx.setOutput(io.slotId, data.slot_id);
			ctx.setOutput(io.state, data.state);
			ctx.setOutput(io.hostVideoEnabled, data.host_video_enabled);
			ctx.setOutput(io.hostAudioEnabled, data.host_audio_enabled);
			ctx.setOutput(io.hostVolume, data.host_volume);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Guest Star Settings Update",
		event: "channel.guest_star_settings.update",
		subscriptionVersion: "beta",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			isModeratorSendLiveEnabled: io.dataOutput({
				id: "isModeratorSendLiveEnabled",
				name: "Moderator Send Live Enabled",
				type: t.bool(),
			}),
			slotCount: io.dataOutput({
				id: "slotCount",
				name: "Slot Count",
				type: t.int(),
			}),
			isBrowserSourceAudioEnabled: io.dataOutput({
				id: "isBrowserSourceAudioEnabled",
				name: "Browser Source Audio Enabled",
				type: t.bool(),
			}),
			groupLayout: io.dataOutput({
				id: "groupLayout",
				name: "Group Layout",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(
				io.isModeratorSendLiveEnabled,
				data.is_moderator_send_live_enabled,
			);
			ctx.setOutput(io.slotCount, data.slot_count);
			ctx.setOutput(
				io.isBrowserSourceAudioEnabled,
				data.is_browser_source_audio_enabled,
			);
			ctx.setOutput(io.groupLayout, data.group_layout);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Custom Power-up Redemption",
		event: "channel.custom_power_up_redemption.add",
		subscriptionVersion: "beta",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			redemptionId: io.dataOutput({
				id: "redemptionId",
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
				name: "Display Name",
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
			redeemedAt: io.dataOutput({
				id: "redeemedAt",
				name: "Redeemed At",
				type: t.string(),
			}),
			powerUpId: io.dataOutput({
				id: "powerUpId",
				name: "Power-up ID",
				type: t.string(),
			}),
			powerUpTitle: io.dataOutput({
				id: "powerUpTitle",
				name: "Power-up Title",
				type: t.string(),
			}),
			powerUpBits: io.dataOutput({
				id: "powerUpBits",
				name: "Power-up Bits",
				type: t.int(),
			}),
			powerUpPrompt: io.dataOutput({
				id: "powerUpPrompt",
				name: "Power-up Prompt",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.redemptionId, data.id);
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.userInput, data.user_input);
			ctx.setOutput(io.status, data.status);
			ctx.setOutput(io.redeemedAt, data.redeemed_at);
			ctx.setOutput(io.powerUpId, data.custom_power_up.id);
			ctx.setOutput(io.powerUpTitle, data.custom_power_up.title);
			ctx.setOutput(io.powerUpBits, data.custom_power_up.bits);
			ctx.setOutput(io.powerUpPrompt, data.custom_power_up.prompt);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "VIP Added",
		event: "channel.vip.add",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
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
				name: "Display Name",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "VIP Removed",
		event: "channel.vip.remove",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
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
				name: "Display Name",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Warning Acknowledged",
		event: "channel.warning.acknowledge",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
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
				name: "Display Name",
				type: t.string(),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.exec(io.exec);
		},
	});

	createEventSubEventSchema({
		name: "Warning Sent",
		event: "channel.warning.send",
		createIO: ({ io }) => ({
			exec: io.execOutput({ id: "exec" }),
			moderatorUserId: io.dataOutput({
				id: "moderatorUserId",
				name: "Moderator User ID",
				type: t.string(),
			}),
			moderatorUserLogin: io.dataOutput({
				id: "moderatorUserLogin",
				name: "Moderator User Login",
				type: t.string(),
			}),
			moderatorUserName: io.dataOutput({
				id: "moderatorUserName",
				name: "Moderator User Name",
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
				name: "Display Name",
				type: t.string(),
			}),
			reason: io.dataOutput({
				id: "reason",
				name: "Reason",
				type: t.string(),
			}),
			chatRulesCited: io.dataOutput({
				id: "chatRulesCited",
				name: "Chat Rules Cited",
				type: t.option(t.list(t.string())),
			}),
		}),
		run({ ctx, data, io }) {
			ctx.setOutput(io.moderatorUserId, data.moderator_user_id);
			ctx.setOutput(io.moderatorUserLogin, data.moderator_user_login);
			ctx.setOutput(io.moderatorUserName, data.moderator_user_name);
			ctx.setOutput(io.userId, data.user_id);
			ctx.setOutput(io.userLogin, data.user_login);
			ctx.setOutput(io.userName, data.user_name);
			ctx.setOutput(io.reason, data.reason);
			ctx.setOutput(io.chatRulesCited, Maybe(data.chat_rules_cited));
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
		e.variant("Unknown", { value: t.string() }),
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
						default: {
							return MessageType.variant([
								"Unknown",
								{ value: data.message_type },
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
		amount: s.field("Amount", t.struct(AmountStruct)),
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
			e.variant("Unraid", {
				value: t.string(),
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
			e.variant("Other", {
				value: t.string(),
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
			ctx.setOutput(io.systemMessage, data.system_message);

			ctx.setOutput(
				io.message,
				MessageStruct.create({
					text: data.message.text,
					fragments: (data.message.fragments as Fragment[]).map((fragment) =>
						FragmentsStruct.create({
							type: fragment.type ?? "text",
							text: fragment.text ?? "",
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
						case "unraid": {
							return ChannelChatNotificationEnum.variant([
								"Unraid",
								{ value: "" },
							]);
						}
						case "pay_it_forward": {
							return ChannelChatNotificationEnum.variant([
								"Pay It Forward",
								{
									value: {
										gifter_is_anonymous:
											data.pay_it_forward!.gifter_is_anonymous,
										gifter_user_id: Maybe(
											data.pay_it_forward!.gifter_user_id,
										),
										gifter_user_name: Maybe(
											data.pay_it_forward!.gifter_user_name,
										),
										gifter_user_login: Maybe(
											data.pay_it_forward!.gifter_user_login,
										),
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
							return ChannelChatNotificationEnum.variant([
								"Other",
								{ value: data.notice_type },
							]);
						}
					}
				})(),
			);
			ctx.exec(io.exec);
		},
	});
}
