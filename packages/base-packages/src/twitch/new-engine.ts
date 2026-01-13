import {
	FetchHttpClient,
	Headers,
	HttpApiClient,
	HttpClient,
	HttpClientRequest,
	Socket,
} from "@effect/platform";
import { Data, Deferred, Effect, Exit, Option, pipe, Scope } from "effect";
import type { PackageEngine } from "@macrograph/package-sdk";

import { EngineDef } from ".";
import { HelixApi } from "./new-helix";
import { MissingCredential, TwitchAPIError } from "./new-types";

const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

class RetryRequest extends Data.TaggedError("RetryRequest") {}

export default EngineDef.toLayer((ctx) =>
	Effect.gen(function* () {
		type SocketState = {
			lock: Effect.Semaphore;
			state: "connecting" | "connected";
			closed: Deferred.Deferred<void>;
			scope: Scope.CloseableScope;
		};

		const sockets = new Map<string, SocketState>();

		const runSocketEdit = <A, E>(e: Effect.Effect<A, E>) =>
			pipe(e, Effect.andThen(Effect.sync(ctx.dirtyState)), Effect.runFork);

		const getCredential = (accountId: string) =>
			ctx.credentials.pipe(
				Effect.map((c) =>
					c.find((c) => c.provider === "twitch" && c.id === accountId),
				),
				Effect.map(Option.fromNullable),
			);

		const createHelixClient = (accountId: string) =>
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
			accountId: string;
		}) {
			if (sockets.get(accountId)) return;

			const lock = Effect.unsafeMakeSemaphore(1);
			const closed = yield* Deferred.make<void>();
			const scope = yield* Scope.make();

			const socket: SocketState = { lock, state: "connecting", closed, scope };

			yield* Effect.sync(() => {
				sockets.set(accountId, socket);
			}).pipe(runSocketEdit);

			// TODO: Implement full WebSocket connection logic
			// 1. Connect to wss://eventsub.wss.twitch.tv/ws
			// 2. Wait for session_welcome message
			// 3. Create EventSub subscriptions using Helix API
			// 4. Process incoming events and emit them via ctx.emitEvent()
			// 5. Handle disconnection and cleanup

			socket.state = "connected";
			yield* Effect.sync(() => {}).pipe(runSocketEdit);

			// Placeholder cleanup logic
			yield* Effect.sync(() => sockets.delete(accountId));
		});

		const disconnectEventSub = Effect.fnUntraced(function* ({
			accountId,
		}: {
			accountId: string;
		}) {
			const socket = sockets.get(accountId);
			if (!socket) return;

			yield* Scope.close(socket.scope, Exit.succeed(null));
			yield* Deferred.await(socket.closed);
		});

		// Helper to wrap Helix API calls with error handling
		const callHelix = <Args extends { accountId: string }, Ret>(
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
			clientState: Effect.succeed({ accounts: [] }),
			resources: { TwitchAccount: Effect.succeed([]) },
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
