import {
  Chunk,
  Context,
  Effect,
  Exit,
  Option,
  Schema,
  Scope,
  Stream,
} from "effect";
import {
  FetchHttpClient,
  HttpApiClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Package, PackageEngine, setOutput } from "@macrograph/package-sdk";

import { RPCS } from "./shared";
import { HelixApi } from "./helix";
import {
  EVENTSUB_MESSAGE,
  EventSubMessage,
  isEventSubMessageType,
  isNotificationType,
} from "./eventSub";

const CLIENT_ID = "ldbp0fkq9yalf2lzsi146i0cip8y59";

const Engine = PackageEngine.make<
  {
    accounts: Array<{
      id: string;
      displayName: string;
      eventSubSocket: { state: "connecting" | "connected" | "disconnected" };
    }>;
  },
  typeof RPCS
>({ rpc: RPCS })<EventSubMessage>(
  Effect.fn(function* (ctx) {
    type Socket = {
      lock: Effect.Semaphore;
      ws: WebSocket;
      state: "connecting" | "connected";
      events: Stream.Stream<EventSubMessage>;
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

        const events = Stream.asyncPush<EventSubMessage>((emit) =>
          Effect.gen(function* () {
            ws.onmessage = (event) => {
              emit.single(
                Schema.decodeSync(EVENTSUB_MESSAGE)(JSON.parse(event.data)),
              );
            };

            ws.onclose = () => {
              emit.end();
              // events.unsafeDone(Exit.succeed(undefined));
            };
          }),
        );

        const socket: Socket = { lock, ws, state: "connecting", events };

        yield* Effect.sync(() => {
          sockets.set(accountId, socket);
        }).pipe(lock.withPermits(1), Effect.ensuring(ctx.dirtyState));

        const firstEvent = yield* Stream.take(events, 1).pipe(
          Stream.runCollect,
          Effect.map(Chunk.get(0)),
          Effect.map(
            Option.getOrThrowWith(
              () => new Error("Welcome event not received"),
            ),
          ),
        );

        if (!isEventSubMessageType(firstEvent, "session_welcome"))
          throw new Error(
            `Invalid first event: ${firstEvent.metadata.message_type}`,
          );

        yield* Effect.gen(function* () {
          const subs = yield* helixClient.eventSub.getSubscriptions();
          yield* Effect.log(`Found ${subs.data.length} existing subscriptions`);
          yield* Effect.all(
            subs.data.map((sub) =>
              sub.status === "websocket_disconnected"
                ? helixClient.eventSub.deleteSubscription({
                    urlParams: { id: sub.id },
                  })
                : Effect.void,
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
                    session_id: firstEvent.payload.session.id,
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
                    session_id: firstEvent.payload.session.id,
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
                    session_id: firstEvent.payload.session.id,
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

        yield* Stream.runForEach(events, (event) => {
          let spanName = `Message.${event.metadata.message_type}`;

          return Effect.gen(function* () {
            if (isEventSubMessageType(event, "session_welcome"))
              throw new Error("Unexpected session welcome");

            if (isEventSubMessageType(event, "notification"))
              ctx.emitEvent(event);
          }).pipe(
            Effect.withSpan(spanName, { attributes: flattenObject(event) }),
          );
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

        yield* socket.events.pipe(Stream.runForEach(() => Effect.void));
      }),
    });

    return {
      rpc: layer,
      state: Effect.gen(function* () {
        const credentials = yield* ctx.credentials.pipe(
          Effect.catchTag("CredentialsFetchFailed", () => Effect.succeed([])),
        );

        return {
          accounts: credentials.map((c) => ({
            id: c.id,
            displayName: c.displayName!,
            eventSubSocket: {
              state: sockets.get(c.id)?.state ?? "disconnected",
            },
          })),
        };
      }),
    };
  }),
);

export default Package.make({
  engine: Engine,
  builder: (ctx) => {
    ctx.schema("notification.channel.ban", {
      name: "User Banned",
      type: "event",
      event: (e) =>
        isEventSubMessageType(e, "notification") &&
        isNotificationType(e, "channel.ban")
          ? Option.some(e)
          : Option.none(),
      io: (io) => ({
        exec: io.out.exec("exec"),
        userId: io.out.data("userId", Schema.String),
        userLogin: io.out.data("userLogin", Schema.String),
        userName: io.out.data("userName", Schema.String),
        broadcasterId: io.out.data("broadcasterId", Schema.String),
        broadcasterLogin: io.out.data("broadcasterLogin", Schema.String),
        broadcasterName: io.out.data("broadcasterName", Schema.String),
        moderatorId: io.out.data("moderatorId", Schema.String),
        moderatorLogin: io.out.data("moderatorLogin", Schema.String),
        moderatorName: io.out.data("moderatorName", Schema.String),
        reason: io.out.data("reason", Schema.String),
        bannedAt: io.out.data("bannedAt", Schema.Date),
        endsAt: io.out.data("endsAt", Schema.OptionFromNullOr(Schema.Date)),
      }),
      run: function* (io, { payload: { event } }) {
        yield* setOutput(io.userId, event.user_id);
        yield* setOutput(io.userName, event.user_name);
        yield* setOutput(io.userLogin, event.user_login);
        yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
        yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
        yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
        yield* setOutput(io.moderatorId, event.moderator_user_id);
        yield* setOutput(io.moderatorLogin, event.moderator_user_login);
        yield* setOutput(io.moderatorName, event.moderator_user_name);
        yield* setOutput(io.reason, event.reason);
        yield* setOutput(io.bannedAt, event.banned_at);
        yield* setOutput(io.endsAt, Option.fromNullable(event.ends_at));

        return io.exec;
      },
    });
    ctx.schema("notification.channel.unban", {
      name: "User Unbanned",
      type: "event",
      event: (e) =>
        isEventSubMessageType(e, "notification") &&
        isNotificationType(e, "channel.unban")
          ? Option.some(e)
          : Option.none(),
      io: (io) => ({
        exec: io.out.exec("exec"),
        userId: io.out.data("userId", Schema.String),
        userLogin: io.out.data("userLogin", Schema.String),
        userName: io.out.data("userName", Schema.String),
        broadcasterId: io.out.data("broadcasterId", Schema.String),
        broadcasterLogin: io.out.data("broadcasterLogin", Schema.String),
        broadcasterName: io.out.data("broadcasterName", Schema.String),
        moderatorId: io.out.data("moderatorId", Schema.String),
        moderatorLogin: io.out.data("moderatorLogin", Schema.String),
        moderatorName: io.out.data("moderatorName", Schema.String),
      }),
      run: function* (io, { payload: { event } }) {
        yield* setOutput(io.userId, event.user_id);
        yield* setOutput(io.userName, event.user_name);
        yield* setOutput(io.userLogin, event.user_login);
        yield* setOutput(io.broadcasterId, event.broadcaster_user_id);
        yield* setOutput(io.broadcasterLogin, event.broadcaster_user_login);
        yield* setOutput(io.broadcasterName, event.broadcaster_user_name);
        yield* setOutput(io.moderatorId, event.moderator_user_id);
        yield* setOutput(io.moderatorLogin, event.moderator_user_login);
        yield* setOutput(io.moderatorName, event.moderator_user_name);

        return io.exec;
      },
    });
  },
});

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
