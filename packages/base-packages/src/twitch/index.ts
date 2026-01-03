import {
	FetchHttpClient,
	Headers,
	type HttpApi,
	HttpApiClient,
	HttpClient,
	HttpClientRequest,
	Socket,
} from "@effect/platform";
import {
	Chunk,
	Data,
	Deferred,
	Effect,
	Exit,
	Option,
	pipe,
	Schema as S,
	Scope,
	Stream,
} from "effect";
import {
	Package,
	PackageEngine,
	Resource,
	setOutput,
	t,
} from "@macrograph/package-sdk";

import {
	EVENTSUB_MESSAGE,
	isEventSubMessageType,
	isNotificationType,
	type SubscriptionTypeDefinition,
	subscriptionTypes,
} from "./eventSub";
import { HelixApi } from "./helix";
import { ConnectFailed, RPCS, TwitchAPIError } from "./shared";

const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

const TwitchAccount = Resource.make<{
	id: string;
	displayName: string;
}>()("TwitchAccount", {
	name: "Twitch Account",
	serialize: (value) => ({ id: value.id, display: value.displayName }),
});

type State = {
	accounts: Array<{
		id: string;
		displayName: string;
		eventSubSocket: { state: "connecting" | "connected" | "disconnected" };
	}>;
};

const buildCondition = <T extends SubscriptionTypeDefinition>(
	def: T,
	accountId: string,
): Record<keyof SubscriptionTypeDefinition["condition"], string> => {
	return Object.fromEntries(
		Object.keys(def.condition).map((key) => [key, accountId]),
	) as any;
};

class RetryRequest extends Data.TaggedError("RetryRequest")<{}> {}

const Engine = PackageEngine.define({
	rpc: RPCS,
	events: EVENTSUB_MESSAGE,
	resources: [TwitchAccount],
}).build<State>((ctx) => {
	type Socket = {
		lock: Effect.Semaphore;
		state: "connecting" | "connected";
		closed: Deferred.Deferred<void>;
		scope: Scope.CloseableScope;
	};

	const sockets = new Map<string, Socket>();

	const layer = RPCS.toLayer({
		ConnectEventSub: Effect.fn(
			function* ({ accountId }) {
				if (sockets.get(accountId)) return;
				const credentials = yield* ctx.credentials.pipe(
					Effect.option,
					Effect.map(Option.getOrUndefined),
				);
				if (!credentials?.find((c) => c.id === accountId)) return;

				const lock = Effect.unsafeMakeSemaphore(1);

				const CredentialRefresh = (c: HttpClient.HttpClient) =>
					c.pipe(
						HttpClient.filterStatusOk,
						HttpClient.catchTags({
							ResponseError: Effect.fnUntraced(function* (e) {
								if (e.response.status === 401) {
									yield* ctx.refreshCredential("twitch", accountId);
									return yield* new RetryRequest();
								}
								return yield* Effect.fail(e);
							}),
						}),
						HttpClient.retry({
							times: 1,
							while: (e) => e._tag === "RetryRequest",
						}),
					);

				const httpClient = yield* HttpClient.HttpClient.pipe(
					Effect.map((client) =>
						pipe(
							client,
							HttpClient.mapRequestEffect((req) =>
								Effect.succeed(
									HttpClientRequest.make(req.method)(req.url, {
										urlParams: req.urlParams,
										hash: Option.getOrUndefined(req.hash),
										headers: Headers.fromInput({
											Authorization: pipe(
												req.headers,
												Headers.get("authorization"),
												Option.getOrUndefined,
											),
											"Client-Id": CLIENT_ID,
											"Content-Type": "application/json",
										}),
										body: req.body,
									}),
								),
							),
							HttpClient.mapRequestEffect((req) =>
								Effect.gen(function* () {
									const credentials = yield* ctx.credentials.pipe(Effect.orDie);
									const credential = Option.fromNullable(
										credentials.find((c) => c.id === accountId),
									);
									return Option.match(credential, {
										onNone: () => req,
										onSome: (credential) =>
											HttpClientRequest.bearerToken(
												req,
												credential.token.access_token,
											),
									});
								}),
							),
							CredentialRefresh,
							HttpClient.withTracerPropagation(false),
						),
					),
					Effect.provide(FetchHttpClient.layer),
				);

				const helixClient = yield* HttpApiClient.makeWith(HelixApi, {
					baseUrl: "https://api.twitch.tv/helix",
					httpClient,
				});

				const closed = yield* Deferred.make<void>();
				const scope = yield* Scope.make();

				const socket: Socket = {
					lock,
					state: "connecting",
					closed,
					scope,
				};

				yield* Effect.sync(() => {
					sockets.set(accountId, socket);
				}).pipe(lock.withPermits(1), Effect.ensuring(ctx.dirtyState));

				const getEvent = yield* Stream.never.pipe(
					Stream.pipeThroughChannel(
						Socket.makeWebSocketChannel("wss://eventsub.wss.twitch.tv/ws"),
					),
					Stream.decodeText(),
					Stream.mapEffect((s) =>
						S.decodeUnknown(S.parseJson(EVENTSUB_MESSAGE))(s),
					),
					Stream.toPull,
					Effect.provideService(Scope.Scope, scope),
				);

				const firstEvent = yield* getEvent.pipe(
					Effect.map(Chunk.get(0)),
					Effect.map(
						Option.getOrThrowWith(
							() => new Error("Welcome event not received"),
						),
					),
				);

				if (!isEventSubMessageType(firstEvent, "session_welcome"))
					return yield* new ConnectFailed({
						cause: "session-welcome-expected",
					});

				yield* Effect.gen(function* () {
					yield* deleteOldSubscriptions(helixClient);

					yield* Effect.log("Creating subscriptions");
					yield* Effect.all(
						Object.values(subscriptionTypes).map((def) =>
							helixClient
								.createEventSubSubscription({
									payload: {
										type: def.type,
										version: def.version.toString(),
										condition: buildCondition(def, accountId),
										transport: {
											method: "websocket",
											session_id: firstEvent.payload.session.id,
										},
									} as any,
								})
								.pipe(
									Effect.withSpan("createSubscription", {
										attributes: { "eventsub.type": def.type },
									}),
								),
						),
						{ concurrency: 2 },
					).pipe(Effect.withSpan("createTestSubscriptions"));
					socket.state = "connected";
					yield* Effect.log("Socket Connected");
				}).pipe(Effect.ensuring(ctx.dirtyState));

				yield* Stream.fromPull(Effect.succeed(getEvent)).pipe(
					Stream.runForEach((event) => {
						const spanName = `Message.${event.metadata.message_type}`;

						return Effect.gen(function* () {
							if (isEventSubMessageType(event, "session_welcome"))
								throw new Error("Unexpected session welcome");

							if (isEventSubMessageType(event, "notification"))
								yield* ctx.emitEvent(event);
						}).pipe(
							Effect.withSpan(spanName, { attributes: flattenObject(event) }),
						);
					}),
					Effect.withSpan(`twitch.EventSub{${accountId}}`, { root: true }),
					Effect.ensuring(
						Effect.all([
							Effect.sync(() => sockets.delete(accountId)).pipe(
								lock.withPermits(1),
							),
							Scope.close(scope, Exit.succeed(null)),
							ctx.dirtyState,
							Effect.log("Socket Disconnected"),
							Deferred.complete(closed, Effect.void),
						]),
					),
					Effect.forkScoped,
					Scope.extend(scope),
				);
			},
			(e) =>
				e.pipe(
					Effect.catchAll((cause) => new TwitchAPIError({ cause })),
					Effect.provide(Socket.layerWebSocketConstructorGlobal),
				),
		),
		DisconnectEventSub: Effect.fn(function* ({ accountId }) {
			const socket = sockets.get(accountId);
			if (!socket) return;

			yield* Scope.close(socket.scope, Exit.succeed(null));

			yield* Deferred.await(socket.closed);
		}),
	});

	const getCredentials = Effect.map(ctx.credentials, (c) =>
		c.filter((c) => c.provider === "twitch"),
	);

	const TwitchAccountLive = TwitchAccount.toLayer(
		Effect.gen(function* () {
			const credentials = yield* getCredentials;
			return credentials.map((c) => ({
				id: c.id,
				displayName: c.displayName ?? c.id,
			}));
		}),
	);

	return {
		rpc: layer,
		state: Effect.gen(function* () {
			const credentials = yield* getCredentials;

			return {
				accounts: credentials.map((c) => ({
					id: c.id,
					displayName: c.displayName!,
					eventSubSocket: {
						state: sockets.get(c.id)?.state ?? "disconnected",
					},
				})),
			};
		}),
		resources: TwitchAccountLive,
	};
});

