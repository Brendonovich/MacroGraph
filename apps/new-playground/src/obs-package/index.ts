import { Context, Option, Schema } from "effect";
import * as Effect from "effect/Effect";
import OBSWebsocket from "obs-websocket-js";
import { getInput } from "../package-utils";
import { definePackage } from "../package";
import { rpcGroup } from "./rpc";

export default definePackage(
  Effect.fn(function* (pkg) {
    // const obsInstance = pkg.resource({
    //   name: "OBS Instance",
    //   // source:
    // });

    const obs = new OBSWebsocket();

    obs.call("SetCurrentProgramScene");

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

    class EngineContext extends Context.Tag("EngineContext")<
      EngineContext,
      { instances: Map<string, Instance> }
    >() {}

    const layer = group.toLayer({
      AddConnection: Effect.fn(function* ({ address, password }) {
        const { instances } = yield* EngineContext;
        if (instances.get(address)) return;

        const lock = Effect.unsafeMakeSemaphore(1);
        yield* lock.take(1);

        const ws = new OBSWebsocket();

        ws.on("ConnectionError", () =>
          Effect.gen(function* () {
            yield* lock.take(1);

            instance.state = "disconnected";
          }).pipe(Effect.runFork),
        );

        ws.on("ConnectionClosed", () =>
          Effect.gen(function* () {
            yield* lock.take(1);

            instance.state = "disconnected";
          }).pipe(Effect.runFork),
        );

        ws.on("ConnectionOpened", () =>
          Effect.gen(function* () {
            yield* lock.take(1);

            instance.state = "connected";
          }).pipe(Effect.runFork),
        );

        const instance: Instance = {
          password: Option.fromNullable(password),
          lock,
          ws,
          state: "disconnected",
        };

        instances.set(address, instance);

        instance.state = "connecting";

        yield* Effect.tryPromise({
          try: () => instance.ws.connect(address, password),
          catch: () => new ConnectionFailed(),
        });
      }),
    });

    return {
      engine: Effect.gen(function* () {}),
      engineRpcs: {
        group: rpcGroup,
        layer,
      },
    };
  }),
);
