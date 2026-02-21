import { Socket } from "@effect/platform";
import { BrowserSocket } from "@effect/platform-browser";
import {
	Deferred,
	Effect,
	Option,
	PubSub,
	Ref,
	Schedule,
	Sink,
	Stream,
	SubscriptionRef,
} from "effect";
import type { ProjectEvent } from "@macrograph/project-domain";
import type { ServerEvent } from "@macrograph/server-domain";

import { ClientAuth } from "../ClientAuth";

export type RealtimeEvent = ServerEvent.ServerEvent | ProjectEvent.ProjectEvent;

export type ConnectionStatus =
	| { readonly _tag: "Connected"; readonly id: number; readonly token: string }
	| { readonly _tag: "Reconnecting" }
	| { readonly _tag: "Disconnected" };

export class ProjectRealtime extends Effect.Service<ProjectRealtime>()(
	"ProjectRealtime",
	{
		scoped: Effect.gen(function* () {
			const { jwt } = yield* ClientAuth;
			const _jwt = yield* jwt.get;

			// Long-lived PubSub that outlives individual socket connections.
			// Events from each connection are piped into this.
			const eventsPubSub = yield* PubSub.unbounded<RealtimeEvent>();

			// Connection status, observable by consumers.
			const connectionStatus = yield* SubscriptionRef.make<ConnectionStatus>({
				_tag: "Disconnected",
			});

			// Fires each time a reconnection succeeds (not the initial connection).
			// Consumers use this to trigger state re-fetch.
			const reconnectedPubSub = yield* PubSub.unbounded<void>();

			// Deferred that resolves once the first connection is established.
			// This gates ServerRpc and UILive from proceeding before we have id/token.
			const firstConnection = yield* Deferred.make<{
				id: number;
				token: string;
			}>();

			// Mutable state for synchronous access to current id/token.
			// Updated on every successful connection.
			let currentId: number | undefined;
			let currentToken: string | undefined;

			// Track whether this is the initial connection.
			const isFirstConnectionRef = yield* Ref.make(true);

			// A single connection attempt: open socket, read identify, pipe events.
			// Fails on socket errors or protocol issues.
			const runConnection = Effect.scoped(
				Effect.gen(function* () {
					const params = new URLSearchParams();
					if (Option.isSome(_jwt)) params.set("jwt", _jwt.value);

					const socket = yield* Socket.makeWebSocket(`/api/realtime?${params}`);

					// The full socket stream of parsed messages
					const messageStream = Stream.never.pipe(
						Stream.pipeThroughChannel(Socket.toChannel(socket)),
						Stream.decodeText(),
						Stream.map(
							(v) =>
								JSON.parse(v) as
									| RealtimeEvent
									| { type: "identify"; id: number; token: string },
						),
					);

					// Peel the first message (identify) and get the remainder
					const [firstEvent, restStream] = yield* messageStream.pipe(
						Stream.peel(Sink.head()),
					);

					if (Option.isNone(firstEvent))
						return yield* Effect.fail(new Error("Identify event not received"));

					const event = firstEvent.value;
					if (!("type" in event && (event as any).type === "identify"))
						return yield* Effect.fail(
							new Error(`Invalid first event: ${JSON.stringify(event)}`),
						);

					const { id, token } = event as {
						type: "identify";
						id: number;
						token: string;
					};

					// Update mutable state for synchronous access
					currentId = id;
					currentToken = token;

					// Update observable connection status
					yield* SubscriptionRef.set(connectionStatus, {
						_tag: "Connected",
						id,
						token,
					});

					const isFirst = yield* Ref.get(isFirstConnectionRef);
					if (isFirst) {
						yield* Deferred.succeed(firstConnection, { id, token });
						yield* Ref.set(isFirstConnectionRef, false);
					} else {
						// Signal reconnection so consumers can re-fetch state
						yield* reconnectedPubSub.offer(undefined);
					}

					yield* Effect.log(
						`Realtime connected (id=${id}, reconnect=${!isFirst})`,
					);

					// Pipe remaining events into the long-lived PubSub
					yield* restStream.pipe(
						Stream.runForEach((evt) => {
							// Skip any stray identify messages
							if ("type" in evt && (evt as any).type === "identify")
								return Effect.void;
							return eventsPubSub.offer(evt as RealtimeEvent);
						}),
					);
				}),
			);

			// Reconnection loop: run connection, on failure/completion set status to
			// "Reconnecting" and retry with exponential backoff capped at 30 seconds.
			// Retries forever. The Deferred gates consumers from proceeding until the
			// first connection succeeds.
			const reconnectionLoop = runConnection.pipe(
				// Convert both clean closes and errors into a retryable failure
				Effect.matchCauseEffect({
					onFailure: (cause) =>
						Effect.logWarning("Realtime socket error", cause).pipe(
							Effect.zipRight(Effect.fail("disconnected" as const)),
						),
					onSuccess: () =>
						Effect.log("Realtime socket closed cleanly").pipe(
							Effect.zipRight(Effect.fail("disconnected" as const)),
						),
				}),
				Effect.tapError(() =>
					SubscriptionRef.set(connectionStatus, { _tag: "Reconnecting" }),
				),
				Effect.retry(
					Schedule.exponential("500 millis").pipe(
						Schedule.either(Schedule.spaced("30 seconds")),
						Schedule.tapInput(() => Effect.log("Attempting to reconnect...")),
					),
				),
				Effect.forever,
			);

			// Fork the reconnection loop into the service scope
			yield* reconnectionLoop.pipe(
				Effect.catchAllCause((cause) =>
					Effect.logError("Realtime connection loop terminated", cause),
				),
				Effect.provide(BrowserSocket.layerWebSocketConstructor),
				Effect.forkScoped,
			);

			// Wait for the first connection before returning the service
			const initial = yield* Deferred.await(firstConnection);

			return {
				/** The current connection ID. Updates on reconnect. */
				get id() {
					return currentId ?? initial.id;
				},
				/** The current JWT token for RPC auth. Updates on reconnect. */
				get token() {
					return currentToken ?? initial.token;
				},
				/** Observable connection status. */
				connectionStatus,
				/** Stream of domain events, survives across reconnections. */
				stream: () => Stream.fromPubSub(eventsPubSub),
				/** Stream that emits each time a reconnection succeeds. */
				reconnected: () => Stream.fromPubSub(reconnectedPubSub),
			};
		}),
		dependencies: [ClientAuth.Default, BrowserSocket.layerWebSocketConstructor],
	},
) {}
