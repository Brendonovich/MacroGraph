import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { HttpServer } from "@effect/platform";
import { createServer } from "node:http";
import { Layer, Option, Fiber } from "effect";
import * as Effect from "effect/Effect";
import { DepsLive } from "@macrograph/server-backend";

import { ServerEntry } from "./entry-server";

const HMRAwareNodeHttpServerLayer = NodeHttpServer.layer(
  () => {
    const server = createServer();

    const fiber = Option.getOrThrow(Fiber.getCurrentFiber());

    if (import.meta.hot) {
      import.meta.hot.accept(() => {
        Fiber.interrupt(fiber).pipe(Effect.runPromise);
        server.closeAllConnections();
        server.close();
      });
    }

    return server;
  },
  { port: 5678, host: "0.0.0.0" },
);

const program = Effect.gen(function* () {
  const server = yield* ServerEntry;

  return yield* Layer.launch(
    server.pipe(HttpServer.serve(), Layer.provide(HMRAwareNodeHttpServerLayer)),
  );
});

program.pipe(Effect.provide(DepsLive), Effect.scoped, NodeRuntime.runMain);
