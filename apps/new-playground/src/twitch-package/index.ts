import {
  Chunk,
  Context,
  Deferred,
  Effect,
  Exit,
  Mailbox,
  Option,
  Schema,
  Scope,
  Stream,
} from "effect";

import { definePackage } from "../package";
import { RPCS, STATE } from "./shared";
import {
  FetchHttpClient,
  HttpApiClient,
  HttpClient,
  HttpClientRequest,
  Socket,
} from "@effect/platform";
import { HelixApi } from "./helix";
import {
  EVENTSUB_MESSAGE,
  EventSubMessage,
  isEventSubMessageType,
} from "./eventSub";
import { layerWebSocketConstructor } from "@effect/platform-node/NodeSocket";
import { makeSpan } from "effect/Effect";
import { Resource } from "@effect/opentelemetry/Resource";

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
                // twitch doesn't like extra headers
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

        const ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

        const events = yield* Mailbox.make<EventSubMessage>();

        const socket: Socket = { lock, ws, state: "connecting", events };

        yield* Effect.sync(() => {
          sockets.set(accountId, socket);
        }).pipe(lock.withPermits(1), Effect.ensuring(ctx.dirtyState));

        ws.onmessage = (event) => {
          events.unsafeOffer(
            Schema.decodeSync(EVENTSUB_MESSAGE)(JSON.parse(event.data)),
          );
        };

        ws.onclose = () => {
          events.unsafeDone(Exit.succeed(undefined));
        };

        const eventStream = Mailbox.toStream(events);

        const welcomeEvent = yield* Stream.take(eventStream, 1).pipe(
          Stream.runCollect,
          Effect.map(Chunk.get(0)),
          Effect.map(
            Option.getOrThrowWith(
              () => new Error("Welcome event not received"),
            ),
          ),
        );

        if (!isEventSubMessageType(welcomeEvent, "session_welcome"))
          throw new Error(
            `Invalid welcome event: ${welcomeEvent.metadata.message_type}`,
          );

        yield* Effect.gen(function* () {
          const subs = yield* helixClient.eventSub.getSubscriptions();
          yield* Effect.log(`Found ${subs.data.length} existing subscriptions`);
          yield* Effect.all(
            subs.data.map(
              (sub) =>
                // sub.status === "websocket_disconnected"
                //   ?
                helixClient.eventSub.deleteSubscription({
                  urlParams: { id: sub.id },
                }),
              // : Effect.void,
            ),
            { concurrency: 10 },
          ).pipe(Effect.withSpan("deleteOldSubscriptions"));
          yield* Effect.log("Creating subscriptions");
          yield* Effect.all(
            [
              helixClient.eventSub.createSubscription({
                payload: {
                  type: "channel.follow",
                  version: "2",
                  condition: {
                    broadcaster_user_id: accountId,
                    moderator_user_id: accountId,
                  },
                  transport: {
                    method: "websocket",
                    session_id: welcomeEvent.payload.session.id,
                  },
                },
              }),
              helixClient.eventSub.createSubscription({
                payload: {
                  type: "channel.ban",
                  version: "1",
                  condition: {
                    broadcaster_user_id: accountId,
                  },
                  transport: {
                    method: "websocket",
                    session_id: welcomeEvent.payload.session.id,
                  },
                },
              }),
              helixClient.eventSub.createSubscription({
                payload: {
                  type: "channel.unban",
                  version: "1",
                  condition: {
                    broadcaster_user_id: accountId,
                  },
                  transport: {
                    method: "websocket",
                    session_id: welcomeEvent.payload.session.id,
                  },
                },
              }),
            ],
            { concurrency: 2 },
          ).pipe(Effect.withSpan("createTestSubscriptions"));
          socket.state = "connected";
          yield* Effect.log("Socket Connected");
        }).pipe(Effect.orDie, Effect.ensuring(ctx.dirtyState));

        const scope = yield* Scope.make();
        yield* Effect.gen(function* () {
          yield* Stream.runForEach(eventStream, (event) => {
            let spanName = `Message.${event.metadata.message_type}`;

            return Effect.gen(function* () {
              if (isEventSubMessageType(event, "session_welcome"))
                throw new Error("Unexpected session welcome");
            }).pipe(
              Effect.withSpan(spanName, { attributes: flattenObject(event) }),
            );
          });
        }).pipe(
          Effect.withSpan(`twitch.EventSub.${accountId}`, { root: true }),
          Effect.ensuring(
            Effect.all([
              Effect.sync(() => sockets.delete(accountId)).pipe(
                lock.withPermits(1),
              ),
              Scope.close(scope, Exit.succeed(null)),
              ctx.dirtyState,
              Effect.log("Socket Disconnected"),
            ]),
          ),
          Effect.forkScoped,
          Scope.extend(scope),
        );
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

function flattenObject(
  obj: Record<string, any>,
  prefix: string = "",
  res: Record<string, any> = {},
): Record<string, any> {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (
        typeof obj[key] === "object" &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        flattenObject(obj[key], newKey, res);
      } else {
        res[newKey] = obj[key];
      }
    }
  }
  return res;
}
