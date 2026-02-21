import {
	type HttpApp,
	HttpClient,
	HttpRouter,
	HttpServerRequest,
	HttpServerResponse,
} from "@effect/platform";
import type { Route } from "@effect/platform/HttpRouter";
import { RpcMiddleware, RpcSerialization, RpcServer } from "@effect/rpc";
import {
	Cache,
	Chunk,
	Context,
	Duration,
	Effect,
	FiberRef,
	Layer,
	Option,
	Record,
	Schema as S,
	Stream,
} from "effect";
import { getCurrentFiber } from "effect/Fiber";
import * as Packages from "@macrograph/base-packages";
import {
	NodesIOStore,
	Package,
	ProjectEvent,
} from "@macrograph/project-domain";
import {
	GraphRequests,
	NodeRequests,
	ProjectEditor,
	ProjectRequests,
} from "@macrograph/project-editor";
import {
	CloudApiClient,
	CredentialsStore,
	EngineInstanceClient,
	EngineRegistry,
	PackageActions,
	ProjectRuntime,
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
import { ServerProjectPersistence } from "./ServerProjectPersistence.ts";
import { ServerRegistration } from "./ServerRegistration";

export * from "./ServerConfig";
export * from "./ServerProjectPersistence.ts";
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
		const packageActions = yield* PackageActions;
		const editor = yield* ProjectEditor.ProjectEditor;

		return {
			GetProject: Effect.request(projectRequests.GetProjectResolver),
			CreateNode: Effect.request(graphRequests.CreateNodeResolver),
			ConnectIO: Effect.request(graphRequests.ConnectIOResolver),
			SetItemPositions: Effect.request(graphRequests.SetItemPositionsResolver),
			CreateGraph: Effect.request(projectRequests.CreateGraphResolver),
			DeleteGraphItems: Effect.request(graphRequests.DeleteGraphItemsResolver),
			DisconnectIO: Effect.request(graphRequests.DisconnectIOResolver),
			SetNodeProperty: Effect.request(nodeRequests.SetNodePropertyResolver),
			SetInputDefault: Effect.request(nodeRequests.SetInputDefaultResolver),
			CreateResourceConstant: Effect.request(
				projectRequests.CreateResourceConstantResolver,
			),
			UpdateResourceConstant: Effect.request(
				projectRequests.UpdateResourceConstantResolver,
			),
			DeleteResourceConstant: Effect.request(
				projectRequests.DeleteResourceConstantResolver,
			),
			GetPackageEngineState: Effect.request(
				packageActions.GetPackageEngineStateResolver,
			),
			FetchSuggestions: Effect.request(
				packageActions.FetchSuggestionsResolver.pipe(
					Effect.provide(
						Layer.effect(ProjectRuntime.CurrentProject, editor.project),
					),
				),
			),
			// GetPackageSettings: (req) => new Package.NotFound({ id: req.package }),
			// projectRequests
			// 	.getPackageSettings(req)
			// 	.pipe(Policy.withPolicy(serverPolicy.isOwner)),
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

const RuntimeLive = Layer.scoped(
	ProjectRuntime.ProjectRuntime,
	Effect.gen(function* () {
		const runtime = yield* ProjectRuntime.make();

		for (const [id, pkg] of Object.entries(Packages)) {
			yield* runtime.loadPackage(Package.Id.make(id), pkg);
		}

		return runtime;
	}),
);

const EditorLive = Layer.scoped(
	ProjectEditor.ProjectEditor,
	Effect.gen(function* () {
		const persistence = yield* ServerProjectPersistence;
		const project = yield* persistence.readProject;

		const editor = yield* ProjectEditor.make();

		yield* editor.loadPackage(Package.Id.make("util"), Packages.util);
		yield* editor.loadPackage(Package.Id.make("twitch"), Packages.twitch);
		yield* editor.loadPackage(Package.Id.make("obs"), Packages.obs);

		if (Option.isSome(project)) yield* editor.loadProject(project.value);

		yield* (yield* editor.subscribe).pipe(
			Stream.throttle({ cost: Chunk.size, duration: "100 millis", units: 1 }),
			Stream.runForEach(
				Effect.fnUntraced(function* () {
					yield* persistence.writeProject(yield* editor.project);
				}),
			),
			Effect.forkScoped,
		);

		return editor;
	}),
);

const Deps = Layer.mergeAll(
	PresenceState.Default,
	RealtimePubSub.Default,
	RealtimeConnections.Default,
	JwtKeys.Default,
	ProjectRequests.Default,
	GraphRequests.Default,
	NodeRequests.Default,
	PackageActions.Default,
	// RuntimeActions.Default,
	ServerRegistration.Default,
	ServerPolicy.Default,
	ClientAuth.Default,
	EngineRegistry.EngineRegistry.Default,
	RuntimeLive,
	EditorLive,
).pipe(
	Layer.provideMerge(
		Layer.mergeAll(CredentialsStore.Default, NodesIOStore.Default),
	),
);

export class Server extends Effect.Service<Server>()("Server", {
	scoped: Effect.gen(function* () {
		const editor = yield* ProjectEditor.ProjectEditor;
		const runtime = yield* ProjectRuntime.ProjectRuntime;

		const realtimeConnections = yield* RealtimeConnections;

		const packageEngines = yield* Effect.promise(
			() => import("@macrograph/base-packages/engines"),
		);

		const engineRegistry = yield* EngineRegistry.EngineRegistry;

		for (const [_id, engineLayer] of Object.entries(packageEngines)) {
			const id = Package.Id.make(_id);
			engineRegistry.engines.set(
				id,
				yield* EngineInstanceClient.makeLocal({
					pkgId: id,
					engine: (Packages as any)[id].engine!,
					layer: engineLayer as any,
					getProject: editor.project,
				}),
			);
		}

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
			Effect.provide(
				ProjectEditorRpcMiddleware.context(() => Effect.succeed(editor)),
			),
			Effect.provide(RpcsSerialization),
		);

		const packageRpc = yield* Cache.make({
			capacity: 1000,
			lookup: (pkgId: Package.Id) =>
				Effect.gen(function* () {
					const engine = engineRegistry.engines.get(pkgId);

					if (!engine) return Option.none();

					const { protocol, httpApp } =
						yield* RpcServer.makeProtocolWithHttpApp.pipe(
							Effect.provide(RpcSerialization.layerJson),
						);

					yield* RpcServer.layer(engine.def.clientRpcs).pipe(
						Layer.provide(engine.client),
						Layer.provide(Layer.succeed(RpcServer.Protocol, protocol)),
						Layer.launch,
						Effect.forkScoped,
					);

					return Option.some(httpApp);
				}),
			timeToLive: Duration.infinity,
		});

		// @effect-diagnostics-next-line returnEffectInGen:off
		return HttpRouter.empty.pipe(
			HttpRouter.mountApp(
				"/rpc",
				Effect.gen(function* () {
					const realtimeConnections = yield* RealtimeConnections;
					const req = yield* HttpServerRequest.HttpServerRequest;

					const searchParams = yield* HttpServerRequest.schemaSearchParams(
						S.Struct({ token: S.String }),
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
						S.Struct({
							jwt: S.OptionFromUndefinedOr(ClientAuthJWTFromEncoded),
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

					yield* Effect.addFinalizer(() =>
						Effect.sync(() => {
							realtimeConnections.delete(connectionId);
						}).pipe(
							Effect.zipLeft(
								Effect.log(`Removed realtime connection ${connectionId}`),
							),
						),
					);

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
						Effect.provideService(ProjectEditor.ProjectEditor, editor),
						Effect.provideService(ProjectRuntime.ProjectRuntime, runtime),
						Effect.provideService(
							EngineRegistry.EngineRegistry,
							engineRegistry,
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
						S.Struct({ package: Package.Id }),
					);

					const httpApp = yield* packageRpc.get(pkgId);
					if (Option.isNone(httpApp))
						return HttpServerResponse.text("Package not found", {
							status: 404,
						});

					return yield* httpApp.value;
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
	dependencies: [Deps],
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
	const runtime = yield* ProjectRuntime.ProjectRuntime;
	const realtimeConnection = yield* Realtime.Connection;
	const engineRegistry = yield* EngineRegistry.EngineRegistry;

	const presence = yield* PresenceState;
	yield* presence.registerToScope;

	const initialResourceEvents = yield* Effect.forEach(
		Array.from(engineRegistry.engines.entries()),
		([pkgId, engine]) =>
			Effect.gen(function* () {
				const resources = yield* Effect.all(
					Record.map(engine.resources, (resource) => resource.get),
				);

				return new ProjectEvent.PackageResourcesUpdated({
					package: pkgId,
					resources,
				});
			}),
	);

	const initialStream = Stream.make(...initialResourceEvents);
	const updatesStream = Stream.mergeAll(
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
			(yield* runtime.subscribe).pipe(
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

	return Stream.concat(initialStream, updatesStream);
});
