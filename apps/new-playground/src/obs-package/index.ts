import { Option, Schema } from "effect";
import * as Effect from "effect/Effect";
import OBSWebsocket from "obs-websocket-js";

import { getInput } from "../package-utils";
import { definePackage } from "../package";
import { ConnectionFailed, RPCS, STATE } from "./rpc";

export default definePackage(
  Effect.fn(function* (pkg, ctx) {
    const obs = new OBSWebsocket();

    yield* pkg.schema("setCurrentProgramScene", {
      type: "exec",
      io: (c) => ({
        scene: c.in.data("scene", Schema.String),
      }),
      run: function* (io) {
        const sceneName = yield* getInput(io.scene);

        yield* Effect.tryPromise(() =>
          obs.call("SetCurrentProgramScene", { sceneName }),
        ).pipe(Effect.catchTag("UnknownException", () => Effect.succeed(null)));
      },
    });

    type Instance = {
      password: Option.Option<string>;
      lock: Effect.Semaphore;
      ws: OBSWebsocket;
      state: "disconnected" | "connecting" | "connected";
    };

    const instances = new Map<string, Instance>();

    const layer = RPCS.toLayer({
      AddSocket: Effect.fn(function* ({ address, password }) {
        if (instances.get(address)) return;

        const lock = Effect.unsafeMakeSemaphore(1);

        const instance = yield* Effect.gen(function* () {
          const ws = new OBSWebsocket();

          ws.on("ConnectionError", () =>
            Effect.gen(function* () {
              instance.state = "disconnected";
              yield* ctx.dirtyState;
            }).pipe(lock.withPermits(1), Effect.runFork),
          );

          ws.on("ConnectionClosed", () =>
            Effect.gen(function* () {
              instance.state = "disconnected";
              yield* ctx.dirtyState;
            }).pipe(lock.withPermits(1), Effect.runFork),
          );

          ws.on("ConnectionOpened", () =>
            Effect.gen(function* () {
              instance.state = "connected";
              yield* ctx.dirtyState;
            }).pipe(lock.withPermits(1), Effect.runFork),
          );

          const instance: Instance = {
            password: Option.fromNullable(password),
            lock,
            ws,
            state: "disconnected",
          };

          instance.state = "connecting";

          return instance;
        }).pipe(lock.withPermits(1));

        yield* Effect.tryPromise({
          try: () => instance.ws.connect(address, password),
          catch: () => new ConnectionFailed(),
        });

        instances.set(address, instance);

        yield* ctx.dirtyState;
      }),
      RemoveSocket: Effect.fn(function* ({ address }) {
        const instance = instances.get(address);
        if (!instance) return;

        yield* Effect.gen(function* () {
          yield* Effect.promise(() => instance.ws.disconnect()).pipe(
            Effect.ignore,
          );
          instances.delete(address);
        }).pipe(instance.lock.withPermits(1));

        yield* ctx.dirtyState;
      }),
      DisconnectSocket: Effect.fn(function* ({ address }) {
        const instance = instances.get(address);
        if (!instance) return;

        yield* Effect.promise(() => instance.ws.disconnect()).pipe(
          Effect.ignore,
        );
      }),
      ConnectSocket: Effect.fn(function* ({ address, password }) {
        const instance = instances.get(address);
        if (!instance) return;

        yield* Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () => instance.ws.connect(address, password),
            catch: () => new ConnectionFailed(),
          });

          instance.state = "connecting";
        }).pipe(instance.lock.withPermits(1));
        yield* ctx.dirtyState;
      }),
    });

    return {
      engine: Effect.gen(function* () {}),
      rpc: { group: RPCS, layer },
      state: {
        schema: STATE,
        get: Effect.gen(function* () {
          return {
            connections: yield* Effect.all(
              [...instances.entries()].map(([address, instance]) =>
                Effect.gen(function* () {
                  return {
                    address,
                    password: Option.getOrUndefined(instance.password),
                    state: instance.state,
                  };
                }).pipe(instance.lock.withPermits(1)),
              ),
            ),
          };
        }),
      },
    };
  }),
);
