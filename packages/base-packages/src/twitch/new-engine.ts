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
	Array,
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
import { LookupRef, type PackageEngine } from "@macrograph/package-sdk";

import { EngineDef } from ".";
import { type SubscriptionTypeDefinition, subscriptionTypes } from "./eventSub";
import { HelixApi } from "./new-helix";
import {
	AccountId,
	EventSubMessage,
	EventSubNotification,
	MissingCredential,
	TwitchAPIError,
} from "./new-types";
import { ConnectFailed } from "./shared";

const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

class RetryRequest extends Data.TaggedError("RetryRequest") {}

export default EngineDef.toLayer((ctx) =>
	Effect.gen(function* () {
		type SocketState = {
			displayName: string;
			lock: Effect.Semaphore;
			state: "connecting" | "connected";
			closed: Deferred.Deferred<void>;
			scope: Scope.CloseableScope;
		};

		const sockets = new Map<AccountId, SocketState>();

		const runSocketEdit = <A, E>(e: Effect.Effect<A, E>) =>
			pipe(e, Effect.andThen(ctx.dirtyState), Effect.forkDaemon);

		const getCredential = (accountId: AccountId) =>
			ctx.credentials.get.pipe(
				Effect.map((c) =>
					c.find((c) => c.provider === "twitch" && c.id === accountId),
				),
				Effect.map(Option.fromNullable),
			);

		const createHelixClient = (accountId: AccountId) =>
			Effect.gen(function* () {
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

				const credential = yield* getCredential(accountId);
				if (Option.isNone(credential)) return yield* new MissingCredential();

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
								Effect.succeed(
									HttpClientRequest.bearerToken(
										req,
										credential.value.token.access_token,
									),
								),
							),
							CredentialRefresh,
							HttpClient.withTracerPropagation(false),
						),
					),
					Effect.provide(FetchHttpClient.layer),
				);

				return yield* HttpApiClient.makeWith(HelixApi, {
					baseUrl: "https://api.twitch.tv/helix",
					httpClient,
				});
			});

		// Connect to EventSub WebSocket
		const connectEventSub = Effect.fnUntraced(function* ({
			accountId,
		}: {
			accountId: AccountId;
		}) {
			if (sockets.get(accountId)) return;
			const credential = yield* getCredential(accountId);
			if (Option.isNone(credential)) return;

			const lock = Effect.unsafeMakeSemaphore(1);
			const closed = yield* Deferred.make<void>();
			const scope = yield* Scope.make();

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
								const credentials = yield* ctx.credentials.get.pipe(
									Effect.orDie,
								);
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

			const socket: SocketState = {
				displayName: credential.value.displayName ?? accountId,
				lock,
				state: "connecting",
				closed,
				scope,
			};

			yield* Effect.sync(() => {
				sockets.set(accountId, socket);
			}).pipe(runSocketEdit);

			const getEvent = yield* Stream.never.pipe(
				Stream.pipeThroughChannel(
					Socket.makeWebSocketChannel("wss://eventsub.wss.twitch.tv/ws"),
				),
				Stream.decodeText(),
				Stream.mapEffect((s) =>
					S.decodeUnknown(S.parseJson(EventSubMessage.EventSubMessage))(s),
				),
				Stream.toPull,
				Effect.provideService(Scope.Scope, scope),
			);

			const firstEvent = yield* getEvent.pipe(
				Effect.map(Chunk.get(0)),
				Effect.map(
					Option.getOrThrowWith(() => new Error("Welcome event not received")),
				),
			);

			if (!EventSubMessage.isType(firstEvent, "session_welcome"))
				return yield* new ConnectFailed({ cause: "session-welcome-expected" });

			yield* Effect.gen(function* () {
				yield* deleteOldSubscriptions(helixClient);

				yield* Effect.log("Creating subscriptions");
				yield* Effect.all(
					pipe(
						Object.values(subscriptionTypes),
						Array.take(10),
						Array.map((def) =>
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
						if (EventSubMessage.isType(event, "session_welcome"))
							throw new Error("Unexpected session welcome");

						if (EventSubMessage.isType(event, "notification")) {
							const notif = yield* S.decode(EventSubNotification.Any)({
								_tag: event.payload.subscription.type as any,
								...event.payload.event,
							}).pipe(Effect.option);

							if (Option.isSome(notif)) ctx.emitEvent(notif.value);
						}
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
		});

		const disconnectEventSub = Effect.fnUntraced(function* ({
			accountId,
		}: {
			accountId: AccountId;
		}) {
			const socket = sockets.get(accountId);
			if (!socket) return;

			yield* Scope.close(socket.scope, Exit.succeed(null));
			yield* Deferred.await(socket.closed);
		});

		// Helper to wrap Helix API calls with error handling
		const callHelix = <Args extends { accountId: AccountId }, Ret>(
			fn: (
				client: any,
			) => (
				args: Args,
			) => Effect.Effect<Ret, MissingCredential | TwitchAPIError, any>,
		) =>
			Effect.fnUntraced(function* (args: Args) {
				const client = yield* createHelixClient(args.accountId);
				return yield* fn(client)(args).pipe(
					Effect.catchAll((cause) =>
						Effect.fail(new TwitchAPIError({ cause })),
					),
				);
			});

		return {
			clientState: Effect.gen(function* () {
				const creds = yield* ctx.credentials.get;
				return {
					accounts: creds
						.filter((c) => c.provider === "twitch")
						.map((c) => {
							const id = AccountId.make(c.id);
							return {
								id,
								displayName: c.displayName ?? c.id,
								eventSubSocket: {
									state: sockets.get(id)?.state ?? "disconnected",
								},
							};
						}),
				};
			}),
			resources: {
				TwitchEventSub: yield* LookupRef.make(
					Effect.sync(() =>
						[...sockets.entries()].map(([id, socket]) => ({
							id,
							display: socket.displayName,
						})),
					),
				),
				TwitchAccount: yield* LookupRef.derive(ctx.credentials, (creds) =>
					 creds
						.filter((c) => c.provider === "twitch")
						.map((c) => ({
							id: AccountId.make(c.id),
							display: c.displayName ?? c.id,
						}))
				),
			},
			clientRpcs: {
				ConnectEventSub: (opts) =>
					connectEventSub(opts).pipe(
						Effect.catchAll((cause) =>
							Effect.fail(new TwitchAPIError({ cause })),
						),
						Effect.provide(Socket.layerWebSocketConstructorGlobal),
					),
				DisconnectEventSub: disconnectEventSub,
			},
			runtimeRpcs: {
				// All 75 Helix API RPCs
				// Each RPC calls the corresponding Helix API endpoint via the HTTP client
				// NOTE: These implementations are functional but require proper OAuth token access
				AddChannelVip: callHelix((client) => client.addChannelVip),
				BlockUser: callHelix((client) => client.blockUser),
				CancelRaid: callHelix((client) => client.cancelRaid),
				CheckUserSubscription: callHelix(
					(client) => client.checkUserSubscription,
				),
				CreateClip: callHelix((client) => client.createClip),
				CreateCustomReward: callHelix((client) => client.createCustomReward),
				CreatePoll: callHelix((client) => client.createPoll),
				CreatePrediction: callHelix((client) => client.createPrediction),
				CreateScheduleSegment: callHelix(
					(client) => client.createScheduleSegment,
				),
				CreateStreamMarker: callHelix((client) => client.createStreamMarker),
				DeleteCustomRewards: callHelix((client) => client.deleteCustomRewards),
				DeleteEventSubSubscription: callHelix(
					(client) => client.deleteEventSubSubscription,
				),
				DeleteScheduleSegment: callHelix(
					(client) => client.deleteScheduleSegment,
				),
				DeleteVideos: callHelix((client) => client.deleteVideos),
				EndPoll: callHelix((client) => client.endPoll),
				EndPrediction: callHelix((client) => client.endPrediction),
				GetBitsLeaderboard: callHelix((client) => client.getBitsLeaderboard),
				GetChannelChatBadges: callHelix(
					(client) => client.getChannelChatBadges,
				),
				GetChannelEditors: callHelix((client) => client.getChannelEditors),
				GetChannelEmotes: callHelix((client) => client.getChannelEmotes),
				GetChannelFollowers: callHelix((client) => client.getChannelFollowers),
				GetChannelInformation: callHelix(
					(client) => client.getChannelInformation,
				),
				GetChannelVips: callHelix((client) => client.getChannelVips),
				GetCharityCampaigns: callHelix((client) => client.getCharityCampaigns),
				GetCharityDonations: callHelix((client) => client.getCharityDonations),
				GetChatChatters: callHelix((client) => client.getChatChatters),
				GetChatSettings: callHelix((client) => client.getChatSettings),
				GetCheermotes: callHelix((client) => client.getCheermotes),
				GetClips: callHelix((client) => client.getClips),
				GetCreatorGoals: callHelix((client) => client.getCreatorGoals),
				GetCustomRewards: callHelix((client) => client.getCustomRewards),
				GetCustomRewardsRedemptions: callHelix(
					(client) => client.getCustomRewardsRedemptions,
				),
				GetDropsEntitlements: callHelix(
					(client) => client.getDropsEntitlements,
				),
				GetEmoteSets: callHelix((client) => client.getEmoteSets),
				GetEventSubSubscriptions: callHelix(
					(client) => client.getEventSubSubscriptions,
				),
				GetExtensionAnalytics: callHelix(
					(client) => client.getExtensionAnalytics,
				),
				GetFollowedChannels: callHelix((client) => client.getFollowedChannels),
				GetFollowedStreams: callHelix((client) => client.getFollowedStreams),
				GetGameAnalytics: callHelix((client) => client.getGameAnalytics),
				GetGames: callHelix((client) => client.getGames),
				GetGlobalChatBadges: callHelix((client) => client.getGlobalChatBadges),
				GetGlobalEmotes: callHelix((client) => client.getGlobalEmotes),
				GetHypeTrainEvents: callHelix((client) => client.getHypeTrainEvents),
				GetPolls: callHelix((client) => client.getPolls),
				GetPredictions: callHelix((client) => client.getPredictions),
				GetSchedule: callHelix((client) => client.getSchedule),
				GetStreamKey: callHelix((client) => client.getStreamKey),
				GetStreamMarkers: callHelix((client) => client.getStreamMarkers),
				GetStreams: callHelix((client) => client.getStreams),
				GetSubscriptions: callHelix((client) => client.getSubscriptions),
				GetTopGames: callHelix((client) => client.getTopGames),
				GetUserChatColor: callHelix((client) => client.getUserChatColor),
				GetUsers: callHelix((client) => client.getUsers),
				GetUsersBlocked: callHelix((client) => client.getUsersBlocked),
				GetUsersFollows: callHelix((client) => client.getUsersFollows),
				GetVideos: callHelix((client) => client.getVideos),
				ModifyChannelInformation: callHelix(
					(client) => client.modifyChannelInformation,
				),
				RemoveChannelVip: callHelix((client) => client.removeChannelVip),
				SearchCategories: callHelix((client) => client.searchCategories),
				SearchChannels: callHelix((client) => client.searchChannels),
				SendChatAnnouncement: callHelix(
					(client) => client.sendChatAnnouncement,
				),
				SendChatMessage: callHelix((client) => client.sendChatMessage),
				SendWhisper: callHelix((client) => client.sendWhisper),
				StartCommercial: callHelix((client) => client.startCommercial),
				StartRaid: callHelix((client) => client.startRaid),
				UnblockUser: callHelix((client) => client.unblockUser),
				UpdateChannelCustomRewardsRedemptionStatus: callHelix(
					(client) => client.updateChannelCustomRewardsRedemptionStatus,
				),
				UpdateChatSettings: callHelix((client) => client.updateChatSettings),
				UpdateCustomReward: callHelix((client) => client.updateCustomReward),
				UpdateDropsEntitlements: callHelix(
					(client) => client.updateDropsEntitlements,
				),
				UpdateSchedule: callHelix((client) => client.updateSchedule),
				UpdateScheduleSegment: callHelix(
					(client) => client.updateScheduleSegment,
				),
				UpdateUser: callHelix((client) => client.updateUser),
				UpdateUserChatColor: callHelix((client) => client.updateUserChatColor),
			},
		} satisfies PackageEngine.Built<typeof EngineDef>;
	}),
);

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
				? helixClient.deleteEventSubSubscription({ urlParams: { id: sub.id } })
				: Effect.void,
		),
		{ concurrency: 10 },
	);
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

const buildCondition = <T extends SubscriptionTypeDefinition>(
	def: T,
	accountId: string,
): Record<keyof SubscriptionTypeDefinition["condition"], string> => {
	return Object.fromEntries(
		Object.keys(def.condition).map((key) => [key, accountId]),
	) as any;
};
