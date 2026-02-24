import { Effect, Iterable, pipe, Record } from "effect";
import { LookupRef } from "@macrograph/package-sdk";

import { EngineDef, EngineState } from "./index";
import { ConnectionFailed } from "./shared";
import { Event, WebSocketUrl } from "./types";

type Connection = {
	url: WebSocketUrl;
	ws: WebSocket;
	state: "disconnected" | "connecting" | "connected";
	reconnectAttempts: number;
	maxReconnectAttempts: number;
};

export default EngineDef.toLayer((ctx) =>
	Effect.gen(function* () {
		const connections = new Map<WebSocketUrl, Connection>();

		const saveState = Effect.gen(function* () {
			if (!ctx.saveState) return;

			yield* pipe(
				connections.entries(),
				Iterable.map(([key]) => [key, { connectOnStartup: true }] as const),
				Record.fromEntries,
				(conns) => new EngineState({ connections: conns }),
				ctx.saveState,
			);
		});

		const emitMessage = (url: WebSocketUrl, data: string) => {
			ctx.emitEvent(new Event.WebSocketMessage({ url, data }));
		};

		const createConnection = Effect.fnUntraced(function* (url: WebSocketUrl) {
			const ws = new WebSocket(url);

			const connection: Connection = {
				url,
				ws,
				state: "connecting",
				reconnectAttempts: 0,
				maxReconnectAttempts: 3,
			};
			connections.set(url, connection);

			yield* saveState;

			const runConnectionEdit = <A>(e: Effect.Effect<A>) =>
				pipe(e, Effect.andThen(ctx.dirtyState), Effect.runFork);

			ws.onerror = () => {
				Effect.sync(() => {
					connection.state = "disconnected";
				}).pipe(runConnectionEdit);
			};

			ws.onclose = () => {
				Effect.sync(() => {
					connection.state = "disconnected";
					connection.reconnectAttempts++;
					// Attempt reconnection if under max attempts
					if (connection.reconnectAttempts < connection.maxReconnectAttempts) {
						setTimeout(() => {
							connectWebSocket(url).pipe(Effect.runFork);
						}, 1000 * connection.reconnectAttempts);
					}
				}).pipe(runConnectionEdit);
			};

			ws.onopen = () => {
				Effect.sync(() => {
					connection.state = "connected";
					connection.reconnectAttempts = 0;
				}).pipe(runConnectionEdit);
			};

			ws.onmessage = (event) => {
				emitMessage(url, event.data);
			};

			return connection;
		});

		const connectWebSocket = Effect.fnUntraced(function* (url: WebSocketUrl) {
			const connection = connections.get(url);
			if (!connection) return;

			if (connection.state === "connected" || connection.state === "connecting")
				return;

			connection.state = "connecting";
			yield* ctx.dirtyState;

			// Close existing socket if in bad state
			if (
				connection.ws.readyState === WebSocket.OPEN ||
				connection.ws.readyState === WebSocket.CONNECTING
			) {
				connection.ws.close();
			}

			// Create new connection
			const newConnection = yield* createConnection(url);

			// Wait a moment to see if connection succeeds
			yield* Effect.sleep("100 millis");

			if (newConnection.state !== "connected") {
				return yield* new ConnectionFailed({
					message: `Failed to connect to ${url}`,
				});
			}
		});

		const disconnectWebSocket = Effect.fnUntraced(function* (
			url: WebSocketUrl,
		) {
			const connection = connections.get(url);
			if (!connection) return;

			connection.ws.close();
			connection.state = "disconnected";
			yield* ctx.dirtyState;
		});

		// Initialize from saved state
		if (ctx.initialState) {
			yield* Effect.all(
				pipe(
					ctx.initialState.connections,
					Record.map((value, urlStr) => {
						const url = WebSocketUrl.make(urlStr);
						return createConnection(url).pipe(
							Effect.zipLeft(
								value.connectOnStartup
									? connectWebSocket(url).pipe(
											Effect.catchAll(() => Effect.void),
										)
									: Effect.void,
							),
						);
					}),
				),
			);
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
					const connection = yield* createConnection(url);
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

					connection.ws.close();
					connections.delete(url);
					yield* ctx.dirtyState;
					yield* saveState;
				}),
				ConnectWebSocket: ({ url }) => connectWebSocket(url),
				DisconnectWebSocket: ({ url }) => disconnectWebSocket(url),
			},
			runtimeRpcs: {
				SendMessage: ({ url, data }: { url: WebSocketUrl; data: string }) =>
					Effect.sync(() => {
						const connection = connections.get(url);
						console.log({ connection, url, data });
						if (connection?.state === "connected") {
							connection.ws.send(data);
						}
					}),
			},
		};
	}),
);
