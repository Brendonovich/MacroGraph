import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { Effect, Layer } from "effect";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { createServer } from "node:http";

import { DepsLive, ServerLive } from "./entry-server";

Layer.unwrapEffect(
  Effect.gen(function* () {
    return HttpRouter.empty.pipe(
      HttpRouter.all(
        "*",
        Effect.sync(() => HttpServerResponse.empty({ status: 494 })),
      ),
      HttpRouter.use(
        HttpMiddleware.make(() =>
          Effect.gen(function* () {
            const httpServerRequest =
              yield* HttpServerRequest.HttpServerRequest;
            let { url } = httpServerRequest;
            if (url === "/") url = "/index.html";
            return yield* HttpServerResponse.file(`dist/client${url}`);
          }),
        ),
      ),
      HttpRouter.mountApp("/api", yield* ServerLive),
      HttpServer.serve(),
    );
  }),
).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 23456 })),
  Layer.launch,
  Effect.provide(DepsLive),
  Effect.scoped,
  NodeRuntime.runMain,
);
