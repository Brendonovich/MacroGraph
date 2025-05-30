import { RpcMiddleware } from "@effect/rpc";

import { RealtimeConnection } from "../Realtime/Connection";

export class RpcRealtimeMiddleware extends RpcMiddleware.Tag<RpcRealtimeMiddleware>()(
  "Middleware",
  {
    provides: RealtimeConnection,
  },
) {}
