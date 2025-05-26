import { RpcMiddleware } from "@effect/rpc";

import { RealtimeConnection } from "../Realtime/Connection";

export class Middleware extends RpcMiddleware.Tag<Middleware>()("Middleware", {
  provides: RealtimeConnection,
}) {}
