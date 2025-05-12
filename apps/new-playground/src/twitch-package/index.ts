import {
  Context,
  Effect,
  Exit,
  FiberRef,
  Mailbox,
  Option,
  pipe,
  Queue,
  Schema,
  Stream,
} from "effect";
import { makeLatch } from "effect/Effect";

import { definePackage } from "../package";
import { RPCS, STATE } from "./shared";
import {
  FetchHttpClient,
  Headers,
  HttpApiClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { HelixApi } from "./helix";

const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

const EVENTSUB_EVENT = Schema.Struct({
  metadata: Schema.Struct({
    message_type: Schema.Literal("session_welcome"),
  }),
  payload: Schema.Struct({
    session: Schema.Struct({
      id: Schema.String,
    }),
  }),
});

export default definePackage(
  Effect.fn(function* (pkg, ctx) {
    type Socket = {
      lock: Effect.Semaphore;
      ws: WebSocket;
      state: "connecting" | "connected";
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

        const latch = yield* makeLatch();

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

          const events = yield* Mailbox.make<(typeof EVENTSUB_EVENT)["Type"]>();

          ws.onmessage = (event) => {
            events.unsafeOffer(
              Schema.decodeSync(EVENTSUB_EVENT)(JSON.parse(event.data)),
            );
          };

          ws.onclose = () => {
            console.log("onclose");
            events.unsafeDone(Exit.succeed(undefined));
          };

          events.pipe(
            Mailbox.toStream,
            Stream.runForEach(
              Effect.fn(function* (event) {
                if (event.metadata.message_type === "session_welcome") {
                  yield* Effect.gen(function* () {
                    const subs = yield* helixClient.eventSub.getSubscriptions();

                    for (const sub of subs.data) {
                      if (sub.status === "websocket_disconnected")
                        yield* helixClient.eventSub.deleteSubscription({
                          urlParams: { id: sub.id },
                        });
                    }

                    // yield* helixClient.eventSub.createSubscription({
                    //   payload: {
                    //     type: "channel.follow",
                    //     version: "2",
                    //     condition: {
                    //       broadcaster_user_id: accountId,
                    //       moderator_user_id: accountId,
                    //     },
                    //     transport: {
                    //       method: "websocket",
                    //       session_id: event.payload.session.id,
                    //     },
                    //   },
                    // });
                  }).pipe(lock.withPermits(1), Effect.ensuring(latch.open));

                  socket.state = "connected";

                  yield* ctx.dirtyState;
                }
              }),
            ),
            Effect.ensuring(
              Effect.all([
                Effect.sync(() => sockets.delete(accountId)).pipe(
                  lock.withPermits(1),
                ),
                latch.open,
                ctx.dirtyState,
              ]),
            ),
            Effect.runFork,
          );

          const socket: Socket = {
            lock,
            ws,
            state: "connecting",
          };

          sockets.set(accountId, socket);
          yield* ctx.dirtyState;

          return socket;
        }).pipe(lock.withPermits(1));

        yield* latch.await;
      }),
      DisconnectEventSub: Effect.fn(function* ({ accountId }) {
        const socket = sockets.get(accountId);
        if (!socket) return;

        socket.ws.close();
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
