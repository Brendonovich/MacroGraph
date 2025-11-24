import {
	FetchHttpClient,
	Headers,
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
	Layer,
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
} from "@macrograph/package-sdk";

import {
	EVENTSUB_MESSAGE,
	type EventSubMessage,
	isEventSubMessageType,
	isNotificationType,
} from "./eventSub";
import { HelixApi } from "./helix";
import { RPCS, TwitchAPIError } from "./shared";

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
		ws: Socket.Socket;
		state: "connecting" | "connected";
		events: Stream.Stream<EventSubMessage>;
		closed: Deferred.Deferred<void>;
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
							// HttpClient.mapRequestEffect((req) =>
							// 	Effect.succeed(
							// 		HttpClientRequest.make(req.method)(req.url, {
							// 			urlParams: req.urlParams,
							// 			hash: Option.getOrUndefined(req.hash),
							// 			headers: Headers.fromInput({
							// 				Authorization: pipe(
							// 					req.headers,
							// 					Headers.get("authorization"),
							// 					Option.getOrUndefined,
							// 				),
							// 				"Client-Id": CLIENT_ID,
							// 				"Content-Type": "application/json",
							// 			}),
							// 			body: req.body,
							// 		}),
							// 	),
							// ),
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
					Effect.provideService(FetchHttpClient.Fetch, (url, init) => {
						console.log({ url, init });
						return fetch(url, {
							...init,
							headers: {
								Authorization: init.headers?.authorization,
								"Client-Id": CLIENT_ID,
								"Content-Type": "application/json",
							},
						});
					}),
				);

				const helixClient = yield* HttpApiClient.makeWith(HelixApi, {
					baseUrl: "https://api.twitch.tv/helix",
					httpClient,
				});

				const ws = yield* Socket.makeWebSocket(
					"wss://eventsub.wss.twitch.tv/ws",
				).pipe(Effect.provide(Socket.layerWebSocketConstructorGlobal));

				// const ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

				const closed = yield* Deferred.make<void>();
				const events = Stream.asyncPush<EventSubMessage>((emit) =>
					ws
						.runRaw((event) => {
							if (typeof event !== "string") return;

							emit.single(
								S.decodeUnknownSync(EVENTSUB_MESSAGE)(JSON.parse(event)),
							);
						})
						.pipe(
							Effect.ensuring(Effect.sync(() => emit.end())),
							Effect.forkScoped,
						),
				);

				const socket: Socket = {
					lock,
					ws,
					state: "connecting",
					events,
					closed,
				};

				yield* Effect.sync(() => {
					sockets.set(accountId, socket);
				}).pipe(lock.withPermits(1), Effect.ensuring(ctx.dirtyState));

				const firstEvent = yield* Stream.take(events, 1).pipe(
					Stream.runCollect,
					Effect.map(Chunk.get(0)),
					Effect.map(
						Option.getOrThrowWith(
							() => new Error("Welcome event not received"),
						),
					),
				);

				if (!isEventSubMessageType(firstEvent, "session_welcome"))
					throw new Error(
						`Invalid first event: ${firstEvent.metadata.message_type}`,
					);

				yield* Effect.gen(function* () {
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

				const scope = yield* Scope.make();

				yield* Stream.runForEach(events, (event) => {
					const spanName = `Message.${event.metadata.message_type}`;

					return Effect.gen(function* () {
						if (isEventSubMessageType(event, "session_welcome"))
							throw new Error("Unexpected session welcome");

						if (isEventSubMessageType(event, "notification"))
							yield* ctx.emitEvent(event);
					}).pipe(
						Effect.withSpan(spanName, { attributes: flattenObject(event) }),
					);
				}).pipe(
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
			Effect.catchAll((cause) => new TwitchAPIError({ cause })),
		),
		DisconnectEventSub: Effect.fn(function* ({ accountId }) {
			const socket = sockets.get(accountId);
			if (!socket) return;

			socket.ws.close();
			yield* Deferred.await(socket.closed);
		}),
	});

	const TwitchAccountLive = TwitchAccount.toLayer(
		Effect.gen(function* () {
			const credentials = yield* ctx.credentials;
			return credentials.map((c) => ({
				id: c.id,
				displayName: c.displayName ?? c.id,
			}));
		}),
	);

	return {
		rpc: layer,
		state: Effect.gen(function* () {
			const credentials = yield* ctx.credentials;

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
				userId: io.out.data("userId", S.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", S.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", S.String, {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", S.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", S.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", S.String, {
					name: "Broadcaster Name",
				}),
				moderatorId: io.out.data("moderatorId", S.String, {
					name: "Moderator ID",
				}),
				moderatorLogin: io.out.data("moderatorLogin", S.String, {
					name: "Moderator Login",
				}),
				moderatorName: io.out.data("moderatorName", S.String, {
					name: "Moderator Name",
				}),
				reason: io.out.data("reason", S.String, {
					name: "Reason",
				}),
				bannedAt: io.out.data("bannedAt", S.Date, {
					name: "Banned At",
				}),
				endsAt: io.out.data("endsAt", S.OptionFromNullOr(S.Date), {
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
				userId: io.out.data("userId", S.String, {
					name: "User ID",
				}),
				userLogin: io.out.data("userLogin", S.String, {
					name: "User Login",
				}),
				userName: io.out.data("userName", S.String, {
					name: "User Name",
				}),
				broadcasterId: io.out.data("broadcasterId", S.String, {
					name: "Broadcaster ID",
				}),
				broadcasterLogin: io.out.data("broadcasterLogin", S.String, {
					name: "Broadcaster Login",
				}),
				broadcasterName: io.out.data("broadcasterName", S.String, {
					name: "Broadcaster Name",
				}),
				moderatorId: io.out.data("moderatorId", S.String, {
					name: "Moderator ID",
				}),
				moderatorLogin: io.out.data("moderatorLogin", S.String, {
					name: "Moderator Login",
				}),
				moderatorName: io.out.data("moderatorName", S.String, {
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
