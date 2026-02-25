import { Socket } from "@effect/platform";
import { Deferred, Effect, Exit, Scope } from "effect";
import { LookupRef } from "@macrograph/package-sdk";

import { EngineDef, EngineState } from "./index";
import { ConnectionFailed } from "./shared";
import { Event, WebSocketUrl } from "./types";

type Connection = {
	url: WebSocketUrl;
	reconnectAttempts: number;
	maxReconnectAttempts: number;
} & (
	| { state: "disconnected" | "connecting" }
	| {
			state: "connected";
			writer: Effect.Effect.Success<Socket.Socket["writer"]>;
	  }
);

export default EngineDef.toLayer((ctx) =>
	Effect.gen(function* () {
		const socketConstructor = yield* Socket.WebSocketConstructor;
		const connections = new Map<WebSocketUrl, Connection>();

		const saveState = Effect.gen(function* () {
			if (!ctx.saveState) return;

			const connectionsRecord: Record<string, { connectOnStartup: boolean }> =
				{};
			for (const [url] of connections) {
				connectionsRecord[url] = { connectOnStartup: true };
			}

			yield* ctx.saveState(new EngineState({ connections: connectionsRecord }));
		});

		const emitMessage = (url: WebSocketUrl, data: string) => {
			ctx.emitEvent(new Event.WebSocketMessage({ url, data }));
		};

		const createConnection = Effect.fnUntraced(function* (url: WebSocketUrl) {
			// Create socket first - don't add to Map until everything is ready
			const socket = yield* Socket.makeWebSocket(url, {
				openTimeout: 5000, // 5 second timeout
			}).pipe(
				Effect.provideService(Socket.WebSocketConstructor, socketConstructor),
				Effect.catchAll(
					(error) =>
						new ConnectionFailed({
							message: `Failed to connect to ${url}: ${error}`,
						}),
				),
			);

			const scope = yield* Scope.make();

			// Now that everything is successful, create and add the connection
			const connection: Connection = {
				url,
				state: "connecting", // Already connected at this point
				reconnectAttempts: 0,
				maxReconnectAttempts: 3,
			};
			connections.set(url, connection);
			yield* saveState;
			yield* ctx.dirtyState;

			const open = yield* Deferred.make<void, ConnectionFailed>();

			yield* socket
				.runRaw(
					(data) =>
						Effect.sync(() => {
							const messageData = typeof data === "string" ? data : "";
							emitMessage(url, messageData);
						}),
					{ onOpen: Deferred.done(open, Exit.succeed<void>(undefined)) },
				)
				.pipe(
					Effect.catchTag("SocketError", (e) =>
						Effect.gen(function* () {
							connection.state = "disconnected";
							yield* ctx.dirtyState;

							return yield* new ConnectionFailed({ message: e.toString() });
						}).pipe(Effect.tapError((e) => Deferred.done(open, Exit.fail(e)))),
					),
					Scope.extend(scope),
					Effect.forkDaemon,
				);

			const writer = yield* socket.writer.pipe(Scope.extend(scope));

			yield* Deferred.await(open);

			connections.set(url, { ...connection, state: "connected", writer });
			yield* ctx.dirtyState;

			return connection;
		});

		const connectWebSocket = Effect.fnUntraced(function* (url: WebSocketUrl) {
			const connection = connections.get(url);
			if (!connection) return;

			// If already connected or connecting, don't try again
			if (connection.state === "connected" || connection.state === "connecting")
				return;

			connection.state = "connecting";
			yield* ctx.dirtyState;

			// Create new connection - old socket will be cleaned up by Scope
			// If it fails, the connection stays in the map but we mark it disconnected
			const newConnection = yield* createConnection(url).pipe(
				Effect.tapError(() =>
					Effect.gen(function* () {
						// Revert to disconnected state on failure
						const conn = connections.get(url);
						if (conn) {
							conn.state = "disconnected";
							yield* ctx.dirtyState;
						}
					}),
				),
				Effect.catchAll(
					(error) =>
						new ConnectionFailed({
							message: `Failed to connect to ${url}: ${error}`,
						}),
				),
			);

			return newConnection;
		});

		const disconnectWebSocket = Effect.fnUntraced(function* (
			url: WebSocketUrl,
		) {
			const connection = connections.get(url);
			if (!connection) return;

			if (connection.state === "connected")
				yield* connection.writer(new Socket.CloseEvent()).pipe(Effect.ignore);

			// Socket.makeWebSocket manages its own scope via Effect.scoped, so we just update state
			connection.state = "disconnected";
			yield* ctx.dirtyState;
		});

		// Initialize from saved state
		if (ctx.initialState) {
			for (const [urlStr, value] of Object.entries(
				ctx.initialState.connections,
			)) {
				const url = WebSocketUrl.make(urlStr);
				if (value.connectOnStartup) {
					yield* createConnection(url).pipe(
						Effect.catchAll((error) => {
							console.error(`Failed to connect to ${url}:`, error);
							return Effect.void;
						}),
					);
				}
			}
		}

		return {
			clientState: Effect.gen(function* () {
				return {
					connections: [...connections.entries()].map(([url, connection]) => ({
						name: url,
						url,
						state: connection.state,
					})),
				};
			}),
			resources: {
				WebSocket: yield* LookupRef.make(
					Effect.sync(() =>
						[...connections.keys()].map((url) => ({ id: url, display: url })),
					),
				),
			},
			clientRpcs: {
				AddWebSocket: Effect.fnUntraced(function* (opts) {
					const url = WebSocketUrl.make(opts.url);
					if (connections.has(url)) {
						return yield* new ConnectionFailed({
							message: `WebSocket ${url} already exists`,
						});
					}
					yield* createConnection(url).pipe(
						Effect.catchTag(
							"ConnectionFailed",
							(e) => new ConnectionFailed({ message: e.message }),
						),
					);
					if (opts.connectOnStartup !== false) {
						yield* connectWebSocket(url).pipe(
							Effect.catchAll(() => Effect.void),
						);
					}
					yield* ctx.dirtyState;
				}),
				RemoveWebSocket: Effect.fnUntraced(function* ({ url }) {
					const connection = connections.get(url);
					if (!connection) return;

					// Socket.makeWebSocket manages its own scope via Effect.scoped
					connections.delete(url);
					yield* ctx.dirtyState;
					yield* saveState;
				}),
				ConnectWebSocket: ({ url }) =>
					connectWebSocket(url).pipe(
						Effect.catchTag(
							"ConnectionFailed",
							(e) => new ConnectionFailed({ message: e.message }),
						),
					),
				DisconnectWebSocket: ({ url }) => disconnectWebSocket(url),
			},
			runtimeRpcs: {
				SendMessage: ({ url, data }: { url: WebSocketUrl; data: string }) =>
					Effect.gen(function* () {
						const connection = connections.get(url);
						if (connection?.state === "connected") {
							const writer = connection.writer;
							yield* writer(data).pipe(Effect.ignore);
						}
					}),
			},
		};
	}),
);
