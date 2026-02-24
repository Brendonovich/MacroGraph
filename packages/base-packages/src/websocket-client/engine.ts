import { Socket } from "@effect/platform";
import { Effect, Scope } from "effect";
import { LookupRef } from "@macrograph/package-sdk";

import { EngineDef, EngineState } from "./index";
import { ConnectionFailed } from "./shared";
import { Event, WebSocketUrl } from "./types";

type Connection = {
	url: WebSocketUrl;
	socket: Socket.Socket;
	state: "disconnected" | "connecting" | "connected";
	reconnectAttempts: number;
	maxReconnectAttempts: number;
};

export default EngineDef.toLayer((ctx) =>
	Effect.gen(function* () {
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
			// Create the WebSocket socket using Effect's fromWebSocket API
			const socket = yield* Socket.fromWebSocket(
				Effect.sync(() => new globalThis.WebSocket(url)),
				{
					openTimeout: 5000, // 5 second timeout
				},
			).pipe(
				Effect.catchAll(
					(error) =>
						new ConnectionFailed({
							message: `Failed to connect to ${url}: ${error}`,
						}),
				),
			);

			const connection: Connection = {
				url,
				socket,
				state: "connecting",
				reconnectAttempts: 0,
				maxReconnectAttempts: 3,
			};
			connections.set(url, connection);

			yield* saveState;

			// Start listening for messages
			Effect.forkDaemon(
				Effect.gen(function* () {
					yield* socket.run((data) =>
						Effect.sync(() => {
							const messageData = typeof data === "string" ? data : "";
							emitMessage(url, messageData);
						}),
					);
				}),
			);

			// Set connected state
			connection.state = "connected";
			connection.reconnectAttempts = 0;
			yield* ctx.dirtyState;

			return connection;
		});

		const connectWebSocket = Effect.fnUntraced(function* (url: WebSocketUrl) {
			const connection = connections.get(url);
			if (!connection) return;

			if (connection.state === "connected" || connection.state === "connecting")
				return;

			connection.state = "connecting";
			yield* ctx.dirtyState;

			// Create new connection - old socket will be cleaned up by Scope
			const newConnection = yield* createConnection(url).pipe(
				Effect.tapError((error) =>
					Effect.gen(function* () {
						// Set to disconnected on failure
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

			// Socket.fromWebSocket manages its own scope, so we just update state
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
					const connection = yield* createConnection(url).pipe(
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

					// Socket.fromWebSocket manages its own scope
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
							const writer = yield* connection.socket.writer;
							yield* writer(data).pipe(Effect.ignore);
						}
					}),
			},
		};
	}),
);
