import {
	HttpApp,
	HttpRouter,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import { RpcServer } from "@effect/rpc";
import {
	Context,
	Layer,
	Option,
	PubSub,
	Stream,
	Schema,
	FiberRef,
	Mailbox,
	Chunk,
	SubscriptionRef,
} from "effect";
import * as Effect from "effect/Effect";
import { NodeSdk } from "@effect/opentelemetry";
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Route } from "@effect/platform/HttpRouter";
import { getCurrentFiber } from "effect/Fiber";
import * as JOSE from "jose";

// import { RpcsSerialization, ProjectEvent } from "./shared";
// import { NodeRpcsLive } from "./domain/Node/rpc";
// import {
//   RealtimeConnection,
//   RealtimeConnectionId,
// } from "./domain/Realtime/Connection";
// import { RealtimePubSub } from "./domain/Realtime/PubSub";
// import { CloudAPIClient } from "./domain/CloudApi/ApiClient";
// import { CloudApiAuthState } from "./domain/CloudApi/AuthState";
// import { Presence } from "./domain/Presence/Presence";
// import {
//   ClientAuthJwt,
//   RpcAuthMiddleware,
//   RpcRealtimeMiddleware,
// } from "./domain/Rpc/Middleware";
// import { ProjectActions } from "./domain/Project/Actions";
// import { ProjectPackages } from "./domain/Project/Packages";
// import { Graphs } from "./domain/Graph/Graphs";
// import { GraphRpcsLive } from "./domain/Graph/rpc";
// import { ProjectRpcsLive } from "./domain/Project/rpc";
// import { Rpcs } from "./rpc";
// import { PresenceRpcsLive } from "./domain/Presence/rpc";
// import { CloudRpcsLive } from "./domain/CloudApi/rpc";
// import { ClientAuthRpcsLive } from "./domain/ClientAuth/rpc";
import {
	ProjectEvent,
	Realtime,
	Rpcs,
	RpcsSerialization,
} from "@macrograph/server-domain";
import { ProjectActions } from "./Project/Actions";
import { GraphRpcsLive, Graphs } from "./Graph";
import { CloudApiAuthState } from "./CloudApi/AuthState";
import { CloudAPIClient } from "./CloudApi/ApiClient";
import { ProjectPackages } from "./Project/Packages";
import {
	RealtimeConnection,
	RealtimeConnectionId,
	RealtimePubSub,
} from "./Realtime";
import { PresenceRpcsLive, PresenceState } from "./Presence";
import { ProjectRpcsLive } from "./Project/rpc";
import { NodeRpcsLive } from "./Node";
import { CloudRpcsLive } from "./CloudApi/rpc";
import { ClientAuthRpcsLive } from "./ClientAuth/rpc";

export { ProjectActions } from "./Project/Actions";

const NodeSdkLive = NodeSdk.layer(() => ({
	resource: { serviceName: "mg-server" },
	// Export span data to the console
	// spanProcessor: [
	//   new BatchSpanProcessor(new OTLPTraceExporter()),
	//   new BatchSpanProcessor(new ConsoleSpanExporter()),
	// ],
}));

export const DepsLive = Layer.mergeAll(
	ProjectActions.Default,
	Graphs.Default,
	CloudApiAuthState.Default,
	CloudAPIClient.Default,
	PresenceState.Default,
	ProjectPackages.Default,
	RealtimePubSub.Default,
	NodeSdkLive,
);

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

	const nextRealtimeClient = (() => {
		let i = 0;
		return () => RealtimeConnectionId.make(i++);
	})();

	const realtimeConnections = new Map<
		number,
		{ auth: Option.Option<{ jwt: string; userId: string }> }
	>();

	const realtimeMiddleware = Realtime.ConnectionRpcMiddleware.context(() =>
		Effect.serviceOption(RealtimeConnection).pipe(
			Effect.map(Option.getOrThrow),
		),
	);

	const realtimeSecretKey = yield* Effect.promise(() =>
		JOSE.generateSecret("HS256"),
	);

	const rpcsWebApp = yield* RpcServer.toHttpAppWebsocket(Rpcs, {
		spanPrefix: "ProjectRpc",
	}).pipe(
		Effect.provide(RpcsLive),
		Effect.provide(NodeRpcsLive),
		Effect.provide(realtimeMiddleware),
		Effect.provide(RpcsSerialization),
	);

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
					JOSE.jwtVerify(searchParams.token, realtimeSecretKey),
				);

				const id = RealtimeConnectionId.make(res.payload.id as number);

				return yield* rpcsWebApp.pipe(
					Effect.provide(
						RealtimeConnection.context({
							id,
							authJwt: yield* SubscriptionRef.make(Option.none<string>()),
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

				const connectionId = nextRealtimeClient();

				realtimeConnections.set(connectionId, { auth: Option.none() });

				yield* Effect.gen(function* () {
					yield* writer(
						JSON.stringify({
							type: "identify",
							id: connectionId,
							token: yield* Effect.promise(() =>
								new JOSE.SignJWT({ id: connectionId })
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
						RealtimeConnection.context({
							id: connectionId,
							authJwt: yield* SubscriptionRef.make(Option.none<string>()),
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
	const realtimeClient = yield* RealtimeConnection;
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

	const cloudAuth = yield* CloudApiAuthState;

	const authStream = Stream.concat(
		Stream.fromEffect(cloudAuth.get),
		cloudAuth.changes,
	).pipe(
		Stream.map(
			(data): ProjectEvent => ({
				type: "authChanged",
				data: data ? { id: data.id, email: data.email } : null,
			}),
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
			authStream,
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
