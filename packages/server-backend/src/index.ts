import {
	type HttpApp,
	HttpClient,
	HttpRouter,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import type { Route } from "@effect/platform/HttpRouter";
import { RpcSerialization, RpcServer } from "@effect/rpc";
import { Context, FiberRef, Layer, Option, Schema, Stream } from "effect";
import * as Effect from "effect/Effect";
import { getCurrentFiber } from "effect/Fiber";
import * as Packages from "@macrograph/base-packages";
import { Package, Policy, type ProjectEvent } from "@macrograph/project-domain";
import {
	CloudApiClient,
	CredentialsStore,
	GraphRequests,
	NodeRequests,
	PackageActions,
	ProjectRequests,
	ProjectRuntime,
	RuntimeActions,
} from "@macrograph/project-runtime";
import {
	ClientAuth as DClientAuth,
	Realtime,
	RequestRpcs,
	Rpcs,
	RpcsSerialization,
	ServerEvent,
} from "@macrograph/server-domain";
import * as Jose from "jose";

import { ClientAuth } from "./ClientAuth/ClientAuth";
import { ClientAuthJWTFromEncoded } from "./ClientAuth/ClientAuthJWT";
import { ClientAuthRpcsLive } from "./ClientAuth/rpc";
import { CloudRpcsLive } from "./CloudApi/rpc";
import { CredentialsRpcsLive as CredentialRpcsLive } from "./Credentials";
import { JwtKeys } from "./JwtKeys";
import { PresenceRpcsLive, PresenceState } from "./Presence";
import { RealtimeConnections, RealtimePubSub } from "./Realtime";
import { ServerPolicy } from "./ServerPolicy";
import { ServerRegistration } from "./ServerRegistration";

export * from "./ServerConfig";
export * from "./ServerRegistration";

const RequestRpcsLive = RequestRpcs.toLayer(
	Effect.gen(function* () {
		const projectRequests = yield* ProjectRequests;
		const graphRequests = yield* GraphRequests;
		const nodeRequests = yield* NodeRequests;
		const serverPolicy = yield* ServerPolicy;

		return {
			GetProject: () => projectRequests.getProject,
			CreateNode: graphRequests.createNode,
			ConnectIO: graphRequests.connectIO,
			SetItemPositions: graphRequests.setItemPositions,
			GetPackageSettings: (req) =>
				projectRequests
					.getPackageSettings(req)
					.pipe(Policy.withPolicy(serverPolicy.isOwner)),
			CreateGraph: projectRequests.createGraph,
			DeleteGraphItems: graphRequests.deleteItems,
			DisconnectIO: graphRequests.disconnectIO,
			SetNodeProperty: nodeRequests.setNodeProperty,
			CreateResourceConstant: projectRequests.createResourceConstant,
			UpdateResourceConstant: projectRequests.updateResourceConstant,
		};
	}),
);

const RpcsLive = Layer.mergeAll(
	RequestRpcsLive,
	PresenceRpcsLive,
	CloudRpcsLive,
	ClientAuthRpcsLive,
	CredentialRpcsLive,
);

export class Server extends Effect.Service<Server>()("Server", {
	scoped: Effect.gen(function* () {
		const runtime = yield* ProjectRuntime.Current;
		const packages = yield* PackageActions;
		const realtimeConnections = yield* RealtimeConnections;

		yield* packages.loadPackage("util", Packages.util).pipe(Effect.orDie);
		yield* packages.loadPackage("twitch", Packages.twitch).pipe(Effect.orDie);
		yield* packages.loadPackage("obs", Packages.obs).pipe(Effect.orDie);

		const nextRealtimeClient = (() => {
			let i = 0;
			return () => Realtime.ConnectionId.make(i++);
		})();

		const realtimeSecretKey = yield* Effect.promise(() =>
			Jose.generateSecret("HS256"),
		);

		const rpcsWebApp = yield* RpcServer.toHttpAppWebsocket(Rpcs).pipe(
			Effect.provide(RpcsLive),
			Effect.provide(
				Realtime.CurrentActorRpcMiddleware.context(() =>
					Effect.serviceOption(Realtime.Connection).pipe(
						Effect.map(Option.getOrThrow),
						Effect.map((conn) => ({ type: "CLIENT", id: conn.id.toString() })),
					),
				),
			),
			Effect.provide(
				Realtime.ConnectionRpcMiddleware.context(() =>
					Effect.serviceOption(Realtime.Connection).pipe(
						Effect.map(Option.getOrThrow),
					),
				),
			),
			Effect.provide(
				DClientAuth.ClientAuthRpcMiddleware.context(() =>
					Effect.succeed({ userId: "", permissions: new Set() }),
				),
			),
			Effect.provide(RpcsSerialization),
		);

		// @effect-diagnostics-next-line returnEffectInGen:off
		return HttpRouter.empty.pipe(
			HttpRouter.mountApp(
				"/rpc",
				Effect.gen(function* () {
					const realtimeConnections = yield* RealtimeConnections;
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
					const cloud = yield* CloudApiClient.CloudApiClient;
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
							Effect.fnUntraced(function* (jwt) {
								return yield* cloud.getUser().pipe(
									Effect.flatten,
									Effect.map((u) => ({ userId: u.id, email: u.email, jwt })),
									Effect.option,
									Effect.provideService(
										CloudApiClient.Auth,
										Effect.succeed(
											Option.some({
												token: jwt.accessToken,
												clientId: "macrograph-server",
											}),
										),
									),
								);
							}),
						),
						Effect.transposeOption,
						Effect.map(Option.flatten),
					);

					if (Option.isSome(auth))
						yield* Effect.log(`Authenticated as '${auth.value.userId}'`);

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

						yield* createEventStream.pipe(
							Effect.flatMap(
								Stream.runForEach((e) => writer(JSON.stringify(e))),
							),
						);
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
					const { package: pkgId } = yield* HttpRouter.schemaPathParams(
						Schema.Struct({ package: Package.Id }),
					);
					const engine = runtime.packages
						.get(pkgId)
						?.engine.pipe(Option.getOrUndefined);

					if (!engine)
						return HttpServerResponse.text("Package not found", {
							status: 404,
						});

					const httpApp = yield* RpcServer.toHttpApp(engine.def.rpc, {
						spanPrefix: `PackageRpc.${pkgId}`,
					}).pipe(
						Effect.provide(
							Layer.mergeAll(
								engine.rpc,
								RpcServer.layerProtocolHttp({ path: "/" }),
							),
						),
						Effect.provide(RpcSerialization.layerJson),
					);

					return yield* httpApp;
				}),
			),
			Effect.provideService(RealtimeConnections, yield* RealtimeConnections),
			Effect.provideService(RealtimePubSub, yield* RealtimePubSub),
			Effect.provideService(PresenceState, yield* PresenceState),
			Effect.provideService(JwtKeys, yield* JwtKeys),
			Effect.provideService(
				ProjectRuntime.Current,
				yield* ProjectRuntime.Current,
			),
			Effect.provideService(
				HttpClient.HttpClient,
				yield* HttpClient.HttpClient,
			),
		);
	}),
	dependencies: [
		PresenceState.Default,
		RealtimePubSub.Default,
		RealtimeConnections.Default,
		JwtKeys.Default,
		ProjectRequests.Default,
		GraphRequests.Default,
		NodeRequests.Default,
		PackageActions.Default,
		RuntimeActions.Default,
		CredentialsStore.layer,
		ServerRegistration.Default,
		ServerPolicy.Default,
		CredentialsStore.layer,
		ClientAuth.Default,
		Layer.effect(ProjectRuntime.Current, ProjectRuntime.make()),
	],
}) {}

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
	const runtime = yield* ProjectRuntime.Current;
	const realtimeConnection = yield* Realtime.Connection;

	const presence = yield* PresenceState;
	yield* presence.registerToScope;

	return Stream.mergeAll(
		[
			Stream.fromPubSub(runtime.events).pipe(
				Stream.filter(
					(e) =>
						!(
							e.actor.type === "CLIENT" &&
							e.actor.id === realtimeConnection.id.toString()
						),
				),
				Stream.map(
					(v): ServerEvent.ServerEvent | ProjectEvent.ProjectEvent => v,
				),
			),
			presence.changes.pipe(
				Stream.map(
					(v): ServerEvent.ServerEvent | ProjectEvent.ProjectEvent =>
						new ServerEvent.PresenceUpdated({ data: v }),
				),
			),
		],
		{ concurrency: "unbounded" },
	);
});
