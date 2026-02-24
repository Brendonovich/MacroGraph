import type { Socket } from "@effect/platform";
import { NodeSocketServer } from "@effect/platform-node";
import { Effect, Option } from "effect";
import { LookupRef } from "@macrograph/package-sdk";

import { EngineDef, EngineState } from "./index";
import { ServerStartError } from "./shared";
import { ClientId, Event, Port, ServerId } from "./types";

type ServerState = {
	port: Port;
	displayName: Option.Option<string>;
	clients: Map<ClientId, Socket.Socket>;
	nextClientId: number;
	state: "running" | "stopped" | "error";
};

export default EngineDef.toLayer((ctx) =>
	Effect.gen(function* () {
		const servers = new Map<Port, ServerState>();

		const saveState = Effect.gen(function* () {
			if (!ctx.saveState) return;

			const serversRecord: Record<
				string,
				{ autoStart: boolean; displayName?: string }
			> = {};
			for (const [port, state] of servers) {
				serversRecord[String(port)] = {
					autoStart: state.state === "running",
					displayName: Option.getOrUndefined(state.displayName),
				};
			}

			yield* ctx.saveState(new EngineState({ servers: serversRecord }));
		});

		const startServer = Effect.fnUntraced(function* (
			port: Port,
			displayName?: string,
		) {
			if (servers.has(port)) {
				return yield* new ServerStartError({
					message: `Server already running on port ${port}`,
				});
			}

			const server = yield* NodeSocketServer.makeWebSocket({ port });

			const serverState: ServerState = {
				port,
				displayName: displayName ? Option.some(displayName) : Option.none(),
				clients: new Map(),
				nextClientId: 1,
				state: "running",
			};
			servers.set(port, serverState);

			yield* saveState;
			yield* ctx.dirtyState;

			// Handle incoming connections - server.run blocks, so use runFork
			Effect.gen(function* () {
				yield* server.run((socket) =>
					Effect.gen(function* () {
						const clientId = ClientId.make(serverState.nextClientId++);
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
				);
			}).pipe(Effect.runFork);
		});

		const stopServer = Effect.fnUntraced(function* (port: Port) {
			const serverState = servers.get(port);
			if (!serverState) return;

			// Close all client connections by sending empty data (triggers close)
			for (const [clientId, socket] of serverState.clients) {
				yield* Effect.scoped(
					Effect.gen(function* () {
						const writer = yield* socket.writer;
						yield* writer(new Uint8Array());
					}),
				).pipe(Effect.ignore);
				serverState.clients.delete(clientId);
				ctx.emitEvent(new Event.ClientDisconnected({ port, client: clientId }));
			}

			serverState.state = "stopped";
			servers.delete(port);
			yield* ctx.dirtyState;
			yield* saveState;
		});

		// Initialize from saved state
		if (ctx.initialState) {
			const initialState = ctx.initialState as {
				servers?: Record<string, { autoStart: boolean; displayName?: string }>;
			};
			if (initialState.servers) {
				for (const [portStr, value] of Object.entries(initialState.servers)) {
					const port = Port.make(Number(portStr));
					if (value.autoStart) {
						yield* startServer(port, value.displayName).pipe(
							Effect.catchAll(() => Effect.void),
						);
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
						displayName: Option.getOrUndefined(server.displayName),
						clientCount: server.clients.size,
						state: server.state,
					})),
				};
			}),
			resources: {
				WebSocketServer: yield* LookupRef.make(
					Effect.sync(() =>
						[...servers.entries()].map(([port, server]) => {
							const displayName = Option.getOrUndefined(server.displayName);
							return {
								id: String(port),
								display: displayName ? `${displayName}` : `Port ${port}`,
							};
						}),
					),
				),
			},
			clientRpcs: {
				StartServer: ({
					port,
					displayName,
				}: {
					port: Port;
					displayName?: string;
				}) =>
					startServer(port, displayName).pipe(
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
