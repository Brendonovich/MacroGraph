import { Socket } from "@effect/platform";
import { Deferred, Effect, Exit, HashMap, Option, Ref, Scope } from "effect";
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
		const connectionsRef = yield* Ref.make(
			HashMap.empty<WebSocketUrl, Connection>(),
		);

		const saveState = Effect.gen(function* () {
			if (!ctx.saveState) return;

			const connectionsRecord: Record<string, { connectOnStartup: boolean }> =
				{};
			for (const [url] of HashMap.entries(yield* connectionsRef)) {
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

			const connection = {
				url,
				state: "connecting",
				reconnectAttempts: 0,
				maxReconnectAttempts: 3,
			} as Connection;

			yield* Ref.update(connectionsRef, HashMap.set(url, connection));
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
							yield* Ref.update(
								connectionsRef,
								HashMap.modify(url, (c) => ({
									...c,
									state: "disconnected" as const,
								})),
							);
							yield* ctx.dirtyState;

							return yield* new ConnectionFailed({ message: e.toString() });
						}).pipe(Effect.tapError((e) => Deferred.done(open, Exit.fail(e)))),
					),
					Scope.extend(scope),
					Effect.forkDaemon,
				);

			const writer = yield* socket.writer.pipe(Scope.extend(scope));

			yield* Deferred.await(open);

			yield* Ref.update(
				connectionsRef,
				HashMap.modify(url, (c) => ({
					...c,
					state: "connected" as const,
					writer,
				})),
			);
			yield* ctx.dirtyState;

			return connection;
		});

		const connectWebSocket = Effect.fnUntraced(function* (url: WebSocketUrl) {
			const connections = yield* Ref.get(connectionsRef);
			const connectionOption = HashMap.get(connections, url);
			if (Option.isNone(connectionOption)) return;
			const connection = connectionOption.value;

			// If already connected or connecting, don't try again
			if (connection.state === "connected" || connection.state === "connecting")
				return;

			yield* Ref.update(connectionsRef, (map) =>
				HashMap.set(map, url, {
					...connection,
					state: "connecting",
				} as Connection),
			);
			yield* ctx.dirtyState;

			// Create new connection - old socket will be cleaned up by Scope
			// If it fails, the connection stays in the map but we mark it disconnected
			const newConnection = yield* createConnection(url).pipe(
				Effect.tapError(() =>
					Effect.gen(function* () {
						// Revert to disconnected state on failure
						const connections = yield* Ref.get(connectionsRef);
						const connOption = HashMap.get(connections, url);
						if (Option.isSome(connOption)) {
							yield* Ref.update(connectionsRef, (map) =>
								HashMap.set(map, url, {
									...connOption.value,
									state: "disconnected",
								} as Connection),
							);
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
			const connections = yield* Ref.get(connectionsRef);
			const connectionOption = HashMap.get(connections, url);
			if (Option.isNone(connectionOption)) return;
			const connection = connectionOption.value;

			if (connection.state === "connected")
				yield* connection.writer(new Socket.CloseEvent()).pipe(Effect.ignore);

			yield* Ref.update(
				connectionsRef,
				HashMap.modify(url, (c) => ({ ...c, state: "disconnected" as const })),
			);
			yield* ctx.dirtyState;
		});

		// Initialize from saved state
		if (ctx.initialState) {
			for (const [urlStr, value] of Object.entries(
				ctx.initialState.connections,
			)) {
				const url = WebSocketUrl.make(urlStr);
				if (value.connectOnStartup) {
					yield* createConnection(url).pipe(Effect.ignore);
				}
			}
		}

		return {
			clientState: Effect.gen(function* () {
				const connections = yield* Ref.get(connectionsRef);
				return {
					connections: [...HashMap.entries(connections)].map(
						([url, connection]) => ({
							name: url,
							url,
							state: connection.state,
						}),
					),
				};
			}),
			resources: {
				WebSocket: yield* LookupRef.make(
					Effect.gen(function* () {
						const connections = yield* Ref.get(connectionsRef);
						return [...HashMap.keys(connections)].map((url) => ({
							id: url,
							display: url,
						}));
					}),
				),
			},
			clientRpcs: {
				AddWebSocket: Effect.fnUntraced(function* (opts) {
					const url = WebSocketUrl.make(opts.url);
					const connections = yield* Ref.get(connectionsRef);
					if (HashMap.has(connections, url)) {
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
					const connections = yield* Ref.get(connectionsRef);
					const connectionOption = HashMap.get(connections, url);
					if (Option.isNone(connectionOption)) return;

					// Socket.makeWebSocket manages its own scope via Effect.scoped
					yield* Ref.update(connectionsRef, HashMap.remove(url));
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
						const connections = yield* Ref.get(connectionsRef);
						const connectionOption = HashMap.get(connections, url);
						if (
							Option.isSome(connectionOption) &&
							connectionOption.value.state === "connected"
						) {
							const writer = connectionOption.value.writer;
							yield* writer(data).pipe(Effect.ignore);
						}
					}),
			},
		};
	}),
);
