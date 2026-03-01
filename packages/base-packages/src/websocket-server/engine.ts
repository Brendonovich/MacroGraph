import type { Socket } from "@effect/platform";
import { NodeSocketServer } from "@effect/platform-node";
import { Effect, Exit, Option, Scope } from "effect";
import { LookupRef } from "@macrograph/package-sdk";

import { EngineDef, EngineState } from "./index";
import { ServerStartError } from "./shared";
import { ClientId, Event, Host, Port, ServerId } from "./types";

type ServerState = {
	port: Port;
	host: Host;
	displayName: Option.Option<string>;
	clients: Map<ClientId, Socket.Socket>;
	nextClientId: number;
	scope: Option.Option<Scope.CloseableScope>;
	state: "running" | "stopped" | "error";
};

export default EngineDef.toLayer((ctx) =>
	Effect.gen(function* () {
		const servers = new Map<Port, ServerState>();

		const saveState = Effect.gen(function* () {
			if (!ctx.saveState) return;

			const serversRecord: Record<
				string,
				{ autoStart: boolean; host: string; displayName?: string }
			> = {};
			for (const [port, state] of servers) {
				serversRecord[String(port)] = {
					autoStart: state.state === "running",
					host: state.host,
					displayName: Option.getOrUndefined(state.displayName),
				};
			}

			yield* ctx.saveState(new EngineState({ servers: serversRecord }));
		});

		const startServer = Effect.fnUntraced(function* (
			port: Port,
			host?: Host,
			displayName?: string,
		) {
			const existingServer = servers.get(port);
			if (existingServer?.state === "running") {
				return yield* new ServerStartError({
					message: `Server already running on port ${port}`,
				});
			}

			// Preserve existing display name and host if restarting a stopped server
			const resolvedDisplayName =
				displayName ??
				Option.getOrUndefined(existingServer?.displayName ?? Option.none());
			const resolvedHost =
				host ?? existingServer?.host ?? Host.make("127.0.0.1");

			const scope = yield* Scope.make();

			yield* Effect.log(`creating server ${port}`);
			// Acquire the WebSocket server into the server's own scope
			// so it stays alive until stopServer closes the scope
			const server = yield* NodeSocketServer.makeWebSocket({
				port,
				host: resolvedHost,
			}).pipe(Scope.extend(scope));
			yield* Effect.log(`created server ${port}`);

			const serverState: ServerState = {
				port,
				host: resolvedHost,
				displayName: Option.fromNullable(resolvedDisplayName),
				clients: new Map(),
				nextClientId: 1,
				scope: Option.some(scope),
				state: "running",
			};
			servers.set(port, serverState);

			yield* saveState;
			yield* ctx.dirtyState;

			yield* Effect.log(`running server ${port}`);

			yield* server
				.run((socket) =>
					Effect.gen(function* () {
						const clientId = ClientId.make(serverState.nextClientId++);
						yield* Effect.log(`Server ${port} client ${clientId} connected`);
						serverState.clients.set(clientId, socket);

						ctx.emitEvent(
							new Event.ClientConnected({ port, client: clientId }),
						);
						yield* ctx.dirtyState;

						// Handle messages from this client
						yield* socket.runRaw((data) =>
							Effect.gen(function* () {
								const messageData = typeof data === "string" ? data : "";
								ctx.emitEvent(
									new Event.MessageReceived({
										port,
										client: clientId,
										data: messageData,
									}),
								);
							}),
						);

						// Cleanup on disconnect
						serverState.clients.delete(clientId);
						ctx.emitEvent(
							new Event.ClientDisconnected({ port, client: clientId }),
						);
						yield* ctx.dirtyState;
					}),
				)
				.pipe(Effect.forkIn(scope));
		});

		const stopServer = Effect.fnUntraced(function* (port: Port) {
			const serverState = servers.get(port);
			if (!serverState) return;
			if (serverState.state !== "running") return;

			if (Option.isSome(serverState.scope)) {
				yield* Scope.close(serverState.scope.value, Exit.succeed(null));
			}

			serverState.state = "stopped";
			yield* ctx.dirtyState;
			yield* saveState;
		});

		const removeServer = Effect.fnUntraced(function* (port: Port) {
			const serverState = servers.get(port);
			if (!serverState) return;
			if (serverState.state === "running") {
				// Stop first if running
				yield* stopServer(port);
			}

			servers.delete(port);
			yield* ctx.dirtyState;
			yield* saveState;
		});

		// Initialize from saved state
		if (ctx.initialState) {
			const initialState = ctx.initialState as {
				servers?: Record<
					string,
					{ autoStart: boolean; host?: string; displayName?: string }
				>;
			};
			if (initialState.servers) {
				for (const [portStr, value] of Object.entries(initialState.servers)) {
					const port = Port.make(Number(portStr));
					if (value.autoStart) {
						yield* startServer(
							port,
							Host.make(value.host ?? "127.0.0.1"),
							value.displayName,
						).pipe(Effect.catchAll(() => Effect.void));
					}
				}
			}
		}

		return {
			clientState: Effect.gen(function* () {
				return {
					servers: [...servers.entries()].map(([port, server]) => ({
						id: ServerId.make(String(port)),
						port,
						host: server.host,
						displayName: Option.getOrUndefined(server.displayName),
						clientCount: server.clients.size,
						state: server.state,
					})),
				};
			}),
			resources: {
				WebSocketServer: yield* LookupRef.make(
					Effect.sync(() =>
						[...servers.entries()]
							.filter(([, server]) => server.state === "running")
							.map(([port, server]) => {
								const displayName = Option.getOrUndefined(server.displayName);
								return {
									id: port,
									display: displayName ? `${displayName}` : `Port ${port}`,
								};
							}),
					),
				),
			},
			clientRpcs: {
				StartServer: ({
					port,
					host,
					displayName,
				}: {
					port: Port;
					host?: Host;
					displayName?: string;
				}) =>
					startServer(port, host, displayName).pipe(
						Effect.catchTag(
							"SocketServerError",
							(e: any) => new ServerStartError({ message: e.message }),
						),
						Effect.catchAll(
							(e) => new ServerStartError({ message: String(e) }),
						),
					),
				StopServer: ({ port }: { port: Port }) =>
					stopServer(port).pipe(Effect.catchAll(() => Effect.void)),
				RemoveServer: ({ port }: { port: Port }) =>
					removeServer(port).pipe(Effect.catchAll(() => Effect.void)),
			},
			runtimeRpcs: {
				SendMessage: ({
					port,
					client,
					data,
				}: {
					port: Port;
					client?: ClientId;
					data: string;
				}) =>
					Effect.scoped(
						Effect.gen(function* () {
							const serverState = servers.get(port);
							if (!serverState) return;

							if (client === undefined) {
								// Broadcast to all clients
								for (const [, socket] of serverState.clients) {
									const writer = yield* socket.writer;
									yield* writer(data).pipe(Effect.ignore);
								}
							} else {
								// Send to specific client
								const socket = serverState.clients.get(client);
								if (socket) {
									const writer = yield* socket.writer;
									yield* writer(data).pipe(Effect.ignore);
								}
							}
						}),
					),
			},
		};
	}),
);
