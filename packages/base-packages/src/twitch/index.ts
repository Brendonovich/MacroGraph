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

const Engine = PackageEngine.define<State>()({
	rpc: RPCS,
	events: EVENTSUB_MESSAGE,
	resources: [TwitchAccount],
}).build((ctx) => {
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
							ResponseError: (e) => {
								if (e.response.status === 401)
									return ctx.refreshCredential("twitch", accountId);
								return e;
							},
						}),
						HttpClient.retry({
							times: 1,
							while: (e) => e._tag === "ForceRetryError",
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
						[
							helixClient.eventSub.createSubscription({
								payload: {
									type: "channel.follow",
									version: "2",
									condition: {
										broadcaster_user_id: accountId,
										moderator_user_id: accountId,
									},
									transport: {
										method: "websocket",
										session_id: firstEvent.payload.session.id,
									},
								},
							}),
							helixClient.eventSub.createSubscription({
								payload: {
									type: "channel.ban",
									version: "1",
									condition: {
										broadcaster_user_id: accountId,
									},
									transport: {
										method: "websocket",
										session_id: firstEvent.payload.session.id,
									},
								},
							}),
							helixClient.eventSub.createSubscription({
								payload: {
									type: "channel.unban",
									version: "1",
									condition: {
										broadcaster_user_id: accountId,
									},
									transport: {
										method: "websocket",
										session_id: firstEvent.payload.session.id,
									},
								},
							}),
						],
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

const deleteOldSubscriptions = Effect.fn(function* <E, R>(
	helixClient: HttpApiClient.Client<Groups<typeof HelixApi>, E, R>,
) {
	const subs = yield* helixClient.eventSub.getSubscriptions();
	yield* Effect.log(`Found ${subs.data.length} existing subscriptions`);
	yield* Effect.all(
		subs.data.map((sub) =>
			sub.status === "websocket_disconnected"
				? helixClient.eventSub.deleteSubscription({
						urlParams: { id: sub.id },
					})
				: Effect.void,
		),
		{ concurrency: 10 },
	).pipe(Effect.withSpan("deleteOldSubscriptions"));
});

export default Package.make({
	name: "Twitch",
	engine: Engine,
	builder: (ctx) => {
		ctx.schema("notification.channel.ban", {
			name: "User Banned",
			type: "event",
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
					return e;
			},
			io: (io) => ({
				exec: io.out.exec("exec"),
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
				yield* setOutput(io.reason, event.reason);
				yield* setOutput(io.bannedAt, event.banned_at);
				yield* setOutput(io.endsAt, Option.fromNullable(event.ends_at));

				return io.exec;
			},
		});
		ctx.schema("notification.channel.unban", {
			name: "User Unbanned",
			type: "event",
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
				exec: io.out.exec("exec"),
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

				return io.exec;
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
