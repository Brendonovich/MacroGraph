import { NodeSdk } from "@effect/opentelemetry";
import {
	type HttpApp,
	HttpClient,
	HttpClientRequest,
	HttpRouter,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import type { Route } from "@effect/platform/HttpRouter";
import { RpcServer } from "@effect/rpc";
import {
	Chunk,
	Config,
	Context,
	FiberRef,
	Layer,
	Mailbox,
	Option,
	PubSub,
	Schedule,
	Schema,
	Stream,
	SubscriptionRef,
} from "effect";
import * as Effect from "effect/Effect";
import { getCurrentFiber } from "effect/Fiber";
import * as Jose from "jose";
import {
	CurrentUser,
	type ProjectEvent,
	Realtime,
	Rpcs,
	RpcsSerialization,
} from "@macrograph/server-domain";
import { NodeContext } from "@effect/platform-node";

import { ClientAuthRpcsLive } from "./ClientAuth/rpc";
import { CloudApiClient } from "./CloudApi/ApiClient";
import { CloudRpcsLive } from "./CloudApi/rpc";
import { GraphRpcsLive, Graphs } from "./Graph";
import { NodeRpcsLive } from "./Node";
import { PresenceRpcsLive, PresenceState } from "./Presence";
import { ProjectActions } from "./Project/Actions";
import { ProjectPackages } from "./Project/Packages";
import { ProjectRpcsLive } from "./Project/rpc";
import { RealtimeConnections, RealtimePubSub } from "./Realtime";
import { ClientAuth } from "@macrograph/server-domain";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { JwtKeys } from "./JwtKeys";
import { ClientAuthJWTFromEncoded } from "./ClientAuth/ClientAuthJWT";
import {
	ServerRegistration,
	ServerRegistrationPolicy,
} from "./ServerRegistration";

export { ProjectActions } from "./Project/Actions";

const NodeSdkLive = NodeSdk.layer(() => ({
	resource: { serviceName: "mg-server" },
	// Export span data to the console
	spanProcessor: [
		new BatchSpanProcessor(new OTLPTraceExporter()),
		//   new BatchSpanProcessor(new ConsoleSpanExporter()),
	],
}));

export const DepsLive = Layer.mergeAll(
	ProjectActions.Default,
	Graphs.Default,
	CloudApiClient.Default,
	PresenceState.Default,
	ProjectPackages.Default,
	RealtimePubSub.Default,
	JwtKeys.Default,
	RealtimeConnections.Default,
	ServerRegistration.Default,
	ServerRegistrationPolicy.Default,
	NodeSdkLive,
).pipe(Layer.provideMerge(NodeContext.layer));

const RpcsLive = Layer.mergeAll(
	ProjectRpcsLive,
	GraphRpcsLive,
	NodeRpcsLive,
	PresenceRpcsLive,
	CloudRpcsLive,
	ClientAuthRpcsLive,
);

export const ServerLive = Effect.gen(function* () {
	const packages = yield* ProjectPackages;
	const cloud = yield* CloudApiClient;

	// const cloudAuthToken = yield* Config.string("CLOUD_AUTH_TOKEN").pipe(
	// 	Config.option,
	// 	Effect.andThen(
	// 		Effect.catchTag("NoSuchElementException", () =>
	// 			Effect.gen(function* () {
	// 				const pendingRegistration =
	// 					yield* cloud.api.startServerRegistration();

	// 				yield* Effect.log(
	// 					`Server registration code: ${pendingRegistration.userCode}`,
	// 				);

	// 				const registration = yield* cloud.api
	// 					.performServerRegistration({
	// 						payload: { id: pendingRegistration.id },
	// 					})
	// 					.pipe(
	// 						Effect.catchAll((error) => {
	// 							if (error._tag === "ServerRegistrationError")
	// 								return Effect.fail(error);
	// 							return Effect.dieMessage(
	// 								"Failed to perform server registration",
	// 							);
	// 						}),
	// 						Effect.retry({
	// 							schedule: Schedule.fixed(3000),
	// 							while: (error) => error.code === "authorization_pending",
	// 						}),
	// 						Effect.orDie,
	// 					);

	// 				return registration.token;
	// 			}),
	// 		),
	// 	),
	// );

	// const publicKey = yield* Config.string("JWT_PUBLIC_KEY").pipe(
	// 	Effect.andThen((v) =>
	// 		Effect.promise(() => Jose.importSPKI(v.replaceAll("\\n", "\n"), "RS256")),
	// 	),
	// 	Effect.orDie,
	// );

	// const { payload } = yield* Effect.promise(() =>
	// 	Jose.jwtVerify(cloudAuthToken, publicKey),
	// );

	// yield* Effect.log(`Cloud auth token: ${cloudAuthToken}`);

	// const { ownerId } = payload;

	// const cloudRegistration = CloudRegistration.context({
	// 	ownerId: ownerId as string,
	// 	token: cloudAuthToken,
	// });

	const nextRealtimeClient = (() => {
		let i = 0;
		return () => Realtime.ConnectionId.make(i++);
	})();

	const realtimeMiddleware = Realtime.ConnectionRpcMiddleware.context(() =>
		Effect.serviceOption(Realtime.Connection).pipe(
			Effect.map(Option.getOrThrow),
		),
	);

	const realtimeSecretKey = yield* Effect.promise(() =>
		Jose.generateSecret("HS256"),
	);

	const rpcsWebApp = yield* RpcServer.toHttpAppWebsocket(Rpcs, {
		spanPrefix: "ProjectRpc",
	}).pipe(
		Effect.provide(RpcsLive),
		Effect.provide(realtimeMiddleware),
		Effect.provide(
			ClientAuth.ClientAuthRpcMiddleware.context(() =>
				Effect.succeed({ userId: "", permissions: new Set() }),
			),
		),
		Effect.provide(RpcsSerialization),
	);

	const realtimeConnections = yield* RealtimeConnections;

	return HttpRouter.empty.pipe(
		HttpRouter.mountApp(
			"/rpc",
			Effect.gen(function* () {
				const req = yield* HttpServerRequest.HttpServerRequest;

				const searchParams = yield* HttpServerRequest.schemaSearchParams(
					Schema.Struct({ token: Schema.String }),
				).pipe(
					Effect.provide(
						HttpServerRequest.ParsedSearchParams.context(
							HttpServerRequest.searchParamsFromURL(
								new URL(req.originalUrl, "s://"),
							),
						),
					),
				);

				const res = yield* Effect.promise(() =>
					Jose.jwtVerify(searchParams.token, realtimeSecretKey),
				);

				const id = Realtime.ConnectionId.make(res.payload.id as number);

				const conn = realtimeConnections.get(id);
				if (!conn) throw new Error("Connection not found");

				return yield* rpcsWebApp.pipe(
					Effect.provide(
						Realtime.Connection.context({
							id,
						}),
					),
				);
			}),
		),
		HttpRouter.get(
			"/realtime",
			Effect.gen(function* () {
				const req = yield* HttpServerRequest.HttpServerRequest;
				const socket = yield* req.upgrade;
				const writer = yield* socket.writer;

				const { jwt } = yield* HttpServerRequest.schemaSearchParams(
					Schema.Struct({
						jwt: Schema.OptionFromUndefinedOr(ClientAuthJWTFromEncoded),
					}),
				);

				const auth = yield* jwt.pipe(
					Option.map(
						Effect.fn(function* (jwt) {
							const client = yield* cloud.makeClient({
								transformClient: HttpClient.mapRequest(
									HttpClientRequest.bearerToken(jwt.accessToken),
								),
							});

							return yield* client.getUser().pipe(
								Effect.option,
								Effect.map(Option.flatten),
								Effect.map(
									Option.map((u) => ({
										userId: u.id,
										email: u.email,
										jwt,
									})),
								),
							);
						}),
					),
					Effect.transposeOption,
					Effect.map(Option.flatten),
				);

				const connectionId = nextRealtimeClient();

				realtimeConnections.set(connectionId, { auth });

				yield* Effect.gen(function* () {
					yield* writer(
						JSON.stringify({
							type: "identify",
							id: connectionId,
							token: yield* Effect.promise(() =>
								new Jose.SignJWT({ id: connectionId })
									.setProtectedHeader({ alg: "HS256" })
									.sign(realtimeSecretKey),
							),
						}),
					);

					const mailbox = yield* createEventStream;
					while (true) {
						const a = yield* mailbox.take;
						yield* writer(JSON.stringify(a));
					}
				}).pipe(
					Effect.provide(
						Realtime.Connection.context({
							id: connectionId,
						}),
					),
					Effect.forkScoped,
				);

				yield* socket.runRaw(() => {});

				return HttpServerResponse.empty();
			}).pipe(Effect.scoped),
		),
		allAsMounted(
			"/package/:package/rpc",
			Effect.gen(function* () {
				const { package: pkg } = yield* HttpRouter.schemaPathParams(
					Schema.Struct({ package: Schema.String }),
				);
				const server = packages.get(pkg)?.rpcServer.pipe(Option.getOrUndefined);
				if (!server)
					return HttpServerResponse.text("Package not found", {
						status: 404,
					});

				return yield* server;
			}),
		),
	);
});

const executeAppAsMounted = <A, E, R>(app: HttpApp.HttpApp<A, E, R>) =>
	Effect.gen(function* () {
		const req = yield* HttpServerRequest.HttpServerRequest;
		const fiber = Option.getOrThrow(getCurrentFiber());
		const context = Context.unsafeMake(
			new Map(fiber.getFiberRef(FiberRef.currentContext).unsafeMap),
		);

		context.unsafeMap.set(
			HttpServerRequest.HttpServerRequest.key,
			sliceRequestUrl(req, req.url),
		);

		return yield* app;
	});

function sliceRequestUrl(
	request: HttpServerRequest.HttpServerRequest,
	prefix: string,
) {
	const prefexLen = prefix.length;
	return request.modify({
		url: request.url.length <= prefexLen ? "/" : request.url.slice(prefexLen),
	});
}

const allAsMounted =
	<R1, E1>(path: `/${string}`, handler: Route.Handler<E1, R1>) =>
	<E, R>(self: HttpRouter.HttpRouter<E, R>) =>
		HttpRouter.all(self, path, executeAppAsMounted(handler));

const createEventStream = Effect.gen(function* () {
	const realtimeClient = yield* Realtime.Connection;
	const packages = yield* ProjectPackages;

	const packageStates = Stream.fromIterable(packages.entries()).pipe(
		Stream.filterMap(([name, { state }]) =>
			Option.map(
				state,
				(_): ProjectEvent => ({
					type: "packageAdded",
					data: { package: name },
				}),
			),
		),
	);

	const eventQueue = yield* PubSub.unbounded<ProjectEvent>();

	const eventStream = Stream.fromPubSub(eventQueue);

	const packageStatesStream = yield* Chunk.fromIterable(
		packages.entries(),
	).pipe(
		Chunk.filterMap(([name, { state }]) =>
			state.pipe(
				Option.map((state) =>
					Effect.map(state.changes, (state) =>
						Stream.fromQueue(state).pipe(
							Stream.map((): (typeof ProjectEvent)["Type"] => ({
								type: "packageStateChanged",
								package: name,
							})),
						),
					),
				),
			),
		),
		Effect.all,
		Effect.map(Stream.mergeAll({ concurrency: "unbounded" })),
	);

	const presence = yield* PresenceState;
	yield* presence.registerToScope;

	const numSubscriptionsStream = presence.changes.pipe(
		Stream.map((v): ProjectEvent => {
			return {
				type: "PresenceUpdated",
				data: v,
			};
		}),
	);

	const mailbox = yield* Mailbox.make<ProjectEvent>();

	const realtime = yield* RealtimePubSub;

	const realtimeStream = realtime.subscribe().pipe(
		Stream.filterMap(([id, item]) => {
			if (id !== realtimeClient.id) return Option.some(item);
			return Option.none();
		}),
	);

	yield* Stream.mergeAll(
		[
			packageStates,
			// authStream,
			eventStream,
			packageStatesStream,
			numSubscriptionsStream,
			realtimeStream,
		],
		{ concurrency: "unbounded" },
	).pipe(
		Stream.runForEach((i) => mailbox.offer(i)),
		Effect.forkScoped,
	);

	return mailbox;
});