type Groups<T extends HttpApi.HttpApi<any, any, any, any>> =
	T extends HttpApi.HttpApi<any, infer TGroups, any, any> ? TGroups : never;

const deleteOldSubscriptions = Effect.fn("deleteOldSubscriptions")(function* <
	E,
	R,
>(helixClient: HttpApiClient.Client<Groups<typeof HelixApi>, E, R>) {
	const subs = yield* helixClient.getEventSubSubscriptions({ urlParams: {} });
	yield* Effect.log(`Found ${subs.data.length} existing subscriptions`);
	yield* Effect.all(
		subs.data.map((sub) =>
			sub.status === "websocket_disconnected"
				? helixClient.deleteEventSubSubscription({
						urlParams: { id: sub.id },
					})
				: Effect.void,
		),
		{ concurrency: 10 },
	);
});

export default Package.make({
	name: "Twitch",
	engine: Engine,
	builder: (ctx) => {
		ctx.schema("notification.channel.ban", {
			name: "User Banned",
			type: "event",
			description: "Fires when a user is banned from the specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.ban") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				moderatorId: io.out.data("moderatorId", t.String, {
					name: "Moderator ID",
				}),
				moderatorLogin: io.out.data("moderatorLogin", t.String, {
					name: "Moderator Login",
				}),
				moderatorName: io.out.data("moderatorName", t.String, {
					name: "Moderator Name",
				}),
				reason: io.out.data("reason", t.String, {
					name: "Reason",
				}),
				bannedAt: io.out.data("bannedAt", t.DateTime, {
					name: "Banned At",
				}),
				endsAt: io.out.data("endsAt", t.Option(t.DateTime), {
					name: "Ends At",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.moderatorId, event.moderator_user_id);
				yield* setOutput(io.moderatorLogin, event.moderator_user_login);
				yield* setOutput(io.moderatorName, event.moderator_user_name);
				yield* setOutput(io.reason, event.reason);
				yield* setOutput(io.bannedAt, event.banned_at);
				yield* setOutput(io.endsAt, Option.fromNullable(event.ends_at));
			},
		});
		ctx.schema("notification.channel.unban", {
			name: "User Unbanned",
			type: "event",
			description: "Fires when a user is unbanned from the specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.unban") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e;
			},
			io: (io) => ({
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				moderatorId: io.out.data("moderatorId", t.String, {
					name: "Moderator ID",
				}),
				moderatorLogin: io.out.data("moderatorLogin", t.String, {
					name: "Moderator Login",
				}),
				moderatorName: io.out.data("moderatorName", t.String, {
					name: "Moderator Name",
				}),
			}),
			run: function* ({ io }, { payload: { event } }) {
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.moderatorId, event.moderator_user_id);
				yield* setOutput(io.moderatorLogin, event.moderator_user_login);
				yield* setOutput(io.moderatorName, event.moderator_user_name);
			},
		});
		ctx.schema("notification.channel.chat.clear", {
			name: "Chat Cleared",
			type: "event",
			description:
				"Fires when all chat messages are cleared from the specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.chat.clear") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
			},
		});
		ctx.schema("notification.channel.chat.clear_user_messages", {
			name: "User Messages Cleared",
			type: "event",
			description:
				"Fires when chat messages are cleared for a specific user in the specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.chat.clear_user_messages") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				targetUserId: io.out.data("targetUserId", t.String, {
					name: "Target User ID",
				}),
				targetUserLogin: io.out.data("targetUserLogin", t.String, {
					name: "Target User Login",
				}),
				targetUserName: io.out.data("targetUserName", t.String, {
					name: "Target User Name",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.targetUserId, event.target_user_id);
				yield* setOutput(io.targetUserLogin, event.target_user_login);
				yield* setOutput(io.targetUserName, event.target_user_name);
			},
		});
		ctx.schema("notification.channel.chat.message", {
			name: "Chat Message",
			type: "event",
			description:
				"Fires when a user sends a chat message in the specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.chat.message") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				chatterUserId: io.out.data("chatterUserId", t.String, {
					name: "Chatter User ID",
				}),
				chatterUserLogin: io.out.data("chatterUserLogin", t.String, {
					name: "Chatter User Login",
				}),
				chatterUserName: io.out.data("chatterUserName", t.String, {
					name: "Chatter User Name",
				}),
				messageId: io.out.data("messageId", t.String, {
					name: "Message ID",
				}),
				messageType: io.out.data("messageType", t.String, {
					name: "Message Type",
				}),
				color: io.out.data("color", t.String, {
					name: "Color",
				}),
				channelPointsCustomRewardId: io.out.data(
					"channelPointsCustomRewardId",
					t.Option(t.String),
					{
						name: "Channel Points Custom Reward ID",
					},
				),
				sourceBroadcasterUserId: io.out.data(
					"sourceBroadcasterUserId",
					t.Option(t.String),
					{
						name: "Source Broadcaster User ID",
					},
				),
				sourceBroadcasterUserName: io.out.data(
					"sourceBroadcasterUserName",
					t.Option(t.String),
					{
						name: "Source Broadcaster User Name",
					},
				),
				sourceBroadcasterUserLogin: io.out.data(
					"sourceBroadcasterUserLogin",
					t.Option(t.String),
					{
						name: "Source Broadcaster User Login",
					},
				),
				sourceMessageId: io.out.data("sourceMessageId", t.Option(t.String), {
					name: "Source Message ID",
				}),
				isSourceOnly: io.out.data("isSourceOnly", t.Option(t.Bool), {
					name: "Is Source Only",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.chatterUserId, event.chatter_user_id);
				yield* setOutput(io.chatterUserLogin, event.chatter_user_login);
				yield* setOutput(io.chatterUserName, event.chatter_user_name);
				yield* setOutput(io.messageId, event.message_id);
				yield* setOutput(io.messageType, event.message_type);
				yield* setOutput(io.color, event.color);
				yield* setOutput(
					io.channelPointsCustomRewardId,
					Option.fromNullable(event.channel_points_custom_reward_id),
				);
				yield* setOutput(
					io.sourceBroadcasterUserId,
					Option.fromNullable(event.source_broadcaster_user_id),
				);
				yield* setOutput(
					io.sourceBroadcasterUserName,
					Option.fromNullable(event.source_broadcaster_user_name),
				);
				yield* setOutput(
					io.sourceBroadcasterUserLogin,
					Option.fromNullable(event.source_broadcaster_user_login),
				);
				yield* setOutput(
					io.sourceMessageId,
					Option.fromNullable(event.source_message_id),
				);
				yield* setOutput(
					io.isSourceOnly,
					Option.fromNullable(event.is_source_only),
				);
			},
		});
		ctx.schema("notification.channel.chat.message_delete", {
			name: "Chat Message Deleted",
			type: "event",
			description:
				"Fires when a chat message is deleted from the specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.chat.message_delete") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				targetUserId: io.out.data("targetUserId", t.String, {
					name: "Target User ID",
				}),
				targetUserLogin: io.out.data("targetUserLogin", t.String, {
					name: "Target User Login",
				}),
				targetUserName: io.out.data("targetUserName", t.String, {
					name: "Target User Name",
				}),
				messageId: io.out.data("messageId", t.String, {
					name: "Message ID",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.targetUserId, event.target_user_id);
				yield* setOutput(io.targetUserLogin, event.target_user_login);
				yield* setOutput(io.targetUserName, event.target_user_name);
				yield* setOutput(io.messageId, event.message_id);
			},
		});
		ctx.schema("notification.channel.chat.notification", {
			name: "Chat Notification",
			type: "event",
			description:
				"Fires when a chat notification (e.g., sub, resub, raid, etc.) is sent in the specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.chat.notification") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				chatterUserId: io.out.data("chatterUserId", t.String, {
					name: "Chatter User ID",
				}),
				chatterUserLogin: io.out.data("chatterUserLogin", t.String, {
					name: "Chatter User Login",
				}),
				chatterUserName: io.out.data("chatterUserName", t.String, {
					name: "Chatter User Name",
				}),
				chatterIsAnonymous: io.out.data("chatterIsAnonymous", t.Bool, {
					name: "Chatter Is Anonymous",
				}),
				color: io.out.data("color", t.String, {
					name: "Color",
				}),
				systemMessage: io.out.data("systemMessage", t.String, {
					name: "System Message",
				}),
				messageId: io.out.data("messageId", t.String, {
					name: "Message ID",
				}),
				noticeType: io.out.data("noticeType", t.String, {
					name: "Notice Type",
				}),
				sourceBroadcasterUserId: io.out.data(
					"sourceBroadcasterUserId",
					t.Option(t.String),
					{
						name: "Source Broadcaster User ID",
					},
				),
				sourceBroadcasterUserName: io.out.data(
					"sourceBroadcasterUserName",
					t.Option(t.String),
					{
						name: "Source Broadcaster User Name",
					},
				),
				sourceBroadcasterUserLogin: io.out.data(
					"sourceBroadcasterUserLogin",
					t.Option(t.String),
					{
						name: "Source Broadcaster User Login",
					},
				),
				sourceMessageId: io.out.data("sourceMessageId", t.Option(t.String), {
					name: "Source Message ID",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.chatterUserId, event.chatter_user_id);
				yield* setOutput(io.chatterUserLogin, event.chatter_user_login);
				yield* setOutput(io.chatterUserName, event.chatter_user_name);
				yield* setOutput(io.chatterIsAnonymous, event.chatter_is_anonymous);
				yield* setOutput(io.color, event.color);
				yield* setOutput(io.systemMessage, event.system_message);
				yield* setOutput(io.messageId, event.message_id);
				yield* setOutput(io.noticeType, event.notice_type);
				yield* setOutput(
					io.sourceBroadcasterUserId,
					Option.fromNullable(event.source_broadcaster_user_id),
				);
				yield* setOutput(
					io.sourceBroadcasterUserName,
					Option.fromNullable(event.source_broadcaster_user_name),
				);
				yield* setOutput(
					io.sourceBroadcasterUserLogin,
					Option.fromNullable(event.source_broadcaster_user_login),
				);
				yield* setOutput(
					io.sourceMessageId,
					Option.fromNullable(event.source_message_id),
				);
			},
		});
		ctx.schema("notification.channel.chat_settings.update", {
			name: "Chat Settings Updated",
			type: "event",
			description:
				"Fires when the chat settings are updated for the specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.chat_settings.update") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				emoteMode: io.out.data("emoteMode", t.Bool, {
					name: "Emote Mode",
				}),
				followerMode: io.out.data("followerMode", t.Bool, {
					name: "Follower Mode",
				}),
				followerModeDurationMinutes: io.out.data(
					"followerModeDurationMinutes",
					t.Option(t.Int),
					{
						name: "Follower Mode Duration Minutes",
					},
				),
				slowMode: io.out.data("slowMode", t.Bool, {
					name: "Slow Mode",
				}),
				slowModeWaitTimeSeconds: io.out.data(
					"slowModeWaitTimeSeconds",
					t.Option(t.Int),
					{
						name: "Slow Mode Wait Time Seconds",
					},
				),
				subscriberMode: io.out.data("subscriberMode", t.Bool, {
					name: "Subscriber Mode",
				}),
				uniqueChatMode: io.out.data("uniqueChatMode", t.Bool, {
					name: "Unique Chat Mode",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.emoteMode, event.emote_mode);
				yield* setOutput(io.followerMode, event.follower_mode);
				yield* setOutput(
					io.followerModeDurationMinutes,
					Option.fromNullable(event.follower_mode_duration_minutes),
				);
				yield* setOutput(io.slowMode, event.slow_mode);
				yield* setOutput(
					io.slowModeWaitTimeSeconds,
					Option.fromNullable(event.slow_mode_wait_time_seconds),
				);
				yield* setOutput(io.subscriberMode, event.subscriber_mode);
				yield* setOutput(io.uniqueChatMode, event.unique_chat_mode);
			},
		});
		ctx.schema("notification.channel.chat.user_message_hold", {
			name: "User Message Held",
			type: "event",
			description:
				"Fires when a user's chat message is held for review in specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.chat.user_message_hold") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				messageId: io.out.data("messageId", t.String, {
					name: "Message ID",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.messageId, event.message_id);
			},
		});
		ctx.schema("notification.channel.chat.user_message_update", {
			name: "User Message Updated",
			type: "event",
			description:
				"Fires when a held user message is approved, denied, or found invalid in specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.chat.user_message_update") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				status: io.out.data("status", t.String, {
					name: "Status",
				}),
				messageId: io.out.data("messageId", t.String, {
					name: "Message ID",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.status, event.status);
				yield* setOutput(io.messageId, event.message_id);
			},
		});
		ctx.schema("notification.channel.subscribe", {
			name: "User Subscribed",
			type: "event",
			description: "Fires when a user subscribes to the specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.subscribe") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				tier: io.out.data("tier", t.String, {
					name: "Tier",
				}),
				isGift: io.out.data("isGift", t.Bool, {
					name: "Is Gift",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.tier, event.tier);
				yield* setOutput(io.isGift, event.is_gift);
			},
		});
		ctx.schema("notification.channel.subscription.end", {
			name: "User Subscription Ended",
			type: "event",
			description:
				"Fires when a user's subscription to the specified channel ends.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.subscription.end") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				tier: io.out.data("tier", t.String, {
					name: "Tier",
				}),
				isGift: io.out.data("isGift", t.Bool, {
					name: "Is Gift",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.tier, event.tier);
				yield* setOutput(io.isGift, event.is_gift);
			},
		});
		ctx.schema("notification.channel.subscription.gift", {
			name: "Subscription Gifted",
			type: "event",
			description:
				"Fires when a user gifts one or more subscriptions to the channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.subscription.gift") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				userId: io.out.data("userId", t.Option(t.String), {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.Option(t.String), {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.Option(t.String), {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				total: io.out.data("total", t.Int, {
					name: "Total",
				}),
				tier: io.out.data("tier", t.String, {
					name: "Tier",
				}),
				cumulativeTotal: io.out.data("cumulativeTotal", t.Option(t.Int), {
					name: "Cumulative Total",
				}),
				isAnonymous: io.out.data("isAnonymous", t.Bool, {
					name: "Is Anonymous",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.userId, Option.fromNullable(event.user_id));
				yield* setOutput(io.userLogin, Option.fromNullable(event.user_login));
				yield* setOutput(io.userName, Option.fromNullable(event.user_name));
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.total, event.total);
				yield* setOutput(io.tier, event.tier);
				yield* setOutput(
					io.cumulativeTotal,
					Option.fromNullable(event.cumulative_total),
				);
				yield* setOutput(io.isAnonymous, event.is_anonymous);
			},
		});
		ctx.schema("notification.channel.subscription.message", {
			name: "Subscription Message",
			type: "event",
			description: "Fires when a user sends a resubscription chat message.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.subscription.message") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				tier: io.out.data("tier", t.String, {
					name: "Tier",
				}),
				cumulativeMonths: io.out.data("cumulativeMonths", t.Int, {
					name: "Cumulative Months",
				}),
				streakMonths: io.out.data("streakMonths", t.Option(t.Int), {
					name: "Streak Months",
				}),
				durationMonths: io.out.data("durationMonths", t.Int, {
					name: "Duration Months",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.tier, event.tier);
				yield* setOutput(io.cumulativeMonths, event.cumulative_months);
				yield* setOutput(
					io.streakMonths,
					Option.fromNullable(event.streak_months),
				);
				yield* setOutput(io.durationMonths, event.duration_months);
			},
		});
		ctx.schema("notification.channel.cheer", {
			name: "Cheer Event",
			type: "event",
			description: "Fires when a user cheers bits to the channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.cheer") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				isAnonymous: io.out.data("isAnonymous", t.Bool, {
					name: "Is Anonymous",
				}),
				userId: io.out.data("userId", t.Option(t.String), {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.Option(t.String), {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.Option(t.String), {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				message: io.out.data("message", t.String, {
					name: "Message",
				}),
				bits: io.out.data("bits", t.Int, {
					name: "Bits",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.isAnonymous, event.is_anonymous);
				yield* setOutput(io.userId, Option.fromNullable(event.user_id));
				yield* setOutput(io.userLogin, Option.fromNullable(event.user_login));
				yield* setOutput(io.userName, Option.fromNullable(event.user_name));
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.message, event.message);
				yield* setOutput(io.bits, event.bits);
			},
		});
		ctx.schema("notification.channel.moderator.add", {
			name: "Moderator Added",
			type: "event",
			description: "Fires when a user is added as a moderator.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.moderator.add") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
			},
		});
		ctx.schema("notification.channel.moderator.remove", {
			name: "Moderator Removed",
			type: "event",
			description: "Fires when a user is removed as a moderator.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.moderator.remove") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
			},
		});
		ctx.schema("notification.channel.vip.add", {
			name: "VIP Added",
			type: "event",
			description: "Fires when a user is added as a VIP.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.vip.add") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
			},
		});
		ctx.schema("notification.channel.vip.remove", {
			name: "VIP Removed",
			type: "event",
			description: "Fires when a user is removed as a VIP.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.vip.remove") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
			},
		});
		ctx.schema("notification.channel.unban_request.create", {
			name: "Unban Request Created",
			type: "event",
			description: "Fires when a user creates an unban request.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.unban_request.create") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				id: io.out.data("id", t.String, {
					name: "Request ID",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				text: io.out.data("text", t.String, {
					name: "Text",
				}),
				createdAt: io.out.data("createdAt", t.DateTime, {
					name: "Created At",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.id, event.id);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.text, event.text);
				yield* setOutput(io.createdAt, event.created_at);
			},
		});

		ctx.schema("notification.channel.moderate", {
			name: "Channel Moderate",
			type: "event",
			description:
				"Fires when a moderator performs a moderation action in a channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.moderate") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				sourceBroadcasterId: io.out.data("sourceBroadcasterId", t.String, {
					name: "Source Broadcaster ID",
				}),
				sourceBroadcasterLogin: io.out.data(
					"sourceBroadcasterLogin",
					t.String,
					{
						name: "Source Broadcaster Login",
					},
				),
				sourceBroadcasterName: io.out.data(
					"sourceBroadcasterName",
					t.Option(t.String),
					{
						name: "Source Broadcaster Name",
					},
				),
				moderatorId: io.out.data("moderatorId", t.String, {
					name: "Moderator ID",
				}),
				moderatorLogin: io.out.data("moderatorLogin", t.String, {
					name: "Moderator Login",
				}),
				moderatorName: io.out.data("moderatorName", t.String, {
					name: "Moderator Name",
				}),
				action: io.out.data("action", t.String, {
					name: "Action",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(
					io.sourceBroadcasterId,
					event.source_broadcaster_user_id,
				);
				yield* setOutput(
					io.sourceBroadcasterLogin,
					event.source_broadcaster_user_login,
				);
				yield* setOutput(
					io.sourceBroadcasterName,
					Option.fromNullable(event.source_broadcaster_user_name),
				);
				yield* setOutput(io.moderatorId, event.moderator_user_id);
				yield* setOutput(io.moderatorLogin, event.moderator_user_login);
				yield* setOutput(io.moderatorName, event.moderator_user_name);
				yield* setOutput(io.action, event.action);
			},
		});
		ctx.schema("notification.automod.settings.update", {
			name: "AutoMod Settings Update",
			type: "event",
			description: "Fires when AutoMod settings are updated.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "automod.settings.update") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				moderatorId: io.out.data("moderatorId", t.String, {
					name: "Moderator ID",
				}),
				moderatorLogin: io.out.data("moderatorLogin", t.String, {
					name: "Moderator Login",
				}),
				moderatorName: io.out.data("moderatorName", t.String, {
					name: "Moderator Name",
				}),
				bullying: io.out.data("bullying", t.Int, {
					name: "Bullying",
				}),
				overallLevel: io.out.data("overallLevel", t.Option(t.Int), {
					name: "Overall Level",
				}),
				disability: io.out.data("disability", t.Int, {
					name: "Disability",
				}),
				raceEthnicityOrReligion: io.out.data("raceEthnicityOrReligion", t.Int, {
					name: "Race Ethnicity Or Religion",
				}),
				misogyny: io.out.data("misogyny", t.Int, {
					name: "Misogyny",
				}),
				sexualitySexOrGender: io.out.data("sexualitySexOrGender", t.Int, {
					name: "Sexuality Sex Or Gender",
				}),
				aggression: io.out.data("aggression", t.Int, {
					name: "Aggression",
				}),
				sexBasedTerms: io.out.data("sexBasedTerms", t.Int, {
					name: "Sex Based Terms",
				}),
				swearing: io.out.data("swearing", t.Int, {
					name: "Swearing",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.moderatorId, event.moderator_user_id);
				yield* setOutput(io.moderatorLogin, event.moderator_user_login);
				yield* setOutput(io.moderatorName, event.moderator_user_name);
				yield* setOutput(io.bullying, event.bullying);
				yield* setOutput(
					io.overallLevel,
					Option.fromNullable(event.overall_level),
				);
				yield* setOutput(io.disability, event.disability);
				yield* setOutput(
					io.raceEthnicityOrReligion,
					event.race_ethnicity_or_religion,
				);
				yield* setOutput(io.misogyny, event.misogyny);
				yield* setOutput(
					io.sexualitySexOrGender,
					event.sexuality_sex_or_gender,
				);
				yield* setOutput(io.aggression, event.aggression);
				yield* setOutput(io.sexBasedTerms, event.sex_based_terms);
				yield* setOutput(io.swearing, event.swearing);
			},
		});
		ctx.schema("notification.automod.terms.update", {
			name: "AutoMod Terms Update",
			type: "event",
			description: "Fires when AutoMod terms are added or removed.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "automod.terms.update") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				moderatorId: io.out.data("moderatorId", t.String, {
					name: "Moderator ID",
				}),
				moderatorLogin: io.out.data("moderatorLogin", t.String, {
					name: "Moderator Login",
				}),
				moderatorName: io.out.data("moderatorName", t.String, {
					name: "Moderator Name",
				}),
				action: io.out.data("action", t.String, {
					name: "Action",
				}),
				fromAutomod: io.out.data("fromAutomod", t.Bool, {
					name: "From Automod",
				}),
				terms: io.out.data("terms", t.List(t.String), {
					name: "Terms",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.moderatorId, event.moderator_user_id);
				yield* setOutput(io.moderatorLogin, event.moderator_user_login);
				yield* setOutput(io.moderatorName, event.moderator_user_name);
				yield* setOutput(io.action, event.action);
				yield* setOutput(io.fromAutomod, event.from_automod);
				yield* setOutput(io.terms, event.terms);
			},
		});
		ctx.schema("notification.channel.unban_request.resolve", {
			name: "Channel Unban Request Resolve",
			type: "event",
			description: "Fires when an unban request is resolved.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.unban_request.resolve") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				id: io.out.data("id", t.String, {
					name: "ID",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				moderatorId: io.out.data("moderatorId", t.Option(t.String), {
					name: "Moderator ID",
				}),
				moderatorLogin: io.out.data("moderatorLogin", t.Option(t.String), {
					name: "Moderator Login",
				}),
				moderatorName: io.out.data("moderatorName", t.Option(t.String), {
					name: "Moderator Name",
				}),
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				resolutionText: io.out.data("resolutionText", t.Option(t.String), {
					name: "Resolution Text",
				}),
				status: io.out.data("status", t.String, {
					name: "Status",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.id, event.id);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(
					io.moderatorId,
					Option.fromNullable(event.moderator_id),
				);
				yield* setOutput(
					io.moderatorLogin,
					Option.fromNullable(event.moderator_login),
				);
				yield* setOutput(
					io.moderatorName,
					Option.fromNullable(event.moderator_name),
				);
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(
					io.resolutionText,
					Option.fromNullable(event.resolution_text),
				);
				yield* setOutput(io.status, event.status);
			},
		});
		ctx.schema("notification.channel.suspicious_user.update", {
			name: "Channel Suspicious User Update",
			type: "event",
			description: "Fires when a suspicious user's status is updated.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.suspicious_user.update") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				moderatorId: io.out.data("moderatorId", t.String, {
					name: "Moderator ID",
				}),
				moderatorLogin: io.out.data("moderatorLogin", t.String, {
					name: "Moderator Login",
				}),
				moderatorName: io.out.data("moderatorName", t.String, {
					name: "Moderator Name",
				}),
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				lowTrustStatus: io.out.data("lowTrustStatus", t.String, {
					name: "Low Trust Status",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.moderatorId, event.moderator_user_id);
				yield* setOutput(io.moderatorLogin, event.moderator_user_login);
				yield* setOutput(io.moderatorName, event.moderator_user_name);
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.lowTrustStatus, event.low_trust_status);
			},
		});
		ctx.schema("notification.channel.suspicious_user.message", {
			name: "Channel Suspicious User Message",
			type: "event",
			description: "Fires when a suspicious user sends a message.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.suspicious_user.message") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				lowTrustStatus: io.out.data("lowTrustStatus", t.String, {
					name: "Low Trust Status",
				}),
				sharedBanChannelIds: io.out.data(
					"sharedBanChannelIds",
					t.List(t.String),
					{
						name: "Shared Ban Channel IDs",
					},
				),
				types: io.out.data("types", t.List(t.String), {
					name: "Types",
				}),
				banEvasionEvaluation: io.out.data("banEvasionEvaluation", t.String, {
					name: "Ban Evasion Evaluation",
				}),
				messageId: io.out.data("messageId", t.String, {
					name: "Message ID",
				}),
				messageText: io.out.data("messageText", t.String, {
					name: "Message Text",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.lowTrustStatus, event.low_trust_status);
				yield* setOutput(io.sharedBanChannelIds, event.shared_ban_channel_ids);
				yield* setOutput(io.types, event.types);
				yield* setOutput(io.banEvasionEvaluation, event.ban_evasion_evaluation);
				yield* setOutput(io.messageId, event.message.message_id);
				yield* setOutput(io.messageText, event.message.text);
			},
		});
		ctx.schema("notification.channel.poll.begin", {
			name: "Poll Started",
			type: "event",
			description: "Fires when a poll begins in specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.poll.begin") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				id: io.out.data("id", t.String, {
					name: "Poll ID",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				title: io.out.data("title", t.String, {
					name: "Title",
				}),
				startedAt: io.out.data("startedAt", t.DateTime, {
					name: "Started At",
				}),
				endsAt: io.out.data("endsAt", t.DateTime, {
					name: "Ends At",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.id, event.id);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.title, event.title);
				yield* setOutput(io.startedAt, event.started_at);
				yield* setOutput(io.endsAt, event.ends_at);
			},
		});
		ctx.schema("notification.channel.poll.progress", {
			name: "Poll Progress",
			type: "event",
			description: "Fires when a poll is updated in specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.poll.progress") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				id: io.out.data("id", t.String, {
					name: "Poll ID",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				title: io.out.data("title", t.String, {
					name: "Title",
				}),
				startedAt: io.out.data("startedAt", t.DateTime, {
					name: "Started At",
				}),
				endsAt: io.out.data("endsAt", t.DateTime, {
					name: "Ends At",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.id, event.id);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.title, event.title);
				yield* setOutput(io.startedAt, event.started_at);
				yield* setOutput(io.endsAt, event.ends_at);
			},
		});
		ctx.schema("notification.channel.poll.end", {
			name: "Poll Ended",
			type: "event",
			description: "Fires when a poll ends in specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.poll.end") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				id: io.out.data("id", t.String, {
					name: "Poll ID",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				title: io.out.data("title", t.String, {
					name: "Title",
				}),
				startedAt: io.out.data("startedAt", t.DateTime, {
					name: "Started At",
				}),
				endsAt: io.out.data("endsAt", t.DateTime, {
					name: "Ends At",
				}),
				status: io.out.data("status", t.String, {
					name: "Status",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.id, event.id);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.title, event.title);
				yield* setOutput(io.startedAt, event.started_at);
				yield* setOutput(io.endsAt, event.ended_at);
				yield* setOutput(io.status, event.status);
			},
		});
		ctx.schema("notification.channel.prediction.begin", {
			name: "Prediction Started",
			type: "event",
			description: "Fires when a prediction begins in specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.prediction.begin") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				id: io.out.data("id", t.String, {
					name: "Prediction ID",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				title: io.out.data("title", t.String, {
					name: "Title",
				}),
				startedAt: io.out.data("startedAt", t.DateTime, {
					name: "Started At",
				}),
				locksAt: io.out.data("locksAt", t.Option(t.DateTime), {
					name: "Locks At",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.id, event.id);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.title, event.title);
				yield* setOutput(io.startedAt, event.started_at);
				yield* setOutput(io.locksAt, Option.fromNullable(event.locks_at));
			},
		});
		ctx.schema("notification.channel.prediction.progress", {
			name: "Prediction Progress",
			type: "event",
			description: "Fires when a prediction is updated in specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.prediction.progress") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				id: io.out.data("id", t.String, {
					name: "Prediction ID",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				title: io.out.data("title", t.String, {
					name: "Title",
				}),
				startedAt: io.out.data("startedAt", t.DateTime, {
					name: "Started At",
				}),
				locksAt: io.out.data("locksAt", t.Option(t.DateTime), {
					name: "Locks At",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.id, event.id);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.title, event.title);
				yield* setOutput(io.startedAt, event.started_at);
				yield* setOutput(io.locksAt, Option.fromNullable(event.locks_at));
			},
		});
		ctx.schema("notification.channel.prediction.lock", {
			name: "Prediction Locked",
			type: "event",
			description: "Fires when a prediction locks in specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.prediction.lock") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				id: io.out.data("id", t.String, {
					name: "Prediction ID",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				title: io.out.data("title", t.String, {
					name: "Title",
				}),
				startedAt: io.out.data("startedAt", t.DateTime, {
					name: "Started At",
				}),
				lockedAt: io.out.data("lockedAt", t.DateTime, {
					name: "Locked At",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.id, event.id);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.title, event.title);
				yield* setOutput(io.startedAt, event.started_at);
				yield* setOutput(io.lockedAt, event.locked_at);
			},
		});
		ctx.schema("notification.channel.prediction.end", {
			name: "Prediction Ended",
			type: "event",
			description: "Fires when a prediction ends in specified channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.prediction.end") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e.payload.event;
			},
			io: (io) => ({
				id: io.out.data("id", t.String, {
					name: "Prediction ID",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				title: io.out.data("title", t.String, {
					name: "Title",
				}),
				startedAt: io.out.data("startedAt", t.DateTime, {
					name: "Started At",
				}),
				endedAt: io.out.data("endedAt", t.DateTime, {
					name: "Ended At",
				}),
				status: io.out.data("status", t.String, {
					name: "Status",
				}),
				winningOutcomeId: io.out.data("winningOutcomeId", t.Option(t.String), {
					name: "Winning Outcome ID",
				}),
			}),
			run: function* ({ io }, event) {
				yield* setOutput(io.id, event.id);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.title, event.title);
				yield* setOutput(io.startedAt, event.started_at);
				yield* setOutput(io.endedAt, event.ended_at);
				yield* setOutput(io.status, event.status);
				yield* setOutput(
					io.winningOutcomeId,
					Option.fromNullable(event.winning_outcome_id),
				);
			},
		});

		ctx.schema("notification.stream.online", {
			name: "Stream Online",
			type: "event",
			description: "Fires when specified broadcaster starts a stream.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "stream.online") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e;
			},
			io: (io) => ({
				id: io.out.data("id", t.String, {
					name: "ID",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				type: io.out.data("type", t.String, {
					name: "Type",
				}),
				startedAt: io.out.data("startedAt", t.DateTime, {
					name: "Started At",
				}),
			}),
			run: function* ({ io }, { payload: { event } }) {
				yield* setOutput(io.id, event.id);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.type, event.type);
				yield* setOutput(io.startedAt, event.started_at);
			},
		});
		ctx.schema("notification.stream.offline", {
			name: "Stream Offline",
			type: "event",
			description: "Fires when specified broadcaster stops a stream.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "stream.offline") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
			}),
			run: function* ({ io }, { payload: { event } }) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
			},
		});
		ctx.schema("notification.channel.update", {
			name: "Channel Update",
			type: "event",
			description: "Fires when a broadcaster updates their channel properties.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.update") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				title: io.out.data("title", t.String, {
					name: "Title",
				}),
				language: io.out.data("language", t.String, {
					name: "Language",
				}),
				categoryId: io.out.data("categoryId", t.String, {
					name: "Category ID",
				}),
				categoryName: io.out.data("categoryName", t.String, {
					name: "Category Name",
				}),
				contentClassificationLabels: io.out.data(
					"contentClassificationLabels",
					t.List(t.String),
					{
						name: "Content Classification Labels",
					},
				),
			}),
			run: function* ({ io }, { payload: { event } }) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.title, event.title);
				yield* setOutput(io.language, event.language);
				yield* setOutput(io.categoryId, event.category_id);
				yield* setOutput(io.categoryName, event.category_name);
				yield* setOutput(
					io.contentClassificationLabels,
					event.content_classification_labels,
				);
			},
		});
		ctx.schema("notification.channel.raid", {
			name: "Channel Raid",
			type: "event",
			description:
				"Fires when a broadcaster raids another broadcaster's channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.raid") &&
					e.payload.event.to_broadcaster_user_id === properties.account.id
				)
					return e;
			},
			io: (io) => ({
				fromBroadcasterId: io.out.data("fromBroadcasterId", t.String, {
					name: "From Broadcaster ID",
				}),
				fromBroadcasterLogin: io.out.data("fromBroadcasterLogin", t.String, {
					name: "From Broadcaster Login",
				}),
				fromBroadcasterName: io.out.data("fromBroadcasterName", t.String, {
					name: "From Broadcaster Name",
				}),
				toBroadcasterId: io.out.data("toBroadcasterId", t.String, {
					name: "To Broadcaster ID",
				}),
				toBroadcasterLogin: io.out.data("toBroadcasterLogin", t.String, {
					name: "To Broadcaster Login",
				}),
				toBroadcasterName: io.out.data("toBroadcasterName", t.String, {
					name: "To Broadcaster Name",
				}),
				viewers: io.out.data("viewers", t.Int, {
					name: "Viewers",
				}),
			}),
			run: function* ({ io }, { payload: { event } }) {
				yield* setOutput(io.fromBroadcasterId, event.from_broadcaster_user_id);
				yield* setOutput(
					io.fromBroadcasterLogin,
					event.from_broadcaster_user_login,
				);
				yield* setOutput(
					io.fromBroadcasterName,
					event.from_broadcaster_user_name,
				);
				yield* setOutput(io.toBroadcasterId, event.to_broadcaster_user_id);
				yield* setOutput(
					io.toBroadcasterLogin,
					event.to_broadcaster_user_login,
				);
				yield* setOutput(io.toBroadcasterName, event.to_broadcaster_user_name);
				yield* setOutput(io.viewers, event.viewers);
			},
		});
		ctx.schema("notification.channel.ad_break.begin", {
			name: "Channel Ad Break Begin",
			type: "event",
			description: "Fires when an ad break begins on channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.ad_break.begin") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e;
			},
			io: (io) => ({
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				requesterId: io.out.data("requesterId", t.String, {
					name: "Requester ID",
				}),
				requesterLogin: io.out.data("requesterLogin", t.String, {
					name: "Requester Login",
				}),
				requesterName: io.out.data("requesterName", t.String, {
					name: "Requester Name",
				}),
				durationSeconds: io.out.data("durationSeconds", t.Int, {
					name: "Duration Seconds",
				}),
				startedAt: io.out.data("startedAt", t.DateTime, {
					name: "Started At",
				}),
				isAutomatic: io.out.data("isAutomatic", t.Bool, {
					name: "Is Automatic",
				}),
			}),
			run: function* ({ io }, { payload: { event } }) {
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.requesterId, event.requester_user_id);
				yield* setOutput(io.requesterLogin, event.requester_user_login);
				yield* setOutput(io.requesterName, event.requester_user_name);
				yield* setOutput(io.durationSeconds, event.duration_seconds);
				yield* setOutput(io.startedAt, event.started_at);
				yield* setOutput(io.isAutomatic, event.is_automatic);
			},
		});
		ctx.schema("notification.channel.bits.use", {
			name: "Channel Bits Use",
			type: "event",
			description: "Fires when viewers cheer bits on channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.bits.use") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e;
			},
			io: (io) => ({
				userId: io.out.data("userId", t.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", t.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", t.String, {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				bits: io.out.data("bits", t.Int, {
					name: "Bits",
				}),
				type: io.out.data("type", t.String, {
					name: "Type",
				}),
			}),
			run: function* ({ io }, { payload: { event } }) {
				yield* setOutput(io.userId, event.user_id);
				yield* setOutput(io.userLogin, event.user_login);
				yield* setOutput(io.userName, event.user_name);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.bits, event.bits);
				yield* setOutput(io.type, event.type);
			},
		});
		ctx.schema(
			"notification.channel.channel_points_automatic_reward_redemption.add",
			{
				name: "Channel Points Automatic Reward Redemption",
				type: "event",
				description:
					"Fires when a viewer uses an automatic channel points reward.",
				properties: {
					account: {
						name: "Account",
						resource: TwitchAccount,
					},
				},
				event: ({ properties }, e) => {
					if (
						isEventSubMessageType(e, "notification") &&
						isNotificationType(
							e,
							"channel.channel_points_automatic_reward_redemption.add",
						) &&
						e.payload.event.broadcaster_user_id === properties.account.id
					)
						return e;
				},
				io: (io) => ({
					redemptionId: io.out.data("redemptionId", t.String, {
						name: "Redemption ID",
					}),
					broadcasterId: io.out.data("broadcasterId", t.String, {
						name: "Broadcaster ID",
					}),
					broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
						name: "Broadcaster Login",
					}),
					broadcasterName: io.out.data("broadcasterName", t.String, {
						name: "Broadcaster Name",
					}),
					userId: io.out.data("userId", t.String, {
						name: "User ID",
					}),
					userLogin: io.out.data("userLogin", t.String, {
						name: "User Login",
					}),
					userName: io.out.data("userName", t.String, {
						name: "User Name",
					}),
					rewardId: io.out.data("rewardId", t.String, {
						name: "Reward ID",
					}),
					rewardTitle: io.out.data("rewardTitle", t.String, {
						name: "Reward Title",
					}),
					rewardPrompt: io.out.data("rewardPrompt", t.String, {
						name: "Reward Prompt",
					}),
					rewardCost: io.out.data("rewardCost", t.Int, {
						name: "Reward Cost",
					}),
					userInput: io.out.data("userInput", t.Option(t.String), {
						name: "User Input",
					}),
					status: io.out.data("status", t.String, {
						name: "Status",
					}),
					redeemedAt: io.out.data("redeemedAt", t.DateTime, {
						name: "Redeemed At",
					}),
				}),
				run: function* ({ io }, { payload: { event } }) {
					yield* setOutput(io.redemptionId, event.id);
					yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
					yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
					yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
					yield* setOutput(io.userId, event.user_id);
					yield* setOutput(io.userLogin, event.user_login);
					yield* setOutput(io.userName, event.user_name);
					// yield* setOutput(io.rewardId, event.reward.id);
					// yield* setOutput(io.rewardTitle, event.reward.title);
					// yield* setOutput(io.rewardPrompt, event.reward.prompt);
					// yield* setOutput(io.rewardCost, event.reward.cost);
					// yield* setOutput(io.userInput, Option.fromNullable(event.user_input));
					// yield* setOutput(io.status, event.status);
					yield* setOutput(io.redeemedAt, event.redeemed_at);
				},
			},
		);
		ctx.schema("notification.channel.hype_train.progress", {
			name: "Hype Train Progress",
			type: "event",
			description: "Fires when hype train level increases on channel.",
			properties: {
				account: {
					name: "Account",
					resource: TwitchAccount,
				},
			},
			event: ({ properties }, e) => {
				if (
					isEventSubMessageType(e, "notification") &&
					isNotificationType(e, "channel.hype_train.progress") &&
					e.payload.event.broadcaster_user_id === properties.account.id
				)
					return e;
			},
			io: (io) => ({
				id: io.out.data("id", t.String, {
					name: "ID",
				}),
				broadcasterId: io.out.data("broadcasterId", t.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", t.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", t.String, {
					name: "Broadcaster Name",
				}),
				level: io.out.data("level", t.Int, {
					name: "Level",
				}),
				total: io.out.data("total", t.Int, {
					name: "Total",
				}),
				progress: io.out.data("progress", t.Int, {
					name: "Progress",
				}),
				goal: io.out.data("goal", t.Int, {
					name: "Goal",
				}),
				startedAt: io.out.data("startedAt", t.DateTime, {
					name: "Started At",
				}),
				expiresAt: io.out.data("expiresAt", t.DateTime, {
					name: "Expires At",
				}),
			}),
			run: function* ({ io }, { payload: { event } }) {
				yield* setOutput(io.id, event.id);
				yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
				yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
				yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
				yield* setOutput(io.level, event.level);
				yield* setOutput(io.total, event.total);
				yield* setOutput(io.progress, event.progress);
				yield* setOutput(io.goal, event.goal);
				yield* setOutput(io.startedAt, event.started_at);
				yield* setOutput(io.expiresAt, event.expires_at);
			},
		});
	},
});

function flattenObject(
	obj: Record<string, any>,
	prefix = "",
	res: Record<string, any> = {},
): Record<string, any> {
	for (const key in obj) {
		if (key in obj) {
			const newKey = prefix ? `${prefix}.${key}` : key;

			if (
				typeof obj[key] === "object" &&
				obj[key] !== null &&
				!Array.isArray(obj[key])
			) {
				flattenObject(obj[key], newKey, res);
			} else {
				res[newKey] = obj[key];
			}
		}
	}
	return res;
}
