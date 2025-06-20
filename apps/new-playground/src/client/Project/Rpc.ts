import { RpcClient, RpcMiddleware } from "@effect/rpc";
import { Headers, Socket } from "@effect/platform";
import { BrowserSocket } from "@effect/platform-browser";
import { Effect, Layer } from "effect";

import { Rpcs } from "../../rpc";
import { RpcsSerialization } from "../../shared";
import { ProjectRealtime } from "./Realtime";
import { RpcRealtimeMiddleware } from "../../domain/Rpc/Middleware";

export class ProjectRpc extends Effect.Service<ProjectRpc>()("ProjectRpc", {
  accessors: true,
  scoped: Effect.gen(function* () {
    const realtime = yield* ProjectRealtime;

    const mw = RpcMiddleware.layerClient(RpcRealtimeMiddleware, ({ request }) =>
      Effect.succeed({
        ...request,
        headers: Headers.set(
          request.headers,
          "realtime-id",
          realtime.id.toString(),
        ),
      }),
    );

    return {
      client: yield* RpcClient.make(Rpcs, { disableTracing: true }).pipe(
        Effect.provide(mw),
      ),
    };
  }),
  dependencies: [
    RpcClient.layerProtocolSocket().pipe(
      Layer.provide(RpcsSerialization),
      Layer.provide(
        Socket.layerWebSocket("/api/rpc").pipe(
          Layer.provide(BrowserSocket.layerWebSocketConstructor),
        ),
      ),
    ),
    ProjectRealtime.Default,
  ],
}) {}
