import { Context, Effect, Layer, pipe, Schema } from "effect";
import { makeLatch } from "effect/Effect";

import { definePackage } from "../package";
import { RPCS, STATE } from "./shared";
import {
  FetchHttpClient,
  HttpApiClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { HelixApi } from "./helix";
import { withTracerDisabledWhen } from "@effect/platform/HttpClient";

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
        const credentials = yield* ctx.credentials;
        const credential = credentials.find((c) => c.id === accountId);
        if (!credential) return;

        const lock = Effect.unsafeMakeSemaphore(1);

        const latch = yield* makeLatch();

        const helixClient = yield* HttpApiClient.make(HelixApi, {
          baseUrl: "https://api.twitch.tv/helix",
        }).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.provide(
            Context.make(FetchHttpClient.Fetch, (url, init) =>
              fetch(url, {
                ...init,
                headers: {
                  authorization: `Bearer ${credential.token.access_token}`,
                  "client-id": CLIENT_ID,
                  "content-type": "application/json",
                },
              }),
            ),
          ),
        );

        yield* Effect.gen(function* () {
          const ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

          ws.onmessage = (event) =>
            Effect.gen(function* () {
              const data = yield* Schema.decode(EVENTSUB_EVENT)(
                JSON.parse(event.data),
              ).pipe(Effect.orDie);

              if (data.metadata.message_type === "session_welcome") {
                yield* Effect.gen(function* () {
                  socket.state = "connected";

                  const subs = yield* helixClient.eventSub.getSubscriptions();

                  for (const sub of subs.data) {
                    if (sub.status === "websocket_disconnected")
                      yield* helixClient.eventSub.deleteSubscription({
                        urlParams: { id: sub.id },
                      });
                  }

                  yield* helixClient.eventSub.createSubscription({
                    payload: {
                      type: "channel.ban",
                      version: "1",
                      condition: {
                        broadcaster_user_id: accountId,
                      },
                      transport: {
                        method: "websocket",
                        session_id: data.payload.session.id,
                      },
                    },
                  });

                  yield* latch.open;
                }).pipe(lock.withPermits(1));
                yield* ctx.dirtyState;
              }
            }).pipe(Effect.runFork);

          ws.onclose = () => {
            Effect.gen(function* () {
              sockets.delete(accountId);
              yield* latch.open;
              yield* ctx.dirtyState;
            }).pipe(lock.withPermits(1), Effect.runFork);
          };

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
    });

    return {
      engine: Effect.gen(function* () {}),
      rpc: { group: RPCS, layer },
      state: {
        schema: STATE,
        get: Effect.gen(function* () {
          const credentials = yield* ctx.credentials;

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
