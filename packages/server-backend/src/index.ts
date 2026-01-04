import {
	type HttpApp,
	HttpClient,
	HttpRouter,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import type { Route } from "@effect/platform/HttpRouter";
import { RpcMiddleware, RpcServer } from "@effect/rpc";
import {
	Context,
	Effect,
	FiberRef,
	HashMap,
	Layer,
	Option,
	Schema,
	Stream,
} from "effect";
import { getCurrentFiber } from "effect/Fiber";
import * as Packages from "@macrograph/base-packages";
import {
	Graph,
	Node,
	Package,
	Project,
	type ProjectEvent,
} from "@macrograph/project-domain";
import {
	CloudApiClient,
	CredentialsStore,
	GraphRequests,
	NodeRequests,
	NodesIOStore,
	PackageActions,
	ProjectEditor,
	ProjectRequests,
	RuntimeActions,
} from "@macrograph/project-runtime";
import {
	ClientAuth as DClientAuth,
	EditorRpcs as RawEditorRpcs,
	Realtime,
	RpcsSerialization,
	ServerEvent,
	ServerRpcs,
} from "@macrograph/server-domain";
import * as Jose from "jose";

import { ClientAuth } from "./ClientAuth/ClientAuth";
import {
	type ClientAuthJWT,
	ClientAuthJWTFromEncoded,
} from "./ClientAuth/ClientAuthJWT";
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

class ProjectEditorRpcMiddleware extends RpcMiddleware.Tag<ProjectEditorRpcMiddleware>()(
	"ProjectEditorRpcMiddleware",
	{ provides: ProjectEditor.ProjectEditor },
) {}

const EditorRpcs = RawEditorRpcs.middleware(ProjectEditorRpcMiddleware);

const EditorRpcsLive = EditorRpcs.toLayer(
	Effect.gen(function* () {
		const projectRequests = yield* ProjectRequests;
		const graphRequests = yield* GraphRequests;
		const nodeRequests = yield* NodeRequests;
		// const serverPolicy = yield* ServerPolicy;

		return {
			GetProject: () => projectRequests.getProject,
			CreateNode: graphRequests.createNode,
			ConnectIO: graphRequests.connectIO,
			SetItemPositions: graphRequests.setItemPositions,
			GetPackageSettings: (req) => new Package.NotFound({ id: req.package }),
			// projectRequests
			// 	.getPackageSettings(req)
			// 	.pipe(Policy.withPolicy(serverPolicy.isOwner)),
			CreateGraph: projectRequests.createGraph,
			DeleteGraphItems: graphRequests.deleteItems,
			DisconnectIO: graphRequests.disconnectIO,
			SetNodeProperty: nodeRequests.setNodeProperty,
			CreateResourceConstant: projectRequests.createResourceConstant,
			UpdateResourceConstant: projectRequests.updateResourceConstant,
			DeleteResourceConstant: projectRequests.deleteResourceConstant,
		};
	}),
);

const RpcsLive = Layer.mergeAll(
	EditorRpcsLive,
	PresenceRpcsLive,
	CloudRpcsLive,
	ClientAuthRpcsLive,
	CredentialRpcsLive,
);

const Rpcs = EditorRpcs.merge(ServerRpcs);

export class Server extends Effect.Service<Server>()("Server", {
	scoped: Effect.gen(function* () {
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

		const editor = ProjectEditor.layer({
			project: new Project.Project({
				name: "New Project",
				graphs: HashMap.empty(),
				constants: HashMap.empty(),
				nextGraphId: Graph.Id.make(0),
				nextNodeId: Node.Id.make(0),
			}),
		});

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
			Effect.provide(
				ProjectEditorRpcMiddleware.context(() =>
					ProjectEditor.ProjectEditor.pipe(Effect.provide(editor)),
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
						Effect.provide(Realtime.Connection.context({ id })),
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
					).pipe(
						Effect.catchAll(() =>
							Effect.succeed({ jwt: Option.none<ClientAuthJWT>() }),
						),
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
						Effect.provide(Realtime.Connection.context({ id: connectionId })),
						Effect.provide(editor),
						Effect.forkScoped,
					);

					yield* socket.runRaw(() => {});

					return HttpServerResponse.empty();
				}).pipe(Effect.scoped),
			),
			allAsMounted(
				"/package/:package/rpc",
				Effect.gen(function* () {
					// const { package: pkgId } = yield* HttpRouter.schemaPathParams(
					// 	Schema.Struct({ package: Package.Id }),
					// );
					// const engine = runtime.packages.get(pkgId)?.engine;

					// if (!engine)
					// 	return HttpServerResponse.text("Package not found", {
					// 		status: 404,
					// 	});

					return HttpServerResponse.text("Not Implemented", { status: 501 });

					// const httpApp = yield* RpcServer.toHttpApp(engine.def.rpc, {
					// 	spanPrefix: `PackageRpc.${pkgId}`,
					// }).pipe(
					// 	Effect.provide(
					// 		Layer.mergeAll(
					// 			engine.rpc,
					// 			RpcServer.layerProtocolHttp({ path: "/" }),
					// 		),
					// 	),
					// 	Effect.provide(RpcSerialization.layerJson),
					// );

					// return yield* httpApp;
				}),
			),
			Effect.provideService(RealtimeConnections, yield* RealtimeConnections),
			Effect.provideService(RealtimePubSub, yield* RealtimePubSub),
			Effect.provideService(PresenceState, yield* PresenceState),
			Effect.provideService(JwtKeys, yield* JwtKeys),
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
		NodesIOStore.Default,
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
	const editor = yield* ProjectEditor.ProjectEditor;
	const realtimeConnection = yield* Realtime.Connection;

	const presence = yield* PresenceState;
	yield* presence.registerToScope;

	return Stream.mergeAll(
		[
			(yield* editor.subscribe).pipe(
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
