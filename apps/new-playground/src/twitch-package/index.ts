import {
  Context,
  Deferred,
  Effect,
  Exit,
  Mailbox,
  Option,
  Schema,
  Stream,
} from "effect";

import { definePackage } from "../package";
import { RPCS, STATE } from "./shared";
import {
  FetchHttpClient,
  HttpApiClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { HelixApi } from "./helix";
import {
  EVENTSUB_MESSAGE,
  EventSubMessage,
  isEventSubMessageType,
} from "./eventSub";

const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

export default definePackage(
  Effect.fn(function* (pkg, ctx) {
    type Socket = {
      lock: Effect.Semaphore;
      ws: WebSocket;
      state: "connecting" | "connected";
      events: Mailbox.ReadonlyMailbox<EventSubMessage>;
    };

    const sockets = new Map<string, Socket>();

    const layer = RPCS.toLayer({
      ConnectEventSub: Effect.fn(function* ({ accountId }) {
        if (sockets.get(accountId)) return;
        if (
          !(yield* ctx.credentials.pipe(Effect.orDie)).find(
            (c) => c.id === accountId,
          )
        )
          return;

        const lock = Effect.unsafeMakeSemaphore(1);
        const responseDefer = yield* Deferred.make<void>();

        const CredentialRefresh = (c: HttpClient.HttpClient) =>
          c.pipe(
            HttpClient.filterStatusOk,
            HttpClient.catchTags({
              ResponseError: (e) => {
                if (e.response.status === 401)
                  return ctx.refreshCredential(accountId);
                return e;
              },
            }),
            HttpClient.retry({
              times: 1,
              while: (e) => e._tag === "ForceRetryError",
            }),
            HttpClient.catchTags({ ForceRetryError: Effect.die }),
          );

        const helixClient = yield* HttpApiClient.make(HelixApi, {
          baseUrl: "https://api.twitch.tv/helix",
          transformClient: (c) =>
            c.pipe(
              HttpClient.mapRequestEffect((req) =>
                Effect.gen(function* () {
                  const credentials = yield* ctx.credentials.pipe(Effect.orDie);
                  const credential = Option.fromNullable(
                    credentials.find((c) => c.id === accountId),
                  );
                  return Option.match(credential, {
                    onNone: () => req,
                    onSome: (credential) =>
                      HttpClientRequest.bearerToken(
                        req,
                        credential.token.access_token,
                      ),
                  });
                }),
              ),
              CredentialRefresh,
            ),
        }).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.provide(
            Context.make(FetchHttpClient.Fetch, (url, init) =>
              fetch(url, {
                ...init,
                headers: {
                  authorization: (init!.headers as { authorization: string })
                    .authorization,
                  "client-id": CLIENT_ID,
                  "content-type": "application/json",
                },
              }),
            ),
          ),
        );

        yield* Effect.gen(function* () {
          const ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

          ws.onmessage = (event) => {
            events.unsafeOffer(
              Schema.decodeSync(EVENTSUB_MESSAGE)(JSON.parse(event.data)),
            );
          };

          ws.onclose = () => {
            events.unsafeDone(Exit.succeed(undefined));
          };

          const events = yield* Mailbox.make<EventSubMessage>();

          events.pipe(
            Mailbox.toStream,
            Stream.runForEach(
              Effect.fn(function* (event) {
                if (isEventSubMessageType(event, "session_welcome")) {
                  yield* Effect.gen(function* () {
                    if (socket.state === "connected") return;

                    const subs = yield* helixClient.eventSub.getSubscriptions();
                    for (const sub of subs.data) {
                      if (sub.status === "websocket_disconnected")
                        yield* helixClient.eventSub.deleteSubscription({
                          urlParams: { id: sub.id },
                        });
                    }

                    yield* helixClient.eventSub.createSubscription({
                      payload: {
                        type: "channel.follow",
                        version: "2",
                        condition: {
                          broadcaster_user_id: accountId,
                          moderator_user_id: accountId,
                        },
                        transport: {
                          method: "websocket",
                          session_id: event.payload.session.id,
                        },
                      },
                    });

                    yield* helixClient.eventSub.createSubscription({
                      payload: {
                        type: "channel.ban",
                        version: "1",
                        condition: {
                          broadcaster_user_id: accountId,
                        },
                        transport: {
                          method: "websocket",
                          session_id: event.payload.session.id,
                        },
                      },
                    });

                    yield* helixClient.eventSub.createSubscription({
                      payload: {
                        type: "channel.unban",
                        version: "1",
                        condition: {
                          broadcaster_user_id: accountId,
                        },
                        transport: {
                          method: "websocket",
                          session_id: event.payload.session.id,
                        },
                      },
                    });

                    socket.state = "connected";
                  }).pipe(
                    lock.withPermits(1),
                    Effect.ensuring(Deferred.succeed(responseDefer, void 0)),
                  );

                  yield* ctx.dirtyState;
                }
              }),
            ),
            Effect.ensuring(
              Effect.all([
                Effect.sync(() => sockets.delete(accountId)).pipe(
                  lock.withPermits(1),
                ),
                Deferred.succeed(responseDefer, void 0),
                ctx.dirtyState,
              ]),
            ),
            Effect.runFork,
          );

          const socket: Socket = {
            lock,
            ws,
            state: "connecting",
            events,
          };

          sockets.set(accountId, socket);
          yield* ctx.dirtyState;
          return socket;
        }).pipe(lock.withPermits(1));

        yield* Deferred.await(responseDefer);
      }),
      DisconnectEventSub: Effect.fn(function* ({ accountId }) {
        const socket = sockets.get(accountId);
        if (!socket) return;

        socket.ws.close();

        yield* socket.events.await;
      }),
    });

    return {
      engine: Effect.gen(function* () {}),
      rpc: { group: RPCS, layer },
      state: {
        schema: STATE,
        get: Effect.gen(function* () {
          const credentials = yield* ctx.credentials.pipe(Effect.orDie);

          return {
            accounts: credentials.map(
              (c) =>
                ({
                  id: c.id,
                  displayName: c.displayName!,
                  eventSubSocket: {
                    state: sockets.get(c.id)?.state ?? "disconnected",
                  },
                }) as const,
            ),
          };
        }),
      },
    };
  }),
);
